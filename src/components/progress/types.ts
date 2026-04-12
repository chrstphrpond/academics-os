import type { CourseStatus } from "@/lib/types";

export interface CourseWithStatus {
  code: string;
  title: string;
  units: number;
  type: string;
  year: number;
  term: number;
  status: CourseStatus;
  grade?: string | null;
  prerequisites: string[];
}
