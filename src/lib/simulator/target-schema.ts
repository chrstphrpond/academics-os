import { z } from "zod";

export const TargetPlanSchema = z.object({
  label: z.string().min(1).max(60),
  /** Per-course grade picks for the upcoming term(s). */
  picks: z
    .array(
      z.object({
        courseCode: z.string().min(1),
        grade: z
          .string()
          .regex(/^(1\.00|1\.25|1\.50|1\.75|2\.00|2\.25|2\.50|2\.75|3\.00)$/),
      })
    )
    .min(1)
    .max(8),
  /** Resulting cumulative GWA the model expects (model's own arithmetic; UI re-verifies). */
  expectedGwa: z.number().min(1).max(5),
  /** Confidence 0..1 — penalize plans that need many ≤1.50 grades. */
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(500),
});
export type TargetPlan = z.infer<typeof TargetPlanSchema>;

export const TargetSolverOutputSchema = z.object({
  /** Up to 3 ranked candidates, best-confidence first. */
  plans: z.array(TargetPlanSchema).min(1).max(3),
  /** Assumptions the model made (e.g. "MO-IT101 INC clears at 1.75"). */
  assumptions: z.array(z.string().min(1)).max(5),
  /** Caveat text — visible to the user under the plan list. */
  caveat: z.string().min(1).max(300),
});
export type TargetSolverOutput = z.infer<typeof TargetSolverOutputSchema>;
