import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { calculateGpa } from "@/lib/gpa";
import { GpaCard } from "@/components/dashboard/gpa-card";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { GraduationCountdown } from "@/components/dashboard/graduation-countdown";
import { AlertFeed } from "@/components/dashboard/alert-feed";
import { CurrentCourses } from "@/components/dashboard/current-courses";
import {
  DashboardHeader,
  DashboardGrid,
  DashboardCard,
} from "@/components/dashboard/dashboard-layout";
import { DashboardSkeleton } from "@/components/ui/skeleton-cards";

async function DashboardContent() {
  const supabase = await createClient();

  // Fetch all enrollments with course data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("grade, status, term, school_year, course_id, courses(code, title, units)")
    .order("school_year", { ascending: false })
    .order("term", { ascending: false });

  // Transform enrollments to match the expected shape
  const mappedEnrollments = (enrollments ?? []).map((e) => {
    const course = e.courses as unknown as { code: string; title: string; units: number };
    return {
      grade: e.grade,
      status: e.status,
      term: e.term,
      school_year: e.school_year,
      course: {
        code: course?.code ?? "",
        title: course?.title ?? "",
        units: course?.units ?? 0,
      },
    };
  });

  // Calculate GPA
  const gpaResult = calculateGpa(mappedEnrollments);

  // Get current term enrollments (most recent term with in_progress status, or just the latest term)
  const currentTermEnrollments = mappedEnrollments.filter(
    (e) => e.status === "in_progress"
  );
  const currentTerm =
    currentTermEnrollments.length > 0
      ? currentTermEnrollments
      : mappedEnrollments.slice(0, 6);

  // Fetch active alerts (non-dismissed, sorted by severity)
  const severityOrder = ["critical", "warning", "info"];
  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, type, title, message, severity")
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const sortedAlerts = (alerts ?? []).sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <>
      <DashboardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard><GpaCard gpa={gpaResult} /></DashboardCard>
        <DashboardCard><ProgressRing unitsPassed={gpaResult.totalUnitsPassed} /></DashboardCard>
        <DashboardCard><GraduationCountdown unitsPassed={gpaResult.totalUnitsPassed} /></DashboardCard>
      </DashboardGrid>

      <DashboardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard><AlertFeed alerts={sortedAlerts} /></DashboardCard>
        <DashboardCard><CurrentCourses enrollments={currentTerm} /></DashboardCard>
      </DashboardGrid>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
