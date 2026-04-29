import { z } from "zod";
import type { ReactNode } from "react";

export type ToolStatus = "proposed" | "executing" | "executed" | "undone" | "failed";

export interface ToolContext {
  studentId: string;
  clerkUserId: string;
  agentRunId?: string;
  conversationId?: string;
}

export interface ToolDiff<TOutput = unknown> {
  output: TOutput;
  /**
   * Inverse-input: the args needed to undo this execution.
   * Set to `null` for read-only tools.
   */
  undoInput: unknown | null;
  /** Human-readable summary of what happened, for the executed-state card. */
  summary: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Stable identifier; matches the LLM tool name and the dispatch in render. */
  name: string;
  /** One-line description shown to the model. */
  description: string;
  /** Zod schema for input validation. Also used to derive AI SDK tool schema. */
  inputSchema: z.ZodType<TInput>;
  /** When true, the UI requires an explicit Approve click before `execute`. */
  requiresConfirmation: boolean;
  /** True for tools that don't mutate state; UI hides Undo. */
  readOnly: boolean;
  /** Server-side execution. */
  execute: (input: TInput, ctx: ToolContext) => Promise<ToolDiff<TOutput>>;
  /** Server-side undo. Throws if the tool is read-only. */
  undo: (undoInput: unknown, ctx: ToolContext) => Promise<void>;
  /** Renders the body of the ToolCard in any state. */
  render: (props: ToolRenderProps<TInput, TOutput>) => ReactNode;
}

export interface ToolRenderProps<TInput = unknown, TOutput = unknown> {
  status: ToolStatus;
  input: TInput;
  output: TOutput | null;
  errorText: string | null;
}
