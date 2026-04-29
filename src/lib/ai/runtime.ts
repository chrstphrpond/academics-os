import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentStudentId } from "@/lib/db/auth";
import { model } from "./vertex";
import { MODELS, FEATURES, type ModelKey, type FeatureKey } from "./models";

export interface RunVertexArgs {
  feature: FeatureKey;
  modelKey: ModelKey;
  prompt: string;
  system?: string;
}

export interface RunVertexResult {
  runId: string;
  text: string;
}

export async function runVertex(args: RunVertexArgs): Promise<RunVertexResult> {
  const studentId = await getCurrentStudentId();

  const inserted = await db
    .insert(schema.agentRuns)
    .values({
      studentId: studentId ?? null,
      feature: FEATURES[args.feature],
      model: MODELS[args.modelKey],
    })
    .returning({ id: schema.agentRuns.id });

  const runId = inserted[0].id;

  const startedAt = Date.now();
  const result = await generateText({
    model: model(args.modelKey),
    system: args.system,
    prompt: args.prompt,
  });
  const latencyMs = Date.now() - startedAt;

  const usage = result.usage as
    | { inputTokens?: number; outputTokens?: number }
    | undefined;

  await db
    .update(schema.agentRuns)
    .set({
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      latencyMs,
    })
    .where(eq(schema.agentRuns.id, runId));

  return { runId, text: result.text };
}
