export type CourseStatus =
  | "passed"
  | "inc"
  | "drp"
  | "in_progress"
  | "failed"
  | "available"
  | "locked"
  | "not_taken";

export type AlertType =
  | "inc_deadline"
  | "prerequisite_blocker"
  | "enrollment_window"
  | "graduation_risk"
  | "cascade_warning";

export type AlertSeverity = "critical" | "warning" | "info";

export type GradeDescriptor =
  | "Excellent"
  | "Superior"
  | "Very Good"
  | "Good"
  | "Meritorious"
  | "Very Satisfactory"
  | "Satisfactory"
  | "Fairly Satisfactory"
  | "Passed"
  | "Failed";

export interface GradeInfo {
  grade: number;
  descriptor: GradeDescriptor;
  color: string;
}
