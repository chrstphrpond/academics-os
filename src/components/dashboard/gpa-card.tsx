import { GlowCard } from "@/components/ui/animated";
import type { GpaResult } from "@/lib/gpa";

export function GpaCard({ gpa }: { gpa: GpaResult }) {
  return (
    <GlowCard>
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-indigo-500" />
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cumulative GPA
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
          {gpa.gpa.toFixed(2)}
        </span>
        <span className="text-sm text-muted-foreground">{gpa.descriptor}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{gpa.totalUnitsGraded}</p>
          <p className="text-xs text-muted-foreground">Graded</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{gpa.totalUnitsPassed}</p>
          <p className="text-xs text-muted-foreground">Passed</p>
        </div>
      </div>
    </GlowCard>
  );
}
