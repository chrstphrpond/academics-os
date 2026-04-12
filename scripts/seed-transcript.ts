import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function gradeToStatus(grade: string): string {
  if (!grade || grade.trim() === "") return "in_progress";
  const g = grade.trim().toUpperCase();
  if (g === "INC") return "inc";
  if (g === "DRP") return "drp";
  if (g === "F" || g === "5.00") return "failed";
  return "passed"; // numeric grades and "P"
}

function parseTerm(termStr: string): { term: string; school_year: string } {
  // Format: "Term 3 SY 2024 - 25"
  const match = termStr.match(/^(Term \d+)\s+SY\s+(\d{4})\s*-\s*(\d{2,4})$/);
  if (match) {
    return {
      term: match[1],
      school_year: `SY ${match[2]}-${match[3]}`,
    };
  }
  return { term: termStr, school_year: "" };
}

async function main() {
  const csvData = fs.readFileSync("data/transcript.csv", "utf-8");
  const rows: string[][] = parse(csvData, {
    relax_column_count: true,
    skip_empty_lines: false,
  });

  // Look up student
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("roll_number", "2024370558")
    .single();

  if (studentError || !student) {
    console.error("Could not find student with roll_number 2024370558:", studentError?.message);
    process.exit(1);
  }

  console.log(`Found student: ${student.id}`);

  // Fetch all courses for lookup
  const { data: allCourses, error: coursesError } = await supabase
    .from("courses")
    .select("id, code");

  if (coursesError) {
    console.error("Error fetching courses:", coursesError.message);
    process.exit(1);
  }

  const courseMap = new Map<string, string>();
  for (const c of allCourses || []) {
    courseMap.set(c.code, c.id);
  }

  // Parse transcript rows (skip header rows 0-6, data starts at row 7 = index 6 in 0-based)
  const enrollments: Array<{
    student_id: string;
    course_id: string;
    term: string;
    school_year: string;
    grade: string | null;
    status: string;
  }> = [];

  const unmatchedCourses: string[] = [];

  for (let i = 7; i < rows.length; i++) {
    const row = rows[i];
    const termRaw = (row[0] || "").trim();
    const courseCode = (row[1] || "").trim();
    const courseTitle = (row[2] || "").trim();
    // row[3] is credits (unused here, comes from courses table)
    const grade = (row[4] || "").trim();

    if (!termRaw || !courseCode) continue;

    const { term, school_year } = parseTerm(termRaw);
    const courseId = courseMap.get(courseCode);

    if (!courseId) {
      unmatchedCourses.push(`${courseCode} - ${courseTitle}`);
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

  if (unmatchedCourses.length > 0) {
    console.log(`\nUnmatched courses (not in curriculum):`);
    for (const c of unmatchedCourses) {
      console.log(`  - ${c}`);
    }
  }

  // Clear existing enrollments for this student
  const { error: deleteError } = await supabase
    .from("enrollments")
    .delete()
    .gte("created_at", "1970-01-01");

  if (deleteError) {
    console.error("Error clearing enrollments:", deleteError.message);
    process.exit(1);
  }

  // Insert enrollments
  if (enrollments.length > 0) {
    const { error } = await supabase.from("enrollments").insert(enrollments);
    if (error) {
      console.error("Error inserting enrollments:", error.message);
      process.exit(1);
    }
  }

  console.log(`\nSuccessfully seeded ${enrollments.length} enrollment records`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
