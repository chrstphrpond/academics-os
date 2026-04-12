import { createClient } from "@/lib/supabase/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const query =
    lastMessage.parts?.find((p) => p.type === "text")?.text || "";

  // Search knowledge base using full-text search
  const supabase = await createClient();
  const { data: chunks } = await supabase
    .from("knowledge_chunks")
    .select("title, content, url, source")
    .textSearch("fts", query.split(" ").join(" & "), { type: "plain" })
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
    model: gateway("anthropic/claude-sonnet-4.6"),
    system: `You are an academic assistant for MMDC (Mapua Malayan Digital College). Answer questions based ONLY on the provided context from the school's FAQ and student handbook. If the context doesn't contain relevant information, say so clearly. Always cite your sources.\n\nContext from MMDC Knowledge Base:\n${context}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
