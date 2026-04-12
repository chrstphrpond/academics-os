import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_UNITS_REQUIRED, MAX_UNITS_PER_TERM } from "@/lib/constants";

export function GraduationCountdown({ unitsPassed }: { unitsPassed: number }) {
  const remaining = TOTAL_UNITS_REQUIRED - unitsPassed;
  const estimatedTerms = Math.ceil(remaining / MAX_UNITS_PER_TERM);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Graduation Estimate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums tracking-tight">{estimatedTerms}</span>
          <span className="text-sm text-muted-foreground">terms remaining</span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <span className="tabular-nums">{remaining}</span> units left
          <span className="mx-1.5 text-border/50">&middot;</span>
          ~<span className="tabular-nums">{MAX_UNITS_PER_TERM}</span> units/term
        </p>
      </CardContent>
    </Card>
  );
}
