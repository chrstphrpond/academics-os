"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth, getCurrentStudentId } from "@/lib/db/auth";
import { solveTarget } from "@/lib/simulator/target-solver";
import { listScholarshipBands } from "@/lib/simulator/scholarships";
import type { TargetSolverOutput } from "@/lib/simulator/target-schema";
import type { EnrollmentWithCourse } from "@/lib/gpa";

export interface RunTargetSolverArgs {
  target: number;
  upcomingCourseCodes: string[];
  termHint?: string;
}

export type RunTargetSolverResult =
  | { ok: true; result: TargetSolverOutput }
  | { ok: false; error: string };

export async function runTargetSolver(
  args: RunTargetSolverArgs
): Promise<RunTargetSolverResult> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return { ok: false, error: "unauthenticated" };

  const enrollments = await withExplicitAuth(clerkUserId, async (tx) => {
    const rows = await tx.query.enrollments.findMany({
      where: eq(schema.enrollments.studentId, studentId),
      with: { course: true },
    });
    return rows.map<EnrollmentWithCourse>((e) => ({
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
  });

  try {
    const result = await solveTarget({
      enrollments,
      target: args.target,
      upcomingCourseCodes: args.upcomingCourseCodes,
      termHint: args.termHint,
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listBands() {
  return listScholarshipBands();
}
