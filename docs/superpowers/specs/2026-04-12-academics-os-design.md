# Academics OS -- Design Spec

Personal academic command center for tracking a BSIT Network & Cybersecurity journey at MMDC (Mapua Malayan Digital College), from enrollment to graduation.

## User Context

- **Student:** Christopher Pond Maquidato (Roll No. 2024370558)
- **Program:** BS Information Technology -- Network & Cybersecurity
- **School:** MMDC (Mapua Malayan Digital College), fully online, trimestral system
- **Progress:** 3 terms completed (Term 3 SY 2024-25 through Term 2 SY 2025-26), ~35 courses taken, ~9 terms remaining
- **Notable:** 2 INC grades in Computer Programming 1 (MO-IT101 + MO-IT101L) that must be completed within the succeeding term or lapse to 5.00 (F)
- **Total units required:** 155

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components, Cache Components/PPR) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Database | Supabase (Postgres + pgvector) |
| AI | Vercel AI SDK v6 + Vercel AI Gateway + Claude |
| Deployment | Vercel (free tier) |
| DB Tooling | Supabase CLI (local dev, migrations, seeding) |
| Package Manager | pnpm |

## Architecture

### Rendering Strategy (Cache Components / PPR)

Three content tiers in every page:

1. **Static shell** -- sidebar, nav, page headers. Prerendered at build time.
2. **Cached data** -- curriculum, FAQ, grade history. Served via `use cache` directive with `cacheLife` profiles and `cacheTag` for invalidation.
3. **Dynamic data** -- AI responses, real-time alerts, task mutations. Streamed in via Suspense boundaries.

### Data Flow

```
Source Files (CSV, PDF, MD)
    |
    v
Seed Scripts (parse + embed)
    |
    v
Supabase Postgres + pgvector
    |
    v
Next.js Server Components (use cache + Suspense)
    |
    v
Client (shadcn/ui + Recharts)
```

## Data Model

### `students`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | |
| roll_number | text | unique |
| degree | text | |
| specialization | text | |
| enrollment_start_term | text | e.g. "Term 3 SY 2024-25" |
| created_at | timestamptz | default now() |

### `courses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| code | text | unique, e.g. "MO-IT101" |
| title | text | |
| type | text | Lec, Lab, Lec/Lab, LFD, Paired |
| units | integer | |
| year | integer | 1-4 |
| term | integer | 1-3 within the year |
| prerequisites | text[] | array of course codes |
| corequisites | text[] | array of course codes |

### `enrollments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK -> students |
| course_id | uuid | FK -> courses |
| term | text | e.g. "Term 1" |
| school_year | text | e.g. "SY 2025-26" |
| grade | text | nullable; "1.00", "P", "INC", "DRP", etc. |
| status | text | passed, inc, drp, in_progress, failed |
| created_at | timestamptz | default now() |

### `alerts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK -> students |
| type | text | inc_deadline, prerequisite_blocker, enrollment_window, graduation_risk |
| title | text | |
| message | text | |
| severity | text | critical, warning, info |
| due_date | date | nullable |
| dismissed | boolean | default false |
| created_at | timestamptz | default now() |

### `knowledge_chunks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| source | text | faq, handbook |
| category | text | nullable |
| title | text | |
| content | text | ~500 token chunks |
| url | text | nullable, source URL for FAQ articles |
| embedding | vector(1536) | pgvector, for similarity search |
| created_at | timestamptz | default now() |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK -> students |
| title | text | |
| description | text | nullable |
| course_id | uuid | nullable FK -> courses |
| due_date | date | nullable |
| completed | boolean | default false |
| created_at | timestamptz | default now() |

### RLS (Future Multi-user)

All personal tables (`enrollments`, `alerts`, `tasks`) have `student_id`. RLS policies will be defined in migrations but not enforced until auth is added. For now, a single student record is used.

## Modules

### 1. Dashboard (`/`)

The landing page. Everything important at a glance.

**Components:**
- **GPA Card** -- cumulative GPA calculated from MMDC's 1.00-5.00 scale (excludes P/INC/DRP). Shows numeric value + descriptor (e.g. "1.35 -- Superior").
- **Progress Ring** -- "X of 155 units completed" with animated ring chart.
- **Graduation Countdown** -- estimated terms remaining based on current pace and remaining units.
- **Alert Feed** -- top 3 active alerts by severity, clickable to `/alerts`.
- **Current Term Courses** -- list of enrolled courses this term with grade status.

**Caching:** Static shell + cached stats (`cacheLife('hours')`, tagged `dashboard-stats`) + dynamic alerts via Suspense.

### 2. Progress Tracker (`/progress`)

Visual map of the entire 4-year curriculum.

**Components:**
- **Curriculum Grid** -- 4 years x 3 terms grid. Each course is a card colored by status:
  - Green: completed/passed
  - Blue: in-progress
  - Yellow: available (prerequisites met, not yet taken)
  - Gray: locked (prerequisites not met)
  - Red: failed/INC
- **Prerequisite Chain View** -- click a course to see upstream dependencies and downstream unlocks. Highlights cascade impact (e.g. MO-IT101 INC blocking 10+ courses).
- **Optimal Path Calculator** -- given current state, suggests course loads per remaining term to graduate on time. Respects prerequisite chains and max load (18 units/term).
- **Units Summary** -- table showing units completed vs required by CHED category (GE-Core, GE-Elective, Professional, Elective, OJT, etc.).

**Caching:** Curriculum data cached (`cacheLife('days')`, tagged `curriculum`). Enrollment status cached (`cacheLife('hours')`, tagged `enrollments`).

### 3. Grade Analyzer (`/grades`)

Deep dive into academic performance.

**Components:**
- **GPA Trend Chart** -- Recharts line chart showing per-term GPA across all completed terms.
- **Grade Distribution** -- bar chart showing count of each grade mark (1.00, 1.25, 1.50, etc.).
- **Course Table** -- sortable/filterable table of all courses with code, title, term, grade, units. Uses shadcn DataTable.
- **GPA Simulator** -- select upcoming courses, input hypothetical grades, see projected cumulative GPA. Interactive sliders or dropdowns for each grade.

**GPA Calculation:** Weighted average using MMDC scale. Only numeric grades (1.00-5.00) count. P, INC, DRP excluded from GPA but INC/DRP tracked as flags. Formula: sum(grade * units) / sum(units) for graded courses.

### 4. Smart Alerts (`/alerts`)

Proactive warning system.

**Alert types:**
- **INC Deadline** -- "MO-IT101 INC must be completed by end of [next term] or becomes 5.00 (F)." Severity: critical.
- **Prerequisite Blocker** -- "Cannot take MO-IT103 (Computer Programming 2) until MO-IT101 is passed." Shows cascade of blocked courses. Severity: warning.
- **Enrollment Window** -- "Enrollment for Term 1 SY 2026-27 opens on [date]." Severity: info.
- **Graduation Risk** -- "At current pace, graduation estimated [date]. X units still needed." Severity: warning if behind schedule.

**Engine:** Server Action runs on dashboard load and when enrollment data changes. Queries `enrollments` + `courses` tables, applies rules, upserts `alerts` table.

**UI:** Filterable list by type and severity. Dismiss button per alert. Critical alerts also show as toast on dashboard.

### 5. Knowledge Base (`/knowledge`)

AI-powered Q&A + browsable FAQ content.

**AI Q&A:**
- Search bar at top of page (also accessible via Cmd+K command palette from any page).
- User types natural language question (e.g. "How do I complete my INC grade?").
- Pipeline: embed query -> pgvector cosine similarity search (top 5 chunks) -> pass chunks + question to Claude via Vercel AI SDK -> stream response with source citations.
- System prompt constrains answers to MMDC-specific content only.
- `useChat` hook for streaming UI.

**Browse:**
- Category grid matching the 13 FAQ categories from the help center.
- Click category -> list of articles.
- Click article -> full content rendered from stored markdown.

**Search:**
- Keyword search fallback using Postgres full-text search (`tsvector`).

**Caching:** Knowledge chunks cached aggressively (`cacheLife('weeks')`, tagged `knowledge`). AI responses are not cached (dynamic, streamed).

### 6. Schedule & Tasks (`/tasks`)

Personal task management and academic calendar.

**Components:**
- **Term Calendar** -- key dates from MMDC academic calendar (enrollment period, class start, last day to drop, grade viewing, etc.). Seeded from handbook data.
- **Task List** -- personal to-do items with title, optional course link, optional due date, completion toggle. Sortable by due date, filterable by course.
- **Quick Add** -- fast task creation from top bar (available on all pages). Title + optional course + optional due date.

**Data:** Tasks stored in `tasks` table. CRUD via Server Actions with `revalidateTag('tasks')`.

## UI Design

### Layout
- **Sidebar** (left, collapsible) -- icons + labels for each module. Active state indicator. Collapse to icon-only on smaller screens.
- **Top bar** -- current term display, quick-add task button, alert bell with unread count, theme toggle.
- **Mobile** -- sidebar becomes bottom tab bar (5 tabs: Dashboard, Progress, Grades, Knowledge, Tasks). Alerts accessible from bell icon.

### Visual Style
- **Dark mode default**, light mode toggle.
- **Modern 2026 aesthetic** -- glass-morphism cards with subtle blur/transparency, smooth micro-animations (Framer Motion), gradient accents, rounded corners, generous spacing.
- **Typography** -- Inter or Geist Sans via `next/font`.
- **Color system:**
  - Background: zinc-950 / slate-950
  - Cards: zinc-900 with subtle border and backdrop-blur
  - Primary accent: blue-500 (actions, links, in-progress)
  - Success: emerald-500 (completed, passed)
  - Warning: amber-500 (INC, caution)
  - Danger: red-500 (failed, critical alerts)
  - Info: sky-400
- **Grade color mapping:**
  - 1.00-1.25: emerald (Excellent/Superior)
  - 1.50-2.00: blue (Very Good/Good/Meritorious)
  - 2.25-2.75: amber (Satisfactory range)
  - 3.00: orange (Passed)
  - 5.00: red (Failed)

### Pages

```
/                     -> Dashboard
/progress             -> Curriculum map + prerequisite chains
/grades               -> Grade analyzer + GPA simulator
/alerts               -> All alerts with filters
/knowledge            -> AI Q&A + category grid
/knowledge/[category] -> Category article list
/tasks                -> Task list + calendar
```

## Supabase CLI Workflow

### Local Development
- `supabase init` -- initialize project
- `supabase start` -- run local Supabase (Postgres, Auth, Storage, etc.)
- `supabase db diff` -- generate migrations from schema changes
- `supabase db push` -- apply migrations to remote

### Migrations
All schema changes managed as SQL migrations in `supabase/migrations/`. Key migrations:
1. `create_tables` -- all 6 tables + indexes
2. `enable_pgvector` -- `CREATE EXTENSION vector`
3. `create_embedding_index` -- IVFFlat index on `knowledge_chunks.embedding`
4. `seed_data` -- initial data load from CSVs + FAQ

### Seeding
Seed scripts in `supabase/seed.sql` and/or TypeScript seed scripts:
- Parse `MMDC BSIT Program Offerings v4.2` CSV -> insert into `courses` with prerequisite arrays
- Parse `Transcript - Database.csv` -> insert into `enrollments`
- Chunk `mmdc-faq.md` + handbook text -> embed via API -> insert into `knowledge_chunks`

## Data Seeding Details

### Curriculum Parser
The BSIT CSV has a specific format:
- Courses grouped by "Year X, Term Y" headers
- Each course row: code, title, type, prerequisite, corequisite, units
- Prerequisites reference course codes (e.g. "MO-IT101")
- Some corequisites span multiple lines (e.g. "MO-IT107L\nMO-IT110")

Parser must handle multi-line corequisites and map year/term position from the CSV structure.

### Transcript Parser
CSV format:
- Header rows (name, roll number, degree) in rows 1-6
- Course data from row 7: term, course_code, course_title, credits, grade
- Grades: numeric (1.00, 1.25, etc.), "P" (passed), "INC" (incomplete)
- Term format: "Term X SY YYYY - YY"

### Knowledge Chunker
- Split FAQ markdown by article (delimited by `## ` headers in the scraped output)
- Split handbook text by section
- Target chunk size: ~500 tokens with overlap
- Preserve source URL and category metadata per chunk
- Generate embeddings via embedding API (e.g. OpenAI text-embedding-3-small or similar via AI Gateway)

## Smart Alert Rules

| Rule | Condition | Severity | Message Template |
|------|-----------|----------|-----------------|
| INC Expiry | enrollment.status = 'inc' AND current term > enrollment.term + 1 | critical | "{course} INC must be completed by end of {next_term} or becomes 5.00 (F)" |
| Prerequisite Blocker | target course prerequisites include a course with status != 'passed' | warning | "Cannot take {target} until {blocker} is passed" |
| Cascade Warning | A blocked course blocks 3+ downstream courses | warning | "{blocker} is blocking {count} downstream courses" |
| Enrollment Window | Calendar date within 2 weeks of enrollment start | info | "Enrollment for {term} opens on {date}" |
| Graduation Pace | remaining_units / (max_load * remaining_terms) > 1 | warning | "At current pace, may not graduate on time. {units} units remaining across {terms} terms" |

## Future Multi-user Path

1. Add Supabase Auth (email/password or Google SSO with MMDC accounts)
2. Enable RLS policies on all personal tables (filter by `auth.uid() = student_id`)
3. Add login/register pages
4. Allow transcript upload (CSV) per user
5. Support BSBA and other specialization tracks

No auth work is done in v1. The schema supports it via `student_id` foreign keys on all personal tables.
