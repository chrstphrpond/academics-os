"use client";
import { GlowCard } from "@/components/ui/animated";
import { TOTAL_UNITS_REQUIRED, MAX_UNITS_PER_TERM } from "@/lib/constants";

export function GraduationCountdown({ unitsPassed }: { unitsPassed: number }) {
  const remaining = TOTAL_UNITS_REQUIRED - unitsPassed;
  const estimatedTerms = Math.ceil(remaining / MAX_UNITS_PER_TERM);
  return (
    <GlowCard>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
        Graduation Estimate
      </p>
      <div className="flex items-baseline gap-2">
        <span className="relative text-5xl font-bold tabular-nums tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
          {estimatedTerms}
          {/* Shimmer overlay */}
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]"
            aria-hidden="true"
          />
        </span>
        <span className="text-sm text-muted-foreground">terms remaining</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{remaining}</p>
          <p className="text-xs text-muted-foreground">Units left</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">~{MAX_UNITS_PER_TERM}</p>
          <p className="text-xs text-muted-foreground">Units/term</p>
        </div>
      </div>
    </GlowCard>
  );
}
