import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ProgressContent } from "@/components/progress/progress-content";
import { OptimalPath } from "@/components/progress/optimal-path";
import { PageHeader } from "@/components/ui/animated";
import { ProgressSkeleton } from "@/components/ui/skeleton-cards";
import { calculateOptimalPath } from "@/lib/path-calculator";
import { MAX_UNITS_PER_TERM } from "@/lib/constants";
import type { CourseStatus } from "@/lib/types";
import type { CourseWithStatus } from "@/components/progress/types";

async function ProgressData() {
  const supabase = await createClient();

  // Fetch all courses ordered by year then term
  const { data: courses } = await supabase
    .from("courses")
    .select("id, code, title, units, type, year, term, prerequisites")
    .order("year")
    .order("term");

  // Fetch all enrollments for the student (single-student app)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, status, grade");

  const allCourses = courses ?? [];
  const allEnrollments = enrollments ?? [];

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
