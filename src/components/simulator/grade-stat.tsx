import { cn } from "@/lib/utils";

export interface GradeStatProps {
  label: string;
  value: string | number;
  hint?: string;
  /** Positive = better (lower GWA); negative = worse. */
  delta?: number;
  className?: string;
}

export function GradeStat({
  label,
  value,
  hint,
  delta,
  className,
}: GradeStatProps) {
  const valueStr = typeof value === "number" ? value.toFixed(2) : value;
  const deltaColor =
    delta == null
      ? ""
      : delta > 0
      ? "text-emerald-400"
      : delta < 0
      ? "text-red-400"
      : "text-muted-foreground";
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card/40 px-3 py-2 text-center",
        className
      )}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums leading-tight">
        {valueStr}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {delta != null && (
        <div className={cn("text-xs tabular-nums", deltaColor)}>
          {delta > 0 ? "▼" : delta < 0 ? "▲" : "·"} {Math.abs(delta).toFixed(2)}
        </div>
      )}
    </div>
  );
}
