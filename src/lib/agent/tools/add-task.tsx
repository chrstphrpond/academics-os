import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().date().optional(),
  courseCode: z.string().min(1).max(20).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  taskId: string;
  resolvedCourseId: string | null;
}

export const addTaskTool: ToolDefinition<Input, Output> = {
  name: "addTask",
  description:
    "Add a task to the student's task list. Optional due date (YYYY-MM-DD) and course code (e.g. MO-IT108).",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: false,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      let courseId: string | null = null;
      if (input.courseCode) {
        const found = await tx
          .select({ id: schema.courses.id })
          .from(schema.courses)
          .where(eq(schema.courses.code, input.courseCode))
          .limit(1);
        courseId = found[0]?.id ?? null;
      }
      const inserted = await tx
        .insert(schema.tasks)
        .values({
          studentId: ctx.studentId,
          title: input.title,
          dueDate: input.dueDate ?? null,
          courseId,
          createdByAgent: true,
        })
        .returning({ id: schema.tasks.id });
      const taskId = inserted[0].id;
      return {
        output: { taskId, resolvedCourseId: courseId },
        undoInput: { taskId },
        summary: `Added task: "${input.title}"${
          input.dueDate ? ` (due ${input.dueDate})` : ""
        }`,
      };
    });
  },
  async undo(undoInput, ctx) {
    const { taskId } = undoInput as { taskId: string };
    await withExplicitAuth(ctx.clerkUserId, async (tx) => {
      await tx.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
    });
  },
  render({ status, input, output, errorText }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div className="font-medium">{input.title}</div>
        {input.dueDate && (
          <div className="text-xs text-muted-foreground">Due {input.dueDate}</div>
        )}
        {input.courseCode && (
          <div className="text-xs text-muted-foreground">Course {input.courseCode}</div>
        )}
        {status === "executed" && output && (
          <div className="text-xs text-emerald-400">Task added.</div>
        )}
        {status === "failed" && errorText && (
          <div className="text-xs text-red-400">{errorText}</div>
        )}
      </div>
    );
  },
};

registerTool(addTaskTool);
