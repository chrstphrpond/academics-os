import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TOTAL_UNITS_REQUIRED } from "@/lib/constants";
import type { CourseWithStatus } from "./types";

interface UnitsSummaryProps {
  courses: CourseWithStatus[];
}

interface CategoryBreakdown {
  label: string;
  passed: number;
  inProgress: number;
  total: number;
}

export function UnitsSummary({ courses }: UnitsSummaryProps) {
  const passedUnits = courses
    .filter((c) => c.status === "passed")
    .reduce((sum, c) => sum + c.units, 0);

  const inProgressUnits = courses
    .filter((c) => c.status === "in_progress")
    .reduce((sum, c) => sum + c.units, 0);

  // Group by course type
  const typeMap = new Map<string, { passed: number; inProgress: number; total: number }>();
  for (const course of courses) {
    const entry = typeMap.get(course.type) ?? { passed: 0, inProgress: 0, total: 0 };
    entry.total += course.units;
    if (course.status === "passed") entry.passed += course.units;
    if (course.status === "in_progress") entry.inProgress += course.units;
    typeMap.set(course.type, entry);
  }

  const typeLabels: Record<string, string> = {
    major: "Major",
    ge: "General Education",
    elective: "Elective",
    pe: "PE / NSTP",
    nstp: "PE / NSTP",
  };

  const categories: CategoryBreakdown[] = [];
  const seen = new Set<string>();
  for (const [type, data] of typeMap) {
    const label = typeLabels[type] ?? type;
    // Merge PE and NSTP
    if (seen.has(label)) {
      const existing = categories.find((c) => c.label === label);
      if (existing) {
        existing.passed += data.passed;
        existing.inProgress += data.inProgress;
        existing.total += data.total;
      }
      continue;
    }
    seen.add(label);
    categories.push({ label, ...data });
  }

  const overallPct = Math.round((passedUnits / TOTAL_UNITS_REQUIRED) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Units Summary</CardTitle>
        <CardDescription>
          {passedUnits} / {TOTAL_UNITS_REQUIRED} units completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Overall Progress</span>
            <span className="tabular-nums text-muted-foreground">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2.5" />
          {inProgressUnits > 0 && (
            <p className="text-[11px] text-muted-foreground">
              +{inProgressUnits} units in progress
            </p>
          )}
        </div>

        {/* Per-category breakdown */}
        <div className="space-y-3 pt-1">
          {categories.map((cat) => {
            const pct = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0;
            return (
              <div key={cat.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{cat.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {cat.passed}/{cat.total}u
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> Passed
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500" /> In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-zinc-500" /> Locked
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-red-500" /> INC/Failed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
