import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withAuth, getCurrentStudentId } from "@/lib/db/auth";
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

  // Insert agent_runs row. When studentId is non-null we must go through withAuth so
  // the RLS WITH CHECK policy (which rejects rows where student_id != current_student_id())
  // sees the correct session variable. Anonymous test pings use the plain HTTP db.
  let runId: string;
  if (studentId) {
    runId = await withAuth(async (tx) => {
      const inserted = await tx
        .insert(schema.agentRuns)
        .values({
          studentId,
          feature: FEATURES[args.feature],
          model: MODELS[args.modelKey],
        })
        .returning({ id: schema.agentRuns.id });
      return inserted[0].id;
    });
  } else {
    const inserted = await db
      .insert(schema.agentRuns)
      .values({
        studentId: null,
        feature: FEATURES[args.feature],
        model: MODELS[args.modelKey],
      })
      .returning({ id: schema.agentRuns.id });
    runId = inserted[0].id;
  }

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

  const updatePayload = {
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    latencyMs,
  };

  if (studentId) {
    await withAuth(async (tx) => {
      await tx
        .update(schema.agentRuns)
        .set(updatePayload)
        .where(eq(schema.agentRuns.id, runId));
    });
  } else {
    await db
      .update(schema.agentRuns)
      .set(updatePayload)
      .where(eq(schema.agentRuns.id, runId));
  }

  return { runId, text: result.text };
}
