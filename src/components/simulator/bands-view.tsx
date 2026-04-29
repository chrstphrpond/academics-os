"use client";

import {
  bandStatusFor,
  type ScholarshipBand,
} from "@/lib/simulator/scholarship-status";

export interface BandsViewProps {
  baselineGpa: number;
  simulatedGpa: number;
  bands: ScholarshipBand[];
}

export function BandsView({
  baselineGpa,
  simulatedGpa,
  bands,
}: BandsViewProps) {
  const baselineStatus = bandStatusFor(baselineGpa, bands);
  const simulatedStatus = bandStatusFor(simulatedGpa, bands);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">Band</div>
        <div className="text-right text-muted-foreground">Baseline</div>
        <div className="text-right text-muted-foreground">Simulated</div>
        {bands.map((b, i) => {
          const baseline = baselineStatus[i];
          const sim = simulatedStatus[i];
          return (
            <div key={b.id} className="contents">
              <div className="rounded-md border border-border/60 bg-card/40 px-2 py-1.5">
                <div className="text-sm font-medium">{b.name}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {b.minGpa}–{b.maxGpa}
                </div>
                {b.note && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {b.note}
                  </div>
                )}
              </div>
              <div className="self-center text-right tabular-nums">
                {baseline.inBand ? (
                  <span className="text-emerald-400">in</span>
                ) : baseline.gapToFloor < 0 ? (
                  <span className="text-muted-foreground">
                    +{Math.abs(baseline.gapToFloor).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-amber-400">
                    −{baseline.gapToFloor.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="self-center text-right tabular-nums">
                {sim.inBand ? (
                  <span className="text-emerald-400">in</span>
                ) : sim.gapToFloor < 0 ? (
                  <span className="text-muted-foreground">
                    +{Math.abs(sim.gapToFloor).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-amber-400">
                    −{sim.gapToFloor.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Bands sourced from the MMDC handbook. &quot;−&quot; shows the gap below the
        floor; &quot;+&quot; shows the margin above the ceiling.
      </p>
    </div>
  );
}
