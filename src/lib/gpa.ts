import type { GradeDescriptor } from "./types";

export interface EnrollmentWithCourse {
  grade: string | null;
  status: string;
  term: string;
  school_year: string;
  course: {
    code: string;
    title: string;
    units: number;
  };
}

export interface GpaResult {
  gpa: number;
  descriptor: GradeDescriptor;
  totalUnitsGraded: number;
  totalUnitsPassed: number;
  totalUnitsAll: number;
}

export interface TermGpa {
  term: string;
  schoolYear: string;
  gpa: number;
  units: number;
  label: string;
}

const GRADE_DESCRIPTORS: [number, number, GradeDescriptor][] = [
  [0, 1.0, "Excellent"],
  [1.0, 1.25, "Superior"],
  [1.25, 1.5, "Very Good"],
  [1.5, 1.75, "Good"],
  [1.75, 2.0, "Meritorious"],
  [2.0, 2.25, "Very Satisfactory"],
  [2.25, 2.5, "Satisfactory"],
  [2.5, 2.75, "Fairly Satisfactory"],
  [2.75, 3.0, "Passed"],
  [3.0, 5.0, "Failed"],
];

function getDescriptor(gpa: number): GradeDescriptor {
  for (const [_min, max, desc] of GRADE_DESCRIPTORS) {
    if (gpa <= max) return desc;
  }
  return "Failed";
}

function isNumericGrade(grade: string | null): boolean {
  if (!grade) return false;
  const num = parseFloat(grade);
  return !isNaN(num) && num >= 1.0 && num <= 5.0;
}

export function calculateGpa(enrollments: EnrollmentWithCourse[]): GpaResult {
  let weightedSum = 0;
  let totalUnitsGraded = 0;
  let totalUnitsPassed = 0;
  let totalUnitsAll = 0;

  for (const e of enrollments) {
    totalUnitsAll += e.course.units;
    if (e.status === "passed") {
      totalUnitsPassed += e.course.units;
    }
    if (isNumericGrade(e.grade)) {
      const gradeNum = parseFloat(e.grade!);
      weightedSum += gradeNum * e.course.units;
      totalUnitsGraded += e.course.units;
    }
  }

  const gpa = totalUnitsGraded > 0 ? weightedSum / totalUnitsGraded : 0;

  return {
    gpa: Math.round(gpa * 100) / 100,
    descriptor: getDescriptor(gpa),
    totalUnitsGraded,
    totalUnitsPassed,
    totalUnitsAll,
  };
}

export function calculateTermGpas(
  enrollments: EnrollmentWithCourse[]
): TermGpa[] {
  const termMap = new Map<string, EnrollmentWithCourse[]>();
  for (const e of enrollments) {
    const key = `${e.term}|${e.school_year}`;
    if (!termMap.has(key)) termMap.set(key, []);
    termMap.get(key)!.push(e);
  }

  const termGpas: TermGpa[] = [];
  for (const [key, termEnrollments] of termMap) {
    const [term, schoolYear] = key.split("|");
    const result = calculateGpa(termEnrollments);
    if (result.totalUnitsGraded > 0) {
      termGpas.push({
        term,
        schoolYear,
        gpa: result.gpa,
        units: result.totalUnitsGraded,
        label: `${term} ${schoolYear}`,
      });
    }
  }

  termGpas.sort((a, b) => {
    if (a.schoolYear !== b.schoolYear)
      return a.schoolYear.localeCompare(b.schoolYear);
    return a.term.localeCompare(b.term);
  });

  return termGpas;
}

export function simulateGpa(
  currentEnrollments: EnrollmentWithCourse[],
  hypotheticalGrades: { units: number; grade: number }[]
): number {
  const current = calculateGpa(currentEnrollments);
  let weightedSum = current.gpa * current.totalUnitsGraded;
  let totalUnits = current.totalUnitsGraded;
  for (const h of hypotheticalGrades) {
    weightedSum += h.grade * h.units;
    totalUnits += h.units;
  }
  return totalUnits > 0
    ? Math.round((weightedSum / totalUnits) * 100) / 100
    : 0;
}
