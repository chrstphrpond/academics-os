import { recordAgentAction } from "@/lib/agent-actions";
import { getTool } from "./registry";
import type { ToolContext, ToolDiff } from "./types";

export interface ExecuteResult<TOutput = unknown> {
  actionId: string;
  diff: ToolDiff<TOutput>;
}

export async function executeTool<TOutput = unknown>(
  toolName: string,
  rawInput: unknown,
  ctx: ToolContext
): Promise<ExecuteResult<TOutput>> {
  const def = getTool(toolName);
  if (!def) throw new Error(`Tool not registered: ${toolName}`);

  // Zod schemas have `.parse(...)` — use it to validate.
  type Parseable = { parse(x: unknown): unknown };
  const input = (def.inputSchema as unknown as Parseable).parse(rawInput);

  try {
    const diff = (await def.execute(input, ctx)) as ToolDiff<TOutput>;
    const actionId = await recordAgentAction({
      kind: def.name,
      input,
      diff: diff.output,
      undoInput: diff.undoInput,
      status: "executed",
      agentRunId: ctx.agentRunId,
    });
    return { actionId, diff };
  } catch (e) {
    const errorText = e instanceof Error ? e.message : String(e);
    await recordAgentAction({
      kind: def.name,
      input,
      status: "failed",
      errorText,
      agentRunId: ctx.agentRunId,
    });
    throw e;
  }
}

export async function undoTool(
  args: { kind: string; undoInput: unknown },
  ctx: ToolContext
): Promise<void> {
  const def = getTool(args.kind);
  if (!def) throw new Error(`Tool not registered: ${args.kind}`);
  if (def.readOnly) {
    throw new Error(`Tool ${args.kind} is read-only; nothing to undo`);
  }

  await def.undo(args.undoInput, ctx);
  await recordAgentAction({
    kind: `${def.name}.undo`,
    input: args.undoInput,
    status: "undone",
  });
}
