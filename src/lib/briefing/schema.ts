import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "warning", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RiskSchema = z.object({
  title: z.string().min(1),
  severity: SeveritySchema,
  dueDate: z.string().date().optional(),
});
export type Risk = z.infer<typeof RiskSchema>;

export const StudyFocusSchema = z.object({
  course: z.string().min(1),
  topic: z.string().min(1),
  why: z.string().min(1),
});
export type StudyFocus = z.infer<typeof StudyFocusSchema>;

export const AgentToolProposalSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  rationale: z.string().min(1),
});
export type AgentToolProposal = z.infer<typeof AgentToolProposalSchema>;

export const BriefingSchema = z.object({
  headline: z.string().min(1).max(200),
  bullets: z.array(z.string().min(1)).min(1).max(6),
  risks: z.array(RiskSchema).max(6),
  studyFocus: z.array(StudyFocusSchema).max(4),
  ctaActions: z.array(AgentToolProposalSchema).max(4),
});
export type Briefing = z.infer<typeof BriefingSchema>;
