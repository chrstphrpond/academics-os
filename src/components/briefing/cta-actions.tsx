import type { AgentToolProposal } from "@/lib/briefing/schema";

/**
 * Phase 1 renders proposed actions as inert cards.
 * Phase 2 wires Approve/Edit/Cancel through the ToolCard system.
 */
export function CtaActions({ actions }: { actions: AgentToolProposal[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Suggested actions
      </h3>
      <ul className="space-y-2">
        {actions.map((a, i) => (
          <li
            key={i}
            className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{a.tool}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                proposed
              </span>
            </div>
            <p className="mt-1 text-foreground/85">{a.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
