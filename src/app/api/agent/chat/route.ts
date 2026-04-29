import { auth } from "@clerk/nextjs/server";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { model } from "@/lib/ai/vertex";
import { getCurrentStudentId } from "@/lib/db/auth";
import { aiSdkTools } from "@/lib/agent/tools/registry";
import "@/lib/agent/tools/all";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Atlas, the academic copilot for an MMDC student.

You do not have prior memory of the student's data. The ONLY way to know anything factual about their academic state is to call a tool. Refusing because you "don't have access" is wrong — call the appropriate tool instead.

Tool-use rules:
- Questions about GPA, GWA, scholarship band, or "what if" grade scenarios → call simulateGpa.
- Questions about handbook/policies/FAQ ("how do I…", "what is the policy on…") → call searchKnowledge.
- Questions about graduation eligibility, prereq order, or term planning → call proposePlan.
- Mutations (add a task, dismiss an alert, clear an INC) → propose the corresponding tool. The user approves before it runs.

Format:
- Read-only tools execute automatically; you receive the result inline. After the result, write 1–3 sentences of plain-prose answer that quotes the concrete numbers/values from the tool output. No greetings, no signoffs, no apologies.
- Mutating tools (addTask, dismissAlert, clearInc) emit an approval card; the user clicks Run. Mention you're proposing the action in one short sentence.
- If a tool returns an error or empty result, say so plainly and suggest the next step.

Never claim you cannot see the student's state without first attempting the relevant tool.`;

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

export async function POST(req: Request) {
  const clerkUserId = await resolveClerkUserId();
  if (!clerkUserId) {
    return new Response("unauthorized", { status: 401 });
  }
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return new Response("no student", { status: 403 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: model("flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: aiSdkTools({ studentId, clerkUserId }),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
