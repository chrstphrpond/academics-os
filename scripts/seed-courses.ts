import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const YEAR_MAP: Record<string, number> = {
  "FIRST YEAR": 1,
  "SECOND YEAR": 2,
  "THIRD YEAR": 3,
  "FOURTH YEAR": 4,
};

function parseTermNumber(header: string): number {
  if (header.includes("1st Term")) return 1;
  if (header.includes("2nd Term")) return 2;
  if (header.includes("3rd Term")) return 3;
  return 0;
}

function parseUnits(raw: string): number {
  if (!raw) return 0;
  // Handle "(3)" or "3" formats
  const cleaned = raw.replace(/[()]/g, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseArrayField(raw: string): string[] {
  if (!raw || raw === "None") return [];
  // Split by newlines (multi-line corequisites) and commas
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== "None");
}

async function main() {
  const csvData = fs.readFileSync("data/curriculum.csv", "utf-8");
  const rows: string[][] = parse(csvData, {
    relax_column_count: true,
    skip_empty_lines: false,
  });

  let currentYear = 0;
  let currentTerm = 0;

  const courses: Array<{
    code: string;
    title: string;
    type: string;
    units: number;
    year: number;
    term: number;
    prerequisites: string[];
    corequisites: string[];
  }> = [];

  for (const row of rows) {
    const colC = (row[2] || "").trim();
    const colD = (row[3] || "").trim();
    const colE = (row[4] || "").trim();
    const colF = (row[5] || "").trim();
    const colG = (row[6] || "").trim();
    const colH = (row[7] || "").trim();

    // Check for year headers
    const upperC = colC.toUpperCase();
    if (YEAR_MAP[upperC]) {
      currentYear = YEAR_MAP[upperC];
      continue;
    }

    // Check for term headers (e.g., "First Year 1st Term")
    if (colC.includes("Term") && !colC.startsWith("MO-")) {
      const termNum = parseTermNumber(colC);
      if (termNum > 0) {
        currentTerm = termNum;
        // Also extract year from "First Year 1st Term" etc.
        if (colC.includes("First Year")) currentYear = 1;
        else if (colC.includes("Second Year")) currentYear = 2;
        else if (colC.includes("Third Year")) currentYear = 3;
        else if (colC.includes("Fourth Year")) currentYear = 4;
      }
      continue;
    }

    // Skip header rows, TOTAL rows, empty rows
    if (colC === "Course Code" || colC === "TOTAL" || colC.startsWith("TOTAL")) continue;

    // Course rows start with "MO-"
    if (colC.startsWith("MO-")) {
      courses.push({
        code: colC,
        title: colD,
        type: colE || "Lec",
        units: parseUnits(colH),
        year: currentYear,
        term: currentTerm,
        prerequisites: parseArrayField(colF),
        corequisites: parseArrayField(colG),
      });
    }
  }

  console.log(`Parsed ${courses.length} courses from curriculum CSV`);

  // Clear existing courses
  const { error: deleteError } = await supabase.from("courses").delete().gte("created_at", "1970-01-01");
  if (deleteError) {
    console.error("Error clearing courses:", deleteError.message);
    process.exit(1);
  }

  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < courses.length; i += batchSize) {
    const batch = courses.slice(i, i + batchSize);
    const { error } = await supabase.from("courses").insert(batch);
    if (error) {
      console.error(`Error inserting batch at index ${i}:`, error.message);
      console.error("Failed rows:", JSON.stringify(batch, null, 2));
      process.exit(1);
    }
    inserted += batch.length;
  }

  console.log(`Successfully seeded ${inserted} courses`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
