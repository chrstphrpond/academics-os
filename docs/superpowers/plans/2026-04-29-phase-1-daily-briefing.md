# Phase 1 — Daily Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Daily Briefing hero — an AI-generated, structured summary at the top of the v2 dashboard that tells the student what matters today (headline + key bullets + risks + study focus + suggested actions), grounded in their transcript, alerts, tasks, calendar, and current courses.

**Architecture:** Server Component flow. A pure data layer (`briefing/data.ts`) gathers all inputs in parallel via `withAuth` (RLS-aware Drizzle); a generator (`briefing/generate.ts`) packs them into a typed prompt and calls `generateObject(gemini-2.5-pro)` with a Zod schema; the result is cached for 6h via Next.js 16 Cache Components (`'use cache'` + `cacheTag('briefing-${studentId}')`). A small typed UI tree renders each field (headline, bullets, risk-list, study-focus-list, cta-actions) — never raw markdown. A refresh button calls a Server Action that runs `updateTag` to invalidate. Behind feature flag `feature.briefing`, only when `dashboard.v2` is on.

**Tech Stack:** Next.js 16 App Router (Cache Components), React 19 Server Components, AI SDK 6 (`generateObject`), Vertex Gemini 2.5 Pro, Drizzle, Zod 4, Tailwind v4, shadcn/ui.

**Pre-conditions:**
- Phase 0 foundation is complete and tagged `phase-0-foundation`.
- Vertex round-trip works (`/api/agent/test-vertex` returns a Gemini reply).
- `feature.briefing` flag is already declared in `src/lib/feature-flags.ts` (Phase 0 Task 2).

**Note on Cache Components:** the project's `next.config.ts` has `cacheComponents: true`. Use the `'use cache'` directive plus `cacheTag` and `cacheLife` from `next/cache`. Reference `node_modules/next/dist/docs/` for current syntax (per `AGENTS.md`) before authoring cache helpers.

**Note on streaming:** the spec mentions `streamObject` for partials. Phase 1 ships **non-streaming** (`generateObject` only) for simplicity and reliability. Phase 1.5 can layer streaming via `streamUI` once the static path is shipped and tested. This is an explicit YAGNI cut; the cached, batched Pro response paints in 1–3 seconds and is acceptable for the hero card.

---

## File Structure

**Create:**
- `src/lib/briefing/schema.ts` — Zod schema for the structured briefing output and the `AgentToolProposal` type
- `src/lib/briefing/data.ts` — gathers transcript / alerts / tasks / calendar / current courses for a student
- `src/lib/briefing/data.test.ts` — unit tests with mocked Drizzle
- `src/lib/briefing/prompt.ts` — system + user prompt builders (pure functions over the gathered data)
- `src/lib/briefing/prompt.test.ts` — unit tests verifying prompt content includes key signals
- `src/lib/briefing/generate.ts` — orchestrator: gather → prompt → `generateObject` → return validated `Briefing`
- `src/lib/briefing/generate.test.ts` — unit tests with mocked Vertex
- `src/lib/briefing/cache.ts` — Cache Components helper that wraps `generate` with `'use cache'` + tag + 6h life
- `src/components/briefing/briefing-hero.tsx` — Server Component, calls cached generator, renders the hero
- `src/components/briefing/briefing-headline.tsx` — typed sub-component (presentation only)
- `src/components/briefing/briefing-bullets.tsx` — typed sub-component
- `src/components/briefing/risk-list.tsx` — typed sub-component
- `src/components/briefing/study-focus-list.tsx` — typed sub-component
- `src/components/briefing/cta-actions.tsx` — typed sub-component (renders `AgentToolProposal[]` as static cards for Phase 1; Phase 2 wires execute/approve)
- `src/components/briefing/briefing-skeleton.tsx` — loading state for `<Suspense>`
- `src/components/briefing/briefing-error.tsx` — error boundary fallback
- `src/components/briefing/refresh-button.tsx` — Client Component, calls the server action, shows pending state
- `src/actions/briefing.ts` — Server Action: `revalidateBriefing()` calls `updateTag(briefing-${studentId})`

**Modify:**
- `src/app/page.tsx` — when `dashboard.v2` AND `feature.briefing` are on, render `<BriefingHero />` above the rest of the v2 placeholder; otherwise render the existing legacy/placeholder paths unchanged

---

## Task 1: Briefing schema (Zod)

**Files:**
- Create: `src/lib/briefing/schema.ts`

- [ ] **Step 1: Create the schema file**

`src/lib/briefing/schema.ts`:

```ts
import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "warning", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RiskSchema = z.object({
  title: z.string().min(1),
  severity: SeveritySchema,
  dueDate: z.string().date().optional(),
});
export type Risk = z.infer<typeof RiskSchema>;

export const StudyFocusSchema = z.object({
  course: z.string().min(1),
  topic: z.string().min(1),
  why: z.string().min(1),
});
export type StudyFocus = z.infer<typeof StudyFocusSchema>;

export const AgentToolProposalSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.unknown()),
  rationale: z.string().min(1),
});
export type AgentToolProposal = z.infer<typeof AgentToolProposalSchema>;

export const BriefingSchema = z.object({
  headline: z.string().min(1).max(200),
  bullets: z.array(z.string().min(1)).min(1).max(6),
  risks: z.array(RiskSchema).max(6),
  studyFocus: z.array(StudyFocusSchema).max(4),
  ctaActions: z.array(AgentToolProposalSchema).max(4),
});
export type Briefing = z.infer<typeof BriefingSchema>;
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/briefing/schema.ts
git commit -m "feat(briefing): Zod schema for structured briefing output"
```

---

## Task 2: Data layer (TDD)

**Files:**
- Create: `src/lib/briefing/data.ts`
- Test: `src/lib/briefing/data.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/briefing/data.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const txQueryEnrollments = vi.fn();
const txQueryAlerts = vi.fn();
const txQueryTasks = vi.fn();

vi.mock("@/lib/db/auth", () => ({
  withAuth: vi.fn(async (cb: any) =>
    cb({
      query: {
        enrollments: { findMany: txQueryEnrollments },
        alerts: { findMany: txQueryAlerts },
        tasks: { findMany: txQueryTasks },
      },
    })
  ),
}));

vi.mock("@/lib/db", () => ({
  schema: {
    enrollments: { studentId: "studentId_col", schoolYear: "schoolYear_col", term: "term_col" },
    alerts: { studentId: "studentId_col", dismissed: "dismissed_col" },
    tasks: { studentId: "studentId_col", completed: "completed_col" },
  },
}));

vi.mock("@/lib/academic-calendar", () => ({
  getUpcomingEvents: vi.fn(() => [
    { title: "End of Classes (Term 3)", date: "2026-07-29", type: "event" as const },
  ]),
}));

import { gatherBriefingData } from "./data";

describe("gatherBriefingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txQueryEnrollments.mockResolvedValue([
      {
        grade: "1.00",
        status: "passed",
        term: "Term 2",
        schoolYear: "SY 2025-26",
        course: { code: "MO-IT118", title: "Cloud Computing", units: 3 },
      },
      {
        grade: null,
        status: "in_progress",
        term: "Term 3",
        schoolYear: "SY 2025-26",
        course: { code: "MO-IT108", title: "Discrete Structures", units: 3 },
      },
    ]);
    txQueryAlerts.mockResolvedValue([
      { id: "a1", title: "Clear INC", severity: "critical", dueDate: "2026-05-29", message: "..." },
    ]);
    txQueryTasks.mockResolvedValue([
      { id: "t1", title: "Submit makeup", dueDate: "2026-05-15", completed: false, course: null },
    ]);
  });

  it("fetches enrollments, alerts, tasks, and calendar in parallel", async () => {
    const result = await gatherBriefingData("student-1");

    expect(result.enrollments).toHaveLength(2);
    expect(result.activeAlerts).toHaveLength(1);
    expect(result.openTasks).toHaveLength(1);
    expect(result.upcomingEvents).toHaveLength(1);
    expect(result.upcomingEvents[0].title).toMatch(/end of classes/i);
  });

  it("identifies the current term as the most recent in_progress enrollment", async () => {
    const result = await gatherBriefingData("student-1");
    expect(result.currentTerm).toEqual({ term: "Term 3", schoolYear: "SY 2025-26" });
  });

  it("falls back to the most recent term when no enrollments are in_progress", async () => {
    txQueryEnrollments.mockResolvedValueOnce([
      {
        grade: "2.50",
        status: "passed",
        term: "Term 2",
        schoolYear: "SY 2025-26",
        course: { code: "MO-MATH035", title: "Math in Modern World", units: 3 },
      },
    ]);
    const result = await gatherBriefingData("student-1");
    expect(result.currentTerm).toEqual({ term: "Term 2", schoolYear: "SY 2025-26" });
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm test data`
Expected: FAIL — `gatherBriefingData` not exported.

- [ ] **Step 3: Implement**

`src/lib/briefing/data.ts`:

```ts
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withAuth } from "@/lib/db/auth";
import { getUpcomingEvents, type CalendarEvent } from "@/lib/academic-calendar";

export interface EnrollmentSnapshot {
  grade: string | null;
  status: string;
  term: string;
  schoolYear: string;
  course: { code: string; title: string; units: number } | null;
}

export interface AlertSnapshot {
  id: string;
  title: string;
  severity: string;
  dueDate: string | null;
  message: string;
}

export interface TaskSnapshot {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  course: { code: string; title: string } | null;
}

export interface BriefingData {
  enrollments: EnrollmentSnapshot[];
  activeAlerts: AlertSnapshot[];
  openTasks: TaskSnapshot[];
  upcomingEvents: CalendarEvent[];
  currentTerm: { term: string; schoolYear: string } | null;
}

function pickCurrentTerm(
  enrollments: EnrollmentSnapshot[]
): BriefingData["currentTerm"] {
  const inProgress = enrollments.find((e) => e.status === "in_progress");
  if (inProgress) {
    return { term: inProgress.term, schoolYear: inProgress.schoolYear };
  }
  if (enrollments.length === 0) return null;
  const latest = enrollments[0];
  return { term: latest.term, schoolYear: latest.schoolYear };
}

export async function gatherBriefingData(studentId: string): Promise<BriefingData> {
  const [enrollments, activeAlerts, openTasks] = await withAuth(async (tx) => {
    const e = tx.query.enrollments.findMany({
      where: eq(schema.enrollments.studentId, studentId),
      with: { course: true },
      orderBy: [desc(schema.enrollments.schoolYear), desc(schema.enrollments.term)],
    });
    const a = tx.query.alerts.findMany({
      where: and(
        eq(schema.alerts.studentId, studentId),
        eq(schema.alerts.dismissed, false)
      ),
      orderBy: [desc(schema.alerts.createdAt)],
      limit: 8,
    });
    const t = tx.query.tasks.findMany({
      where: and(
        eq(schema.tasks.studentId, studentId),
        eq(schema.tasks.completed, false)
      ),
      with: { course: true },
      orderBy: [desc(schema.tasks.createdAt)],
      limit: 12,
    });
    return Promise.all([e, a, t]);
  });

  const upcomingEvents = getUpcomingEvents(5);

  return {
    enrollments: enrollments as EnrollmentSnapshot[],
    activeAlerts: activeAlerts as AlertSnapshot[],
    openTasks: openTasks as TaskSnapshot[],
    upcomingEvents,
    currentTerm: pickCurrentTerm(enrollments as EnrollmentSnapshot[]),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test data`
Expected: 3 passed.

- [ ] **Step 5: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/briefing/data.ts src/lib/briefing/data.test.ts
git commit -m "feat(briefing): RLS-aware data gatherer for transcript/alerts/tasks/calendar"
```

---

## Task 3: Prompt builder (TDD)

**Files:**
- Create: `src/lib/briefing/prompt.ts`
- Test: `src/lib/briefing/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/briefing/prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildBriefingPrompt, BRIEFING_SYSTEM_PROMPT } from "./prompt";
import type { BriefingData } from "./data";

const fixture: BriefingData = {
  enrollments: [
    {
      grade: null,
      status: "in_progress",
      term: "Term 3",
      schoolYear: "SY 2025-26",
      course: { code: "MO-IT108", title: "Discrete Structures", units: 3 },
    },
    {
      grade: "INC",
      status: "inc",
      term: "Term 2",
      schoolYear: "SY 2025-26",
      course: { code: "MO-IT101", title: "Computer Programming 1", units: 2 },
    },
  ],
  activeAlerts: [
    {
      id: "a1",
      title: "Clear INC for MO-IT101",
      severity: "critical",
      dueDate: "2026-05-29",
      message: "Submit makeup work to your professor.",
    },
  ],
  openTasks: [
    {
      id: "t1",
      title: "Read DSA chapter 4",
      dueDate: "2026-05-02",
      completed: false,
      course: { code: "MO-IT108", title: "Discrete Structures" },
    },
  ],
  upcomingEvents: [
    { title: "Last Day for Enrollment", date: "2026-04-30", type: "deadline" },
  ],
  currentTerm: { term: "Term 3", schoolYear: "SY 2025-26" },
};

describe("BRIEFING_SYSTEM_PROMPT", () => {
  it("instructs the model to be specific and grounded", () => {
    expect(BRIEFING_SYSTEM_PROMPT).toMatch(/grounded/i);
    expect(BRIEFING_SYSTEM_PROMPT).toMatch(/specific/i);
  });
});

describe("buildBriefingPrompt", () => {
  it("includes the current term and date", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Term 3/);
    expect(out).toMatch(/SY 2025-26/);
    expect(out).toMatch(/2026-04-29/);
  });

  it("includes critical alerts and upcoming deadlines", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Clear INC for MO-IT101/);
    expect(out).toMatch(/2026-05-29/);
    expect(out).toMatch(/Last Day for Enrollment/);
  });

  it("includes the open tasks", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Read DSA chapter 4/);
  });

  it("lists in-progress enrollments distinctly from INCs", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Discrete Structures/);
    expect(out).toMatch(/Computer Programming 1/);
    expect(out).toMatch(/INC/);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm test prompt`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/briefing/prompt.ts`:

```ts
import type { BriefingData } from "./data";

export const BRIEFING_SYSTEM_PROMPT = `You are an academic assistant for an MMDC student. Produce a daily briefing that is short, specific, and grounded in the data provided. Do not invent courses, grades, or deadlines that aren't in the input. The reader is a busy student — every line must earn its place.

Output a structured object with:
- headline: one sentence (≤120 chars) capturing the single most important thing today
- bullets: 3–6 short, scannable bullets covering academic state and what to do next
- risks: zero or more concrete risks (INC deadlines, enrollment cutoffs, falling-behind signals); set severity to "critical" if a deadline is within 7 days, "warning" within 30 days, "info" otherwise
- studyFocus: 1–3 specific things to study today, each tied to a course code and topic
- ctaActions: 0–3 suggested actions the student could click; each names a tool ("addTask" | "dismissAlert" | "clearInc" | "searchKnowledge" | "simulateGpa" | "proposePlan"), provides args, and a one-sentence rationale

Tone: direct, calm, no exclamation marks, no greetings, no signoffs.`;

function fmtEnrollment(e: BriefingData["enrollments"][number]): string {
  const grade = e.grade ?? "-";
  const code = e.course?.code ?? "?";
  const title = e.course?.title ?? "?";
  const units = e.course?.units ?? 0;
  return `  • [${e.status}] ${code} — ${title} (${units}u, ${e.schoolYear} ${e.term}, grade ${grade})`;
}

function fmtAlert(a: BriefingData["activeAlerts"][number]): string {
  const due = a.dueDate ? ` (due ${a.dueDate})` : "";
  return `  • [${a.severity}] ${a.title}${due}: ${a.message}`;
}

function fmtTask(t: BriefingData["openTasks"][number]): string {
  const due = t.dueDate ? ` (due ${t.dueDate})` : "";
  const code = t.course?.code ? `[${t.course.code}] ` : "";
  return `  • ${code}${t.title}${due}`;
}

function fmtEvent(e: BriefingData["upcomingEvents"][number]): string {
  return `  • [${e.type}] ${e.title} — ${e.date}`;
}

export function buildBriefingPrompt(data: BriefingData, today: Date): string {
  const todayStr = today.toISOString().slice(0, 10);
  const term = data.currentTerm
    ? `${data.currentTerm.term} ${data.currentTerm.schoolYear}`
    : "no current term";

  const inProgress = data.enrollments.filter((e) => e.status === "in_progress");
  const incs = data.enrollments.filter((e) => e.status === "inc");
  const recent = data.enrollments.filter(
    (e) => e.status !== "in_progress" && e.status !== "inc"
  ).slice(0, 8);

  return [
    `Today's date: ${todayStr}`,
    `Current term: ${term}`,
    "",
    "=== In-progress courses ===",
    inProgress.length ? inProgress.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Incomplete (INC) courses ===",
    incs.length ? incs.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Recent enrollments (most recent first) ===",
    recent.length ? recent.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Active alerts ===",
    data.activeAlerts.length
      ? data.activeAlerts.map(fmtAlert).join("\n")
      : "  (none)",
    "",
    "=== Open tasks ===",
    data.openTasks.length
      ? data.openTasks.map(fmtTask).join("\n")
      : "  (none)",
    "",
    "=== Upcoming calendar events ===",
    data.upcomingEvents.length
      ? data.upcomingEvents.map(fmtEvent).join("\n")
      : "  (none)",
    "",
    "Produce the briefing now.",
  ].join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test prompt`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/briefing/prompt.ts src/lib/briefing/prompt.test.ts
git commit -m "feat(briefing): system + user prompt builders"
```

---

## Task 4: Generator (TDD)

**Files:**
- Create: `src/lib/briefing/generate.ts`
- Test: `src/lib/briefing/generate.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/briefing/generate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateObjectMock, runVertexInsert, dataMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  runVertexInsert: vi.fn(),
  dataMock: vi.fn(),
}));

vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@/lib/ai/vertex", () => ({ model: (k: string) => ({ providerKey: k }) }));
vi.mock("@/lib/briefing/data", () => ({ gatherBriefingData: dataMock }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({ values: () => ({ returning: async () => [{ id: "run-1" }] }) }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  },
  schema: { agentRuns: { id: "agentRuns_id_col" } },
}));

import { generateBriefing } from "./generate";

describe("generateBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataMock.mockResolvedValue({
      enrollments: [],
      activeAlerts: [],
      openTasks: [],
      upcomingEvents: [],
      currentTerm: { term: "Term 3", schoolYear: "SY 2025-26" },
    });
    generateObjectMock.mockResolvedValue({
      object: {
        headline: "All clear today",
        bullets: ["Sail through Discrete Structures", "Confirm Term 3 enrollment"],
        risks: [],
        studyFocus: [],
        ctaActions: [],
      },
      usage: { inputTokens: 200, outputTokens: 30 },
    });
  });

  it("returns the parsed Briefing object", async () => {
    const result = await generateBriefing("student-1");
    expect(result.headline).toBe("All clear today");
    expect(result.bullets.length).toBeGreaterThan(0);
  });

  it("calls generateObject with the briefing schema and the gemini-2.5-pro model", async () => {
    await generateBriefing("student-1");
    expect(generateObjectMock).toHaveBeenCalledOnce();
    const args = generateObjectMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toEqual({ providerKey: "pro" });
    expect(typeof args.system).toBe("string");
    expect(typeof args.prompt).toBe("string");
    expect(args.schema).toBeDefined();
  });

  it("throws a typed error if the model output fails schema validation", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { headline: "" /* invalid: must be non-empty */, bullets: [], risks: [], studyFocus: [], ctaActions: [] },
      usage: { inputTokens: 100, outputTokens: 10 },
    });
    await expect(generateBriefing("student-1")).rejects.toThrow(/briefing/i);
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `pnpm test generate`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/briefing/generate.ts`:

```ts
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { model } from "@/lib/ai/vertex";
import { MODELS, FEATURES } from "@/lib/ai/models";
import { gatherBriefingData } from "./data";
import { buildBriefingPrompt, BRIEFING_SYSTEM_PROMPT } from "./prompt";
import { BriefingSchema, type Briefing } from "./schema";

export async function generateBriefing(studentId: string): Promise<Briefing> {
  const [data, runRow] = await Promise.all([
    gatherBriefingData(studentId),
    db
      .insert(schema.agentRuns)
      .values({
        studentId,
        feature: FEATURES.briefing,
        model: MODELS.pro,
      })
      .returning({ id: schema.agentRuns.id }),
  ]);
  const runId = runRow[0].id;

  const startedAt = Date.now();
  const result = await generateObject({
    model: model("pro"),
    system: BRIEFING_SYSTEM_PROMPT,
    prompt: buildBriefingPrompt(data, new Date()),
    schema: BriefingSchema,
  });
  const latencyMs = Date.now() - startedAt;

  const usage = result.usage as
    | { inputTokens?: number; outputTokens?: number }
    | undefined;

  await db
    .update(schema.agentRuns)
    .set({
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      latencyMs,
    })
    .where(eq(schema.agentRuns.id, runId));

  // generateObject already validates against the schema and throws a ZodError
  // if validation fails. Defensively re-validate to surface a clearer message.
  const parsed = BriefingSchema.safeParse(result.object);
  if (!parsed.success) {
    throw new Error(
      `Briefing failed schema validation: ${parsed.error.message}`
    );
  }
  return parsed.data;
}
```

Note: the `agent_runs` insert uses `db` (HTTP) not `dbAuth` because the runtime row has the studentId and we accept the WITH CHECK policy will reject it. To work around the policy: this insert must run inside `withAuth`. Update accordingly:

```ts
import { withAuth } from "@/lib/db/auth";

export async function generateBriefing(studentId: string): Promise<Briefing> {
  const [data, runId] = await Promise.all([
    gatherBriefingData(studentId),
    withAuth(async (tx) => {
      const inserted = await tx
        .insert(schema.agentRuns)
        .values({
          studentId,
          feature: FEATURES.briefing,
          model: MODELS.pro,
        })
        .returning({ id: schema.agentRuns.id });
      return inserted[0].id;
    }),
  ]);

  const startedAt = Date.now();
  const result = await generateObject({
    model: model("pro"),
    system: BRIEFING_SYSTEM_PROMPT,
    prompt: buildBriefingPrompt(data, new Date()),
    schema: BriefingSchema,
  });
  const latencyMs = Date.now() - startedAt;

  const usage = result.usage as
    | { inputTokens?: number; outputTokens?: number }
    | undefined;

  await withAuth(async (tx) => {
    await tx
      .update(schema.agentRuns)
      .set({
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        latencyMs,
      })
      .where(eq(schema.agentRuns.id, runId));
  });

  const parsed = BriefingSchema.safeParse(result.object);
  if (!parsed.success) {
    throw new Error(
      `Briefing failed schema validation: ${parsed.error.message}`
    );
  }
  return parsed.data;
}
```

Update the test mocks to mock `@/lib/db/auth` instead of (or in addition to) `@/lib/db`:

```ts
vi.mock("@/lib/db/auth", () => ({
  withAuth: vi.fn(async (cb: any) =>
    cb({
      insert: () => ({
        values: () => ({ returning: async () => [{ id: "run-1" }] }),
      }),
      update: () => ({
        set: () => ({ where: async () => {} }),
      }),
    })
  ),
}));
```

Remove the `@/lib/db` mock if no longer needed by the test. Re-run the tests.

- [ ] **Step 4: Run tests → pass**

Run: `pnpm test generate`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/briefing/generate.ts src/lib/briefing/generate.test.ts
git commit -m "feat(briefing): generator wires Vertex generateObject + agent_runs telemetry"
```

---

## Task 5: Cache wrapper

**Files:**
- Create: `src/lib/briefing/cache.ts`

- [ ] **Step 1: Implement**

`src/lib/briefing/cache.ts`:

```ts
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from "next/cache";
import { generateBriefing } from "./generate";
import type { Briefing } from "./schema";

export async function getCachedBriefing(studentId: string): Promise<Briefing> {
  "use cache";
  cacheTag(`briefing-${studentId}`);
  cacheLife({ revalidate: 6 * 60 * 60 }); // 6 hours
  return generateBriefing(studentId);
}

export function briefingTagFor(studentId: string): string {
  return `briefing-${studentId}`;
}
```

(`unstable_cacheTag` and `unstable_cacheLife` are the current Next.js 16 names exported from `next/cache`. If the build complains they're not exported under those names, check `node_modules/next/dist/docs/` and adjust to whichever the runtime publishes — the API was stabilized but the import names may have shifted. The `'use cache'` directive itself is stable.)

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/briefing/cache.ts
git commit -m "feat(briefing): Next.js Cache Components wrapper with 6h revalidate"
```

---

## Task 6: Server Action for refresh

**Files:**
- Create: `src/actions/briefing.ts`

- [ ] **Step 1: Implement**

`src/actions/briefing.ts`:

```ts
"use server";

import { unstable_updateTag as updateTag } from "next/cache";
import { getCurrentStudentId } from "@/lib/db/auth";

export async function revalidateBriefing(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { ok: false, reason: "no-student" };
  updateTag(`briefing-${studentId}`);
  return { ok: true };
}
```

(Same caveat about `unstable_updateTag` import — if Next.js 16 stabilized the name, swap to the stable export.)

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/actions/briefing.ts
git commit -m "feat(briefing): server action to revalidate the briefing cache tag"
```

---

## Task 7: Sub-component — headline

**Files:**
- Create: `src/components/briefing/briefing-headline.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/briefing-headline.tsx`:

```tsx
export function BriefingHeadline({ children }: { children: string }) {
  return (
    <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/briefing/briefing-headline.tsx
git commit -m "feat(briefing): headline sub-component"
```

---

## Task 8: Sub-component — bullets

**Files:**
- Create: `src/components/briefing/briefing-bullets.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/briefing-bullets.tsx`:

```tsx
export function BriefingBullets({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm text-foreground/85">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/briefing/briefing-bullets.tsx
git commit -m "feat(briefing): bullets sub-component"
```

---

## Task 9: Sub-component — risks

**Files:**
- Create: `src/components/briefing/risk-list.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/risk-list.tsx`:

```tsx
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Risk } from "@/lib/briefing/schema";

const ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const COLORS = {
  critical: "text-red-400",
  warning: "text-amber-400",
  info: "text-sky-400",
} as const;

export function RiskList({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Risks
      </h3>
      <ul className="space-y-1">
        {risks.map((r, i) => {
          const Icon = ICONS[r.severity];
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${COLORS[r.severity]}`} />
              <span className="font-medium">{r.title}</span>
              {r.dueDate && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  · due {r.dueDate}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/briefing/risk-list.tsx
git commit -m "feat(briefing): risk list sub-component"
```

---

## Task 10: Sub-component — study focus

**Files:**
- Create: `src/components/briefing/study-focus-list.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/study-focus-list.tsx`:

```tsx
import type { StudyFocus } from "@/lib/briefing/schema";

export function StudyFocusList({ items }: { items: StudyFocus[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Study focus
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((s, i) => (
          <li key={i} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground">{s.course}</span>
              <span className="font-medium text-foreground">{s.topic}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/briefing/study-focus-list.tsx
git commit -m "feat(briefing): study focus sub-component"
```

---

## Task 11: Sub-component — CTA actions (Phase 1 read-only)

**Files:**
- Create: `src/components/briefing/cta-actions.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/cta-actions.tsx`:

```tsx
import type { AgentToolProposal } from "@/lib/briefing/schema";

/**
 * Phase 1 renders proposed actions as inert cards.
 * Phase 2 wires Approve/Edit/Cancel through the ToolCard system.
 */
export function CtaActions({ actions }: { actions: AgentToolProposal[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Suggested actions
      </h3>
      <ul className="space-y-2">
        {actions.map((a, i) => (
          <li
            key={i}
            className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{a.tool}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                proposed
              </span>
            </div>
            <p className="mt-1 text-foreground/85">{a.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/briefing/cta-actions.tsx
git commit -m "feat(briefing): CTA actions sub-component (Phase 1 read-only)"
```

---

## Task 12: Skeleton + error states

**Files:**
- Create: `src/components/briefing/briefing-skeleton.tsx`
- Create: `src/components/briefing/briefing-error.tsx`

- [ ] **Step 1: Skeleton**

`src/components/briefing/briefing-skeleton.tsx`:

```tsx
export function BriefingSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/40 p-5">
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-muted/70" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-muted/70" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Error**

`src/components/briefing/briefing-error.tsx`:

```tsx
import { AlertCircle } from "lucide-react";

export function BriefingError({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-amber-200">
        <AlertCircle className="h-4 w-4" aria-hidden />
        Briefing unavailable
      </div>
      <p className="mt-1 text-amber-200/80">
        {message ??
          "Couldn't reach the briefing service. Your dashboard is still here — try refreshing in a minute."}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/briefing/briefing-skeleton.tsx src/components/briefing/briefing-error.tsx
git commit -m "feat(briefing): skeleton + error fallback components"
```

---

## Task 13: Refresh button (Client Component)

**Files:**
- Create: `src/components/briefing/refresh-button.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/refresh-button.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revalidateBriefing } from "@/actions/briefing";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await revalidateBriefing();
        });
      }}
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
        aria-hidden
      />
      {pending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/briefing/refresh-button.tsx
git commit -m "feat(briefing): refresh button calls revalidateBriefing server action"
```

---

## Task 14: Briefing hero (Server Component)

**Files:**
- Create: `src/components/briefing/briefing-hero.tsx`

- [ ] **Step 1: Implement**

`src/components/briefing/briefing-hero.tsx`:

```tsx
import { getCurrentStudentId } from "@/lib/db/auth";
import { getCachedBriefing } from "@/lib/briefing/cache";
import { BriefingHeadline } from "./briefing-headline";
import { BriefingBullets } from "./briefing-bullets";
import { RiskList } from "./risk-list";
import { StudyFocusList } from "./study-focus-list";
import { CtaActions } from "./cta-actions";
import { BriefingError } from "./briefing-error";
import { RefreshButton } from "./refresh-button";

export async function BriefingHero() {
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return <BriefingError message="Sign in to see your briefing." />;
  }

  let briefing;
  try {
    briefing = await getCachedBriefing(studentId);
  } catch (err) {
    return (
      <BriefingError
        message={
          err instanceof Error
            ? `Briefing unavailable: ${err.message}`
            : undefined
        }
      />
    );
  }

  const isEmpty =
    briefing.bullets.length === 0 &&
    briefing.risks.length === 0 &&
    briefing.studyFocus.length === 0 &&
    briefing.ctaActions.length === 0;

  return (
    <section
      aria-labelledby="briefing-headline"
      className="relative overflow-hidden rounded-lg border border-border bg-card/60 p-5 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Today's briefing
          </p>
          <BriefingHeadline>
            <span id="briefing-headline">{briefing.headline}</span>
          </BriefingHeadline>
        </div>
        <RefreshButton />
      </div>

      {isEmpty ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing pressing today. Enjoy the calm.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <BriefingBullets bullets={briefing.bullets} />
            <RiskList risks={briefing.risks} />
          </div>
          <div className="space-y-4">
            <StudyFocusList items={briefing.studyFocus} />
            <CtaActions actions={briefing.ctaActions} />
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/briefing/briefing-hero.tsx
git commit -m "feat(briefing): hero Server Component composing all sub-views"
```

---

## Task 15: Wire into v2 dashboard behind feature.briefing

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current page**

```bash
cat src/app/page.tsx
```

Note the v1/v2 branch from Phase 0 Task 18. The v2 placeholder currently renders just the `<h1>` and a paragraph. Phase 1 adds the briefing above that — only when `feature.briefing` is also enabled.

- [ ] **Step 2: Modify the v2 branch**

At the top of `src/app/page.tsx`, add imports:

```tsx
import { BriefingHero } from "@/components/briefing/briefing-hero";
import { BriefingSkeleton } from "@/components/briefing/briefing-skeleton";
```

Inside `DashboardPage`, after `const v2 = await isFlagEnabled("dashboard.v2");`, also resolve the briefing flag:

```tsx
const briefingOn = await isFlagEnabled("feature.briefing");
```

Replace the v2 placeholder block with:

```tsx
if (v2) {
  return (
    <div className="space-y-6 p-6">
      {briefingOn ? (
        <Suspense fallback={<BriefingSkeleton />}>
          <BriefingHero />
        </Suspense>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Enable <code>feature.briefing</code> to see the daily briefing.
        </div>
      )}
      <h1 className="text-xl font-semibold tracking-tight">
        Dashboard v2 (foundation only)
      </h1>
      <p className="text-sm text-muted-foreground">
        Sidekick and the rest land in subsequent phases.
      </p>
    </div>
  );
}
```

The `<Suspense>` wraps the `BriefingHero` Server Component so its async work doesn't block the rest of the v2 page from streaming.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: PASS. The build output should still list `/` as `◐ (Partial Prerender)`.

- [ ] **Step 4: Type-check + tests**

```bash
pnpm tsc --noEmit
pnpm test
```

Expected: PASS, all 17+ tests passing (the existing 14 plus 3 new — data, prompt, generate).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(dashboard): wire briefing hero into v2 path behind feature.briefing"
```

---

## Task 16: Verification gate

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2: All unit tests**

```bash
pnpm test
```

Expected: all tests passing. Phase 0 had 14; Phase 1 adds at least 11 (Task 2 = 3, Task 3 = 5, Task 4 = 3) → 25+ total.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: PASS. Confirm the `/` route still appears.

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: 0 errors. Pre-existing warnings about `result` and `chartTheme` carry over and are acceptable.

- [ ] **Step 5: Manual end-to-end (you do this)**

1. `pnpm dev`
2. Sign in via Clerk if not already.
3. In DevTools console:
   ```js
   document.cookie = "ff=dashboard.v2=1;feature.briefing=1; path=/";
   location.reload();
   ```
4. Briefing hero should render at the top of the dashboard within 2–4 seconds.
5. Click **Refresh** — the briefing should re-fetch (look for a new `agent_runs` row at `/admin/runs`).
6. Confirm the headline is non-generic and the bullets/risks are grounded in your real data (mention real course codes from your transcript).
7. Confirm an `agent_runs` row appears with feature `briefing`, model `gemini-2.5-pro`, populated tokens and latency.

If any of those fail, stop and fix before tagging.

- [ ] **Step 6: Tag the phase**

```bash
git tag -a phase-1-briefing -m "Phase 1 — daily briefing shipped behind feature.briefing"
```

---

## Self-Review

**Spec coverage:**
- Server Component fetches transcript + alerts + tasks + calendar + current courses → Task 2 ✓
- Pack into structured prompt for `gemini-2.5-pro` → Task 3 + 4 ✓
- `generateObject` for first paint → Task 4 ✓
- Output schema (headline, bullets, risks, studyFocus, ctaActions) → Task 1 ✓
- Cached for 6h via Cache Components, tag-based invalidation → Tasks 5 + 6 ✓
- Manual refresh button → Tasks 6 + 13 ✓
- Renders with typed components, never raw markdown → Tasks 7–11 + 14 ✓
- Empty / error / streaming (skeleton) states → Tasks 12 + 14 ✓
- Behind `feature.briefing` flag, only when `dashboard.v2` is on → Task 15 ✓

**Explicit YAGNI cuts (documented):** `streamObject` partial-paint streaming is deferred to Phase 1.5; static `generateObject` is sufficient for Phase 1.

**Placeholder scan:** No "TBD" / "implement later" / vague "handle edge cases" steps. Two soft-references (`unstable_cacheTag`, `unstable_updateTag`) include explicit fallback instructions ("if the build complains, check `node_modules/next/dist/docs/`") rather than guesswork.

**Type consistency:** `Briefing`, `Risk`, `StudyFocus`, `AgentToolProposal` defined in Task 1 and consumed in Tasks 4, 9, 10, 11, 14. `gatherBriefingData(studentId)` returns `BriefingData` consumed in Tasks 3 + 4. `getCachedBriefing(studentId)` returns `Briefing` consumed in Task 14. All consistent.

**Phase 0 dependency:** Tasks 4, 6, 14 depend on `getCurrentStudentId` from `@/lib/db/auth` and `withAuth` — both shipped in Phase 0. Task 4 depends on `model("pro")` from `@/lib/ai/vertex` — shipped in Phase 0.

**Untested-but-shipped:** Sub-components (Tasks 7–13) ship without unit tests because they're pure presentation with no logic; visual verification happens at the manual gate (Task 16 step 5). If you want stronger coverage later, RTL snapshot tests for each are straightforward to add.
