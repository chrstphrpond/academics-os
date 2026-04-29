import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import type { EnrollmentStatus } from "@/lib/db/schema";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  enrollmentId: z.string().uuid(),
  newGrade: z
    .string()
    .regex(/^(1\.00|1\.25|1\.50|1\.75|2\.00|2\.25|2\.50|2\.75|3\.00|5\.00|P|F|INC|DRP)$/),
  evidenceTaskId: z.string().uuid().optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  enrollmentId: string;
  prevGrade: string | null;
  prevStatus: string;
}

function gradeToStatus(grade: string): EnrollmentStatus {
  const u = grade.toUpperCase();
  if (u === "INC") return "inc";
  if (u === "DRP") return "drp";
  if (u === "5.00" || u === "F") return "failed";
  return "passed";
}

export const clearIncTool: ToolDefinition<Input, Output> = {
  name: "clearInc",
  description:
    "Clear an INC enrollment by setting a final grade. Requires explicit user approval. Logs an audit row.",
  inputSchema: InputSchema,
  requiresConfirmation: true,
  readOnly: false,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const prev = await tx
        .select({
          grade: schema.enrollments.grade,
          status: schema.enrollments.status,
        })
        .from(schema.enrollments)
        .where(eq(schema.enrollments.id, input.enrollmentId))
        .limit(1);
      const prevGrade = prev[0]?.grade ?? null;
      const prevStatus = prev[0]?.status ?? "in_progress";
      await tx
        .update(schema.enrollments)
        .set({
          grade: input.newGrade,
          status: gradeToStatus(input.newGrade),
        })
        .where(eq(schema.enrollments.id, input.enrollmentId));
      return {
        output: { enrollmentId: input.enrollmentId, prevGrade, prevStatus },
        undoInput: {
          enrollmentId: input.enrollmentId,
          prevGrade,
          prevStatus,
        },
        summary: `Set grade to ${input.newGrade} for enrollment ${input.enrollmentId.slice(
          0,
          8
        )}…`,
      };
    });
  },
  async undo(undoInput, ctx) {
    const { enrollmentId, prevGrade, prevStatus } = undoInput as {
      enrollmentId: string;
      prevGrade: string | null;
      prevStatus: EnrollmentStatus;
    };
    await withExplicitAuth(ctx.clerkUserId, async (tx) => {
      await tx
        .update(schema.enrollments)
        .set({ grade: prevGrade, status: prevStatus })
        .where(eq(schema.enrollments.id, enrollmentId));
    });
  },
  render({ input }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div>
          Set enrollment{" "}
          <span className="font-mono text-xs">
            {input.enrollmentId.slice(0, 8)}…
          </span>{" "}
          to grade <span className="font-mono font-medium">{input.newGrade}</span>
        </div>
        {input.evidenceTaskId && (
          <div className="text-xs text-muted-foreground">
            Evidence task {input.evidenceTaskId.slice(0, 8)}…
          </div>
        )}
        <div className="text-xs text-amber-300">Requires approval</div>
      </div>
    );
  },
};

registerTool(clearIncTool);
