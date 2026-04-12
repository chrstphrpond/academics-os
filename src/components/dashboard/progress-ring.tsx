"use client";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/ui/animated";
import { TOTAL_UNITS_REQUIRED } from "@/lib/constants";

export function ProgressRing({ unitsPassed }: { unitsPassed: number }) {
  const percentage = Math.round((unitsPassed / TOTAL_UNITS_REQUIRED) * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Calculate the position of the arc endpoint for the pulsing dot
  const angle = (percentage / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = 50 + 45 * Math.cos(angle);
  const dotY = 50 + 45 * Math.sin(angle);

  return (
    <GlowCard>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
        Progress
      </p>
      <div className="flex items-center gap-5">
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
              style={{ filter: "drop-shadow(0 0 6px oklch(0.541 0.24 264.376 / 0.5))" }}
            />
            {/* Pulsing dot at arc end */}
            <motion.circle
              cx={dotX}
              cy={dotY}
              r="4"
              fill="currentColor"
              className="text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.6, 1, 0.6], r: [3, 4.5, 3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.3 }}
              style={{ filter: "drop-shadow(0 0 4px oklch(0.541 0.24 264.376 / 0.6))" }}
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
      </div>
    </GlowCard>
  );
}
