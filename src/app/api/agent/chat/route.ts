import { auth } from "@clerk/nextjs/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { model } from "@/lib/ai/vertex";
import { aiSdkTools } from "@/lib/agent/tools/registry";
import "@/lib/agent/tools/all";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the academic sidekick for an MMDC student. You can:
- Answer questions about their academic state grounded in tool results.
- Propose actions via tool calls. The user reviews and approves each one before it takes effect.
Tone: direct, calm, no greetings or signoffs. When you call a tool, write a one-sentence rationale before the tool call.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: model("flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: aiSdkTools(),
  });

  return result.toUIMessageStreamResponse();
}
