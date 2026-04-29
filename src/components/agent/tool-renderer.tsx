"use client";

import { useState } from "react";
import { ToolCard } from "./tool-card";
import type { ToolStatus } from "@/lib/agent/tools/types";

interface Props {
  tool: string;
  input: unknown;
  requiresConfirmation: boolean;
  readOnly: boolean;
  toolLabel: string;
  /** UI render function — typically a small JSX fragment summarizing the tool's args. */
  renderBody: (args: {
    status: ToolStatus;
    input: unknown;
    output: unknown;
    errorText: string | null;
  }) => React.ReactNode;
}

export function ToolRenderer(props: Props) {
  const [status, setStatus] = useState<ToolStatus>("proposed");
  const [actionId, setActionId] = useState<string | undefined>();
  const [undoInput, setUndoInput] = useState<unknown>();
  const [output] = useState<unknown>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  return (
    <ToolCard
      tool={props.tool}
      toolLabel={props.toolLabel}
      status={status}
      requiresConfirmation={props.requiresConfirmation}
      readOnly={props.readOnly}
      input={props.input}
      actionId={actionId}
      undoInput={undoInput}
      errorText={errorText}
      body={props.renderBody({ status, input: props.input, output, errorText })}
      onStatusChange={(next, aId, undo) => {
        setStatus(next);
        if (aId) setActionId(aId);
        if (undo !== undefined) setUndoInput(undo);
        if (next === "failed") setErrorText("Tool execution failed.");
        else if (next === "executed") setErrorText(null);
      }}
    />
  );
}
