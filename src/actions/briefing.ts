"use server";

import { updateTag } from "next/cache";
import { getCurrentStudentId } from "@/lib/db/auth";

export type RevalidateBriefingResult =
  | { ok: true }
  | { ok: false; reason: "no-student" };

/**
 * Invalidate the current user's cached briefing so the next request
 * regenerates it from fresh data. Safe to call from a Client Component.
 */
export async function revalidateBriefing(): Promise<RevalidateBriefingResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { ok: false, reason: "no-student" };
  updateTag(`briefing-${studentId}`);
  return { ok: true };
}
