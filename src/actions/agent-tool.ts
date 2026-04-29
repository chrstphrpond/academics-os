"use server";

import { auth } from "@clerk/nextjs/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getCurrentStudentId } from "@/lib/db/auth";
import { executeTool, undoTool, type ExecuteResult } from "@/lib/agent/tools/runtime";
// Importing the barrel ensures all tool files are loaded → registered.
import "@/lib/agent/tools/all";

export interface RunToolArgs {
  tool: string;
  input: unknown;
  conversationId?: string;
  agentRunId?: string;
}

async function resolveClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  if (process.env.DISABLE_AUTH !== "1") return null;
  const roll = process.env.DEV_DEFAULT_ROLL_NUMBER ?? "2024370558";
  const rows = await db
    .select({ clerkUserId: schema.students.clerkUserId })
    .from(schema.students)
    .where(sql`roll_number = ${roll}`)
    .limit(1);
  return rows[0]?.clerkUserId ?? `dev-${roll}`;
}

export async function runTool(
  args: RunToolArgs
): Promise<{ ok: true; result: ExecuteResult } | { ok: false; error: string }> {
  const clerkUserId = await resolveClerkUserId();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) {
    return { ok: false, error: "unauthenticated" };
  }
  try {
    const result = await executeTool(args.tool, args.input, {
      studentId,
      clerkUserId,
      conversationId: args.conversationId,
      agentRunId: args.agentRunId,
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function undoToolAction(
  args: { kind: string; undoInput: unknown }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clerkUserId = await resolveClerkUserId();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return { ok: false, error: "unauthenticated" };
  try {
    await undoTool(args, { studentId, clerkUserId });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
