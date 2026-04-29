import { eq, desc, asc } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessageAt: Date | null;
}

export async function listConversations(
  studentId: string,
  clerkUserId: string,
  limit = 20
): Promise<ConversationSummary[]> {
  return withExplicitAuth(clerkUserId, async (tx) => {
    const rows = await tx
      .select({
        id: schema.agentConversations.id,
        title: schema.agentConversations.title,
        lastMessageAt: schema.agentConversations.lastMessageAt,
      })
      .from(schema.agentConversations)
      .where(eq(schema.agentConversations.studentId, studentId))
      .orderBy(desc(schema.agentConversations.lastMessageAt))
      .limit(limit);
    return rows;
  });
}

export async function createConversation(
  studentId: string,
  clerkUserId: string,
  title: string | null = null
): Promise<string> {
  return withExplicitAuth(clerkUserId, async (tx) => {
    const inserted = await tx
      .insert(schema.agentConversations)
      .values({ studentId, title })
      .returning({ id: schema.agentConversations.id });
    return inserted[0].id;
  });
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: unknown;
  createdAt: Date | null;
}

export async function loadMessages(
  conversationId: string,
  clerkUserId: string
): Promise<PersistedMessage[]> {
  return withExplicitAuth(clerkUserId, async (tx) => {
    const rows = await tx
      .select({
        id: schema.agentMessages.id,
        role: schema.agentMessages.role,
        parts: schema.agentMessages.partsJsonb,
        createdAt: schema.agentMessages.createdAt,
      })
      .from(schema.agentMessages)
      .where(eq(schema.agentMessages.conversationId, conversationId))
      .orderBy(asc(schema.agentMessages.createdAt));
    return rows as PersistedMessage[];
  });
}

export async function appendMessage(
  conversationId: string,
  clerkUserId: string,
  role: PersistedMessage["role"],
  parts: unknown
): Promise<void> {
  await withExplicitAuth(clerkUserId, async (tx) => {
    await tx
      .insert(schema.agentMessages)
      .values({ conversationId, role, partsJsonb: parts });
    await tx
      .update(schema.agentConversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.agentConversations.id, conversationId));
  });
}
