"use server";

import { updateTag } from "next/cache";
import { schema } from "@/lib/db";
import { withAuth, getCurrentStudentId } from "@/lib/db/auth";
import { eq } from "drizzle-orm";

export async function createTask(formData: FormData) {
  const studentId = await getCurrentStudentId();
  if (!studentId) return;

  const courseIdRaw = formData.get("course_id") as string | null;

  await withAuth(async (tx) => {
    await tx.insert(schema.tasks).values({
      studentId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      dueDate: (formData.get("due_date") as string) || null,
      courseId: courseIdRaw || null,
    });
  });

  updateTag("tasks");
}

export async function toggleTask(taskId: string, completed: boolean) {
  await withAuth(async (tx) => {
    await tx
      .update(schema.tasks)
      .set({ completed })
      .where(eq(schema.tasks.id, taskId));
  });
  updateTag("tasks");
}

export async function deleteTask(taskId: string) {
  await withAuth(async (tx) => {
    await tx.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  });
  updateTag("tasks");
}
