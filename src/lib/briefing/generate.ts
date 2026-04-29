import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { model } from "@/lib/ai/vertex";
import { MODELS, FEATURES } from "@/lib/ai/models";
import { gatherBriefingData } from "./data";
import { buildBriefingPrompt, BRIEFING_SYSTEM_PROMPT } from "./prompt";
import { BriefingSchema, type Briefing } from "./schema";

export async function generateBriefing(
  studentId: string,
  clerkUserId: string
): Promise<Briefing> {
  const [data, runId] = await Promise.all([
    gatherBriefingData(studentId, clerkUserId),
    withExplicitAuth(clerkUserId, async (tx) => {
      const inserted = await tx
        .insert(schema.agentRuns)
        .values({
          studentId,
          feature: FEATURES.briefing,
          model: MODELS.pro,
        })
        .returning({ id: schema.agentRuns.id });
      return inserted[0].id as string;
    }),
  ]);

  const startedAt = Date.now();
  const result = await generateObject({
    model: model("pro"),
    system: BRIEFING_SYSTEM_PROMPT,
    prompt: buildBriefingPrompt(data, new Date()),
    schema: BriefingSchema,
  });
  const latencyMs = Date.now() - startedAt;

  const usage = result.usage as
    | { inputTokens?: number; outputTokens?: number }
    | undefined;

  await withExplicitAuth(clerkUserId, async (tx) => {
    await tx
      .update(schema.agentRuns)
      .set({
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        latencyMs,
      })
      .where(eq(schema.agentRuns.id, runId));
  });

  const parsed = BriefingSchema.safeParse(result.object);
  if (!parsed.success) {
    throw new Error(`Briefing failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
