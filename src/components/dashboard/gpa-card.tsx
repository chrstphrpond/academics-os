import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GpaResult } from "@/lib/gpa";

export function GpaCard({ gpa }: { gpa: GpaResult }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Cumulative GPA</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{gpa.gpa.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">{gpa.descriptor}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {gpa.totalUnitsGraded} units graded · {gpa.totalUnitsPassed} units passed
        </p>
      </CardContent>
    </Card>
  );
}
