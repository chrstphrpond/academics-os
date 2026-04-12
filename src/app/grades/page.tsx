import { createClient } from "@/lib/supabase/server";
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

export default async function GradesPage() {
  const supabase = await createClient();

  // Fetch all enrollments with course data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("grade, status, term, school_year, course_id")
    .order("school_year")
    .order("term");

  // Fetch all courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, code, title, units");

  const allEnrollments = enrollments ?? [];
  const allCourses = courses ?? [];

  // Build course lookup
  const courseMap = new Map(
    allCourses.map((c) => [c.id, { code: c.code, title: c.title, units: c.units }])
  );

  // Build EnrollmentWithCourse objects
  const enrollmentsWithCourse: EnrollmentWithCourse[] = allEnrollments
    .map((e) => {
      const course = courseMap.get(e.course_id);
      if (!course) return null;
      return {
        grade: e.grade,
        status: e.status,
        term: e.term,
        school_year: e.school_year,
        course,
      };
    })
    .filter((e): e is EnrollmentWithCourse => e !== null);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grade Analyzer</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your grades, GPA trends, and simulate future outcomes
        </p>
      </div>

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
    </div>
  );
}
