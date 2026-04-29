import { and, desc, eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withAuth } from "@/lib/db/auth";
import { getUpcomingEvents, type CalendarEvent } from "@/lib/academic-calendar";

export interface EnrollmentSnapshot {
  grade: string | null;
  status: string;
  term: string;
  schoolYear: string;
  course: { code: string; title: string; units: number } | null;
}

export interface AlertSnapshot {
  id: string;
  title: string;
  severity: string;
  dueDate: string | null;
  message: string;
}

export interface TaskSnapshot {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  course: { code: string; title: string } | null;
}

export interface BriefingData {
  enrollments: EnrollmentSnapshot[];
  activeAlerts: AlertSnapshot[];
  openTasks: TaskSnapshot[];
  upcomingEvents: CalendarEvent[];
  currentTerm: { term: string; schoolYear: string } | null;
}

function pickCurrentTerm(
  enrollments: EnrollmentSnapshot[]
): BriefingData["currentTerm"] {
  const inProgress = enrollments.find((e) => e.status === "in_progress");
  if (inProgress) {
    return { term: inProgress.term, schoolYear: inProgress.schoolYear };
  }
  if (enrollments.length === 0) return null;
  const latest = enrollments[0];
  return { term: latest.term, schoolYear: latest.schoolYear };
}

export async function gatherBriefingData(studentId: string): Promise<BriefingData> {
  const [enrollments, activeAlerts, openTasks] = await withAuth(async (tx) => {
    const e = tx.query.enrollments.findMany({
      where: eq(schema.enrollments.studentId, studentId),
      with: { course: true },
      orderBy: [desc(schema.enrollments.schoolYear), desc(schema.enrollments.term)],
    });
    const a = tx.query.alerts.findMany({
      where: and(
        eq(schema.alerts.studentId, studentId),
        eq(schema.alerts.dismissed, false)
      ),
      orderBy: [desc(schema.alerts.createdAt)],
      limit: 8,
    });
    const t = tx.query.tasks.findMany({
      where: and(
        eq(schema.tasks.studentId, studentId),
        eq(schema.tasks.completed, false)
      ),
      with: { course: true },
      orderBy: [desc(schema.tasks.createdAt)],
      limit: 12,
    });
    return Promise.all([e, a, t]);
  });

  const upcomingEvents = getUpcomingEvents(5);

  return {
    enrollments: enrollments as EnrollmentSnapshot[],
    activeAlerts: activeAlerts as AlertSnapshot[],
    openTasks: openTasks as TaskSnapshot[],
    upcomingEvents,
    currentTerm: pickCurrentTerm(enrollments as EnrollmentSnapshot[]),
  };
}
