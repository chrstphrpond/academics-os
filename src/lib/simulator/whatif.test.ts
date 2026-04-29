import { describe, it, expect } from "vitest";
import { applyOverrides, computeWhatIf } from "./whatif";
import type { EnrollmentWithCourse } from "@/lib/gpa";

const baseline: EnrollmentWithCourse[] = [
  {
    grade: "1.50",
    status: "passed",
    term: "Term 1",
    school_year: "SY 2025-26",
    course: { code: "MO-IT117", title: "Data Viz", units: 3 },
  },
  {
    grade: null,
    status: "in_progress",
    term: "Term 3",
    school_year: "SY 2025-26",
    course: { code: "MO-IT108", title: "Discrete Structures", units: 3 },
  },
];

describe("applyOverrides", () => {
  it("returns the original list when overrides are empty", () => {
    const out = applyOverrides(baseline, []);
    expect(out).toHaveLength(2);
    expect(out[1].grade).toBeNull();
  });

  it("replaces grades for matched course codes and marks them passed", () => {
    const out = applyOverrides(baseline, [
      { courseCode: "MO-IT108", grade: "1.75" },
    ]);
    expect(out[1].grade).toBe("1.75");
    expect(out[1].status).toBe("passed");
  });

  it("ignores overrides for course codes that don't appear", () => {
    const out = applyOverrides(baseline, [
      { courseCode: "DOES-NOT-EXIST", grade: "1.00" },
    ]);
    expect(out).toEqual(baseline);
  });
});

describe("computeWhatIf", () => {
  it("returns baseline + simulated GpaResult", () => {
    const result = computeWhatIf(baseline, [
      { courseCode: "MO-IT108", grade: "1.00" },
    ]);
    expect(result.baseline.gpa).toBeCloseTo(1.5, 2);
    expect(result.simulated.gpa).toBeLessThan(result.baseline.gpa);
    expect(result.simulated.totalUnitsPassed).toBeGreaterThan(
      result.baseline.totalUnitsPassed
    );
  });
});
