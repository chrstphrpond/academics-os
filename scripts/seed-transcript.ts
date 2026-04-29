import { parse } from "csv-parse/sync";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db/index";

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

  // Look up student by roll number
  const studentRows = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.rollNumber, "2024370558"))
    .limit(1);

  if (!studentRows.length) {
    console.error("Could not find student with rollNumber 2024370558. Run seed:courses first.");
    process.exit(1);
  }

  const student = studentRows[0];
  console.log(`Found student: ${student.id} (${student.name})`);

  // Fetch all courses for lookup
  const allCourses = await db.select().from(schema.courses);

  const courseMap = new Map<string, string>();
  for (const c of allCourses) {
    courseMap.set(c.code, c.id);
  }

  // Parse transcript rows (data starts at row index 7, rows 0-6 are headers)
  const enrollments: Array<{
    studentId: string;
    courseId: string;
    term: string;
    schoolYear: string;
    grade: string | null;
    status: "passed" | "inc" | "drp" | "in_progress" | "failed";
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

    const status = gradeToStatus(grade);
    enrollments.push({
      studentId: student.id,
      courseId,
      term,
      schoolYear: school_year,
      grade: grade || null,
      status: status as "passed" | "inc" | "drp" | "in_progress" | "failed",
    });
  }

  if (unmatchedCourses.length > 0) {
    console.log(`\nUnmatched courses (not in curriculum):`);
    for (const c of unmatchedCourses) {
      console.log(`  - ${c}`);
    }
  }

  // Insert enrollments (idempotent via onConflictDoNothing on unique constraint)
  if (enrollments.length > 0) {
    await db
      .insert(schema.enrollments)
      .values(enrollments)
      .onConflictDoNothing({
        target: [
          schema.enrollments.studentId,
          schema.enrollments.courseId,
          schema.enrollments.term,
          schema.enrollments.schoolYear,
        ],
      });
  }

  console.log(`\nSuccessfully seeded ${enrollments.length} enrollment records`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
