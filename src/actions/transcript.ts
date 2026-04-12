"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function gradeToStatus(grade: string): string {
  if (!grade || grade.trim() === "") return "in_progress";
  const g = grade.trim().toUpperCase();
  if (g === "INC") return "inc";
  if (g === "DRP") return "drp";
  if (g === "F" || g === "5.00") return "failed";
  return "passed";
}

function parseTerm(termStr: string): { term: string; school_year: string } {
  const match = termStr.match(/^(Term \d+)\s+SY\s+(\d{4})\s*-\s*(\d{2,4})$/);
  if (match) {
    return {
      term: match[1],
      school_year: `SY ${match[2]}-${match[3]}`,
    };
  }
  return { term: termStr, school_year: "" };
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export async function uploadTranscript(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { success: false as const, error: "No file provided" };

  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim());

  // Find the header row (contains "Term,Course Code,Course Title,Credits,Grade")
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().startsWith("term,course code")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return { success: false as const, error: "Could not find header row in CSV. Expected 'Term,Course Code,Course Title,Credits,Grade'" };
  }

  const supabase = await createClient();

  // Lookup student (single student app)
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .single();

  if (studentError || !student) {
    return { success: false as const, error: "Could not find student record" };
  }

  // Fetch all courses for lookup
  const { data: allCourses, error: coursesError } = await supabase
    .from("courses")
    .select("id, code");

  if (coursesError || !allCourses) {
    return { success: false as const, error: "Could not fetch courses" };
  }

  const courseMap = new Map<string, string>();
  for (const c of allCourses) {
    courseMap.set(c.code, c.id);
  }

  // Parse data rows after header
  const enrollments: Array<{
    student_id: string;
    course_id: string;
    term: string;
    school_year: string;
    grade: string | null;
    status: string;
  }> = [];

  const unmatchedCourses: string[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const fields = parseCsvLine(line);
    const termRaw = (fields[0] || "").trim();
    const courseCode = (fields[1] || "").trim();
    const grade = (fields[4] || "").trim();

    if (!termRaw || !courseCode) continue;

    const { term, school_year } = parseTerm(termRaw);
    const courseId = courseMap.get(courseCode);

    if (!courseId) {
      unmatchedCourses.push(courseCode);
      continue;
    }

    enrollments.push({
      student_id: student.id,
      course_id: courseId,
      term,
      school_year,
      grade: grade || null,
      status: gradeToStatus(grade),
    });
  }

  if (enrollments.length === 0) {
    return {
      success: false as const,
      error: unmatchedCourses.length > 0
        ? `No matching courses found. Unmatched: ${unmatchedCourses.join(", ")}`
        : "No valid enrollment rows found in the file",
    };
  }

  // Delete existing enrollments for the student
  const { error: deleteError } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", student.id);

  if (deleteError) {
    return { success: false as const, error: `Failed to clear existing enrollments: ${deleteError.message}` };
  }

  // Insert new enrollments
  const { error: insertError } = await supabase
    .from("enrollments")
    .insert(enrollments);

  if (insertError) {
    return { success: false as const, error: `Failed to insert enrollments: ${insertError.message}` };
  }

  updateTag("enrollments");

  return {
    success: true as const,
    count: enrollments.length,
    unmatched: unmatchedCourses,
  };
}
