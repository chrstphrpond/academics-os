import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Risk } from "@/lib/briefing/schema";

const ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const COLORS = {
  critical: "text-red-400",
  warning: "text-amber-400",
  info: "text-sky-400",
} as const;

export function RiskList({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Risks
      </h3>
      <ul className="space-y-1">
        {risks.map((r, i) => {
          const Icon = ICONS[r.severity];
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${COLORS[r.severity]}`} />
              <span className="font-medium">{r.title}</span>
              {r.dueDate && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  · due {r.dueDate}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
