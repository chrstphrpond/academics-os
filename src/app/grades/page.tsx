import { Suspense } from "react";
import { db, schema } from "@/lib/db";
import { withAuth, getCurrentStudentId } from "@/lib/db/auth";
import { eq, asc } from "drizzle-orm";
import { calculateTermGpas, type EnrollmentWithCourse } from "@/lib/gpa";
import { GpaTrendChart } from "@/components/grades/gpa-trend-chart";
import {
  GradeDistribution,
  type GradeDistributionItem,
} from "@/components/grades/grade-distribution";
import {
  CourseTable,
  type CourseGradeRow,
} from "@/components/grades/course-table";
import {
  GpaSimulator,
  type AvailableCourse,
} from "@/components/grades/gpa-simulator";
import { FadeIn } from "@/components/ui/animated";
import { GradesSkeleton } from "@/components/ui/skeleton-cards";
import { TranscriptUpload } from "@/components/grades/transcript-upload";

async function GradesContent() {
  const studentId = await getCurrentStudentId();

  // Fetch all courses — reference table, safe on plain db
  const allCourses = await db
    .select({
      id: schema.courses.id,
      code: schema.courses.code,
      title: schema.courses.title,
      units: schema.courses.units,
    })
    .from(schema.courses);

  // Fetch enrollments through withAuth when we have a student
  const allEnrollments = studentId
    ? await withAuth(async (tx) =>
        tx
          .select({
            grade: schema.enrollments.grade,
            status: schema.enrollments.status,
            term: schema.enrollments.term,
            school_year: schema.enrollments.schoolYear,
            course_id: schema.enrollments.courseId,
          })
          .from(schema.enrollments)
          .where(eq(schema.enrollments.studentId, studentId))
          .orderBy(asc(schema.enrollments.schoolYear), asc(schema.enrollments.term))
      )
    : [];

  // Build course lookup
  const courseMap = new Map(
    allCourses.map((c) => [c.id, { code: c.code, title: c.title, units: c.units }])
  );

  // Build EnrollmentWithCourse objects
  const enrollmentsWithCourse: EnrollmentWithCourse[] = allEnrollments
    .flatMap((e) => {
      const course = courseMap.get(e.course_id);
      if (!course) return [];
      const row: EnrollmentWithCourse = {
        grade: e.grade,
        status: e.status as string,
        term: e.term,
        school_year: e.school_year,
        course,
      };
      return [row];
    });

  // Calculate term GPAs
  const termGpas = calculateTermGpas(enrollmentsWithCourse);

  // Build grade distribution data
  const gradeCountMap = new Map<string, number>();
  for (const e of enrollmentsWithCourse) {
    if (e.grade) {
      const num = parseFloat(e.grade);
      if (!isNaN(num)) {
        const key = num.toFixed(2);
        gradeCountMap.set(key, (gradeCountMap.get(key) ?? 0) + 1);
      }
    }
  }

  // Sort by grade value and build distribution items
  const gradeDistribution: GradeDistributionItem[] = Array.from(
    gradeCountMap.entries()
  )
    .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
    .map(([grade, count]) => ({ grade, count }));

  // Build course table rows
  const courseRows: CourseGradeRow[] = enrollmentsWithCourse.map((e) => ({
    code: e.course.code,
    title: e.course.title,
    term: e.term,
    schoolYear: e.school_year,
    units: e.course.units,
    grade: e.grade,
    status: e.status,
  }));

  // Get enrolled course IDs for filtering available courses
  const enrolledCourseIds = new Set(allEnrollments.map((e) => e.course_id));

  // Available courses = not yet enrolled
  const availableCourses: AvailableCourse[] = allCourses
    .filter((c) => !enrolledCourseIds.has(c.id))
    .map((c) => ({ code: c.code, title: c.title, units: c.units }));

  return (
    <>
      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        <GpaTrendChart termGpas={termGpas} />
        <GradeDistribution data={gradeDistribution} />
      </div>

      {/* Table and simulator row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="text-lg font-semibold mb-3">Course Grades</h2>
          <CourseTable courses={courseRows} />
        </div>
        <GpaSimulator
          currentEnrollments={enrollmentsWithCourse}
          availableCourses={availableCourses}
        />
      </div>
    </>
  );
}

export default function GradesPage() {
  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Grade Analyzer</h1>
            <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Analyze your grades, GPA trends, and simulate future outcomes</p>
          </div>
          <TranscriptUpload />
        </div>
      </FadeIn>

      <Suspense fallback={<GradesSkeleton />}>
        <GradesContent />
      </Suspense>
    </div>
  );
}
