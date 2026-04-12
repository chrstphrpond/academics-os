import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GpaResult } from "@/lib/gpa";

export function GpaCard({ gpa }: { gpa: GpaResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cumulative GPA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums tracking-tight">
            {gpa.gpa.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">{gpa.descriptor}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <span className="tabular-nums">{gpa.totalUnitsGraded}</span> graded
          <span className="mx-1.5 text-border/50">&middot;</span>
          <span className="tabular-nums">{gpa.totalUnitsPassed}</span> passed
        </p>
      </CardContent>
    </Card>
  );
}
