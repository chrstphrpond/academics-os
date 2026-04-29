"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runTargetSolver } from "@/actions/simulator";
import type {
  TargetSolverOutput,
  TargetPlan,
} from "@/lib/simulator/target-schema";

export interface TargetsViewProps {
  upcomingCourseCodes: string[];
  termHint?: string;
  onApplyPlan(plan: TargetPlan): void;
}

export function TargetsView({
  upcomingCourseCodes,
  termHint,
  onApplyPlan,
}: TargetsViewProps) {
  const [target, setTarget] = useState("1.50");
  const [pending, start] = useTransition();
  const [output, setOutput] = useState<TargetSolverOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const num = parseFloat(target);
      if (isNaN(num) || num < 1 || num > 5) {
        setError("Target must be between 1.00 and 5.00.");
        return;
      }
      const r = await runTargetSolver({
        target: num,
        upcomingCourseCodes,
        termHint,
      });
      if (r.ok) setOutput(r.result);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Target cumulative GWA
          </label>
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="1.50"
            className="text-sm"
          />
        </div>
        <Button type="submit" disabled={pending} className="gap-1.5 text-xs">
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          Solve
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {output && (
        <div className="space-y-3">
          {output.plans.map((p, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-card/60 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.label}</div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  exp {p.expectedGwa.toFixed(2)} · conf{" "}
                  {(p.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs">
                {p.picks.map((pk, j) => (
                  <li key={j} className="flex justify-between">
                    <span className="font-mono text-muted-foreground">
                      {pk.courseCode}
                    </span>
                    <span className="font-mono">{pk.grade}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-foreground/85">{p.rationale}</p>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyPlan(p)}
                  className="text-xs"
                >
                  Apply to What-If
                </Button>
              </div>
            </div>
          ))}

          {output.assumptions.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Assumptions: </span>
              {output.assumptions.join(" · ")}
            </div>
          )}
          <p className="text-xs italic text-muted-foreground">{output.caveat}</p>
        </div>
      )}
    </div>
  );
}
