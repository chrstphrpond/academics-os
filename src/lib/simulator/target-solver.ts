import { generateObject } from "ai";
import { model } from "@/lib/ai/vertex";
import {
  TargetSolverOutputSchema,
  type TargetSolverOutput,
} from "./target-schema";
import type { EnrollmentWithCourse } from "@/lib/gpa";

export interface SolveTargetArgs {
  enrollments: EnrollmentWithCourse[];
  target: number;
  upcomingCourseCodes: string[];
  /** Optional hint, e.g. "Term 3 SY 2025-26". */
  termHint?: string;
}

const SYSTEM_PROMPT = `You are a grade-target solver for an MMDC student.

Given the student's existing enrollments and the courses they're about to take, produce 1–3 plans that, if achieved, would land the cumulative GWA at or below the target. Use the MMDC scale (1.00 = best, 5.00 = fail). Only use grades from {1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00}.

Rank plans by realism — a plan that needs many 1.00s gets lower confidence than one with mixed grades. Cap confidence at 0.95.

Each plan must include "picks" only for courses listed in upcomingCourseCodes. Compute expectedGwa using the picks + existing enrollments. State realistic assumptions (e.g. "INC in MO-IT101 clears at 1.75").

Be honest in the caveat: if the target is unreachable even with all 1.00s, say so plainly.`;

function fmtEnrollment(e: EnrollmentWithCourse): string {
  return `  • [${e.status}] ${e.course.code} (${e.course.units}u, ${e.school_year} ${e.term}) grade ${e.grade ?? "-"}`;
}

function buildPrompt(args: SolveTargetArgs): string {
  return [
    `Target cumulative GWA: ${args.target.toFixed(2)}`,
    args.termHint ? `Upcoming term: ${args.termHint}` : null,
    "",
    "=== Existing enrollments ===",
    args.enrollments.length ? args.enrollments.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Upcoming course codes the student will take ===",
    args.upcomingCourseCodes.length
      ? args.upcomingCourseCodes.map((c) => `  • ${c}`).join("\n")
      : "  (none — explain that no plan can change the GWA)",
    "",
    "Produce the plans now.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function solveTarget(
  args: SolveTargetArgs
): Promise<TargetSolverOutput> {
  const result = await generateObject({
    model: model("pro"),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(args),
    schema: TargetSolverOutputSchema,
  });
  const parsed = TargetSolverOutputSchema.safeParse(result.object);
  if (!parsed.success) {
    throw new Error(`Target solver output invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}
