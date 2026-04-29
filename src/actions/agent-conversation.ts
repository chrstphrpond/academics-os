"use server";

import { auth } from "@clerk/nextjs/server";
import { getCurrentStudentId } from "@/lib/db/auth";
import {
  createConversation,
  listConversations,
  type ConversationSummary,
} from "@/lib/agent/conversations";

export async function startConversation(
  title: string | null = null
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return { ok: false, error: "unauthenticated" };
  const id = await createConversation(studentId, clerkUserId, title);
  return { ok: true, id };
}

export async function recentConversations(): Promise<ConversationSummary[]> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return [];
  return listConversations(studentId, clerkUserId);
}
