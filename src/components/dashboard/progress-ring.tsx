"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_UNITS_REQUIRED } from "@/lib/constants";

export function ProgressRing({ unitsPassed }: { unitsPassed: number }) {
  const percentage = Math.round((unitsPassed / TOTAL_UNITS_REQUIRED) * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" className="text-primary transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{percentage}%</span>
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold">{unitsPassed}</p>
          <p className="text-xs text-muted-foreground">of {TOTAL_UNITS_REQUIRED} units</p>
        </div>
      </CardContent>
    </Card>
  );
}
