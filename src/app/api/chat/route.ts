import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { convertToModelMessages, streamText, UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const query =
    lastMessage.parts?.find((p) => p.type === "text")?.text || "";

  const fts = sql`to_tsvector('english', ${schema.knowledgeChunks.title} || ' ' || ${schema.knowledgeChunks.content}) @@ plainto_tsquery('english', ${query})`;

  const chunks = await db
    .select({
      title: schema.knowledgeChunks.title,
      content: schema.knowledgeChunks.content,
      url: schema.knowledgeChunks.url,
      source: schema.knowledgeChunks.source,
    })
    .from(schema.knowledgeChunks)
    .where(fts)
    .limit(5);

  const context =
    chunks && chunks.length > 0
      ? chunks
          .map(
            (c) =>
              `### ${c.title}\nSource: ${c.source}${c.url ? ` (${c.url})` : ""}\n\n${c.content}`
          )
          .join("\n\n---\n\n")
      : "No relevant information found in the knowledge base.";

  const result = streamText({
    model: "anthropic/claude-sonnet-4.6",
    system: `You are an academic assistant for MMDC (Mapua Malayan Digital College). Answer questions based ONLY on the provided context from the school's FAQ and student handbook. If the context doesn't contain relevant information, say so clearly. Always cite your sources.\n\nContext from MMDC Knowledge Base:\n${context}`,
    messages: await convertToModelMessages(messages),
    providerOptions: {
      gateway: {
        tags: ["feature:knowledge-chat", "env:production"],
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
