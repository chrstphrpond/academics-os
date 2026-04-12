# Academics OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal academic command center for tracking a BSIT Network & Cybersecurity journey at MMDC, featuring a dashboard, progress tracker, grade analyzer, smart alerts, AI-powered knowledge base, and task manager.

**Architecture:** Next.js 16 App Router with Cache Components (PPR) for mixed static/cached/dynamic rendering. Supabase Postgres + pgvector for all data storage and vector search. Vercel AI SDK v6 for streaming AI Q&A over scraped school FAQ and handbook content.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Supabase (Postgres + pgvector), Supabase CLI, Vercel AI SDK v6, Vercel AI Gateway, pnpm

**Spec:** `docs/superpowers/specs/2026-04-12-academics-os-design.md`

---

## File Structure

```
academics-os/
├── .env.local                          # Supabase + AI API keys
├── next.config.ts                      # Next.js config with cacheComponents
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts                  # Tailwind v4 config (if needed beyond CSS)
├── tsconfig.json
├── components.json                     # shadcn/ui config
├── supabase/
│   ├── config.toml                     # Supabase CLI config
│   ├── migrations/
│   │   ├── 00001_enable_extensions.sql # pgvector + uuid-ossp
│   │   ├── 00002_create_tables.sql     # All 6 tables
│   │   └── 00003_create_indexes.sql    # Vector index + search indexes
│   └── seed.sql                        # Initial student record
├── scripts/
│   ├── seed-courses.ts                 # Parse curriculum CSV -> courses table
│   ├── seed-transcript.ts              # Parse transcript CSV -> enrollments table
│   └── seed-knowledge.ts              # Chunk FAQ+handbook -> embed -> knowledge_chunks
├── data/                               # Source data files (moved here from root)
│   ├── curriculum.csv
│   ├── transcript.csv
│   ├── mmdc-faq.md
│   └── handbook.txt                    # Extracted text from PDF
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: sidebar + top bar + providers
│   │   ├── page.tsx                    # Dashboard
│   │   ├── progress/
│   │   │   └── page.tsx                # Progress tracker
│   │   ├── grades/
│   │   │   └── page.tsx                # Grade analyzer
│   │   ├── alerts/
│   │   │   └── page.tsx                # Smart alerts
│   │   ├── knowledge/
│   │   │   ├── page.tsx                # AI Q&A + category grid
│   │   │   └── [category]/
│   │   │       └── page.tsx            # Category article list
│   │   ├── tasks/
│   │   │   └── page.tsx                # Task manager
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts            # AI Q&A streaming endpoint
│   │   └── globals.css                 # Tailwind imports + custom theme
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx         # Sidebar navigation
│   │   │   ├── top-bar.tsx             # Top bar with alerts bell + quick add
│   │   │   └── command-palette.tsx     # Cmd+K knowledge search
│   │   ├── dashboard/
│   │   │   ├── gpa-card.tsx            # GPA display card
│   │   │   ├── progress-ring.tsx       # Animated progress ring
│   │   │   ├── graduation-countdown.tsx# Terms remaining card
│   │   │   ├── alert-feed.tsx          # Top 3 alerts
│   │   │   └── current-courses.tsx     # Current term courses
│   │   ├── progress/
│   │   │   ├── curriculum-grid.tsx     # 4-year course grid
│   │   │   ├── course-card.tsx         # Individual course card
│   │   │   ├── prerequisite-chain.tsx  # Dependency visualization
│   │   │   └── units-summary.tsx       # CHED units breakdown
│   │   ├── grades/
│   │   │   ├── gpa-trend-chart.tsx     # Line chart
│   │   │   ├── grade-distribution.tsx  # Bar chart
│   │   │   ├── course-table.tsx        # DataTable
│   │   │   └── gpa-simulator.tsx       # What-if calculator
│   │   ├── alerts/
│   │   │   ├── alert-list.tsx          # Filterable alert list
│   │   │   └── alert-card.tsx          # Individual alert
│   │   ├── knowledge/
│   │   │   ├── chat-interface.tsx      # AI Q&A chat UI
│   │   │   ├── category-grid.tsx       # FAQ category cards
│   │   │   └── article-list.tsx        # Articles in a category
│   │   └── tasks/
│   │       ├── task-list.tsx           # Task list with filters
│   │       ├── task-card.tsx           # Individual task
│   │       └── quick-add-task.tsx      # Quick add form
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   └── server.ts              # Server Supabase client
│   │   ├── gpa.ts                     # GPA calculation utilities
│   │   ├── alerts-engine.ts           # Smart alert generation logic
│   │   ├── types.ts                   # Shared TypeScript types
│   │   └── constants.ts              # Grade scale, colors, etc.
│   └── actions/
│       ├── tasks.ts                   # Task CRUD server actions
│       ├── alerts.ts                  # Alert dismiss/generate server actions
│       └── grades.ts                  # Grade data fetching actions
```

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js Project with shadcn/ui

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `components.json`

- [ ] **Step 1: Create Next.js project**

Run:
```bash
cd /Users/macbookairm2/Developer/academics-os
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

Expected: Project scaffolded with App Router, TypeScript, Tailwind CSS v4, src directory.

- [ ] **Step 2: Initialize shadcn/ui**

Run:
```bash
pnpm dlx shadcn@latest init -d
```

Expected: `components.json` created, CSS variables added to `globals.css`.

- [ ] **Step 3: Enable Cache Components in next.config.ts**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

- [ ] **Step 4: Install core dependencies**

Run:
```bash
pnpm add @supabase/supabase-js @supabase/ssr @ai-sdk/gateway ai @ai-sdk/react recharts framer-motion
pnpm add -D supabase
```

- [ ] **Step 5: Create .env.local**

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
VERCEL_AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

Note: Local keys will be printed by `supabase start` in Task 2.

- [ ] **Step 6: Add .gitignore entries**

Append to `.gitignore`:

```
.env.local
data/handbook.txt
```

- [ ] **Step 7: Verify dev server starts**

Run:
```bash
pnpm dev
```

Expected: Dev server running at `http://localhost:3000`, default Next.js page loads.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 16 project with shadcn/ui and dependencies"
```

---

### Task 2: Set Up Supabase Local Development

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/00001_enable_extensions.sql`, `supabase/migrations/00002_create_tables.sql`, `supabase/migrations/00003_create_indexes.sql`, `supabase/seed.sql`

- [ ] **Step 1: Initialize Supabase**

Run:
```bash
cd /Users/macbookairm2/Developer/academics-os
pnpm supabase init
```

Expected: `supabase/` directory created with `config.toml`.

- [ ] **Step 2: Start local Supabase**

Run:
```bash
pnpm supabase start
```

Expected: Local Supabase stack running. Note the `API URL`, `anon key`, and `service_role key` printed in output. Update `.env.local` with these values.

- [ ] **Step 3: Create migration -- enable extensions**

Create `supabase/migrations/00001_enable_extensions.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

- [ ] **Step 4: Create migration -- tables**

Create `supabase/migrations/00002_create_tables.sql`:

```sql
-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  degree TEXT NOT NULL,
  specialization TEXT NOT NULL,
  enrollment_start_term TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses (curriculum)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  units INTEGER NOT NULL,
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  prerequisites TEXT[] DEFAULT '{}',
  corequisites TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments (transcript)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  school_year TEXT NOT NULL,
  grade TEXT,
  status TEXT NOT NULL CHECK (status IN ('passed', 'inc', 'drp', 'in_progress', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, term, school_year)
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inc_deadline', 'prerequisite_blocker', 'enrollment_window', 'graduation_risk', 'cascade_warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  due_date DATE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge chunks (FAQ + handbook for RAG)
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('faq', 'handbook')),
  category TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 5: Create migration -- indexes**

Create `supabase/migrations/00003_create_indexes.sql`:

```sql
-- Vector similarity search index
CREATE INDEX ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search on knowledge chunks
ALTER TABLE knowledge_chunks ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;
CREATE INDEX ON knowledge_chunks USING gin(fts);

-- Enrollment lookups
CREATE INDEX ON enrollments (student_id);
CREATE INDEX ON enrollments (course_id);

-- Alert lookups
CREATE INDEX ON alerts (student_id, dismissed);

-- Task lookups
CREATE INDEX ON tasks (student_id, completed);
```

- [ ] **Step 6: Create seed file**

Create `supabase/seed.sql`:

```sql
-- Seed the student record
INSERT INTO students (name, roll_number, degree, specialization, enrollment_start_term)
VALUES (
  'Christopher Pond Maquidato',
  '2024370558',
  'Bachelor of Science in Information Technology',
  'Network & Cybersecurity',
  'Term 3 SY 2024-25'
);
```

- [ ] **Step 7: Apply migrations and seed**

Run:
```bash
pnpm supabase db reset
```

Expected: All migrations applied, seed data inserted. Output shows tables created.

- [ ] **Step 8: Verify tables exist**

Run:
```bash
pnpm supabase db lint
```

Expected: No errors. You can also check via:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\dt"
```

Expected: 6 tables listed (students, courses, enrollments, alerts, knowledge_chunks, tasks).

- [ ] **Step 9: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase migrations for all 6 tables with pgvector"
```

---

### Task 3: Supabase Client Setup + TypeScript Types

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/types.ts`, `src/lib/constants.ts`

- [ ] **Step 1: Generate TypeScript types from database**

Run:
```bash
pnpm supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Expected: `database.types.ts` created with typed schema for all tables.

- [ ] **Step 2: Create server-side Supabase client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create browser-side Supabase client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create shared types**

Create `src/lib/types.ts`:

```ts
export type CourseStatus =
  | "passed"
  | "inc"
  | "drp"
  | "in_progress"
  | "failed"
  | "available"
  | "locked"
  | "not_taken";

export type AlertType =
  | "inc_deadline"
  | "prerequisite_blocker"
  | "enrollment_window"
  | "graduation_risk"
  | "cascade_warning";

export type AlertSeverity = "critical" | "warning" | "info";

export type GradeDescriptor =
  | "Excellent"
  | "Superior"
  | "Very Good"
  | "Good"
  | "Meritorious"
  | "Very Satisfactory"
  | "Satisfactory"
  | "Fairly Satisfactory"
  | "Passed"
  | "Failed";

export interface GradeInfo {
  grade: number;
  descriptor: GradeDescriptor;
  color: string;
}
```

- [ ] **Step 5: Create constants**

Create `src/lib/constants.ts`:

```ts
import type { GradeInfo } from "./types";

export const MMDC_GRADE_SCALE: GradeInfo[] = [
  { grade: 1.0, descriptor: "Excellent", color: "emerald" },
  { grade: 1.25, descriptor: "Superior", color: "emerald" },
  { grade: 1.5, descriptor: "Very Good", color: "blue" },
  { grade: 1.75, descriptor: "Good", color: "blue" },
  { grade: 2.0, descriptor: "Meritorious", color: "blue" },
  { grade: 2.25, descriptor: "Very Satisfactory", color: "amber" },
  { grade: 2.5, descriptor: "Satisfactory", color: "amber" },
  { grade: 2.75, descriptor: "Fairly Satisfactory", color: "amber" },
  { grade: 3.0, descriptor: "Passed", color: "orange" },
  { grade: 5.0, descriptor: "Failed", color: "red" },
];

export const TOTAL_UNITS_REQUIRED = 155;

export const MAX_UNITS_PER_TERM = 18;

export const TERMS_PER_YEAR = 3;

export function getGradeDescriptor(grade: number): GradeInfo | undefined {
  return MMDC_GRADE_SCALE.find((g) => g.grade === grade);
}

export function getGradeColor(grade: string): string {
  const num = parseFloat(grade);
  if (isNaN(num)) return "zinc"; // P, INC, DRP
  if (num <= 1.25) return "emerald";
  if (num <= 2.0) return "blue";
  if (num <= 2.75) return "amber";
  if (num <= 3.0) return "orange";
  return "red";
}

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Progress", href: "/progress", icon: "Map" },
  { label: "Grades", href: "/grades", icon: "GraduationCap" },
  { label: "Alerts", href: "/alerts", icon: "Bell" },
  { label: "Knowledge", href: "/knowledge", icon: "BookOpen" },
  { label: "Tasks", href: "/tasks", icon: "CheckSquare" },
] as const;
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/
git commit -m "feat: add Supabase clients, TypeScript types, and constants"
```

---

### Task 4: Data Seeding Scripts

**Files:**
- Create: `data/` directory, `scripts/seed-courses.ts`, `scripts/seed-transcript.ts`, `scripts/seed-knowledge.ts`
- Modify: `package.json` (add seed scripts)

- [ ] **Step 1: Organize data files**

Run:
```bash
mkdir -p /Users/macbookairm2/Developer/academics-os/data
mkdir -p /Users/macbookairm2/Developer/academics-os/scripts
cp "MMDC BSIT Program Offerings v4.2 _ SY25-26  - NW & Cybersecurity.csv" data/curriculum.csv
cp "Transcript - Database.csv" data/transcript.csv
cp mmdc-faq.md data/mmdc-faq.md
```

Extract handbook text:
```bash
pdftotext "MMDC STUDENT Building blocks_ Student Handbook.pdf" data/handbook.txt
```

- [ ] **Step 2: Install seed script dependencies**

Run:
```bash
pnpm add -D tsx csv-parse
```

- [ ] **Step 3: Create curriculum seed script**

Create `scripts/seed-courses.ts`:

```ts
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface CourseRow {
  code: string;
  title: string;
  type: string;
  units: number;
  year: number;
  term: number;
  prerequisites: string[];
  corequisites: string[];
}

function parseCurriculum(csvPath: string): CourseRow[] {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const records = parse(raw, { relax_column_count: true });

  const courses: CourseRow[] = [];
  let currentYear = 0;
  let currentTerm = 0;

  for (const row of records) {
    const col2 = (row[2] || "").toString().trim();
    const col3 = (row[3] || "").toString().trim();

    // Detect year headers like "FIRST YEAR", "SECOND YEAR", etc.
    if (col2.match(/^(FIRST|SECOND|THIRD|FOURTH)\s+YEAR$/i)) {
      const yearMap: Record<string, number> = {
        FIRST: 1,
        SECOND: 2,
        THIRD: 3,
        FOURTH: 4,
      };
      const word = col2.split(" ")[0].toUpperCase();
      currentYear = yearMap[word] || 0;
      continue;
    }

    // Detect term headers like "First Year 1st Term"
    const termMatch = col2.match(/(\d)(?:st|nd|rd|th)\s+Term/i);
    if (termMatch) {
      currentTerm = parseInt(termMatch[1]);
      continue;
    }

    // Skip header rows, TOTAL rows, empty rows
    if (
      !col2 ||
      col2 === "Course Code" ||
      col2 === "TOTAL" ||
      col2.startsWith("TOTAL ")
    ) {
      continue;
    }

    // Check if this looks like a course code (starts with "MO-")
    if (!col2.startsWith("MO-")) continue;

    const code = col2;
    const title = col3;
    const type = (row[4] || "").toString().trim() || "Lec";
    const prereqRaw = (row[5] || "").toString().trim();
    const coreqRaw = (row[6] || "").toString().trim();
    const unitsRaw = (row[7] || "").toString().trim().replace(/[()]/g, "");
    const units = parseInt(unitsRaw) || 0;

    if (!code || !title || units === 0) continue;

    const prerequisites =
      prereqRaw && prereqRaw !== "None"
        ? prereqRaw
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const corequisites =
      coreqRaw && coreqRaw !== "None"
        ? coreqRaw
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    courses.push({
      code,
      title,
      type,
      units,
      year: currentYear,
      term: currentTerm,
      prerequisites,
      corequisites,
    });
  }

  return courses;
}

async function main() {
  const courses = parseCurriculum("data/curriculum.csv");
  console.log(`Parsed ${courses.length} courses`);

  // Clear existing courses
  await supabase.from("courses").delete().neq("id", "");

  // Insert courses
  const { error } = await supabase.from("courses").insert(courses);

  if (error) {
    console.error("Error inserting courses:", error);
    process.exit(1);
  }

  console.log(`Seeded ${courses.length} courses successfully`);
}

main();
```

- [ ] **Step 4: Create transcript seed script**

Create `scripts/seed-transcript.ts`:

```ts
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface TranscriptRow {
  term: string;
  school_year: string;
  course_code: string;
  grade: string;
}

function parseTranscript(csvPath: string): TranscriptRow[] {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const records = parse(raw, { relax_column_count: true });

  const rows: TranscriptRow[] = [];

  // Data starts at row index 6 (0-indexed), after header info
  for (let i = 6; i < records.length; i++) {
    const row = records[i];
    const termRaw = (row[0] || "").toString().trim();
    const courseCode = (row[1] || "").toString().trim();
    const grade = (row[4] || "").toString().trim();

    if (!termRaw || !courseCode) continue;

    // Parse "Term 3 SY 2024 - 25" -> term: "Term 3", school_year: "SY 2024-25"
    const match = termRaw.match(
      /^(Term\s+\d)\s+SY\s+(\d{4})\s*-\s*(\d{2,4})$/i
    );
    if (!match) continue;

    const term = match[1];
    const school_year = `SY ${match[2]}-${match[3]}`;

    rows.push({ term, school_year, course_code: courseCode, grade });
  }

  return rows;
}

function gradeToStatus(grade: string): string {
  if (!grade) return "in_progress";
  if (grade === "INC") return "inc";
  if (grade === "DRP") return "drp";
  if (grade === "F" || grade === "5.00") return "failed";
  // Numeric grades 1.00-3.00 and "P" are passing
  return "passed";
}

async function main() {
  const transcriptRows = parseTranscript("data/transcript.csv");
  console.log(`Parsed ${transcriptRows.length} enrollment records`);

  // Get student ID
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("roll_number", "2024370558")
    .single();

  if (!students) {
    console.error("Student not found. Run supabase db reset first.");
    process.exit(1);
  }

  const studentId = students.id;

  // Get all courses for code -> id mapping
  const { data: courses } = await supabase.from("courses").select("id, code");
  if (!courses) {
    console.error("No courses found. Run seed-courses first.");
    process.exit(1);
  }

  const courseMap = new Map(courses.map((c) => [c.code, c.id]));

  // Clear existing enrollments for this student
  await supabase.from("enrollments").delete().eq("student_id", studentId);

  // Build enrollment records
  const enrollments = transcriptRows
    .filter((row) => courseMap.has(row.course_code))
    .map((row) => ({
      student_id: studentId,
      course_id: courseMap.get(row.course_code)!,
      term: row.term,
      school_year: row.school_year,
      grade: row.grade || null,
      status: gradeToStatus(row.grade),
    }));

  // Some transcript courses may not be in the NW&Cybersecurity curriculum
  // (e.g. gen-ed courses taken but listed under a different track)
  // Log any unmatched courses
  const unmatched = transcriptRows.filter(
    (row) => !courseMap.has(row.course_code)
  );
  if (unmatched.length > 0) {
    console.log(
      `Note: ${unmatched.length} courses not in curriculum:`,
      unmatched.map((r) => r.course_code)
    );
  }

  if (enrollments.length > 0) {
    const { error } = await supabase.from("enrollments").insert(enrollments);
    if (error) {
      console.error("Error inserting enrollments:", error);
      process.exit(1);
    }
  }

  console.log(`Seeded ${enrollments.length} enrollments successfully`);
}

main();
```

- [ ] **Step 5: Create knowledge base seed script**

Create `scripts/seed-knowledge.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// We'll use a lightweight embedding approach
// For production, use OpenAI text-embedding-3-small or similar
// For now, we store chunks without embeddings and add them later

interface Chunk {
  source: "faq" | "handbook";
  category: string | null;
  title: string;
  content: string;
  url: string | null;
}

function chunkFaq(faqPath: string): Chunk[] {
  const raw = fs.readFileSync(faqPath, "utf-8");
  const chunks: Chunk[] = [];

  // Split by article headers (## Title\n\nURL: ...)
  const articles = raw.split(/\n---\n/).filter((s) => s.trim());

  for (const article of articles) {
    const titleMatch = article.match(/^## (.+)$/m);
    const urlMatch = article.match(/^URL: (.+)$/m);

    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const url = urlMatch ? urlMatch[1].trim() : null;

    // Remove the title and URL lines from content
    let content = article
      .replace(/^## .+$/m, "")
      .replace(/^URL: .+$/m, "")
      .trim();

    // Skip if content is too short (navigation-only pages)
    if (content.length < 100) continue;

    // Split long articles into ~500 token chunks (~2000 chars)
    const maxChunkSize = 2000;
    if (content.length <= maxChunkSize) {
      chunks.push({ source: "faq", category: null, title, content, url });
    } else {
      const paragraphs = content.split(/\n\n+/);
      let currentChunk = "";
      let chunkIndex = 0;

      for (const para of paragraphs) {
        if (
          currentChunk.length + para.length > maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push({
            source: "faq",
            category: null,
            title: `${title} (Part ${chunkIndex + 1})`,
            content: currentChunk.trim(),
            url,
          });
          currentChunk = "";
          chunkIndex++;
        }
        currentChunk += para + "\n\n";
      }

      if (currentChunk.trim()) {
        chunks.push({
          source: "faq",
          category: null,
          title: `${title} (Part ${chunkIndex + 1})`,
          content: currentChunk.trim(),
          url,
        });
      }
    }
  }

  return chunks;
}

function chunkHandbook(handbookPath: string): Chunk[] {
  const raw = fs.readFileSync(handbookPath, "utf-8");
  const chunks: Chunk[] = [];

  // Split by major section headers
  const sections = raw.split(
    /\n(?=[IVX]+\.\s|VIII\.\s|VII\.\s|VI\.\s|V\.\s|IV\.\s|III\.\s|II\.\s|I\.\s)/
  );

  for (const section of sections) {
    const lines = section.trim().split("\n");
    if (lines.length === 0) continue;

    const title = lines[0].trim();
    const content = lines.slice(1).join("\n").trim();

    if (content.length < 50) continue;

    // Split long sections into chunks
    const maxChunkSize = 2000;
    if (content.length <= maxChunkSize) {
      chunks.push({
        source: "handbook",
        category: null,
        title,
        content,
        url: null,
      });
    } else {
      const paragraphs = content.split(/\n\n+/);
      let currentChunk = "";
      let chunkIndex = 0;

      for (const para of paragraphs) {
        if (
          currentChunk.length + para.length > maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push({
            source: "handbook",
            category: null,
            title: `${title} (Part ${chunkIndex + 1})`,
            content: currentChunk.trim(),
            url: null,
          });
          currentChunk = "";
          chunkIndex++;
        }
        currentChunk += para + "\n\n";
      }

      if (currentChunk.trim()) {
        chunks.push({
          source: "handbook",
          category: null,
          title: `${title} (Part ${chunkIndex + 1})`,
          content: currentChunk.trim(),
          url: null,
        });
      }
    }
  }

  return chunks;
}

async function main() {
  const faqChunks = chunkFaq("data/mmdc-faq.md");
  const handbookChunks = chunkHandbook("data/handbook.txt");
  const allChunks = [...faqChunks, ...handbookChunks];

  console.log(
    `Parsed ${faqChunks.length} FAQ chunks + ${handbookChunks.length} handbook chunks = ${allChunks.length} total`
  );

  // Clear existing knowledge chunks
  await supabase.from("knowledge_chunks").delete().neq("id", "");

  // Insert chunks without embeddings first
  // Embeddings will be generated in a separate step
  const { error } = await supabase.from("knowledge_chunks").insert(
    allChunks.map((c) => ({
      source: c.source,
      category: c.category,
      title: c.title,
      content: c.content,
      url: c.url,
      embedding: null,
    }))
  );

  if (error) {
    console.error("Error inserting chunks:", error);
    process.exit(1);
  }

  console.log(`Seeded ${allChunks.length} knowledge chunks (without embeddings)`);
  console.log(
    "Run seed-embeddings to generate embeddings for vector search."
  );
}

main();
```

- [ ] **Step 6: Add seed scripts to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "seed:courses": "tsx scripts/seed-courses.ts",
    "seed:transcript": "tsx scripts/seed-transcript.ts",
    "seed:knowledge": "tsx scripts/seed-knowledge.ts",
    "seed:all": "pnpm seed:courses && pnpm seed:transcript && pnpm seed:knowledge",
    "db:reset": "pnpm supabase db reset && pnpm seed:all"
  }
}
```

- [ ] **Step 7: Run all seed scripts**

Run:
```bash
pnpm seed:all
```

Expected:
```
Parsed XX courses
Seeded XX courses successfully
Parsed XX enrollment records
Seeded XX enrollments successfully
Parsed XX FAQ chunks + XX handbook chunks = XX total
Seeded XX knowledge chunks (without embeddings)
```

- [ ] **Step 8: Commit**

```bash
git add scripts/ data/curriculum.csv data/transcript.csv data/mmdc-faq.md package.json
git commit -m "feat: add data seeding scripts for courses, transcript, and knowledge base"
```

---

## Phase 2: Layout & Navigation

### Task 5: App Shell -- Sidebar, Top Bar, Theme

**Files:**
- Create: `src/components/layout/app-sidebar.tsx`, `src/components/layout/top-bar.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Install shadcn/ui components**

Run:
```bash
pnpm dlx shadcn@latest add sidebar button badge tooltip sheet separator
pnpm dlx shadcn@latest add sonner
pnpm add next-themes lucide-react
```

- [ ] **Step 2: Set up dark mode theme in globals.css**

Replace `src/app/globals.css` with dark-mode-first theme using zinc palette. Keep shadcn's generated CSS variables but override the dark theme values:

```css
@import "tailwindcss";
@plugin "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  /* Light mode colors */
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.13 0.028 261.69);
  --card: oklch(0.98 0 0);
  --card-foreground: oklch(0.13 0.028 261.69);
  --popover: oklch(0.98 0 0);
  --popover-foreground: oklch(0.13 0.028 261.69);
  --primary: oklch(0.55 0.18 255);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.93 0.006 264.53);
  --secondary-foreground: oklch(0.21 0.034 264.66);
  --muted: oklch(0.93 0.006 264.53);
  --muted-foreground: oklch(0.55 0.02 264);
  --accent: oklch(0.93 0.006 264.53);
  --accent-foreground: oklch(0.21 0.034 264.66);
  --destructive: oklch(0.58 0.22 27.33);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.87 0.006 264.53);
  --input: oklch(0.87 0.006 264.53);
  --ring: oklch(0.55 0.18 255);
  --sidebar: oklch(0.96 0.006 264.53);
  --sidebar-foreground: oklch(0.13 0.028 261.69);
  --sidebar-primary: oklch(0.55 0.18 255);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.93 0.006 264.53);
  --sidebar-accent-foreground: oklch(0.21 0.034 264.66);
  --sidebar-border: oklch(0.87 0.006 264.53);
  --sidebar-ring: oklch(0.55 0.18 255);
}

.dark {
  --background: oklch(0.1 0.015 264);
  --foreground: oklch(0.93 0.006 264.53);
  --card: oklch(0.14 0.02 264);
  --card-foreground: oklch(0.93 0.006 264.53);
  --popover: oklch(0.14 0.02 264);
  --popover-foreground: oklch(0.93 0.006 264.53);
  --primary: oklch(0.62 0.18 255);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.21 0.034 264.66);
  --secondary-foreground: oklch(0.93 0.006 264.53);
  --muted: oklch(0.21 0.034 264.66);
  --muted-foreground: oklch(0.55 0.02 264);
  --accent: oklch(0.21 0.034 264.66);
  --accent-foreground: oklch(0.93 0.006 264.53);
  --destructive: oklch(0.58 0.22 27.33);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.27 0.03 264);
  --input: oklch(0.27 0.03 264);
  --ring: oklch(0.62 0.18 255);
  --sidebar: oklch(0.12 0.018 264);
  --sidebar-foreground: oklch(0.93 0.006 264.53);
  --sidebar-primary: oklch(0.62 0.18 255);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.21 0.034 264.66);
  --sidebar-accent-foreground: oklch(0.93 0.006 264.53);
  --sidebar-border: oklch(0.27 0.03 264);
  --sidebar-ring: oklch(0.62 0.18 255);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

- [ ] **Step 3: Create app sidebar**

Create `src/components/layout/app-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  GraduationCap,
  Bell,
  BookOpen,
  CheckSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Progress", href: "/progress", icon: Map },
  { label: "Grades", href: "/grades", icon: GraduationCap },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Academics OS
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
                    }
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 4: Create top bar**

Create `src/components/layout/top-bar.tsx`:

```tsx
"use client";

import { Bell, Plus, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function TopBar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm text-muted-foreground">
        Term 3 SY 2025-26
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
          >
            2
          </Badge>
        </Button>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academics OS",
  description: "Your personal academic command center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <TopBar />
              <main className="flex-1 overflow-auto p-6">{children}</main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Install geist font**

Run:
```bash
pnpm add geist
```

- [ ] **Step 7: Create placeholder pages for all routes**

Create stub pages for each route so navigation works:

`src/app/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">Your academic command center</p>
    </div>
  );
}
```

`src/app/progress/page.tsx`:
```tsx
export default function ProgressPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Progress Tracker</h1>
      <p className="text-muted-foreground mt-1">Your curriculum journey</p>
    </div>
  );
}
```

`src/app/grades/page.tsx`:
```tsx
export default function GradesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Grade Analyzer</h1>
      <p className="text-muted-foreground mt-1">Academic performance insights</p>
    </div>
  );
}
```

`src/app/alerts/page.tsx`:
```tsx
export default function AlertsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Smart Alerts</h1>
      <p className="text-muted-foreground mt-1">Proactive academic warnings</p>
    </div>
  );
}
```

`src/app/knowledge/page.tsx`:
```tsx
export default function KnowledgePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Knowledge Base</h1>
      <p className="text-muted-foreground mt-1">Ask anything about MMDC</p>
    </div>
  );
}
```

`src/app/knowledge/[category]/page.tsx`:
```tsx
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold capitalize">
        {category.replace(/-/g, " ")}
      </h1>
    </div>
  );
}
```

`src/app/tasks/page.tsx`:
```tsx
export default function TasksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Tasks</h1>
      <p className="text-muted-foreground mt-1">Your academic to-do list</p>
    </div>
  );
}
```

- [ ] **Step 8: Verify in browser**

Run:
```bash
pnpm dev
```

Open `http://localhost:3000`. Expected: Dark mode app with collapsible sidebar, all 6 navigation links working, top bar with theme toggle.

- [ ] **Step 9: Commit**

```bash
git add src/ pnpm-lock.yaml package.json
git commit -m "feat: add app shell with sidebar navigation, top bar, and dark mode"
```

---

## Phase 3: Core Modules

### Task 6: GPA Calculation Utilities

**Files:**
- Create: `src/lib/gpa.ts`
- Test: Run in browser console or via a quick page render

- [ ] **Step 1: Create GPA utility module**

Create `src/lib/gpa.ts`:

```ts
import type { GradeDescriptor } from "./types";

export interface EnrollmentWithCourse {
  grade: string | null;
  status: string;
  term: string;
  school_year: string;
  course: {
    code: string;
    title: string;
    units: number;
  };
}

export interface GpaResult {
  gpa: number;
  descriptor: GradeDescriptor;
  totalUnitsGraded: number;
  totalUnitsPassed: number;
  totalUnitsAll: number;
}

export interface TermGpa {
  term: string;
  schoolYear: string;
  gpa: number;
  units: number;
  label: string;
}

const GRADE_DESCRIPTORS: [number, number, GradeDescriptor][] = [
  [0, 1.0, "Excellent"],
  [1.0, 1.25, "Superior"],
  [1.25, 1.5, "Very Good"],
  [1.5, 1.75, "Good"],
  [1.75, 2.0, "Meritorious"],
  [2.0, 2.25, "Very Satisfactory"],
  [2.25, 2.5, "Satisfactory"],
  [2.5, 2.75, "Fairly Satisfactory"],
  [2.75, 3.0, "Passed"],
  [3.0, 5.0, "Failed"],
];

function getDescriptor(gpa: number): GradeDescriptor {
  for (const [_min, max, desc] of GRADE_DESCRIPTORS) {
    if (gpa <= max) return desc;
  }
  return "Failed";
}

function isNumericGrade(grade: string | null): boolean {
  if (!grade) return false;
  const num = parseFloat(grade);
  return !isNaN(num) && num >= 1.0 && num <= 5.0;
}

export function calculateGpa(enrollments: EnrollmentWithCourse[]): GpaResult {
  let weightedSum = 0;
  let totalUnitsGraded = 0;
  let totalUnitsPassed = 0;
  let totalUnitsAll = 0;

  for (const e of enrollments) {
    totalUnitsAll += e.course.units;

    if (e.status === "passed") {
      totalUnitsPassed += e.course.units;
    }

    if (isNumericGrade(e.grade)) {
      const gradeNum = parseFloat(e.grade!);
      weightedSum += gradeNum * e.course.units;
      totalUnitsGraded += e.course.units;
    }
  }

  const gpa = totalUnitsGraded > 0 ? weightedSum / totalUnitsGraded : 0;

  return {
    gpa: Math.round(gpa * 100) / 100,
    descriptor: getDescriptor(gpa),
    totalUnitsGraded,
    totalUnitsPassed,
    totalUnitsAll,
  };
}

export function calculateTermGpas(
  enrollments: EnrollmentWithCourse[]
): TermGpa[] {
  // Group by term + school year
  const termMap = new Map<string, EnrollmentWithCourse[]>();

  for (const e of enrollments) {
    const key = `${e.term}|${e.school_year}`;
    if (!termMap.has(key)) termMap.set(key, []);
    termMap.get(key)!.push(e);
  }

  const termGpas: TermGpa[] = [];

  for (const [key, termEnrollments] of termMap) {
    const [term, schoolYear] = key.split("|");
    const result = calculateGpa(termEnrollments);

    if (result.totalUnitsGraded > 0) {
      termGpas.push({
        term,
        schoolYear,
        gpa: result.gpa,
        units: result.totalUnitsGraded,
        label: `${term} ${schoolYear}`,
      });
    }
  }

  // Sort by school year then term
  termGpas.sort((a, b) => {
    if (a.schoolYear !== b.schoolYear)
      return a.schoolYear.localeCompare(b.schoolYear);
    return a.term.localeCompare(b.term);
  });

  return termGpas;
}

export function simulateGpa(
  currentEnrollments: EnrollmentWithCourse[],
  hypotheticalGrades: { units: number; grade: number }[]
): number {
  const current = calculateGpa(currentEnrollments);
  let weightedSum = current.gpa * current.totalUnitsGraded;
  let totalUnits = current.totalUnitsGraded;

  for (const h of hypotheticalGrades) {
    weightedSum += h.grade * h.units;
    totalUnits += h.units;
  }

  return totalUnits > 0 ? Math.round((weightedSum / totalUnits) * 100) / 100 : 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/gpa.ts
git commit -m "feat: add GPA calculation utilities with term breakdown and simulator"
```

---

### Task 7: Smart Alerts Engine

**Files:**
- Create: `src/lib/alerts-engine.ts`, `src/actions/alerts.ts`

- [ ] **Step 1: Create alerts engine**

Create `src/lib/alerts-engine.ts`:

```ts
import type { AlertType, AlertSeverity } from "./types";
import { TOTAL_UNITS_REQUIRED, MAX_UNITS_PER_TERM } from "./constants";

export interface AlertInput {
  enrollments: {
    status: string;
    grade: string | null;
    term: string;
    school_year: string;
    course: {
      code: string;
      title: string;
      units: number;
      prerequisites: string[];
    };
  }[];
  allCourses: {
    code: string;
    title: string;
    units: number;
    prerequisites: string[];
  }[];
  currentTerm: string;
  currentSchoolYear: string;
}

export interface GeneratedAlert {
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  due_date: string | null;
}

export function generateAlerts(input: AlertInput): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];
  const passedCodes = new Set(
    input.enrollments
      .filter((e) => e.status === "passed")
      .map((e) => e.course.code)
  );

  // 1. INC deadline alerts
  const incEnrollments = input.enrollments.filter(
    (e) => e.status === "inc"
  );
  for (const inc of incEnrollments) {
    alerts.push({
      type: "inc_deadline",
      title: `INC: ${inc.course.code}`,
      message: `${inc.course.title} (${inc.course.code}) has an INC grade from ${inc.term} ${inc.school_year}. Must be completed within the succeeding term or it lapses to 5.00 (F).`,
      severity: "critical",
      due_date: null,
    });
  }

  // 2. Prerequisite blocker alerts
  const incOrFailedCodes = new Set(
    input.enrollments
      .filter((e) => e.status === "inc" || e.status === "failed")
      .map((e) => e.course.code)
  );

  for (const course of input.allCourses) {
    if (passedCodes.has(course.code)) continue;

    for (const prereq of course.prerequisites) {
      if (incOrFailedCodes.has(prereq)) {
        alerts.push({
          type: "prerequisite_blocker",
          title: `Blocked: ${course.code}`,
          message: `Cannot take ${course.title} (${course.code}) until ${prereq} is passed.`,
          severity: "warning",
          due_date: null,
        });
        break;
      }
    }
  }

  // 3. Cascade warning -- if a blocked course blocks 3+ downstream courses
  for (const blockerCode of incOrFailedCodes) {
    const downstream = countDownstream(blockerCode, input.allCourses, passedCodes);
    if (downstream >= 3) {
      const blockerCourse = input.allCourses.find((c) => c.code === blockerCode);
      alerts.push({
        type: "cascade_warning",
        title: `Cascade: ${blockerCode}`,
        message: `${blockerCourse?.title || blockerCode} is blocking ${downstream} downstream courses. Clearing this should be a priority.`,
        severity: "warning",
        due_date: null,
      });
    }
  }

  // 4. Graduation pace
  const totalUnitsPassed = input.enrollments
    .filter((e) => e.status === "passed")
    .reduce((sum, e) => sum + e.course.units, 0);
  const remainingUnits = TOTAL_UNITS_REQUIRED - totalUnitsPassed;

  // Estimate remaining terms (rough -- based on current term number)
  const currentTermNum = parseInt(input.currentTerm.replace(/\D/g, "")) || 1;
  const currentYearMatch = input.currentSchoolYear.match(/\d{4}/);
  const currentYear = currentYearMatch
    ? parseInt(currentYearMatch[0])
    : 2025;

  // Assuming graduation by SY 2027-28 (4 years from enrollment)
  const estimatedGradYear = 2028;
  const remainingTerms =
    (estimatedGradYear - currentYear) * 3 + (3 - currentTermNum);

  if (remainingTerms > 0 && remainingUnits / remainingTerms > MAX_UNITS_PER_TERM) {
    alerts.push({
      type: "graduation_risk",
      title: "Graduation Pace Warning",
      message: `${remainingUnits} units remaining across ~${remainingTerms} terms. That's ${Math.ceil(remainingUnits / remainingTerms)} units/term, exceeding the ${MAX_UNITS_PER_TERM} unit max. You may need to extend or request overload.`,
      severity: "warning",
      due_date: null,
    });
  }

  return alerts;
}

function countDownstream(
  blockerCode: string,
  allCourses: { code: string; prerequisites: string[] }[],
  passedCodes: Set<string>
): number {
  const blocked = new Set<string>();
  const queue = [blockerCode];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const course of allCourses) {
      if (blocked.has(course.code) || passedCodes.has(course.code)) continue;
      if (course.prerequisites.includes(current)) {
        blocked.add(course.code);
        queue.push(course.code);
      }
    }
  }

  return blocked.size;
}
```

- [ ] **Step 2: Create alerts server action**

Create `src/actions/alerts.ts`:

```ts
"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateAlerts } from "@/lib/alerts-engine";

export async function refreshAlerts() {
  const supabase = await createClient();

  // Get student
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .single();

  if (!student) return;

  // Get enrollments with course data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, course:courses(*)")
    .eq("student_id", student.id);

  // Get all courses
  const { data: allCourses } = await supabase.from("courses").select("*");

  if (!enrollments || !allCourses) return;

  const generatedAlerts = generateAlerts({
    enrollments: enrollments.map((e) => ({
      ...e,
      course: e.course!,
    })),
    allCourses,
    currentTerm: "Term 3",
    currentSchoolYear: "SY 2025-26",
  });

  // Clear old non-dismissed alerts
  await supabase
    .from("alerts")
    .delete()
    .eq("student_id", student.id)
    .eq("dismissed", false);

  // Insert new alerts
  if (generatedAlerts.length > 0) {
    await supabase.from("alerts").insert(
      generatedAlerts.map((a) => ({
        ...a,
        student_id: student.id,
      }))
    );
  }

  revalidateTag("alerts");
}

export async function dismissAlert(alertId: string) {
  const supabase = await createClient();
  await supabase.from("alerts").update({ dismissed: true }).eq("id", alertId);
  revalidateTag("alerts");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/alerts-engine.ts src/actions/alerts.ts
git commit -m "feat: add smart alerts engine with INC, prerequisite, cascade, and graduation checks"
```

---

### Task 8: Dashboard Page

**Files:**
- Create: `src/components/dashboard/gpa-card.tsx`, `src/components/dashboard/progress-ring.tsx`, `src/components/dashboard/graduation-countdown.tsx`, `src/components/dashboard/alert-feed.tsx`, `src/components/dashboard/current-courses.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Install shadcn card component**

Run:
```bash
pnpm dlx shadcn@latest add card progress
```

- [ ] **Step 2: Create GPA card component**

Create `src/components/dashboard/gpa-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGradeColor } from "@/lib/constants";
import type { GpaResult } from "@/lib/gpa";

export function GpaCard({ gpa }: { gpa: GpaResult }) {
  const color = getGradeColor(gpa.gpa.toFixed(2));

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cumulative GPA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold text-${color}-500`}>
            {gpa.gpa.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">
            {gpa.descriptor}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {gpa.totalUnitsGraded} units graded &middot; {gpa.totalUnitsPassed}{" "}
          units passed
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create progress ring component**

Create `src/components/dashboard/progress-ring.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_UNITS_REQUIRED } from "@/lib/constants";

export function ProgressRing({ unitsPassed }: { unitsPassed: number }) {
  const percentage = Math.round((unitsPassed / TOTAL_UNITS_REQUIRED) * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{percentage}%</span>
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold">{unitsPassed}</p>
          <p className="text-xs text-muted-foreground">
            of {TOTAL_UNITS_REQUIRED} units
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create graduation countdown component**

Create `src/components/dashboard/graduation-countdown.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_UNITS_REQUIRED, MAX_UNITS_PER_TERM } from "@/lib/constants";

export function GraduationCountdown({
  unitsPassed,
}: {
  unitsPassed: number;
}) {
  const remaining = TOTAL_UNITS_REQUIRED - unitsPassed;
  const estimatedTerms = Math.ceil(remaining / MAX_UNITS_PER_TERM);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Graduation Estimate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{estimatedTerms}</span>
          <span className="text-sm text-muted-foreground">terms remaining</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {remaining} units left &middot; ~{MAX_UNITS_PER_TERM} units/term
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create alert feed component**

Create `src/components/dashboard/alert-feed.tsx`:

```tsx
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
}

const severityConfig = {
  critical: { icon: AlertTriangle, className: "text-red-500" },
  warning: { icon: AlertCircle, className: "text-amber-500" },
  info: { icon: Info, className: "text-sky-400" },
} as const;

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Active Alerts
        </CardTitle>
        <Link
          href="/alerts"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts</p>
        ) : (
          alerts.slice(0, 3).map((alert) => {
            const config =
              severityConfig[alert.severity as keyof typeof severityConfig] ||
              severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={alert.id} className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Create current courses component**

Create `src/components/dashboard/current-courses.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGradeColor } from "@/lib/constants";

interface Enrollment {
  grade: string | null;
  status: string;
  course: {
    code: string;
    title: string;
    units: number;
  };
}

export function CurrentCourses({
  enrollments,
}: {
  enrollments: Enrollment[];
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Current Term Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div
              key={e.course.code}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {e.course.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.course.code} &middot; {e.course.units} units
                </p>
              </div>
              {e.grade ? (
                <Badge
                  variant="outline"
                  className={`text-${getGradeColor(e.grade)}-500 border-${getGradeColor(e.grade)}-500/30`}
                >
                  {e.grade}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  In Progress
                </Badge>
              )}
            </div>
          ))}
          {enrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No courses enrolled this term
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: Wire up dashboard page**

Replace `src/app/page.tsx`:

```tsx
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateGpa } from "@/lib/gpa";
import { GpaCard } from "@/components/dashboard/gpa-card";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { GraduationCountdown } from "@/components/dashboard/graduation-countdown";
import { AlertFeed } from "@/components/dashboard/alert-feed";
import { CurrentCourses } from "@/components/dashboard/current-courses";

async function DashboardStats() {
  "use cache";
  cacheLife("hours");
  cacheTag("dashboard-stats");

  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, course:courses(code, title, units)")
    .order("created_at", { ascending: true });

  if (!enrollments) return null;

  const gpa = calculateGpa(
    enrollments.map((e) => ({
      grade: e.grade,
      status: e.status,
      term: e.term,
      school_year: e.school_year,
      course: e.course!,
    }))
  );

  return (
    <>
      <GpaCard gpa={gpa} />
      <ProgressRing unitsPassed={gpa.totalUnitsPassed} />
      <GraduationCountdown unitsPassed={gpa.totalUnitsPassed} />
    </>
  );
}

async function DashboardAlerts() {
  const supabase = await createClient();

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("dismissed", false)
    .order("severity", { ascending: true })
    .limit(3);

  return <AlertFeed alerts={alerts || []} />;
}

async function DashboardCurrentCourses() {
  "use cache";
  cacheLife("hours");
  cacheTag("enrollments");

  const supabase = await createClient();

  // Get the latest term's enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("grade, status, course:courses(code, title, units)")
    .order("created_at", { ascending: false })
    .limit(10);

  // Filter to most recent term
  if (!enrollments || enrollments.length === 0) return <CurrentCourses enrollments={[]} />;

  const latestTerm = enrollments[0];
  const currentTermEnrollments = enrollments.filter(
    (e) => e.course !== null
  );

  return (
    <CurrentCourses
      enrollments={currentTermEnrollments.map((e) => ({
        grade: e.grade,
        status: e.status,
        course: e.course!,
      }))}
    />
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your academic command center
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense
          fallback={
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          }
        >
          <DashboardStats />
        </Suspense>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <DashboardAlerts />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="lg:col-span-2" />}>
          <DashboardCurrentCourses />
        </Suspense>
      </div>
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`h-36 rounded-xl border border-border/50 bg-card/50 animate-pulse ${className || ""}`}
    />
  );
}
```

- [ ] **Step 8: Verify in browser**

Run `pnpm dev`, open `http://localhost:3000`.
Expected: Dashboard with GPA card, progress ring, graduation countdown, alerts feed, and current courses -- all pulling data from Supabase.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/ src/app/page.tsx
git commit -m "feat: add dashboard with GPA, progress ring, graduation countdown, alerts, and current courses"
```

---

### Task 9: Progress Tracker Page

**Files:**
- Create: `src/components/progress/curriculum-grid.tsx`, `src/components/progress/course-card.tsx`, `src/components/progress/units-summary.tsx`
- Modify: `src/app/progress/page.tsx`

- [ ] **Step 1: Install shadcn dialog and popover**

Run:
```bash
pnpm dlx shadcn@latest add dialog popover scroll-area
```

- [ ] **Step 2: Create course card component**

Create `src/components/progress/course-card.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CourseStatus } from "@/lib/types";

interface CourseCardProps {
  code: string;
  title: string;
  units: number;
  status: CourseStatus;
  grade?: string | null;
  prerequisites: string[];
  blockedCourses: string[];
}

const statusStyles: Record<CourseStatus, string> = {
  passed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  in_progress: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  available: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  locked: "border-zinc-500/30 bg-zinc-500/5 text-zinc-500",
  inc: "border-red-500/30 bg-red-500/10 text-red-500",
  drp: "border-zinc-500/30 bg-zinc-500/10 text-zinc-500",
  failed: "border-red-500/30 bg-red-500/10 text-red-500",
  not_taken: "border-border/50 bg-card/50 text-muted-foreground",
};

const statusLabels: Record<CourseStatus, string> = {
  passed: "Passed",
  in_progress: "In Progress",
  available: "Available",
  locked: "Locked",
  inc: "Incomplete",
  drp: "Dropped",
  failed: "Failed",
  not_taken: "Not Taken",
};

export function CourseCard({
  code,
  title,
  units,
  status,
  grade,
  prerequisites,
  blockedCourses,
}: CourseCardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`w-full rounded-lg border p-2 text-left transition-all hover:scale-[1.02] hover:shadow-md ${statusStyles[status]}`}
        >
          <p className="text-xs font-mono font-medium">{code}</p>
          <p className="text-xs truncate mt-0.5 opacity-80">{title}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] opacity-60">{units}u</span>
            {grade && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {grade}
              </Badge>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-2">
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">
              {code} &middot; {units} units &middot; {statusLabels[status]}
            </p>
          </div>
          {prerequisites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Prerequisites
              </p>
              <p className="text-xs">{prerequisites.join(", ")}</p>
            </div>
          )}
          {blockedCourses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Unlocks
              </p>
              <p className="text-xs">{blockedCourses.join(", ")}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: Create curriculum grid component**

Create `src/components/progress/curriculum-grid.tsx`:

```tsx
import { CourseCard } from "./course-card";
import type { CourseStatus } from "@/lib/types";

interface Course {
  code: string;
  title: string;
  units: number;
  year: number;
  term: number;
  prerequisites: string[];
  status: CourseStatus;
  grade?: string | null;
}

function getBlockedCourses(courseCode: string, allCourses: Course[]): string[] {
  return allCourses
    .filter((c) => c.prerequisites.includes(courseCode))
    .map((c) => c.code);
}

export function CurriculumGrid({ courses }: { courses: Course[] }) {
  const years = [1, 2, 3, 4];
  const terms = [1, 2, 3];
  const termLabels = ["1st Term", "2nd Term", "3rd Term"];

  return (
    <div className="space-y-8">
      {years.map((year) => (
        <div key={year}>
          <h3 className="text-lg font-semibold mb-3">Year {year}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {terms.map((term, termIdx) => {
              const termCourses = courses.filter(
                (c) => c.year === year && c.term === term
              );
              return (
                <div key={term}>
                  <p className="text-sm text-muted-foreground mb-2">
                    {termLabels[termIdx]}
                  </p>
                  <div className="space-y-2">
                    {termCourses.map((course) => (
                      <CourseCard
                        key={course.code}
                        code={course.code}
                        title={course.title}
                        units={course.units}
                        status={course.status}
                        grade={course.grade}
                        prerequisites={course.prerequisites}
                        blockedCourses={getBlockedCourses(
                          course.code,
                          courses
                        )}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create units summary component**

Create `src/components/progress/units-summary.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UnitCategory {
  label: string;
  required: number;
  completed: number;
}

export function UnitsSummary({
  categories,
}: {
  categories: UnitCategory[];
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Units Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex justify-between text-xs mb-1">
              <span>{cat.label}</span>
              <span className="text-muted-foreground">
                {cat.completed}/{cat.required}
              </span>
            </div>
            <Progress
              value={(cat.completed / cat.required) * 100}
              className="h-1.5"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Wire up progress page**

Replace `src/app/progress/page.tsx`:

```tsx
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CurriculumGrid } from "@/components/progress/curriculum-grid";
import { UnitsSummary } from "@/components/progress/units-summary";
import type { CourseStatus } from "@/lib/types";

function determineCourseStatus(
  courseCode: string,
  prerequisites: string[],
  enrollmentMap: Map<string, { status: string; grade: string | null }>,
  passedCodes: Set<string>
): { status: CourseStatus; grade: string | null } {
  const enrollment = enrollmentMap.get(courseCode);

  if (enrollment) {
    return {
      status: enrollment.status as CourseStatus,
      grade: enrollment.grade,
    };
  }

  // Not enrolled -- check if prerequisites are met
  const allPrereqsMet =
    prerequisites.length === 0 ||
    prerequisites.every((p) => passedCodes.has(p));

  return {
    status: allPrereqsMet ? "available" : "locked",
    grade: null,
  };
}

async function ProgressData() {
  "use cache";
  cacheLife("hours");
  cacheTag("curriculum", "enrollments");

  const supabase = await createClient();

  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .order("year")
      .order("term"),
    supabase
      .from("enrollments")
      .select("course_id, status, grade, course:courses(code)"),
  ]);

  if (!courses) return null;

  // Build enrollment lookup by course code
  const enrollmentMap = new Map<
    string,
    { status: string; grade: string | null }
  >();
  const passedCodes = new Set<string>();

  for (const e of enrollments || []) {
    if (e.course) {
      enrollmentMap.set(e.course.code, {
        status: e.status,
        grade: e.grade,
      });
      if (e.status === "passed") passedCodes.add(e.course.code);
    }
  }

  const coursesWithStatus = courses.map((c) => {
    const { status, grade } = determineCourseStatus(
      c.code,
      c.prerequisites,
      enrollmentMap,
      passedCodes
    );
    return { ...c, status, grade };
  });

  // Calculate unit categories
  const categories = [
    { label: "General Education", required: 54, completed: 0 },
    { label: "Professional Major", required: 24, completed: 0 },
    { label: "Elective", required: 12, completed: 0 },
    { label: "NSTP", required: 6, completed: 0 },
    { label: "PE", required: 8, completed: 0 },
    { label: "Internship", required: 6, completed: 0 },
  ];

  // Simple unit count for now
  const totalPassed = coursesWithStatus
    .filter((c) => c.status === "passed")
    .reduce((sum, c) => sum + c.units, 0);

  categories[0].completed = Math.min(
    totalPassed,
    categories[0].required
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <CurriculumGrid courses={coursesWithStatus} />
      <div className="space-y-4">
        <UnitsSummary categories={categories} />
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Your 4-year curriculum journey
        </p>
      </div>
      <ProgressData />
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

Open `http://localhost:3000/progress`.
Expected: 4-year curriculum grid with color-coded course cards. Clicking a card shows prerequisites and downstream courses. Units breakdown sidebar.

- [ ] **Step 7: Commit**

```bash
git add src/components/progress/ src/app/progress/
git commit -m "feat: add progress tracker with curriculum grid and prerequisite visualization"
```

---

### Task 10: Grade Analyzer Page

**Files:**
- Create: `src/components/grades/gpa-trend-chart.tsx`, `src/components/grades/grade-distribution.tsx`, `src/components/grades/course-table.tsx`, `src/components/grades/gpa-simulator.tsx`
- Modify: `src/app/grades/page.tsx`

- [ ] **Step 1: Install shadcn table and select**

Run:
```bash
pnpm dlx shadcn@latest add table select input label slider
```

- [ ] **Step 2: Create GPA trend chart**

Create `src/components/grades/gpa-trend-chart.tsx`:

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TermGpa } from "@/lib/gpa";

export function GpaTrendChart({ termGpas }: { termGpas: TermGpa[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          GPA Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={termGpas}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              domain={[1, 3]}
              reversed
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="gpa"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create grade distribution chart**

Create `src/components/grades/grade-distribution.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGradeColor } from "@/lib/constants";

interface GradeCount {
  grade: string;
  count: number;
}

const colorMap: Record<string, string> = {
  emerald: "#10b981",
  blue: "#3b82f6",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  zinc: "#71717a",
};

export function GradeDistribution({ data }: { data: GradeCount[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Grade Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="grade"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.grade}
                  fill={colorMap[getGradeColor(entry.grade)] || "#71717a"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create course table**

Create `src/components/grades/course-table.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGradeColor } from "@/lib/constants";

interface CourseGrade {
  code: string;
  title: string;
  term: string;
  schoolYear: string;
  grade: string | null;
  units: number;
  status: string;
}

export function CourseTable({ courses }: { courses: CourseGrade[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          All Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Term</TableHead>
              <TableHead className="text-center">Units</TableHead>
              <TableHead className="text-center">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={`${c.code}-${c.term}-${c.schoolYear}`}>
                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                <TableCell className="text-sm">{c.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.term} {c.schoolYear}
                </TableCell>
                <TableCell className="text-center text-sm">{c.units}</TableCell>
                <TableCell className="text-center">
                  {c.grade ? (
                    <Badge
                      variant="outline"
                      className={`text-${getGradeColor(c.grade)}-500 border-${getGradeColor(c.grade)}-500/30`}
                    >
                      {c.grade}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create GPA simulator**

Create `src/components/grades/gpa-simulator.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MMDC_GRADE_SCALE } from "@/lib/constants";
import { simulateGpa, type EnrollmentWithCourse } from "@/lib/gpa";

interface SimulatorCourse {
  code: string;
  title: string;
  units: number;
}

export function GpaSimulator({
  currentEnrollments,
  availableCourses,
}: {
  currentEnrollments: EnrollmentWithCourse[];
  availableCourses: SimulatorCourse[];
}) {
  const [hypotheticals, setHypotheticals] = useState<
    Record<string, number>
  >({});

  const hypotheticalGrades = Object.entries(hypotheticals)
    .filter(([, grade]) => grade > 0)
    .map(([code, grade]) => ({
      units: availableCourses.find((c) => c.code === code)?.units || 3,
      grade,
    }));

  const projectedGpa = simulateGpa(currentEnrollments, hypotheticalGrades);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          GPA Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Select hypothetical grades for upcoming courses:
        </p>
        {availableCourses.slice(0, 6).map((course) => (
          <div
            key={course.code}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{course.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {course.code} &middot; {course.units}u
              </p>
            </div>
            <Select
              onValueChange={(val) =>
                setHypotheticals((prev) => ({
                  ...prev,
                  [course.code]: parseFloat(val),
                }))
              }
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {MMDC_GRADE_SCALE.map((g) => (
                  <SelectItem key={g.grade} value={g.grade.toString()}>
                    {g.grade.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {hypotheticalGrades.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">Projected GPA</p>
            <p className="text-2xl font-bold">{projectedGpa.toFixed(2)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Wire up grades page**

Replace `src/app/grades/page.tsx`:

```tsx
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateGpa, calculateTermGpas } from "@/lib/gpa";
import { GpaTrendChart } from "@/components/grades/gpa-trend-chart";
import { GradeDistribution } from "@/components/grades/grade-distribution";
import { CourseTable } from "@/components/grades/course-table";
import { GpaSimulator } from "@/components/grades/gpa-simulator";

async function GradesData() {
  "use cache";
  cacheLife("hours");
  cacheTag("enrollments");

  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, course:courses(code, title, units)")
    .order("school_year")
    .order("term");

  if (!enrollments) return null;

  const enriched = enrollments.map((e) => ({
    grade: e.grade,
    status: e.status,
    term: e.term,
    school_year: e.school_year,
    course: e.course!,
  }));

  const termGpas = calculateTermGpas(enriched);

  // Grade distribution
  const gradeCounts = new Map<string, number>();
  for (const e of enriched) {
    if (e.grade && e.grade !== "P") {
      gradeCounts.set(e.grade, (gradeCounts.get(e.grade) || 0) + 1);
    }
  }
  const distribution = Array.from(gradeCounts.entries())
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => parseFloat(a.grade) - parseFloat(b.grade));

  // Course table data
  const courseGrades = enriched.map((e) => ({
    code: e.course.code,
    title: e.course.title,
    term: e.term,
    schoolYear: e.school_year,
    grade: e.grade,
    units: e.course.units,
    status: e.status,
  }));

  // Available courses for simulator (not yet taken)
  const { data: allCourses } = await supabase.from("courses").select("code, title, units");
  const takenCodes = new Set(enriched.map((e) => e.course.code));
  const availableCourses = (allCourses || []).filter(
    (c) => !takenCodes.has(c.code)
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <GpaTrendChart termGpas={termGpas} />
        <GradeDistribution data={distribution} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <CourseTable courses={courseGrades} />
        <GpaSimulator
          currentEnrollments={enriched}
          availableCourses={availableCourses}
        />
      </div>
    </>
  );
}

export default function GradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grade Analyzer</h1>
        <p className="text-muted-foreground mt-1">
          Academic performance insights
        </p>
      </div>
      <GradesData />
    </div>
  );
}
```

- [ ] **Step 7: Verify in browser**

Open `http://localhost:3000/grades`.
Expected: GPA trend line chart, grade distribution bar chart, sortable course table, GPA simulator with dropdowns.

- [ ] **Step 8: Commit**

```bash
git add src/components/grades/ src/app/grades/
git commit -m "feat: add grade analyzer with trend chart, distribution, course table, and GPA simulator"
```

---

### Task 11: Smart Alerts Page

**Files:**
- Create: `src/components/alerts/alert-list.tsx`, `src/components/alerts/alert-card.tsx`
- Modify: `src/app/alerts/page.tsx`

- [ ] **Step 1: Create alert card component**

Create `src/components/alerts/alert-card.tsx`:

```tsx
"use client";

import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dismissAlert } from "@/actions/alerts";

interface AlertCardProps {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    className: "border-red-500/30 bg-red-500/5",
    iconClass: "text-red-500",
  },
  warning: {
    icon: AlertCircle,
    className: "border-amber-500/30 bg-amber-500/5",
    iconClass: "text-amber-500",
  },
  info: {
    icon: Info,
    className: "border-sky-400/30 bg-sky-400/5",
    iconClass: "text-sky-400",
  },
} as const;

export function AlertCard({
  id,
  title,
  message,
  severity,
  createdAt,
}: AlertCardProps) {
  const config =
    severityConfig[severity as keyof typeof severityConfig] ||
    severityConfig.info;
  const Icon = config.icon;

  return (
    <Card className={`${config.className} border`}>
      <CardContent className="flex items-start gap-3 p-4">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconClass}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{message}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => dismissAlert(id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create alert list component**

Create `src/components/alerts/alert-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AlertCard } from "./alert-card";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  created_at: string;
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? alerts.filter((a) => a.severity === filter)
    : alerts;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={filter === null ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter(null)}
        >
          All ({alerts.length})
        </Button>
        <Button
          variant={filter === "critical" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("critical")}
        >
          Critical ({alerts.filter((a) => a.severity === "critical").length})
        </Button>
        <Button
          variant={filter === "warning" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("warning")}
        >
          Warning ({alerts.filter((a) => a.severity === "warning").length})
        </Button>
        <Button
          variant={filter === "info" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("info")}
        >
          Info ({alerts.filter((a) => a.severity === "info").length})
        </Button>
      </div>
      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard
            key={alert.id}
            id={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            severity={alert.severity}
            createdAt={alert.created_at}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No alerts to show
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire up alerts page**

Replace `src/app/alerts/page.tsx`:

```tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AlertList } from "@/components/alerts/alert-list";
import { Button } from "@/components/ui/button";
import { refreshAlerts } from "@/actions/alerts";
import { RefreshCw } from "lucide-react";

async function AlertsData() {
  const supabase = await createClient();

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("dismissed", false)
    .order("severity")
    .order("created_at", { ascending: false });

  return <AlertList alerts={alerts || []} />;
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Proactive academic warnings
          </p>
        </div>
        <form action={refreshAlerts}>
          <Button variant="outline" size="sm" type="submit">
            <RefreshCw className="h-3 w-3 mr-2" />
            Refresh
          </Button>
        </form>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-border/50 bg-card/50 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <AlertsData />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/alerts`, click "Refresh" to generate alerts.
Expected: INC deadline alerts for MO-IT101, prerequisite blocker alerts, filterable by severity.

- [ ] **Step 5: Commit**

```bash
git add src/components/alerts/ src/app/alerts/
git commit -m "feat: add smart alerts page with filtering and dismiss functionality"
```

---

### Task 12: Knowledge Base -- AI Q&A + Browse

**Files:**
- Create: `src/app/api/chat/route.ts`, `src/components/knowledge/chat-interface.tsx`, `src/components/knowledge/category-grid.tsx`
- Modify: `src/app/knowledge/page.tsx`

- [ ] **Step 1: Create AI chat API route**

Create `src/app/api/chat/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const query =
    lastMessage.parts?.find((p) => p.type === "text")?.text ||
    lastMessage.content ||
    "";

  // Search knowledge base using full-text search
  const supabase = await createClient();
  const { data: chunks } = await supabase
    .from("knowledge_chunks")
    .select("title, content, url, source")
    .textSearch("fts", query.split(" ").join(" & "), { type: "plain" })
    .limit(5);

  const context =
    chunks && chunks.length > 0
      ? chunks
          .map(
            (c) =>
              `### ${c.title}\nSource: ${c.source}${c.url ? ` (${c.url})` : ""}\n\n${c.content}`
          )
          .join("\n\n---\n\n")
      : "No relevant information found in the knowledge base.";

  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4.6"),
    system: `You are an academic assistant for MMDC (Mapua Malayan Digital College). Answer questions based ONLY on the provided context from the school's FAQ and student handbook. If the context doesn't contain relevant information, say so clearly. Always cite your sources.

Context from MMDC Knowledge Base:
${context}`,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Create chat interface component**

Create `src/components/knowledge/chat-interface.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User } from "lucide-react";

const transport = new TextStreamChatTransport({ api: "/api/chat" });

export function ChatInterface() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useChat({ transport });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        <div className="min-h-[300px] max-h-[500px] overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Ask anything about MMDC policies, enrollment, grading, and more.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {[
                  "How do I complete my INC grade?",
                  "What are the payment channels?",
                  "How do I drop a course?",
                ].map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setInput(q);
                      sendMessage({ text: q });
                      setInput("");
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role !== "user" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.parts?.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              {m.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce delay-100" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            sendMessage({ text: input });
            setInput("");
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about MMDC policies, enrollment, grading..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create category grid component**

Create `src/components/knowledge/category-grid.tsx`:

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  GraduationCap,
  CreditCard,
  Laptop,
  Users,
  HelpCircle,
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  Newspaper,
  Heart,
  Award,
} from "lucide-react";

const categories = [
  { slug: "getting-started", label: "Getting Started", icon: BookOpen },
  { slug: "enrollment-and-admissions", label: "Enrollment & Admissions", icon: FileText },
  { slug: "academic-programs-and-policies", label: "Academic Programs", icon: GraduationCap },
  { slug: "college-resources", label: "College Resources", icon: Laptop },
  { slug: "student-services", label: "Student Services", icon: Users },
  { slug: "tech-tips-troubleshooting", label: "Tech Tips", icon: Laptop },
  { slug: "tuition-scholarships-and-financial-aid", label: "Tuition & Aid", icon: CreditCard },
  { slug: "internship-graduation", label: "Internship & Graduation", icon: Award },
  { slug: "career-development-services", label: "Career Development", icon: Briefcase },
  { slug: "student-engagement-clubs-orgs", label: "Clubs & Orgs", icon: Heart },
  { slug: "faqs", label: "FAQs", icon: HelpCircle },
  { slug: "feedback-sentiments", label: "Feedback", icon: MessageSquare },
  { slug: "news-and-announcements", label: "News", icon: Newspaper },
];

export function CategoryGrid() {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((cat) => (
        <Link key={cat.slug} href={`/knowledge/${cat.slug}`}>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <cat.icon className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">{cat.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Wire up knowledge page**

Replace `src/app/knowledge/page.tsx`:

```tsx
import { ChatInterface } from "@/components/knowledge/chat-interface";
import { CategoryGrid } from "@/components/knowledge/category-grid";

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Ask anything about MMDC or browse by category
        </p>
      </div>
      <ChatInterface />
      <div>
        <h2 className="text-lg font-semibold mb-4">Browse by Category</h2>
        <CategoryGrid />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/knowledge`.
Expected: Chat interface with suggested questions. Type a question, get a streamed AI response based on FAQ data. Category grid below with clickable cards.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/chat/ src/components/knowledge/ src/app/knowledge/
git commit -m "feat: add knowledge base with AI Q&A chat and browsable FAQ categories"
```

---

### Task 13: Task Manager Page

**Files:**
- Create: `src/actions/tasks.ts`, `src/components/tasks/task-list.tsx`, `src/components/tasks/task-card.tsx`, `src/components/tasks/quick-add-task.tsx`
- Modify: `src/app/tasks/page.tsx`

- [ ] **Step 1: Create task server actions**

Create `src/actions/tasks.ts`:

```ts
"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .single();

  if (!student) return;

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const dueDate = (formData.get("due_date") as string) || null;
  const courseId = (formData.get("course_id") as string) || null;

  await supabase.from("tasks").insert({
    student_id: student.id,
    title,
    description,
    due_date: dueDate || null,
    course_id: courseId || null,
  });

  revalidateTag("tasks");
}

export async function toggleTask(taskId: string, completed: boolean) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId);
  revalidateTag("tasks");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidateTag("tasks");
}
```

- [ ] **Step 2: Create task card component**

Create `src/components/tasks/task-card.tsx`:

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleTask, deleteTask } from "@/actions/tasks";

interface TaskCardProps {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  courseName: string | null;
}

export function TaskCard({
  id,
  title,
  description,
  dueDate,
  completed,
  courseName,
}: TaskCardProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors ${
        completed ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={(e) => toggleTask(id, e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        <div className="flex gap-2 mt-1">
          {courseName && (
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {courseName}
            </span>
          )}
          {dueDate && (
            <span className="text-[10px] text-muted-foreground">
              Due: {new Date(dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => deleteTask(id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create quick add task form**

Create `src/components/tasks/quick-add-task.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createTask } from "@/actions/tasks";

export function QuickAddTask() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createTask(formData);
        formRef.current?.reset();
      }}
      className="flex gap-2"
    >
      <Input
        name="title"
        placeholder="Add a task..."
        required
        className="flex-1"
      />
      <Input name="due_date" type="date" className="w-40" />
      <Button type="submit" size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create task list component**

Create `src/components/tasks/task-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  course: { title: string } | null;
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [showCompleted, setShowCompleted] = useState(false);

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-3">
      {pending.map((task) => (
        <TaskCard
          key={task.id}
          id={task.id}
          title={task.title}
          description={task.description}
          dueDate={task.due_date}
          completed={task.completed}
          courseName={task.course?.title || null}
        />
      ))}
      {pending.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No pending tasks. Add one above!
        </p>
      )}
      {completed.length > 0 && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? "Hide" : "Show"} completed ({completed.length})
          </Button>
          {showCompleted &&
            completed.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description}
                dueDate={task.due_date}
                completed={task.completed}
                courseName={task.course?.title || null}
              />
            ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire up tasks page**

Replace `src/app/tasks/page.tsx`:

```tsx
import { Suspense } from "react";
import { cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/tasks/task-list";
import { QuickAddTask } from "@/components/tasks/quick-add-task";

async function TasksData() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, course:courses(title)")
    .order("completed")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return <TaskList tasks={tasks || []} />;
}

export default function TasksPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground mt-1">Your academic to-do list</p>
      </div>
      <QuickAddTask />
      <Suspense
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg border border-border/50 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <TasksData />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

Open `http://localhost:3000/tasks`.
Expected: Quick add form at top, add a task, toggle completion, delete. Completed tasks hidden by default with show/hide toggle.

- [ ] **Step 7: Commit**

```bash
git add src/actions/tasks.ts src/components/tasks/ src/app/tasks/
git commit -m "feat: add task manager with quick add, toggle completion, and delete"
```

---

## Phase 4: Polish

### Task 14: Command Palette (Cmd+K)

**Files:**
- Create: `src/components/layout/command-palette.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install shadcn command component**

Run:
```bash
pnpm dlx shadcn@latest add command
```

- [ ] **Step 2: Create command palette**

Create `src/components/layout/command-palette.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  GraduationCap,
  Bell,
  BookOpen,
  CheckSquare,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const pages = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Progress Tracker", href: "/progress", icon: Map },
  { label: "Grade Analyzer", href: "/grades", icon: GraduationCap },
  { label: "Smart Alerts", href: "/alerts", icon: Bell },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages or ask a question..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => {
                router.push(page.href);
                setOpen(false);
              }}
            >
              <page.icon className="mr-2 h-4 w-4" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 3: Add to layout**

Add `<CommandPalette />` inside the `<ThemeProvider>` in `src/app/layout.tsx`, after `<Toaster />`.

```tsx
import { CommandPalette } from "@/components/layout/command-palette";
// ... in the JSX, after <Toaster />:
<CommandPalette />
```

- [ ] **Step 4: Verify**

Press `Cmd+K` in browser. Expected: Command palette opens with page navigation.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/command-palette.tsx src/app/layout.tsx
git commit -m "feat: add Cmd+K command palette for quick navigation"
```

---

### Task 15: Final Polish and Verification

**Files:**
- Modify: various files as needed

- [ ] **Step 1: Run build check**

Run:
```bash
pnpm build
```

Expected: Build completes with no errors. Fix any TypeScript errors or build issues.

- [ ] **Step 2: Run lint**

Run:
```bash
pnpm lint
```

Expected: No linting errors.

- [ ] **Step 3: Test all pages in browser**

Start dev server and verify each page:
1. `/` -- Dashboard: GPA, progress ring, graduation countdown, alerts, current courses
2. `/progress` -- Curriculum grid with color-coded cards, popovers, units breakdown
3. `/grades` -- GPA trend chart, grade distribution, course table, GPA simulator
4. `/alerts` -- Alert list with severity filters, dismiss, refresh
5. `/knowledge` -- AI chat with suggestions, streaming responses, category grid
6. `/tasks` -- Quick add, toggle, delete, show/hide completed
7. `Cmd+K` -- Command palette navigates to all pages
8. Theme toggle -- dark/light mode works
9. Mobile responsive -- sidebar collapses, layout adapts

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors and polish UI"
```

- [ ] **Step 5: Create .gitignore and clean up**

Ensure `.gitignore` has:
```
node_modules/
.next/
.env.local
.env*.local
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: finalize Academics OS v1"
```
