import { calculateGpa, type EnrollmentWithCourse, type GpaResult } from "@/lib/gpa";

export interface GradeOverride {
  courseCode: string;
  grade: string;
}

export function applyOverrides(
  enrollments: EnrollmentWithCourse[],
  overrides: GradeOverride[]
): EnrollmentWithCourse[] {
  if (overrides.length === 0) return enrollments;
  const map = new Map(overrides.map((o) => [o.courseCode, o.grade]));
  return enrollments.map((e) => {
    const override = map.get(e.course.code);
    if (override == null) return e;
    return { ...e, grade: override, status: "passed" };
  });
}

export interface WhatIfResult {
  baseline: GpaResult;
  simulated: GpaResult;
}

export function computeWhatIf(
  enrollments: EnrollmentWithCourse[],
  overrides: GradeOverride[]
): WhatIfResult {
  return {
    baseline: calculateGpa(enrollments),
    simulated: calculateGpa(applyOverrides(enrollments, overrides)),
  };
}
