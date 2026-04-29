"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Undo2, AlertCircle } from "lucide-react";
import { runTool, undoToolAction } from "@/actions/agent-tool";
import type { ToolStatus } from "@/lib/agent/tools/types";

const STATUS_LABEL: Record<ToolStatus, string> = {
  proposed: "Proposed",
  executing: "Executing",
  executed: "Done",
  undone: "Undone",
  failed: "Failed",
};

export interface ToolCardProps {
  tool: string;
  toolLabel: string;
  status: ToolStatus;
  requiresConfirmation: boolean;
  readOnly: boolean;
  body: React.ReactNode;
  input: unknown;
  actionId?: string;
  undoInput?: unknown;
  onStatusChange?(next: ToolStatus, actionId?: string, undoInput?: unknown): void;
  errorText?: string | null;
}

export function ToolCard({
  tool,
  toolLabel,
  status,
  readOnly,
  body,
  input,
  undoInput,
  onStatusChange,
}: ToolCardProps) {
  const [pending, start] = useTransition();

  const approve = () => {
    onStatusChange?.("executing");
    start(async () => {
      const r = await runTool({ tool, input });
      if (r.ok) {
        onStatusChange?.("executed", r.result.actionId, r.result.diff.undoInput ?? undefined);
      } else {
        onStatusChange?.("failed");
      }
    });
  };

  const undo = () => {
    if (!undoInput) return;
    start(async () => {
      const r = await undoToolAction({ kind: tool, undoInput });
      onStatusChange?.(r.ok ? "undone" : "failed");
    });
  };

  const statusColorClass =
    status === "failed"
      ? "text-red-400"
      : status === "executed"
      ? "text-emerald-400"
      : status === "executing"
      ? "text-amber-400"
      : status === "undone"
      ? "text-muted-foreground"
      : "text-foreground/70";

  return (
    <div className="rounded-md border border-border bg-card text-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{toolLabel}</span>
        <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wide ${statusColorClass}`}>
          {status === "executing" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {status === "executed" && <Check className="h-3 w-3" aria-hidden />}
          {status === "failed" && <AlertCircle className="h-3 w-3" aria-hidden />}
          {STATUS_LABEL[status]}
        </span>
      </header>
      <div className="px-3 py-2">{body}</div>
      <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-3 py-1.5">
        {status === "proposed" && !readOnly && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange?.("undone")}
              disabled={pending}
            >
              <X className="h-3 w-3" aria-hidden /> Cancel
            </Button>
            <Button size="sm" onClick={approve} disabled={pending}>
              <Check className="h-3 w-3" aria-hidden /> Approve
            </Button>
          </>
        )}
        {status === "proposed" && readOnly && (
          <Button size="sm" onClick={approve} disabled={pending}>
            <Check className="h-3 w-3" aria-hidden /> Run
          </Button>
        )}
        {status === "executed" && !readOnly && undoInput != null && (
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={pending}
          >
            <Undo2 className="h-3 w-3" aria-hidden /> Undo
          </Button>
        )}
      </footer>
    </div>
  );
}
