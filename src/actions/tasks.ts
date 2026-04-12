"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .single();
  if (!student) return;

  await supabase.from("tasks").insert({
    student_id: student.id,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
    course_id: (formData.get("course_id") as string) || null,
  });

  updateTag("tasks");
}

export async function toggleTask(taskId: string, completed: boolean) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ completed }).eq("id", taskId);
  updateTag("tasks");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  updateTag("tasks");
}
