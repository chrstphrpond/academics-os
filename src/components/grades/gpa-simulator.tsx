"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlowCard, AnimatedNumber } from "@/components/ui/animated";
import { simulateGpa, calculateGpa, type EnrollmentWithCourse } from "@/lib/gpa";
import { MMDC_GRADE_SCALE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface AvailableCourse {
  code: string;
  title: string;
  units: number;
}

interface GpaSimulatorProps {
  currentEnrollments: EnrollmentWithCourse[];
  availableCourses: AvailableCourse[];
}

const GRADE_OPTIONS = MMDC_GRADE_SCALE.map((g) => ({
  value: g.grade.toString(),
  label: `${g.grade.toFixed(2)} - ${g.descriptor}`,
}));

export function GpaSimulator({
  currentEnrollments,
  availableCourses,
}: GpaSimulatorProps) {
  const [hypotheticalGrades, setHypotheticalGrades] = useState<
    Record<string, number | null>
  >({});

  const currentGpa = useMemo(
    () => calculateGpa(currentEnrollments).gpa,
    [currentEnrollments]
  );

  const projectedGpa = useMemo(() => {
    const hypotheticals = Object.entries(hypotheticalGrades)
      .filter(([, grade]) => grade !== null)
      .map(([code, grade]) => {
        const course = availableCourses.find((c) => c.code === code);
        return { units: course?.units ?? 0, grade: grade! };
      })
      .filter((h) => h.units > 0);

    if (hypotheticals.length === 0) return null;
    return simulateGpa(currentEnrollments, hypotheticals);
  }, [hypotheticalGrades, currentEnrollments, availableCourses]);

  const isImproving =
    projectedGpa !== null && projectedGpa < currentGpa;
  const isWorsening =
    projectedGpa !== null && projectedGpa > currentGpa;

  const activeCount = Object.values(hypotheticalGrades).filter(
    (g) => g !== null
  ).length;

  function handleGradeChange(courseCode: string, value: string | null) {
    setHypotheticalGrades((prev) => ({
      ...prev,
      [courseCode]: value ? parseFloat(value) : null,
    }));
  }

  if (availableCourses.length === 0) {
    return (
      <GlowCard>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">GPA Simulator</h3>
        <p className="text-muted-foreground text-sm mt-2">
          No available courses to simulate.
        </p>
      </GlowCard>
    );
  }

  return (
    <GlowCard>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">GPA Simulator</h3>
        <div className="flex items-center gap-3">
          {projectedGpa !== null && (
            <>
              <div className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 border",
                isImproving && "border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
                isWorsening && "border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]",
                !isImproving && !isWorsening && "border-white/[0.06]",
              )}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Projected</span>
                <span className={cn(
                  "text-lg font-bold font-mono tabular-nums bg-gradient-to-b bg-clip-text text-transparent",
                  isImproving && "from-emerald-400 to-emerald-600",
                  isWorsening && "from-red-400 to-red-600",
                  !isImproving && !isWorsening && "from-white to-white/70",
                )}>
                  <AnimatedNumber value={projectedGpa} decimals={2} />
                </span>
              </div>
              <button
                className="rounded-full bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1 text-xs text-muted-foreground transition-colors cursor-pointer"
                onClick={() => setHypotheticalGrades({})}
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Select hypothetical grades for upcoming courses to see your projected
        GPA. {activeCount > 0 && `(${activeCount} course${activeCount > 1 ? "s" : ""} selected)`}
      </p>

      <div className="space-y-0">
        {availableCourses.map((course, index) => (
          <div
            key={course.code}
            className={cn(
              "flex items-center justify-between gap-4 py-3",
              index < availableCourses.length - 1 && "border-b border-white/[0.04]"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                <span className="font-mono text-xs">{course.code}</span>{" "}
                <span className="text-muted-foreground">
                  ({course.units}u)
                </span>
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {course.title}
              </p>
            </div>
            <Select
              value={hypotheticalGrades[course.code]?.toString() ?? ""}
              onValueChange={(val) =>
                handleGradeChange(course.code, val || null)
              }
            >
              <SelectTrigger className="w-[140px]" size="sm">
                <SelectValue placeholder="Grade..." />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
