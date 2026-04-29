import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { calculateGpa } from "@/lib/gpa";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  overrides: z
    .array(
      z.object({
        courseCode: z.string().min(1),
        grade: z.string().min(1),
      })
    )
    .max(20),
  target: z.number().min(1).max(5).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  baselineGpa: number;
  simulatedGpa: number;
  unitsPassed: number;
  notes: string[];
}

export const simulateGpaTool: ToolDefinition<Input, Output> = {
  name: "simulateGpa",
  description:
    "Simulate a what-if cumulative GWA by overriding grades for specific courses. Read-only. Optional `target` returns the gap.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: true,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const enrollments = await tx.query.enrollments.findMany({
        where: eq(schema.enrollments.studentId, ctx.studentId),
        with: { course: true },
      });
      const mapped = enrollments.map((e) => ({
        grade: e.grade,
        status: e.status,
        term: e.term,
        school_year: e.schoolYear,
        course: {
          code: e.course?.code ?? "",
          title: e.course?.title ?? "",
          units: e.course?.units ?? 0,
        },
      }));
      const baseline = calculateGpa(mapped);
      const overrideMap = new Map(
        input.overrides.map((o) => [o.courseCode, o.grade])
      );
      const simulated = calculateGpa(
        mapped.map((m) => ({
          ...m,
          grade: overrideMap.get(m.course.code) ?? m.grade,
          status: overrideMap.has(m.course.code) ? "passed" : m.status,
        }))
      );
      const notes: string[] = [];
      if (input.target != null) {
        const gap = simulated.gpa - input.target;
        notes.push(
          gap >= 0
            ? `Target ${input.target.toFixed(2)} met (margin ${gap.toFixed(2)}).`
            : `Target ${input.target.toFixed(2)} short by ${Math.abs(gap).toFixed(2)}.`
        );
      }
      return {
        output: {
          baselineGpa: baseline.gpa,
          simulatedGpa: simulated.gpa,
          unitsPassed: simulated.totalUnitsPassed,
          notes,
        },
        undoInput: null,
        summary: `Simulated GWA: ${simulated.gpa.toFixed(
          2
        )} (baseline ${baseline.gpa.toFixed(2)})`,
      };
    });
  },
  async undo() {
    throw new Error("simulateGpa is read-only");
  },
  render({ input, output }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div className="text-xs text-muted-foreground">
          {input.overrides.length} grade override
          {input.overrides.length === 1 ? "" : "s"}
          {input.target != null && ` · target ${input.target.toFixed(2)}`}
        </div>
        {output && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
            <div>
              <div className="text-muted-foreground">Baseline</div>
              <div className="text-base font-medium">
                {output.baselineGpa.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Simulated</div>
              <div className="text-base font-medium">
                {output.simulatedGpa.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Units</div>
              <div className="text-base font-medium">{output.unitsPassed}</div>
            </div>
            {output.notes.map((n, i) => (
              <div
                key={i}
                className="col-span-3 text-xs text-foreground/80"
              >
                {n}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
};

registerTool(simulateGpaTool);
