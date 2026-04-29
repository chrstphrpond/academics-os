# Phase 3 — GPA Simulator with AI Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a three-view simulator (`What-If`, `Targets`, `Scholarship Bands`) on `/grades` that lets the student slide grades to see their GWA update live, ask Gemini Pro for the realistic grade combinations needed to hit a target GWA, and surface scholarship band thresholds with handbook citations.

**Architecture:** The deterministic engine (`src/lib/gpa.ts`) stays the source of truth. Phase 3 adds three thin layers on top: (a) a `<SimulatorPanel>` shell with three tabs that share live what-if state; (b) a Server Action `solveTarget` that calls `generateObject(gemini-2.5-pro)` with a constrained Zod schema to return ranked grade plans + AI explanation; (c) a `scholarships` table seeded from the handbook plus a `<ScholarshipBands>` view that shows the bands with cited source chunks. The existing Phase 2 `simulateGpa` tool keeps working — Phase 3 replaces the simulator UI but doesn't break the tool surface.

**Tech Stack:** Next.js 16 App Router, AI SDK 6 (`generateObject`), Vertex Gemini 2.5 Pro, Drizzle, Zod 4, Tailwind v4, shadcn/ui.

**Pre-conditions:**
- Phase 2 complete and tagged `phase-2-sidekick`.
- `feature.simulator` flag declared in `src/lib/feature-flags.ts` (Phase 0).
- `simulateGpa` tool registered (Phase 2).
- The deterministic engine (`src/lib/gpa.ts`) exposes `calculateGpa(enrollments)` returning `{ gpa, descriptor, totalUnitsGraded, totalUnitsPassed, totalUnitsAll }` and `calculateTermGpas(enrollments)` returning per-term breakdowns.
- The existing `/grades` page already renders a `<GpaSimulator />` — Phase 3 replaces it with `<SimulatorPanel />` behind the flag (off → legacy, on → Phase 3 view).

**Reading note:** Next.js 16 has breaking changes — consult `node_modules/next/dist/docs/` for any App Router APIs (Cache Components, Server Actions) before authoring.

---

## File Structure

**Create:**
- `src/lib/gpa/types.ts` — pull existing engine types out of `gpa.ts` so the new modules can import them without circular deps. (Or keep them in `gpa.ts` if cleaner; the simulator modules just need `EnrollmentWithCourse` + `GpaResult`.)
- `src/lib/simulator/whatif.ts` — pure functions: `applyOverrides(enrollments, overrides)` returns a new enrollments list with overrides folded in; `computeWhatIf(enrollments, overrides)` returns `{ baseline, simulated }` GPA results.
- `src/lib/simulator/whatif.test.ts` — TDD coverage.
- `src/lib/simulator/target-schema.ts` — Zod schema for the AI target solver output (ranked plans + rationale + assumptions).
- `src/lib/simulator/target-solver.ts` — server-side `solveTarget(input, ctx)` that calls `generateObject(gemini-2.5-pro)` with the schema and a constraint-aware prompt.
- `src/lib/simulator/target-solver.test.ts` — TDD coverage with mocked Vertex.
- `src/lib/simulator/scholarships.ts` — seed/lookup for scholarship bands; reads from new `scholarships` table.
- `src/actions/simulator.ts` — Server Actions: `runTargetSolver(input)`, `listScholarshipBands()`.
- `src/components/simulator/simulator-panel.tsx` — top-level container with three tabs sharing what-if state.
- `src/components/simulator/whatif-view.tsx` — sliders/selects per upcoming course → live GWA + units.
- `src/components/simulator/targets-view.tsx` — input target GWA + term hint → calls `runTargetSolver` → renders ranked plans + AI rationale.
- `src/components/simulator/bands-view.tsx` — lists scholarship thresholds with handbook citations.
- `src/components/simulator/grade-stat.tsx` — small reusable stat tile (label + value + delta).
- `drizzle/0004_scholarships.sql` — manual SQL: `scholarships` table + RLS allow-all-read policy.
- `scripts/seed-scholarships.ts` — one-shot seed from a hand-curated JSON of MMDC scholarship bands (President's, Dean's, Latin honors).

**Modify:**
- `src/lib/db/schema.ts` — append `scholarships` table + relations + types.
- `src/app/grades/page.tsx` — branch on `feature.simulator` flag: render `<SimulatorPanel />` when on, legacy `<GpaSimulator />` when off.
- `src/lib/agent/tools/simulate-gpa.tsx` — extend to optionally include scholarship gap notes when `target` is set, by reusing `listScholarshipBands()`.

---

## Task 1: Scholarships table

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0004_scholarships.sql`

- [ ] **Step 1: Append schema**

In `src/lib/db/schema.ts`, before the inferred-types block, add:

```ts
export const scholarships = pgTable(
  "scholarships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    minGpa: text("min_gpa").notNull(), // stored as text to preserve "1.00" formatting
    maxGpa: text("max_gpa").notNull(),
    note: text("note"),
    sourceChunkId: uuid("source_chunk_id").references(() => knowledgeChunks.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);
```

In the inferred-types block, append:

```ts
export type Scholarship = typeof scholarships.$inferSelect;
export type NewScholarship = typeof scholarships.$inferInsert;
```

- [ ] **Step 2: Generate migration**

```bash
pnpm db:generate
pnpm db:push --force
```

- [ ] **Step 3: RLS migration**

Create `drizzle/0004_scholarships.sql`:

```sql
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY scholarships_read_all ON scholarships
  FOR SELECT USING (true);
```

Apply:

```bash
dotenv -e .env.local --override -- tsx -e "import {Client} from '@neondatabase/serverless';import {readFileSync} from 'fs';const c=new Client(process.env.DATABASE_URL_UNPOOLED);await c.connect();const sql=readFileSync('drizzle/0004_scholarships.sql','utf-8');for(const stmt of sql.split(/;\\s*\\n/).map(s=>s.split('\\n').filter(l=>!l.trim().startsWith('--')).join('\\n').trim()).filter(s=>s)){console.log('  ✓',stmt.slice(0,80));await c.query(stmt);}await c.end();console.log('done')"
```

- [ ] **Step 4: Re-apply prior RLS policies (db:push wiped them)**

```bash
pnpm db:apply-rls
dotenv -e .env.local --override -- tsx -e "import {Client} from '@neondatabase/serverless';import {readFileSync} from 'fs';const c=new Client(process.env.DATABASE_URL_UNPOOLED);await c.connect();const sql=readFileSync('drizzle/0003_agent_conversations_rls.sql','utf-8');for(const stmt of sql.split(/;\\s*\\n/).map(s=>s.split('\\n').filter(l=>!l.trim().startsWith('--')).join('\\n').trim()).filter(s=>s)){try{await c.query(stmt);console.log('  ✓',stmt.slice(0,80))}catch(e){console.log('  skip',stmt.slice(0,80))}};await c.end()"
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(db): scholarships table with read-all RLS"
```

---

## Task 2: Seed scholarships

**Files:**
- Create: `scripts/seed-scholarships.ts`
- Modify: `package.json` (add `seed:scholarships` script)

- [ ] **Step 1: Write the seed script**

Create `scripts/seed-scholarships.ts`:

```ts
import { db, schema } from "@/lib/db";

const BANDS = [
  { name: "President's List", minGpa: "1.00", maxGpa: "1.20", note: "GWA between 1.00 and 1.20 with no grade lower than 1.50." },
  { name: "Dean's List", minGpa: "1.21", maxGpa: "1.45", note: "GWA between 1.21 and 1.45 with no grade lower than 1.75." },
  { name: "Summa Cum Laude", minGpa: "1.00", maxGpa: "1.20", note: "Latin honors at graduation." },
  { name: "Magna Cum Laude", minGpa: "1.21", maxGpa: "1.45", note: "Latin honors at graduation." },
  { name: "Cum Laude", minGpa: "1.46", maxGpa: "1.75", note: "Latin honors at graduation." },
];

async function main() {
  for (const b of BANDS) {
    await db
      .insert(schema.scholarships)
      .values(b)
      .onConflictDoNothing({ target: schema.scholarships.name });
  }
  const all = await db.select().from(schema.scholarships);
  console.log(`Seeded scholarships (${all.length} rows):`);
  for (const s of all) console.log(`  ${s.name}: ${s.minGpa}–${s.maxGpa}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add the script**

In `package.json` `"scripts"`:

```json
"seed:scholarships": "dotenv -e .env.local --override -- tsx scripts/seed-scholarships.ts"
```

Update `seed:all` to include it:

```json
"seed:all": "pnpm seed:courses && pnpm seed:transcript && pnpm seed:knowledge && pnpm seed:scholarships"
```

- [ ] **Step 3: Run the seed**

```bash
pnpm seed:scholarships
```

Expected: 5 rows printed.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-scholarships.ts package.json
git commit -m "feat(seed): scholarship bands (President's/Dean's/Latin honors)"
```

---

## Task 3: What-if engine (TDD)

**Files:**
- Create: `src/lib/simulator/whatif.ts`
- Create: `src/lib/simulator/whatif.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/simulator/whatif.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyOverrides, computeWhatIf } from "./whatif";
import type { EnrollmentWithCourse } from "@/lib/gpa";

const baseline: EnrollmentWithCourse[] = [
  {
    grade: "1.50",
    status: "passed",
    term: "Term 1",
    school_year: "SY 2025-26",
    course: { code: "MO-IT117", title: "Data Viz", units: 3 },
  },
  {
    grade: null,
    status: "in_progress",
    term: "Term 3",
    school_year: "SY 2025-26",
    course: { code: "MO-IT108", title: "Discrete Structures", units: 3 },
  },
];

describe("applyOverrides", () => {
  it("returns the original list when overrides are empty", () => {
    const out = applyOverrides(baseline, []);
    expect(out).toHaveLength(2);
    expect(out[1].grade).toBeNull();
  });

  it("replaces grades for matched course codes and marks them passed", () => {
    const out = applyOverrides(baseline, [
      { courseCode: "MO-IT108", grade: "1.75" },
    ]);
    expect(out[1].grade).toBe("1.75");
    expect(out[1].status).toBe("passed");
  });

  it("ignores overrides for course codes that don't appear", () => {
    const out = applyOverrides(baseline, [
      { courseCode: "DOES-NOT-EXIST", grade: "1.00" },
    ]);
    expect(out).toEqual(baseline);
  });
});

describe("computeWhatIf", () => {
  it("returns baseline + simulated GpaResult", () => {
    const result = computeWhatIf(baseline, [
      { courseCode: "MO-IT108", grade: "1.00" },
    ]);
    expect(result.baseline.gpa).toBeCloseTo(1.5, 2);
    expect(result.simulated.gpa).toBeLessThan(result.baseline.gpa);
    expect(result.simulated.totalUnitsPassed).toBeGreaterThan(
      result.baseline.totalUnitsPassed
    );
  });
});
```

- [ ] **Step 2: Run test → fail**

```bash
pnpm test whatif
```

FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/simulator/whatif.ts`:

```ts
import { calculateGpa, type EnrollmentWithCourse, type GpaResult } from "@/lib/gpa";

export interface GradeOverride {
  courseCode: string;
  grade: string;
}

export function applyOverrides(
  enrollments: EnrollmentWithCourse[],
  overrides: GradeOverride[]
): EnrollmentWithCourse[] {
  if (overrides.length === 0) return enrollments;
  const map = new Map(overrides.map((o) => [o.courseCode, o.grade]));
  return enrollments.map((e) => {
    const override = map.get(e.course.code);
    if (override == null) return e;
    return { ...e, grade: override, status: "passed" };
  });
}

export interface WhatIfResult {
  baseline: GpaResult;
  simulated: GpaResult;
}

export function computeWhatIf(
  enrollments: EnrollmentWithCourse[],
  overrides: GradeOverride[]
): WhatIfResult {
  return {
    baseline: calculateGpa(enrollments),
    simulated: calculateGpa(applyOverrides(enrollments, overrides)),
  };
}
```

- [ ] **Step 4: Run tests → pass**

```bash
pnpm test whatif
```

PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/simulator/whatif.ts src/lib/simulator/whatif.test.ts
git commit -m "feat(simulator): pure what-if engine (applyOverrides + computeWhatIf)"
```

---

## Task 4: Target solver schema + prompt

**Files:**
- Create: `src/lib/simulator/target-schema.ts`

- [ ] **Step 1: Schema**

Create `src/lib/simulator/target-schema.ts`:

```ts
import { z } from "zod";

export const TargetPlanSchema = z.object({
  label: z.string().min(1).max(60),
  /** Per-course grade picks for the upcoming term(s). */
  picks: z
    .array(
      z.object({
        courseCode: z.string().min(1),
        grade: z.string().regex(/^(1\.00|1\.25|1\.50|1\.75|2\.00|2\.25|2\.50|2\.75|3\.00)$/),
      })
    )
    .min(1)
    .max(8),
  /** Resulting cumulative GWA the model expects (model's own arithmetic; UI re-verifies). */
  expectedGwa: z.number().min(1).max(5),
  /** Confidence 0..1 — penalize plans that need many ≤1.50 grades. */
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(500),
});
export type TargetPlan = z.infer<typeof TargetPlanSchema>;

export const TargetSolverOutputSchema = z.object({
  /** Up to 3 ranked candidates, best-confidence first. */
  plans: z.array(TargetPlanSchema).min(1).max(3),
  /** Assumptions the model made (e.g. "MO-IT101 INC clears at 1.75"). */
  assumptions: z.array(z.string().min(1)).max(5),
  /** Caveat text — visible to the user under the plan list. */
  caveat: z.string().min(1).max(300),
});
export type TargetSolverOutput = z.infer<typeof TargetSolverOutputSchema>;
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/lib/simulator/target-schema.ts
git commit -m "feat(simulator): target solver Zod schema"
```

---

## Task 5: Target solver (TDD)

**Files:**
- Create: `src/lib/simulator/target-solver.ts`
- Create: `src/lib/simulator/target-solver.test.ts`

- [ ] **Step 1: Failing test**

Create `src/lib/simulator/target-solver.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateObjectMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@/lib/ai/vertex", () => ({ model: (k: string) => ({ providerKey: k }) }));

import { solveTarget } from "./target-solver";
import type { EnrollmentWithCourse } from "@/lib/gpa";

const enrollments: EnrollmentWithCourse[] = [
  {
    grade: "1.50",
    status: "passed",
    term: "Term 2",
    school_year: "SY 2025-26",
    course: { code: "MO-IT118", title: "Cloud Computing", units: 3 },
  },
];

describe("solveTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateObjectMock.mockResolvedValue({
      object: {
        plans: [
          {
            label: "Aggressive",
            picks: [{ courseCode: "MO-IT108", grade: "1.00" }],
            expectedGwa: 1.4,
            confidence: 0.7,
            rationale: "Maxing the next course gets you closest to 1.40.",
          },
        ],
        assumptions: ["MO-IT101 INC clears at 1.75"],
        caveat: "Confidence shrinks as you require more 1.00 grades.",
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    });
  });

  it("returns the parsed TargetSolverOutput", async () => {
    const out = await solveTarget({ enrollments, target: 1.4, upcomingCourseCodes: ["MO-IT108"] });
    expect(out.plans).toHaveLength(1);
    expect(out.plans[0].label).toBe("Aggressive");
  });

  it("calls generateObject with gemini-2.5-pro and the schema", async () => {
    await solveTarget({ enrollments, target: 1.4, upcomingCourseCodes: ["MO-IT108"] });
    const args = generateObjectMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toEqual({ providerKey: "pro" });
    expect(typeof args.system).toBe("string");
    expect(typeof args.prompt).toBe("string");
    expect(args.schema).toBeDefined();
  });

  it("re-validates the model output with safeParse and throws on invalid", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { plans: [], assumptions: [], caveat: "" },
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    await expect(
      solveTarget({ enrollments, target: 1.4, upcomingCourseCodes: ["MO-IT108"] })
    ).rejects.toThrow(/target solver/i);
  });
});
```

- [ ] **Step 2: Run → fail**

```bash
pnpm test target-solver
```

FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/simulator/target-solver.ts`:

```ts
import { generateObject } from "ai";
import { model } from "@/lib/ai/vertex";
import {
  TargetSolverOutputSchema,
  type TargetSolverOutput,
} from "./target-schema";
import type { EnrollmentWithCourse } from "@/lib/gpa";

export interface SolveTargetArgs {
  enrollments: EnrollmentWithCourse[];
  target: number;
  upcomingCourseCodes: string[];
  /** Optional hint, e.g. "Term 3 SY 2025-26". */
  termHint?: string;
}

const SYSTEM_PROMPT = `You are a grade-target solver for an MMDC student.

Given the student's existing enrollments and the courses they're about to take, produce 1–3 plans that, if achieved, would land the cumulative GWA at or below the target. Use the MMDC scale (1.00 = best, 5.00 = fail). Only use grades from {1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00}.

Rank plans by realism — a plan that needs many 1.00s gets lower confidence than one with mixed grades. Cap confidence at 0.95.

Each plan must include "picks" only for courses listed in upcomingCourseCodes. Compute expectedGwa using the picks + existing enrollments. State realistic assumptions (e.g. "INC in MO-IT101 clears at 1.75").

Be honest in the caveat: if the target is unreachable even with all 1.00s, say so plainly.`;

function fmtEnrollment(e: EnrollmentWithCourse): string {
  return `  • [${e.status}] ${e.course.code} (${e.course.units}u, ${e.school_year} ${e.term}) grade ${e.grade ?? "-"}`;
}

function buildPrompt(args: SolveTargetArgs): string {
  return [
    `Target cumulative GWA: ${args.target.toFixed(2)}`,
    args.termHint ? `Upcoming term: ${args.termHint}` : null,
    "",
    "=== Existing enrollments ===",
    args.enrollments.length ? args.enrollments.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Upcoming course codes the student will take ===",
    args.upcomingCourseCodes.length
      ? args.upcomingCourseCodes.map((c) => `  • ${c}`).join("\n")
      : "  (none — solver should explain that no plan can change the GWA)",
    "",
    "Produce the plans now.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function solveTarget(
  args: SolveTargetArgs
): Promise<TargetSolverOutput> {
  const result = await generateObject({
    model: model("pro"),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(args),
    schema: TargetSolverOutputSchema,
  });
  const parsed = TargetSolverOutputSchema.safeParse(result.object);
  if (!parsed.success) {
    throw new Error(`Target solver output invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

- [ ] **Step 4: Run → pass**

```bash
pnpm test target-solver
```

PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/simulator/target-solver.ts src/lib/simulator/target-solver.test.ts
git commit -m "feat(simulator): target solver wires generateObject(gemini-2.5-pro)"
```

---

## Task 6: Scholarships helper

**Files:**
- Create: `src/lib/simulator/scholarships.ts`

- [ ] **Step 1: Implement**

```ts
import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";

export interface ScholarshipBand {
  id: string;
  name: string;
  minGpa: string;
  maxGpa: string;
  note: string | null;
  sourceChunkId: string | null;
}

export async function listScholarshipBands(): Promise<ScholarshipBand[]> {
  return db
    .select({
      id: schema.scholarships.id,
      name: schema.scholarships.name,
      minGpa: schema.scholarships.minGpa,
      maxGpa: schema.scholarships.maxGpa,
      note: schema.scholarships.note,
      sourceChunkId: schema.scholarships.sourceChunkId,
    })
    .from(schema.scholarships)
    .orderBy(asc(schema.scholarships.minGpa));
}

export interface BandStatus {
  band: ScholarshipBand;
  inBand: boolean;
  /** Negative means above (worse than) the band; positive means below the floor. */
  gapToFloor: number;
}

export function bandStatusFor(
  gpa: number,
  bands: ScholarshipBand[]
): BandStatus[] {
  return bands.map((b) => {
    const min = parseFloat(b.minGpa);
    const max = parseFloat(b.maxGpa);
    const inBand = gpa >= min && gpa <= max;
    const gapToFloor = parseFloat((max - gpa).toFixed(2));
    return { band: b, inBand, gapToFloor };
  });
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/lib/simulator/scholarships.ts
git commit -m "feat(simulator): scholarships helper (list + band status)"
```

---

## Task 7: Server Actions for the simulator

**Files:**
- Create: `src/actions/simulator.ts`

- [ ] **Step 1: Implement**

```ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { getCurrentStudentId } from "@/lib/db/auth";
import { solveTarget } from "@/lib/simulator/target-solver";
import { listScholarshipBands } from "@/lib/simulator/scholarships";
import type { TargetSolverOutput } from "@/lib/simulator/target-schema";
import type { EnrollmentWithCourse } from "@/lib/gpa";

export interface RunTargetSolverArgs {
  target: number;
  upcomingCourseCodes: string[];
  termHint?: string;
}

export type RunTargetSolverResult =
  | { ok: true; result: TargetSolverOutput }
  | { ok: false; error: string };

export async function runTargetSolver(
  args: RunTargetSolverArgs
): Promise<RunTargetSolverResult> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return { ok: false, error: "unauthenticated" };

  // Pull the student's enrollments inside withExplicitAuth so RLS is satisfied.
  const enrollments = await withExplicitAuth(clerkUserId, async (tx) => {
    const rows = await tx.query.enrollments.findMany({
      where: eq(schema.enrollments.studentId, studentId),
      with: { course: true },
    });
    return rows.map<EnrollmentWithCourse>((e) => ({
      grade: e.grade,
      status: e.status,
      term: e.term,
      school_year: e.schoolYear,
      course: {
        code: e.course?.code ?? "",
        title: e.course?.title ?? "",
        units: e.course?.units ?? 0,
      },
    }));
  });

  try {
    const result = await solveTarget({
      enrollments,
      target: args.target,
      upcomingCourseCodes: args.upcomingCourseCodes,
      termHint: args.termHint,
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listBands() {
  return listScholarshipBands();
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/actions/simulator.ts
git commit -m "feat(simulator): server actions runTargetSolver + listBands"
```

---

## Task 8: GradeStat reusable tile

**Files:**
- Create: `src/components/simulator/grade-stat.tsx`

- [ ] **Step 1: Implement**

```tsx
import { cn } from "@/lib/utils";

export interface GradeStatProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number; // positive = better (lower GWA), negative = worse
  className?: string;
}

export function GradeStat({ label, value, hint, delta, className }: GradeStatProps) {
  const valueStr = typeof value === "number" ? value.toFixed(2) : value;
  const deltaColor =
    delta == null ? "" : delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground";
  return (
    <div className={cn("rounded-md border border-border/60 bg-card/40 px-3 py-2 text-center", className)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums leading-tight">{valueStr}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {delta != null && (
        <div className={cn("text-xs tabular-nums", deltaColor)}>
          {delta > 0 ? "▼" : delta < 0 ? "▲" : "·"} {Math.abs(delta).toFixed(2)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/simulator/grade-stat.tsx
git commit -m "feat(simulator): GradeStat tile primitive"
```

---

## Task 9: What-if view

**Files:**
- Create: `src/components/simulator/whatif-view.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useMemo, useState } from "react";
import { computeWhatIf, type GradeOverride } from "@/lib/simulator/whatif";
import type { EnrollmentWithCourse } from "@/lib/gpa";
import { MMDC_GRADE_SCALE } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GradeStat } from "./grade-stat";

const GRADE_OPTIONS = MMDC_GRADE_SCALE.filter((g) => g.grade < 4).map((g) => ({
  value: g.grade.toFixed(2),
  label: `${g.grade.toFixed(2)} — ${g.descriptor}`,
}));

export interface WhatIfViewProps {
  enrollments: EnrollmentWithCourse[];
  /** Courses the student is currently in or about to take. */
  upcomingCourses: { code: string; title: string; units: number }[];
  /** Lifted override state — Targets view also reads this. */
  overrides: GradeOverride[];
  onOverridesChange(next: GradeOverride[]): void;
}

export function WhatIfView({
  enrollments,
  upcomingCourses,
  overrides,
  onOverridesChange,
}: WhatIfViewProps) {
  const [target] = useState<number | null>(null);
  const result = useMemo(
    () => computeWhatIf(enrollments, overrides),
    [enrollments, overrides]
  );

  const setGrade = (courseCode: string, grade: string | null) => {
    const next = overrides.filter((o) => o.courseCode !== courseCode);
    if (grade) next.push({ courseCode, grade });
    onOverridesChange(next);
  };

  const delta = result.baseline.gpa - result.simulated.gpa;
  const unitsDelta =
    result.simulated.totalUnitsPassed - result.baseline.totalUnitsPassed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <GradeStat label="Baseline" value={result.baseline.gpa} hint={result.baseline.descriptor} />
        <GradeStat
          label="Simulated"
          value={result.simulated.gpa}
          hint={result.simulated.descriptor}
          delta={delta}
        />
        <GradeStat
          label="Units passed"
          value={result.simulated.totalUnitsPassed}
          delta={unitsDelta}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Upcoming courses
        </h3>
        {upcomingCourses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No upcoming courses to override.
          </p>
        )}
        {upcomingCourses.map((c) => {
          const current =
            overrides.find((o) => o.courseCode === c.code)?.grade ?? "";
          return (
            <div
              key={c.code}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{c.code}</div>
                <div className="truncate text-sm">{c.title}</div>
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">
                {c.units}u
              </div>
              <Select
                value={current}
                onValueChange={(v) => setGrade(c.code, v === "_clear" ? null : v)}
              >
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue placeholder="Pick a grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_clear">Clear</SelectItem>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Used by future "Target" sub-feature — keep stub here so panel can pass through */}
      {target != null && (
        <p className="text-xs text-muted-foreground">Target: {target.toFixed(2)}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/components/simulator/whatif-view.tsx
git commit -m "feat(simulator): What-if view with live GWA + per-course grade picker"
```

---

## Task 10: Targets view

**Files:**
- Create: `src/components/simulator/targets-view.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runTargetSolver } from "@/actions/simulator";
import type { TargetSolverOutput, TargetPlan } from "@/lib/simulator/target-schema";
import type { GradeOverride } from "@/lib/simulator/whatif";

export interface TargetsViewProps {
  upcomingCourseCodes: string[];
  termHint?: string;
  /** When the user clicks "Apply", the picks fold into the panel-level overrides. */
  onApplyPlan(plan: TargetPlan): void;
}

export function TargetsView({
  upcomingCourseCodes,
  termHint,
  onApplyPlan,
}: TargetsViewProps) {
  const [target, setTarget] = useState("1.50");
  const [pending, start] = useTransition();
  const [output, setOutput] = useState<TargetSolverOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const num = parseFloat(target);
      if (isNaN(num) || num < 1 || num > 5) {
        setError("Target must be between 1.00 and 5.00.");
        return;
      }
      const r = await runTargetSolver({
        target: num,
        upcomingCourseCodes,
        termHint,
      });
      if (r.ok) setOutput(r.result);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Target cumulative GWA
          </label>
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="1.50"
            className="text-sm"
          />
        </div>
        <Button type="submit" disabled={pending} className="gap-1.5 text-xs">
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          Solve
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {output && (
        <div className="space-y-3">
          {output.plans.map((p, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-card/60 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.label}</div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  exp {p.expectedGwa.toFixed(2)} · conf {(p.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs">
                {p.picks.map((pk, j) => (
                  <li key={j} className="flex justify-between">
                    <span className="font-mono text-muted-foreground">{pk.courseCode}</span>
                    <span className="font-mono">{pk.grade}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-foreground/85">{p.rationale}</p>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyPlan(p)}
                  className="text-xs"
                >
                  Apply to What-If
                </Button>
              </div>
            </div>
          ))}

          {output.assumptions.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Assumptions: </span>
              {output.assumptions.join(" · ")}
            </div>
          )}
          <p className="text-xs italic text-muted-foreground">{output.caveat}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/simulator/targets-view.tsx
git commit -m "feat(simulator): Targets view (Gemini-solved grade plans)"
```

---

## Task 11: Bands view

**Files:**
- Create: `src/components/simulator/bands-view.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { bandStatusFor, type ScholarshipBand } from "@/lib/simulator/scholarships";

export interface BandsViewProps {
  baselineGpa: number;
  simulatedGpa: number;
  bands: ScholarshipBand[];
}

export function BandsView({ baselineGpa, simulatedGpa, bands }: BandsViewProps) {
  const baselineStatus = bandStatusFor(baselineGpa, bands);
  const simulatedStatus = bandStatusFor(simulatedGpa, bands);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">Band</div>
        <div className="text-right text-muted-foreground">Baseline</div>
        <div className="text-right text-muted-foreground">Simulated</div>
        {bands.map((b, i) => {
          const baseline = baselineStatus[i];
          const sim = simulatedStatus[i];
          return (
            <div key={b.id} className="contents">
              <div className="rounded-md border border-border/60 bg-card/40 px-2 py-1.5">
                <div className="text-sm font-medium">{b.name}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {b.minGpa}–{b.maxGpa}
                </div>
                {b.note && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {b.note}
                  </div>
                )}
              </div>
              <div className="self-center text-right tabular-nums">
                {baseline.inBand ? (
                  <span className="text-emerald-400">in</span>
                ) : baseline.gapToFloor < 0 ? (
                  <span className="text-muted-foreground">+{Math.abs(baseline.gapToFloor).toFixed(2)}</span>
                ) : (
                  <span className="text-amber-400">−{baseline.gapToFloor.toFixed(2)}</span>
                )}
              </div>
              <div className="self-center text-right tabular-nums">
                {sim.inBand ? (
                  <span className="text-emerald-400">in</span>
                ) : sim.gapToFloor < 0 ? (
                  <span className="text-muted-foreground">+{Math.abs(sim.gapToFloor).toFixed(2)}</span>
                ) : (
                  <span className="text-amber-400">−{sim.gapToFloor.toFixed(2)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Bands sourced from the MMDC handbook. "−" shows the gap below the floor;
        "+" shows the margin above the ceiling.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/simulator/bands-view.tsx
git commit -m "feat(simulator): scholarship Bands view (baseline vs simulated)"
```

---

## Task 12: SimulatorPanel container

**Files:**
- Create: `src/components/simulator/simulator-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { WhatIfView } from "./whatif-view";
import { TargetsView } from "./targets-view";
import { BandsView } from "./bands-view";
import { computeWhatIf, type GradeOverride } from "@/lib/simulator/whatif";
import type { EnrollmentWithCourse } from "@/lib/gpa";
import type { ScholarshipBand } from "@/lib/simulator/scholarships";

export interface SimulatorPanelProps {
  enrollments: EnrollmentWithCourse[];
  upcomingCourses: { code: string; title: string; units: number }[];
  bands: ScholarshipBand[];
  termHint?: string;
}

export function SimulatorPanel({
  enrollments,
  upcomingCourses,
  bands,
  termHint,
}: SimulatorPanelProps) {
  const [overrides, setOverrides] = useState<GradeOverride[]>([]);
  const result = computeWhatIf(enrollments, overrides);

  const upcomingCodes = upcomingCourses.map((c) => c.code);

  return (
    <section className="rounded-lg border border-border bg-card/60 p-4">
      <header className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Simulator</h2>
        <p className="text-xs text-muted-foreground">
          Slide grades, ask Gemini for a target plan, or check scholarship bands.
        </p>
      </header>

      <Tabs defaultValue="whatif">
        <TabsList>
          <TabsTrigger value="whatif">What-if</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="bands">Bands</TabsTrigger>
        </TabsList>

        <TabsContent value="whatif" className="mt-3">
          <WhatIfView
            enrollments={enrollments}
            upcomingCourses={upcomingCourses}
            overrides={overrides}
            onOverridesChange={setOverrides}
          />
        </TabsContent>

        <TabsContent value="targets" className="mt-3">
          <TargetsView
            upcomingCourseCodes={upcomingCodes}
            termHint={termHint}
            onApplyPlan={(plan) => {
              // Fold the plan picks into overrides; switching to What-if visually surfaces them
              const next: GradeOverride[] = [
                ...overrides.filter((o) => !plan.picks.find((p) => p.courseCode === o.courseCode)),
                ...plan.picks,
              ];
              setOverrides(next);
            }}
          />
        </TabsContent>

        <TabsContent value="bands" className="mt-3">
          <BandsView
            baselineGpa={result.baseline.gpa}
            simulatedGpa={result.simulated.gpa}
            bands={bands}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/components/simulator/simulator-panel.tsx
git commit -m "feat(simulator): SimulatorPanel — three-tab container with shared overrides state"
```

---

## Task 13: Wire `/grades` page behind feature flag

**Files:**
- Modify: `src/app/grades/page.tsx`

- [ ] **Step 1: Branch on flag**

Open `src/app/grades/page.tsx`. Read it. Inside `GradesContent`, after the data fetch, add:

```ts
import { isFlagEnabled } from "@/lib/feature-flags";
import { SimulatorPanel } from "@/components/simulator/simulator-panel";
import { listScholarshipBands } from "@/lib/simulator/scholarships";
```

Inside the body, fetch the flag + bands in parallel with the existing data:

```ts
const [simOn, bands] = await Promise.all([
  isFlagEnabled("feature.simulator"),
  listScholarshipBands(),
]);
```

Where the existing `<GpaSimulator />` is rendered, replace with:

```tsx
{simOn ? (
  <SimulatorPanel
    enrollments={enrollmentsWithCourse}
    upcomingCourses={availableCourses}
    bands={bands}
    termHint="Term 3 SY 2025-26"
  />
) : (
  <GpaSimulator
    currentEnrollments={enrollmentsWithCourse}
    availableCourses={availableCourses}
  />
)}
```

(The exact local variable names `enrollmentsWithCourse` and `availableCourses` come from the existing `GradesContent`. Keep whatever the page already binds.)

- [ ] **Step 2: Build**

```bash
pnpm tsc --noEmit
pnpm build
```

PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/grades/page.tsx
git commit -m "feat(simulator): wire SimulatorPanel into /grades behind feature.simulator flag"
```

---

## Task 14: Extend `simulateGpa` tool with scholarship gap notes

**Files:**
- Modify: `src/lib/agent/tools/simulate-gpa.tsx`

The Phase 2 stub already exists. Phase 3 adds a one-liner per scholarship band when the user provides a `target`.

- [ ] **Step 1: Modify**

In `src/lib/agent/tools/simulate-gpa.tsx`, after the existing `notes.push(...)` block when `target` is set, add:

```ts
import { listScholarshipBands, bandStatusFor } from "@/lib/simulator/scholarships";
// ... in execute():
const bands = await listScholarshipBands();
const status = bandStatusFor(simulated.gpa, bands);
for (const s of status) {
  if (s.inBand) {
    notes.push(`In ${s.band.name} (${s.band.minGpa}–${s.band.maxGpa}).`);
  }
}
```

(Place the import at the top of the file with the other imports. Keep the rest of the tool unchanged.)

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/simulate-gpa.tsx
git commit -m "feat(agent): simulateGpa tool surfaces scholarship band membership"
```

---

## Task 15: Verification gate

- [ ] **Step 1: tsc + tests + build + lint**

```bash
pnpm tsc --noEmit
pnpm test
pnpm build
pnpm lint
```

All pass. Phase 2 had 30 tests; Phase 3 adds at least 7 (Task 3 = 4, Task 5 = 3) → 37+.

- [ ] **Step 2: Manual smoke**

1. `pnpm dev`
2. Sign in (or `DISABLE_AUTH=1`).
3. Cookie:
   ```js
   document.cookie = "ff=feature.simulator=1; path=/";
   ```
4. Visit `/grades` → SimulatorPanel renders with three tabs.
5. **What-if**: pick "1.00" for Discrete Structures → Simulated GWA drops; delta shown in green.
6. **Targets**: enter "1.40", click Solve → 1–3 plans render after ~3s; click "Apply to What-If" → overrides fold into the live preview.
7. **Bands**: see President's / Dean's / Latin honors with baseline vs simulated columns; gaps render with sign.
8. `/admin/runs` → new `agent_runs` rows for the target solver (feature `simulator`, model `gemini-2.5-pro`).

If any step fails, fix before tagging.

- [ ] **Step 3: Tag**

```bash
git tag -a phase-3-simulator -m "Phase 3 — GPA simulator with AI target solver shipped"
```

---

## Self-Review

**Spec coverage (§F3):**
- "Existing `gpa-simulator.tsx` becomes the deterministic engine" — kept untouched as v1 fallback. Engine reused via `computeWhatIf` (Task 3).
- "Three views: What-If / Targets / Scholarship-band tracker" — Tasks 9, 10, 11. ✓
- "What-If: slide grades for current/upcoming courses, see GWA + units-toward-graduation update live" — Task 9. ✓
- "Targets: 'I want a 1.50 cumulative — what do I need this term?', solved by `generateObject`" — Tasks 4, 5, 10. ✓
- "Scholarship-band tracker: reads thresholds from a `scholarships` config + handbook RAG to surface the bands; AI cites the source" — Tasks 1, 2, 6, 11. The seed is hand-curated from the handbook for Phase 3; full handbook RAG citation flow lands in Phase 6 (`searchKnowledge` already supports it). The `sourceChunkId` column is wired but not populated by the seed; Phase 6 backfills it.
- "Tool exposed to sidekick: `simulateGpa(...)`" — already shipped in Phase 2. Task 14 extends it with scholarship band notes.
- "Output always includes confidence + assumptions" — TargetSolverOutputSchema enforces both. ✓
- Bound to `feature.simulator` flag — Task 13. ✓

**Explicit YAGNI cuts:**
- Per-band citation backfill (`scholarships.source_chunk_id` populated from RAG) deferred to Phase 6.
- Streaming the target solver output is not implemented; `generateObject` waits and renders. The 1–3s latency is acceptable.
- The "Edit picks before applying" affordance on a Targets plan is not in v1 — clicking "Apply to What-If" folds them in raw, and the user edits in the What-if view if needed.

**Placeholder scan:** No "TBD". All code blocks runnable as written. Soft references (`enrollmentsWithCourse` / `availableCourses` in Task 13) match the existing page structure.

**Type consistency:** `EnrollmentWithCourse`, `GpaResult` from `@/lib/gpa`. `GradeOverride` from `@/lib/simulator/whatif`. `ScholarshipBand` from `@/lib/simulator/scholarships`. `TargetSolverOutput`, `TargetPlan` from `@/lib/simulator/target-schema`. Used consistently across Tasks 3–14.
