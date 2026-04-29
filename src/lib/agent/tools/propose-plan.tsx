import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  termHint: z.string().optional(),
  maxUnits: z.number().int().min(3).max(24).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface PlanCandidate {
  label: string;
  courseCodes: string[];
  units: number;
  rationale: string;
}
interface Output {
  candidates: PlanCandidate[];
}

/**
 * Phase 2 ships a stub: returns a single "clear INCs first" candidate
 * synthesized from the student's INC enrollments. Phase 4 (Optimal Next-Term
 * Planner) replaces this with a real prereq-aware constraint solver.
 */
export const proposePlanTool: ToolDefinition<Input, Output> = {
  name: "proposePlan",
  description:
    "Propose 1-3 next-term plan candidates given the student's progress. Read-only. Phase 4 will replace this stub with a real solver.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: true,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const enrollments = await tx.query.enrollments.findMany({
        where: eq(schema.enrollments.studentId, ctx.studentId),
        with: { course: true },
      });
      const incCourses = enrollments
        .filter((e) => e.status === "inc")
        .map((e) => e.course?.code)
        .filter((c): c is string => Boolean(c));
      const candidates: PlanCandidate[] = [
        {
          label: "Light + clear INCs",
          courseCodes: [...incCourses, "MO-IT108"].slice(0, 4),
          units: incCourses.length * 3 + 3,
          rationale:
            "Resolves outstanding INCs first; lighter on new IT cores.",
        },
      ];
      return {
        output: { candidates },
        undoInput: null,
        summary: `Proposed ${candidates.length} plan candidate${
          candidates.length === 1 ? "" : "s"
        }.`,
      };
    });
  },
  async undo() {
    throw new Error("proposePlan is read-only");
  },
  render({ input, output }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-2 text-sm">
        {input.termHint && (
          <div className="text-xs text-muted-foreground">
            Term hint: {input.termHint}
          </div>
        )}
        {output?.candidates.map((c, i) => (
          <div
            key={i}
            className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5"
          >
            <div className="font-medium">{c.label}</div>
            <div className="text-xs font-mono text-muted-foreground">
              {c.courseCodes.join(", ")} ({c.units}u)
            </div>
            <div className="mt-0.5 text-xs text-foreground/80">{c.rationale}</div>
          </div>
        ))}
      </div>
    );
  },
};

registerTool(proposePlanTool);
