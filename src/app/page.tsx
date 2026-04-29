import { Suspense } from "react";
import { isFlagEnabled } from "@/lib/feature-flags";
import { BriefingHero } from "@/components/briefing/briefing-hero";
import { BriefingSkeleton } from "@/components/briefing/briefing-skeleton";
import { schema } from "@/lib/db";
import { withAuth, getCurrentStudentId } from "@/lib/db/auth";
import { eq, desc, and } from "drizzle-orm";
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
  const studentId = await getCurrentStudentId();

  if (!studentId) {
    const gpaResult = calculateGpa([]);
    return (
      <>
        <DashboardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard><GpaCard gpa={gpaResult} /></DashboardCard>
          <DashboardCard><ProgressRing unitsPassed={0} /></DashboardCard>
          <DashboardCard><GraduationCountdown unitsPassed={0} /></DashboardCard>
        </DashboardGrid>
        <DashboardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard><AlertFeed alerts={[]} /></DashboardCard>
          <DashboardCard><CurrentCourses enrollments={[]} /></DashboardCard>
        </DashboardGrid>
      </>
    );
  }

  return withAuth(async (tx) => {
    // Fetch all enrollments with course data using relational query
    const enrollmentRows = await tx.query.enrollments.findMany({
      where: eq(schema.enrollments.studentId, studentId),
      with: { course: true },
      orderBy: [
        desc(schema.enrollments.schoolYear),
        desc(schema.enrollments.term),
      ],
    });

    // Transform enrollments to match the expected shape
    const mappedEnrollments = enrollmentRows.map((e) => ({
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
    const alertRows = await tx
      .select({
        id: schema.alerts.id,
        type: schema.alerts.type,
        title: schema.alerts.title,
        message: schema.alerts.message,
        severity: schema.alerts.severity,
      })
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.studentId, studentId),
          eq(schema.alerts.dismissed, false)
        )
      )
      .orderBy(desc(schema.alerts.createdAt))
      .limit(10);

    const sortedAlerts = alertRows.sort(
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
  });
}

export default async function DashboardPage() {
  const [v2, briefingOn] = await Promise.all([
    isFlagEnabled("dashboard.v2"),
    isFlagEnabled("feature.briefing"),
  ]);

  if (v2) {
    return (
      <div className="space-y-6 p-6">
        {briefingOn ? (
          <Suspense fallback={<BriefingSkeleton />}>
            <BriefingHero />
          </Suspense>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Enable <code>feature.briefing</code> to see the daily briefing.
          </div>
        )}
        <h1 className="text-xl font-semibold tracking-tight">
          Dashboard v2 (foundation only)
        </h1>
        <p className="text-sm text-muted-foreground">
          Atlas and the rest land in subsequent phases.
        </p>
      </div>
    );
  }

  // Existing v1 body — keep verbatim
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
