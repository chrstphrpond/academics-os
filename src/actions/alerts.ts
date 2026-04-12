"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateAlerts } from "@/lib/alerts-engine";

export async function refreshAlerts() {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .single();
  if (!student) return;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, course:courses(*)")
    .eq("student_id", student.id);

  const { data: allCourses } = await supabase.from("courses").select("*");

  if (!enrollments || !allCourses) return;

  const generatedAlerts = generateAlerts({
    enrollments: enrollments.map((e) => ({
      ...e,
      course: {
        ...e.course!,
        prerequisites: e.course!.prerequisites ?? [],
      },
    })),
    allCourses: allCourses.map((c) => ({
      ...c,
      prerequisites: c.prerequisites ?? [],
    })),
    currentTerm: "Term 3",
    currentSchoolYear: "SY 2025-26",
  });

  await supabase
    .from("alerts")
    .delete()
    .eq("student_id", student.id)
    .eq("dismissed", false);

  if (generatedAlerts.length > 0) {
    await supabase.from("alerts").insert(
      generatedAlerts.map((a) => ({ ...a, student_id: student.id }))
    );
  }

  updateTag("alerts");
}

export async function dismissAlert(alertId: string) {
  const supabase = await createClient();
  await supabase
    .from("alerts")
    .update({ dismissed: true })
    .eq("id", alertId);
  updateTag("alerts");
}
