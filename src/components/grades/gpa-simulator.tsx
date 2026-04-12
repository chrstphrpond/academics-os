"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { simulateGpa, type EnrollmentWithCourse } from "@/lib/gpa";
import { MMDC_GRADE_SCALE } from "@/lib/constants";

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
      <Card>
        <CardHeader>
          <CardTitle>GPA Simulator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No available courses to simulate.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>GPA Simulator</span>
          {projectedGpa !== null && (
            <Badge variant="secondary" className="text-sm font-mono">
              Projected: {projectedGpa.toFixed(2)}
            </Badge>
          )}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Select hypothetical grades for upcoming courses to see your projected
          GPA. {activeCount > 0 && `(${activeCount} course${activeCount > 1 ? "s" : ""} selected)`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {availableCourses.map((course) => (
            <div
              key={course.code}
              className="flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  <span className="font-mono">{course.code}</span>{" "}
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
      </CardContent>
    </Card>
  );
}
