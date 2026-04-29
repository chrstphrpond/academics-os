"use server";

import { updateTag } from "next/cache";
import { db, schema, getCurrentStudentIdLegacy } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateAlerts } from "@/lib/alerts-engine";

export async function refreshAlerts() {
  const studentId = await getCurrentStudentIdLegacy().catch(() => null);
  if (!studentId) return;

  const enrollmentsWithCourse = await db.query.enrollments.findMany({
    where: eq(schema.enrollments.studentId, studentId),
    with: { course: true },
  });

  const allCourses = await db.select().from(schema.courses);

  const generatedAlerts = generateAlerts({
    enrollments: enrollmentsWithCourse.map((e) => ({
      status: e.status,
      grade: e.grade,
      term: e.term,
      school_year: e.schoolYear,
      course: {
        code: e.course!.code,
        title: e.course!.title,
        units: e.course!.units,
        prerequisites: e.course!.prerequisites ?? [],
      },
    })),
    allCourses: allCourses.map((c) => ({
      code: c.code,
      title: c.title,
      units: c.units,
      prerequisites: c.prerequisites ?? [],
    })),
    currentTerm: "Term 3",
    currentSchoolYear: "SY 2025-26",
  });

  await db
    .delete(schema.alerts)
    .where(
      and(
        eq(schema.alerts.studentId, studentId),
        eq(schema.alerts.dismissed, false)
      )
    );

  if (generatedAlerts.length > 0) {
    await db.insert(schema.alerts).values(
      generatedAlerts.map((a) => ({
        studentId,
        type: a.type,
        title: a.title,
        message: a.message,
        severity: a.severity,
        dueDate: a.due_date,
      }))
    );
  }

  updateTag("alerts");
}

export async function dismissAlert(alertId: string) {
  await db
    .update(schema.alerts)
    .set({ dismissed: true })
    .where(eq(schema.alerts.id, alertId));
  updateTag("alerts");
}
