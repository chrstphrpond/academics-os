"use server";

import { updateTag } from "next/cache";
import { db, schema, getCurrentStudentIdLegacy } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function createTask(formData: FormData) {
  const studentId = await getCurrentStudentIdLegacy().catch(() => null);
  if (!studentId) return;

  const courseIdRaw = formData.get("course_id") as string | null;

  await db.insert(schema.tasks).values({
    studentId,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    dueDate: (formData.get("due_date") as string) || null,
    courseId: courseIdRaw || null,
  });

  updateTag("tasks");
}

export async function toggleTask(taskId: string, completed: boolean) {
  await db
    .update(schema.tasks)
    .set({ completed })
    .where(eq(schema.tasks.id, taskId));
  updateTag("tasks");
}

export async function deleteTask(taskId: string) {
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  updateTag("tasks");
}
