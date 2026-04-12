# High-Impact Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA support, optimal graduation path calculator, knowledge category pages with article content, transcript upload UI, and academic calendar integration.

**Architecture:** Extend existing Next.js app with new pages, components, and a service worker for PWA. All features use existing Supabase database and shadcn/ui components.

**Tech Stack:** Next.js 16, Supabase, shadcn/ui, framer-motion, next-pwa (serwist), recharts

---

## Task 1: PWA Support (Installable App)

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icon-192.png`, `public/icon-512.png`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create web manifest**

Create `src/app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Academics OS",
    short_name: "AcademicsOS",
    description: "Your personal academic command center",
    start_url: "/",
    display: "standalone",
    background_color: "#050506",
    theme_color: "#6366f1",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 2: Generate app icons**

Create simple SVG-based PNG icons using a script or canvas. The icon should be the "A" logo on a dark background with indigo accent. Use a simple approach -- create an SVG file and convert it, or use a minimal canvas script.

- [ ] **Step 3: Add metadata to layout**

In `src/app/layout.tsx`, update the metadata export to include:
```ts
export const metadata: Metadata = {
  title: "Academics OS",
  description: "Your personal academic command center",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Academics OS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};
```

Also add to the `<head>` via metadata:
```ts
other: {
  "mobile-web-app-capable": "yes",
},
```

- [ ] **Step 4: Commit**
```bash
git add src/app/manifest.ts public/ src/app/layout.tsx
git commit -m "feat: add PWA manifest and app icons for installable app"
```

---

## Task 2: Optimal Graduation Path Calculator

**Files:**
- Create: `src/lib/path-calculator.ts`
- Create: `src/components/progress/optimal-path.tsx`
- Modify: `src/app/progress/page.tsx`

- [ ] **Step 1: Create path calculator algorithm**

Create `src/lib/path-calculator.ts`:

The algorithm should:
1. Take all courses, enrollment data, and max units per term (18)
2. Identify remaining courses (not passed)
3. Respect prerequisite chains -- a course can only be scheduled after all prerequisites are passed
4. Distribute courses across remaining terms to minimize total terms
5. Return an array of `{ term: number, courses: Course[] }` representing the optimal schedule

```ts
interface CourseForPath {
  code: string;
  title: string;
  units: number;
  prerequisites: string[];
  status: string;
}

interface TermPlan {
  termNumber: number;
  label: string;
  courses: CourseForPath[];
  totalUnits: number;
}

export function calculateOptimalPath(
  allCourses: CourseForPath[],
  maxUnitsPerTerm: number
): TermPlan[]
```

The algorithm uses topological sort on the prerequisite DAG:
1. Build adjacency list from prerequisites
2. Calculate "depth" of each remaining course (longest prerequisite chain)
3. Sort remaining courses by depth (shallowest first = can be taken earliest)
4. Greedily fill each term up to maxUnitsPerTerm, respecting that prerequisites must be in earlier terms
5. Label terms starting from "Term 1" (next available)

- [ ] **Step 2: Create optimal path component**

Create `src/components/progress/optimal-path.tsx`:

A client component that displays the calculated path as a timeline/list:
- Each term is a Card showing: term label, list of courses, total units
- Color coding: green if on track, amber if heavy (close to 18 units), red if overloaded
- Summary at top: "Estimated graduation in N terms"
- Collapsible by default, expandable via button "Show Optimal Path"

- [ ] **Step 3: Wire into progress page**

Read `src/app/progress/page.tsx`. Pass the course data to the OptimalPath component. Add it below the curriculum grid.

- [ ] **Step 4: Commit**
```bash
git add src/lib/path-calculator.ts src/components/progress/ src/app/progress/
git commit -m "feat: add optimal graduation path calculator"
```

---

## Task 3: Knowledge Category Pages

**Files:**
- Modify: `src/app/knowledge/[category]/page.tsx`
- Create: `src/components/knowledge/article-list.tsx`

- [ ] **Step 1: Create article list component**

Create `src/components/knowledge/article-list.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  url: string | null;
  source: string;
}

export function ArticleList({ articles }: { articles: Article[] }) {
  // Show articles as expandable cards
  // Title visible, content collapsed by default
  // Click to expand and show full content
  // If URL exists, show "View on MMDC" link
}
```

Use shadcn Accordion or Collapsible for expand/collapse. Each article shows:
- Title (always visible)
- Source badge (FAQ / Handbook)
- Expand to reveal full content (rendered as text, not markdown since it's plain text chunks)
- External link if URL exists

- [ ] **Step 2: Update category page**

Update `src/app/knowledge/[category]/page.tsx`:
- Map the category slug to search terms (e.g., "getting-started" -> search for chunks with titles/content matching getting started topics)
- Query Supabase `knowledge_chunks` table with full-text search matching the category
- Render ArticleList with results
- Add a "Back to Knowledge Base" link
- Add PageHeader with category name

The category-to-search mapping:
```ts
const categoryMap: Record<string, string> = {
  "getting-started": "getting started onboarding welcome orientation",
  "enrollment-and-admissions": "enrollment admission enroll registration",
  "academic-programs-and-policies": "academic program policy curriculum course",
  "college-resources": "resource library e-book database",
  "student-services": "student service advising counseling",
  "tech-tips-troubleshooting": "tech tip troubleshoot google camu",
  "tuition-scholarships-and-financial-aid": "tuition fee payment scholarship financial",
  "internship-graduation": "internship practicum graduation capstone",
  "career-development-services": "career development job employment",
  "student-engagement-clubs-orgs": "club organization student engagement activity",
  "faqs": "faq frequently asked question",
  "feedback-sentiments": "feedback suggestion sentiment",
  "news-and-announcements": "news announcement update calendar",
};
```

- [ ] **Step 3: Commit**
```bash
git add src/app/knowledge/ src/components/knowledge/
git commit -m "feat: add knowledge category pages with article browsing"
```

---

## Task 4: Transcript Upload UI

**Files:**
- Create: `src/components/grades/transcript-upload.tsx`
- Create: `src/actions/transcript.ts`
- Modify: `src/app/grades/page.tsx`

- [ ] **Step 1: Create upload server action**

Create `src/actions/transcript.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { parse } from "csv-parse/sync";
```

The action receives FormData with a CSV file, parses it using the same logic as `scripts/seed-transcript.ts`, and upserts enrollment records. It should:
1. Read the CSV from FormData
2. Parse with same format (rows 7+, term/course_code/grade columns)
3. Look up student and course IDs
4. Upsert enrollments (delete old + insert new for the student)
5. Return { success: true, count: number } or { error: string }

Note: `csv-parse` is already in devDependencies. For server actions it needs to be a regular dependency. Move it or use a simpler parsing approach (split by newlines and commas).

- [ ] **Step 2: Create upload component**

Create `src/components/grades/transcript-upload.tsx`:

A client component with:
- File input (accepts .csv)
- Drag-and-drop zone
- Upload button
- Progress/status indicator
- Preview of parsed data before confirming
- Toast on success/error

Use shadcn Dialog to show a modal when user clicks "Update Transcript":
1. User clicks button -> dialog opens
2. User drops/selects CSV file
3. Preview table shows parsed courses + grades
4. User clicks "Import" to confirm
5. Server action runs, toast shows result
6. Page refreshes with new data

- [ ] **Step 3: Add to grades page**

In `src/app/grades/page.tsx`, add an "Update Transcript" button in the page header area that opens the upload dialog.

- [ ] **Step 4: Commit**
```bash
git add src/actions/transcript.ts src/components/grades/transcript-upload.tsx src/app/grades/page.tsx
git commit -m "feat: add transcript CSV upload for updating grades"
```

---

## Task 5: Academic Calendar Integration

**Files:**
- Create: `src/lib/academic-calendar.ts`
- Create: `src/components/tasks/calendar-events.tsx`
- Modify: `src/app/tasks/page.tsx`

- [ ] **Step 1: Create calendar data**

Create `src/lib/academic-calendar.ts` with hardcoded MMDC calendar events extracted from the handbook and FAQ data:

```ts
export interface CalendarEvent {
  title: string;
  date: string; // ISO date
  type: "enrollment" | "deadline" | "exam" | "holiday" | "event";
  description?: string;
}

export const academicCalendar: CalendarEvent[] = [
  // Term 3 SY 2025-26 events (from the scraped calendar)
  { title: "Start of Classes", date: "2026-03-23", type: "event" },
  { title: "Last Day of Late Enrollment", date: "2026-03-29", type: "deadline" },
  { title: "Last Day for Cancellation of Enrollment (with refund)", date: "2026-04-04", type: "deadline" },
  { title: "Last Day for Dropping Courses", date: "2026-05-30", type: "deadline" },
  { title: "Last Day of Regular Classes", date: "2026-06-20", type: "event" },
  { title: "Submission of Final Outputs", date: "2026-06-21", type: "deadline" },
  { title: "Viewing of Final Grades", date: "2026-07-01", type: "event" },
  // Add more events from the calendar data
];

export function getUpcomingEvents(limit = 5): CalendarEvent[] {
  const now = new Date().toISOString().split("T")[0];
  return academicCalendar
    .filter((e) => e.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 2: Create calendar events component**

Create `src/components/tasks/calendar-events.tsx`:

A card showing upcoming academic calendar events:
- List of next 5 events
- Each shows: title, date, days until, type badge (color-coded)
- Urgent events (< 7 days) highlighted
- "View all" link or expandable

- [ ] **Step 3: Add to tasks page**

In `src/app/tasks/page.tsx`, add the CalendarEvents component above or beside the task list. On desktop, show it in a sidebar layout. On mobile, show it above the tasks.

- [ ] **Step 4: Commit**
```bash
git add src/lib/academic-calendar.ts src/components/tasks/ src/app/tasks/
git commit -m "feat: add academic calendar integration to tasks page"
```

---

## Task 6: Final Build + Push

- [ ] **Step 1: Build check**
```bash
pnpm build
pnpm lint
```

- [ ] **Step 2: Push**
```bash
git push
```
