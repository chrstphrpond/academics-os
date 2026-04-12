"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_UNITS_REQUIRED } from "@/lib/constants";

export function ProgressRing({ unitsPassed }: { unitsPassed: number }) {
  const percentage = Math.round((unitsPassed / TOTAL_UNITS_REQUIRED) * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <div className="relative h-20 w-20">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              strokeLinecap="round" className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold tabular-nums">{percentage}%</span>
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums tracking-tight">{unitsPassed}</p>
          <p className="text-xs text-muted-foreground">of {TOTAL_UNITS_REQUIRED} units</p>
        </div>
      </CardContent>
    </Card>
  );
}
