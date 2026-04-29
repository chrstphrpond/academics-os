"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeWhatIf, type GradeOverride } from "@/lib/simulator/whatif";
import type { EnrollmentWithCourse } from "@/lib/gpa";
import { MMDC_GRADE_SCALE } from "@/lib/constants";
import { GradeStat } from "./grade-stat";

const GRADE_OPTIONS = MMDC_GRADE_SCALE.filter((g) => g.grade < 4).map((g) => ({
  value: g.grade.toFixed(2),
  label: `${g.grade.toFixed(2)} — ${g.descriptor}`,
}));

export interface WhatIfViewProps {
  enrollments: EnrollmentWithCourse[];
  upcomingCourses: { code: string; title: string; units: number }[];
  overrides: GradeOverride[];
  onOverridesChange(next: GradeOverride[]): void;
}

export function WhatIfView({
  enrollments,
  upcomingCourses,
  overrides,
  onOverridesChange,
}: WhatIfViewProps) {
  const result = useMemo(
    () => computeWhatIf(enrollments, overrides),
    [enrollments, overrides]
  );

  const setGrade = (courseCode: string, grade: string | null) => {
    const next = overrides.filter((o) => o.courseCode !== courseCode);
    if (grade) next.push({ courseCode, grade });
    onOverridesChange(next);
  };

  const delta = result.baseline.gpa - result.simulated.gpa;
  const unitsDelta =
    result.simulated.totalUnitsPassed - result.baseline.totalUnitsPassed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <GradeStat
          label="Baseline"
          value={result.baseline.gpa}
          hint={result.baseline.descriptor}
        />
        <GradeStat
          label="Simulated"
          value={result.simulated.gpa}
          hint={result.simulated.descriptor}
          delta={delta}
        />
        <GradeStat
          label="Units passed"
          value={result.simulated.totalUnitsPassed}
          delta={unitsDelta}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Upcoming courses
        </h3>
        {upcomingCourses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No upcoming courses to override.
          </p>
        )}
        {upcomingCourses.map((c) => {
          const current =
            overrides.find((o) => o.courseCode === c.code)?.grade ?? "";
          return (
            <div
              key={c.code}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-muted-foreground">
                  {c.code}
                </div>
                <div className="truncate text-sm">{c.title}</div>
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">
                {c.units}u
              </div>
              <Select
                value={current}
                onValueChange={(v) =>
                  setGrade(c.code, v === "_clear" ? null : v)
                }
              >
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue placeholder="Pick a grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_clear">Clear</SelectItem>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
