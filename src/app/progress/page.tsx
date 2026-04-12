import { createClient } from "@/lib/supabase/server";
import { CurriculumGrid } from "@/components/progress/curriculum-grid";
import { UnitsSummary } from "@/components/progress/units-summary";
import type { CourseStatus } from "@/lib/types";
import type { CourseWithStatus } from "@/components/progress/types";

export default async function ProgressPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Track your 4-year curriculum progress across all courses
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <CurriculumGrid courses={coursesWithStatus} unlocksMap={unlocksMap} />
        <div className="order-first lg:order-last">
          <div className="lg:sticky lg:top-20">
            <UnitsSummary courses={coursesWithStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
