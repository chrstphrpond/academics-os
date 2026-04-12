import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_UNITS_REQUIRED, MAX_UNITS_PER_TERM } from "@/lib/constants";

export function GraduationCountdown({ unitsPassed }: { unitsPassed: number }) {
  const remaining = TOTAL_UNITS_REQUIRED - unitsPassed;
  const estimatedTerms = Math.ceil(remaining / MAX_UNITS_PER_TERM);
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Graduation Estimate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{estimatedTerms}</span>
          <span className="text-sm text-muted-foreground">terms remaining</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{remaining} units left · ~{MAX_UNITS_PER_TERM} units/term</p>
      </CardContent>
    </Card>
  );
}
