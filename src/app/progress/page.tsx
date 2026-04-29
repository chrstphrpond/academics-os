import { Suspense } from "react";
import { db, schema, getCurrentStudentIdLegacy } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { ProgressContent } from "@/components/progress/progress-content";
import { OptimalPath } from "@/components/progress/optimal-path";
import { PageHeader } from "@/components/ui/animated";
import { ProgressSkeleton } from "@/components/ui/skeleton-cards";
import { calculateOptimalPath } from "@/lib/path-calculator";
import { MAX_UNITS_PER_TERM } from "@/lib/constants";
import type { CourseStatus } from "@/lib/types";
import type { CourseWithStatus } from "@/components/progress/types";

async function ProgressData() {
  const studentId = await getCurrentStudentIdLegacy().catch(() => null);

  // Fetch all courses ordered by year then term
  const allCourses = await db
    .select({
      id: schema.courses.id,
      code: schema.courses.code,
      title: schema.courses.title,
      units: schema.courses.units,
      type: schema.courses.type,
      year: schema.courses.year,
      term: schema.courses.term,
      prerequisites: schema.courses.prerequisites,
    })
    .from(schema.courses)
    .orderBy(asc(schema.courses.year), asc(schema.courses.term));

  // Fetch all enrollments for the student
  const allEnrollments = studentId
    ? await db
        .select({
          course_id: schema.enrollments.courseId,
          status: schema.enrollments.status,
          grade: schema.enrollments.grade,
        })
        .from(schema.enrollments)
        .where(eq(schema.enrollments.studentId, studentId))
    : [];

  // Build enrollment lookup by course_id
  const enrollmentMap = new Map<string, { status: string; grade: string | null }>();
  for (const e of allEnrollments) {
    enrollmentMap.set(e.course_id, { status: e.status, grade: e.grade });
  }

  // Build set of passed course codes
  const passedCodes = new Set<string>();
  for (const c of allCourses) {
    const enrollment = enrollmentMap.get(c.id);
    if (enrollment?.status === "passed") {
      passedCodes.add(c.code);
    }
  }

  // Build "unlocks" map: for each course code, which courses list it as a prerequisite
  const unlocksMap: Record<string, string[]> = {};
  for (const c of allCourses) {
    const prereqs = c.prerequisites ?? [];
    for (const prereq of prereqs) {
      if (!unlocksMap[prereq]) {
        unlocksMap[prereq] = [];
      }
      unlocksMap[prereq].push(c.code);
    }
  }

  // Determine status for each course
  const coursesWithStatus: CourseWithStatus[] = allCourses.map((c) => {
    const enrollment = enrollmentMap.get(c.id);
    let status: CourseStatus;

    if (enrollment) {
      // Use enrollment status directly for known statuses
      const s = enrollment.status as CourseStatus;
      if (["passed", "inc", "drp", "failed", "in_progress"].includes(s)) {
        status = s;
      } else {
        status = "not_taken";
      }
    } else {
      // Not enrolled: check if prerequisites are met
      const prereqs = c.prerequisites ?? [];
      const allPrereqsMet =
        prereqs.length === 0 || prereqs.every((p: string) => passedCodes.has(p));
      status = allPrereqsMet ? "available" : "locked";
    }

    return {
      code: c.code,
      title: c.title,
      units: c.units,
      type: c.type,
      year: c.year,
      term: c.term,
      status,
      grade: enrollment?.grade ?? null,
      prerequisites: c.prerequisites ?? [],
    };
  });

  // Build optimal graduation path
  const coursesForPath = coursesWithStatus.map((c) => ({
    code: c.code,
    title: c.title,
    units: c.units,
    prerequisites: c.prerequisites ?? [],
    status: c.status,
  }));

  const termPlans = calculateOptimalPath(coursesForPath, MAX_UNITS_PER_TERM);

  const totalRemainingUnits = coursesWithStatus
    .filter((c) => c.status !== "passed")
    .reduce((sum, c) => sum + c.units, 0);

  return (
    <>
      <ProgressContent courses={coursesWithStatus} unlocksMap={unlocksMap} />
      <OptimalPath
        termPlans={termPlans}
        totalRemainingUnits={totalRemainingUnits}
      />
    </>
  );
}

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Tracker"
        description="Track your 4-year curriculum progress across all courses"
      />

      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressData />
      </Suspense>
    </div>
  );
}
