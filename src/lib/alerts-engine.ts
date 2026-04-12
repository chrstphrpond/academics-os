import type { AlertType, AlertSeverity } from "./types";
import { TOTAL_UNITS_REQUIRED, MAX_UNITS_PER_TERM } from "./constants";

export interface AlertInput {
  enrollments: {
    status: string;
    grade: string | null;
    term: string;
    school_year: string;
    course: {
      code: string;
      title: string;
      units: number;
      prerequisites: string[];
    };
  }[];
  allCourses: {
    code: string;
    title: string;
    units: number;
    prerequisites: string[];
  }[];
  currentTerm: string;
  currentSchoolYear: string;
}

export interface GeneratedAlert {
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  due_date: string | null;
}

export function generateAlerts(input: AlertInput): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];
  const passedCodes = new Set(
    input.enrollments
      .filter((e) => e.status === "passed")
      .map((e) => e.course.code)
  );

  // 1. INC deadline alerts
  const incEnrollments = input.enrollments.filter(
    (e) => e.status === "inc"
  );
  for (const inc of incEnrollments) {
    alerts.push({
      type: "inc_deadline",
      title: `INC: ${inc.course.code}`,
      message: `${inc.course.title} (${inc.course.code}) has an INC grade from ${inc.term} ${inc.school_year}. Must be completed within the succeeding term or it lapses to 5.00 (F).`,
      severity: "critical",
      due_date: null,
    });
  }

  // 2. Prerequisite blocker alerts
  const incOrFailedCodes = new Set(
    input.enrollments
      .filter((e) => e.status === "inc" || e.status === "failed")
      .map((e) => e.course.code)
  );

  for (const course of input.allCourses) {
    if (passedCodes.has(course.code)) continue;
    for (const prereq of course.prerequisites) {
      if (incOrFailedCodes.has(prereq)) {
        alerts.push({
          type: "prerequisite_blocker",
          title: `Blocked: ${course.code}`,
          message: `Cannot take ${course.title} (${course.code}) until ${prereq} is passed.`,
          severity: "warning",
          due_date: null,
        });
        break;
      }
    }
  }

  // 3. Cascade warning
  for (const blockerCode of incOrFailedCodes) {
    const downstream = countDownstream(
      blockerCode,
      input.allCourses,
      passedCodes
    );
    if (downstream >= 3) {
      const blockerCourse = input.allCourses.find(
        (c) => c.code === blockerCode
      );
      alerts.push({
        type: "cascade_warning",
        title: `Cascade: ${blockerCode}`,
        message: `${blockerCourse?.title || blockerCode} is blocking ${downstream} downstream courses. Clearing this should be a priority.`,
        severity: "warning",
        due_date: null,
      });
    }
  }

  // 4. Graduation pace
  const totalUnitsPassed = input.enrollments
    .filter((e) => e.status === "passed")
    .reduce((sum, e) => sum + e.course.units, 0);
  const remainingUnits = TOTAL_UNITS_REQUIRED - totalUnitsPassed;
  const currentTermNum =
    parseInt(input.currentTerm.replace(/\D/g, "")) || 1;
  const currentYearMatch = input.currentSchoolYear.match(/\d{4}/);
  const currentYear = currentYearMatch
    ? parseInt(currentYearMatch[0])
    : 2025;
  const estimatedGradYear = 2028;
  const remainingTerms =
    (estimatedGradYear - currentYear) * 3 + (3 - currentTermNum);

  if (
    remainingTerms > 0 &&
    remainingUnits / remainingTerms > MAX_UNITS_PER_TERM
  ) {
    alerts.push({
      type: "graduation_risk",
      title: "Graduation Pace Warning",
      message: `${remainingUnits} units remaining across ~${remainingTerms} terms. That's ${Math.ceil(remainingUnits / remainingTerms)} units/term, exceeding the ${MAX_UNITS_PER_TERM} unit max. You may need to extend or request overload.`,
      severity: "warning",
      due_date: null,
    });
  }

  return alerts;
}

function countDownstream(
  blockerCode: string,
  allCourses: { code: string; prerequisites: string[] }[],
  passedCodes: Set<string>
): number {
  const blocked = new Set<string>();
  const queue = [blockerCode];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const course of allCourses) {
      if (blocked.has(course.code) || passedCodes.has(course.code)) continue;
      if (course.prerequisites.includes(current)) {
        blocked.add(course.code);
        queue.push(course.code);
      }
    }
  }
  return blocked.size;
}
