import { dbAuth, getCurrentStudentId } from "@/lib/db/auth";
import { agentActions } from "@/lib/db/schema";

export type AgentActionStatus =
  | "proposed"
  | "approved"
  | "executed"
  | "undone"
  | "failed";

export interface RecordAgentActionInput {
  kind: string;
  input: unknown;
  diff?: unknown;
  undoInput?: unknown;
  status: AgentActionStatus;
  agentRunId?: string;
  errorText?: string;
}

/**
 * Insert a single audit row in agent_actions for the current Clerk user.
 * Returns the new row id. Throws if no student is linked to the current user.
 */
export async function recordAgentAction(
  args: RecordAgentActionInput
): Promise<string> {
  const studentId = await getCurrentStudentId();
  if (!studentId) throw new Error("No linked student for current user");

  const rows = await dbAuth()
    .insert(agentActions)
    .values({
      studentId,
      agentRunId: args.agentRunId ?? null,
      kind: args.kind,
      inputJsonb: args.input as object,
      diffJsonb: (args.diff ?? null) as object | null,
      undoInputJsonb: (args.undoInput ?? null) as object | null,
      status: args.status,
      errorText: args.errorText ?? null,
      executedAt: args.status === "executed" ? new Date() : null,
    })
    .returning({ id: agentActions.id });

  return rows[0].id;
}
