"use client";

import type { AgentToolProposal } from "@/lib/briefing/schema";
import { ToolRenderer } from "@/components/agent/tool-renderer";

const READONLY_TOOLS = new Set([
  "searchKnowledge",
  "simulateGpa",
  "proposePlan",
]);

/**
 * Phase 1 rendered these as inert cards.
 * Phase 2 wires them through ToolRenderer so each Approve actually runs the
 * registered server-side tool, with full audit + undo.
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
          <li key={i}>
            <ToolRenderer
              tool={a.tool}
              toolLabel={a.tool}
              input={a.args}
              requiresConfirmation
              readOnly={READONLY_TOOLS.has(a.tool)}
              renderBody={() => (
                <p className="text-foreground/85">{a.rationale}</p>
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
