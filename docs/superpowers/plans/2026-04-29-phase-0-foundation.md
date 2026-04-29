# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the foundation for the smart-dashboard redesign — Clerk auth, Supabase RLS via Clerk Third-Party Auth, Vertex AI runtime with a working hello-world round-trip, audit-log infrastructure, feature-flag plumbing, and a refreshed Linear/Vercel-style visual base — so every subsequent phase can ship features without revisiting plumbing.

**Architecture:** Additive-only schema changes; existing dashboard keeps working behind a `dashboard.v2` cookie flag. Clerk handles authentication; Supabase JWT validation is configured to accept Clerk tokens so RLS policies can key on `auth.jwt() ->> 'sub'`. Vertex AI is reached through a thin `lib/ai/` adapter that exposes the AI SDK 6 surface (`streamText`, `generateObject`) so call sites stay provider-agnostic. Every agent mutation writes a row to `agent_actions`; an admin shell at `/admin/runs` reads that table.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind v4, shadcn/ui, `@clerk/nextjs`, Supabase (`@supabase/ssr`), Vertex Node SDK (`@google-cloud/vertexai`), AI SDK 6, Zod 4, Vitest 2.

**Branch:** Run `git checkout -b feat/smart-dashboard-foundation` before Task 1 if not already on a feature branch.

**Reading note:** Next.js 16 has breaking changes from older versions; before touching App Router APIs (cache, middleware, server actions) consult `node_modules/next/dist/docs/` for current behavior.

---

## File Structure

**Create:**
- `vitest.config.ts` — test runner config
- `vitest.setup.ts` — test env shims
- `src/lib/feature-flags.ts` + `.test.ts` — cookie-based flag reader
- `src/lib/agent-actions.ts` + `.test.ts` — audit-log writer
- `src/lib/ai/vertex.ts` — Vertex SDK adapter
- `src/lib/ai/models.ts` — model routing constants
- `src/lib/ai/runtime.ts` + `.test.ts` — orchestrator (system prompt + agent_runs row)
- `src/lib/clerk/supabase.ts` — server-side Supabase factory that injects Clerk JWT
- `src/middleware.ts` — Clerk auth middleware
- `src/app/admin/runs/page.tsx` — audit log read view
- `src/app/api/agent/test-vertex/route.ts` — hello-world Vertex round-trip
- `supabase/migrations/00004_clerk_and_agent_audit.sql` — schema additions
- `supabase/migrations/00005_rls_policies.sql` — RLS policies
- `scripts/backfill-clerk-user-id.ts` — one-shot backfill
- `.env.example` — document new env vars

**Modify:**
- `package.json` — new deps
- `src/app/layout.tsx` — wrap in `<ClerkProvider>`
- `src/app/page.tsx` — wrap in `dashboard.v2` flag (legacy fallback)
- `src/lib/supabase/server.ts` — delegate to Clerk-aware factory
- `src/lib/supabase/client.ts` — same for browser
- `src/actions/transcript.ts`, `src/actions/tasks.ts`, `src/actions/alerts.ts` — replace hardcoded roll-number lookups with current Clerk user
- `src/components/layout/app-sidebar.tsx` — new tokens, new layout
- `src/components/layout/top-bar.tsx` — command bar + sidekick toggle stub
- `src/app/globals.css` — `oklch` token system

---

## Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Install deps**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Run an empty test file to verify config**

Create `src/lib/__sanity__.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("vitest", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```

Run: `pnpm test`
Expected: `1 passed`

- [ ] **Step 6: Delete sanity file and commit**

```bash
rm src/lib/__sanity__.test.ts
git add vitest.config.ts vitest.setup.ts package.json pnpm-lock.yaml
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Feature flag reader (TDD)

**Files:**
- Create: `src/lib/feature-flags.ts`
- Test: `src/lib/feature-flags.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/feature-flags.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isFlagEnabled } from "./feature-flags";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";

describe("isFlagEnabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when cookie is missing", async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => undefined,
    });
    await expect(isFlagEnabled("dashboard.v2")).resolves.toBe(false);
  });

  it("returns true when cookie value is '1'", async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) =>
        name === "ff" ? { value: "dashboard.v2=1" } : undefined,
    });
    await expect(isFlagEnabled("dashboard.v2")).resolves.toBe(true);
  });

  it("supports multiple flags in one cookie", async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => ({ value: "dashboard.v2=1;feature.briefing=1" }),
    });
    await expect(isFlagEnabled("feature.briefing")).resolves.toBe(true);
    await expect(isFlagEnabled("feature.sidekick")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm test feature-flags`
Expected: FAIL — `isFlagEnabled` not exported.

- [ ] **Step 3: Implement**

`src/lib/feature-flags.ts`:

```ts
import { cookies } from "next/headers";

export type FeatureFlag =
  | "dashboard.v2"
  | "feature.briefing"
  | "feature.sidekick"
  | "feature.simulator"
  | "feature.planner"
  | "feature.radar"
  | "feature.rag"
  | "feature.study"
  | "feature.inbox"
  | "feature.voice";

export async function isFlagEnabled(flag: FeatureFlag): Promise<boolean> {
  const store = await cookies();
  const raw = store.get("ff")?.value ?? "";
  for (const entry of raw.split(";")) {
    const [name, value] = entry.split("=");
    if (name?.trim() === flag && value?.trim() === "1") return true;
  }
  return false;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test feature-flags`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feature-flags.ts src/lib/feature-flags.test.ts
git commit -m "feat(flags): cookie-based feature flag reader"
```

---

## Task 3: Install Clerk and middleware

**Files:**
- Create: `src/middleware.ts`
- Modify: `package.json`, `src/app/layout.tsx`, `.env.example`

- [ ] **Step 1: User action — create Clerk app**

In the Clerk dashboard:
1. Create a new application (Student Pro plan).
2. Copy `Publishable Key` and `Secret Key`.
3. Run `vercel env add CLERK_PUBLISHABLE_KEY` (development + preview + production), paste the publishable key.
4. Run `vercel env add CLERK_SECRET_KEY` (same scopes), paste the secret key.
5. Run `vercel env pull .env.local` to bring them into local dev.

- [ ] **Step 2: Install `@clerk/nextjs`**

```bash
pnpm add @clerk/nextjs
```

- [ ] **Step 3: Document env vars**

Create `.env.example`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Cloud Vertex AI
GOOGLE_PROJECT_ID=
GOOGLE_LOCATION=us-central1
# Local dev: gcloud auth application-default login (no env needed)
# Production: Workload Identity Federation
GOOGLE_WORKLOAD_IDENTITY_PROVIDER=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
```

(The Clerk publishable env name in Next 16 conventions is `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Update the `vercel env add` step in Step 1 if you used the wrong name — re-add as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.)

- [ ] **Step 4: Create middleware**

`src/middleware.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 5: Wrap layout**

Modify `src/app/layout.tsx` — add at the top of the file:

```tsx
import { ClerkProvider } from "@clerk/nextjs";
```

Wrap the `<html>` element returned from `RootLayout` with `<ClerkProvider>`:

```tsx
return (
  <ClerkProvider>
    <html lang="en">
      {/* existing body */}
    </html>
  </ClerkProvider>
);
```

- [ ] **Step 6: Verify dev boot**

Run: `pnpm dev`
Open http://localhost:3000 — expected redirect to Clerk-hosted sign-in page.
Sign in with your account. After redirect, the existing dashboard should render (auth wired, but no RLS yet).
Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/middleware.ts src/app/layout.tsx .env.example
git commit -m "feat(auth): add Clerk middleware and provider"
```

---

## Task 4: Configure Supabase Third-Party Auth with Clerk

**Files (no code yet — config + secrets):**

- [ ] **Step 1: User action — Clerk side**

In Clerk dashboard → Configure → JWT Templates:
1. Click "New template" → choose **Supabase**.
2. Name it `supabase`.
3. Set claim `role: "authenticated"`.
4. Save. Note the template name (`supabase`).

- [ ] **Step 2: User action — Supabase side**

In the Supabase dashboard → Authentication → Sign In / Up → Third-Party Auth:
1. Add Clerk as a provider.
2. Paste your Clerk Frontend API URL (from Clerk dashboard → API Keys → Frontend API URL).
3. Save.

- [ ] **Step 3: Verify config (no code change yet)**

This task introduces no code; subsequent tasks consume the config. Move to Task 5.

---

## Task 5: Clerk-aware Supabase clients

**Files:**
- Create: `src/lib/clerk/supabase.ts`
- Modify: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

- [ ] **Step 1: Create the factory**

`src/lib/clerk/supabase.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createClerkSupabaseServerClient() {
  const cookieStore = await cookies();
  const { getToken } = await auth();
  const token = (await getToken({ template: "supabase" })) ?? undefined;

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
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
    }
  );
}
```

- [ ] **Step 2: Replace `src/lib/supabase/server.ts` body**

Overwrite `src/lib/supabase/server.ts` with:

```ts
export { createClerkSupabaseServerClient as createClient } from "@/lib/clerk/supabase";
```

- [ ] **Step 3: Browser client**

Modify `src/lib/supabase/client.ts` so the browser client also injects the Clerk token. Replace the file with:

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import type { Database } from "./database.types";

export function useSupabase() {
  const { getToken } = useAuth();
  return useMemo(
    () =>
      createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () =>
            (await getToken({ template: "supabase" })) ?? null,
        }
      ),
    [getToken]
  );
}
```

- [ ] **Step 4: Smoke check existing usages**

Run: `pnpm tsc --noEmit`
Expected: PASS (server-side imports unchanged via re-export; browser client now requires `useSupabase()` — fix call sites if `pnpm tsc` flags any).

If `pnpm tsc` flags a call site that imports `createClient` from `@/lib/supabase/client`, switch it to `useSupabase()`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clerk/supabase.ts src/lib/supabase/server.ts src/lib/supabase/client.ts
git commit -m "feat(auth): wire Clerk JWT into Supabase clients"
```

---

## Task 6: Add `clerk_user_id` and audit tables (migration)

**Files:**
- Create: `supabase/migrations/00004_clerk_and_agent_audit.sql`

- [ ] **Step 1: Write migration**

`supabase/migrations/00004_clerk_and_agent_audit.sql`:

```sql
-- Clerk user binding
ALTER TABLE students
  ADD COLUMN clerk_user_id TEXT UNIQUE;

CREATE INDEX students_clerk_user_id_idx ON students (clerk_user_id);

-- Agent runs (one row per Vertex round-trip)
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd_micros BIGINT,
  latency_ms INTEGER,
  trace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX agent_runs_student_idx ON agent_runs (student_id, created_at DESC);
CREATE INDEX agent_runs_feature_idx ON agent_runs (feature, created_at DESC);

-- Agent actions (every mutation the AI proposes/executes)
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  input_jsonb JSONB NOT NULL,
  diff_jsonb JSONB,
  undo_input_jsonb JSONB,
  status TEXT NOT NULL CHECK (status IN ('proposed','approved','executed','undone','failed')),
  error_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ
);

CREATE INDEX agent_actions_student_idx ON agent_actions (student_id, created_at DESC);
CREATE INDEX agent_actions_kind_idx ON agent_actions (kind, status);

-- Link tasks to agent actions for cascading undo
ALTER TABLE tasks
  ADD COLUMN created_by_agent BOOLEAN DEFAULT FALSE,
  ADD COLUMN agent_action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL;

ALTER TABLE alerts
  ADD COLUMN agent_action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Apply locally**

Run: `pnpm supabase db reset`
Expected: all migrations apply cleanly, seeds re-run, exit 0.

If reset fails because the seed scripts depend on a hardcoded student row, that's expected — Task 7 fixes it. For now, confirm the migration itself applies; you can apply it standalone with `pnpm supabase migration up` if `db reset` errors at the seed step.

- [ ] **Step 3: Regenerate database types**

```bash
pnpm supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00004_clerk_and_agent_audit.sql src/lib/supabase/database.types.ts
git commit -m "feat(db): add clerk_user_id and agent audit tables"
```

---

## Task 7: Backfill `clerk_user_id` and drop hardcoded roll-number lookups

**Files:**
- Create: `scripts/backfill-clerk-user-id.ts`
- Modify: `src/actions/transcript.ts`, `src/actions/tasks.ts`, `src/actions/alerts.ts`

- [ ] **Step 1: Inspect current actions**

Run: `grep -n "roll_number\|2024370558" src/actions/*.ts`
Note every line that hardcodes the roll number — Step 4 replaces all of them.

- [ ] **Step 2: Create the backfill script**

`scripts/backfill-clerk-user-id.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rollNumber = process.argv[2];
  const clerkUserId = process.argv[3];

  if (!url || !key || !rollNumber || !clerkUserId) {
    console.error(
      "Usage: tsx scripts/backfill-clerk-user-id.ts <roll_number> <clerk_user_id>"
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("students")
    .update({ clerk_user_id: clerkUserId })
    .eq("roll_number", rollNumber)
    .select("id, name, clerk_user_id");

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("Updated:", data);
}

main();
```

- [ ] **Step 3: Run the backfill**

Get your Clerk user ID from the Clerk dashboard → Users → click your account → copy the `user_...` ID.

```bash
pnpm tsx scripts/backfill-clerk-user-id.ts 2024370558 user_<your_id_here>
```

Expected output: `Updated: [ { id: '...', name: 'Christopher Pond Maquidato', clerk_user_id: 'user_...' } ]`

- [ ] **Step 4: Add a `getCurrentStudent` helper**

Append to `src/lib/clerk/supabase.ts` (after the existing factory):

```ts
import { auth } from "@clerk/nextjs/server";

export async function getCurrentStudentId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = await createClerkSupabaseServerClient();
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  return data?.id ?? null;
}
```

(If `auth` is already imported at the top of the file from Task 5, don't duplicate the import.)

- [ ] **Step 5: Replace each hardcoded roll-number lookup**

For every action file flagged in Step 1, replace the roll-number `eq` with a call to `getCurrentStudentId()`. Example transformation in `src/actions/transcript.ts`:

```ts
// Before
const { data: student } = await supabase
  .from("students").select("id").eq("roll_number", "2024370558").single();
const studentId = student?.id;

// After
import { getCurrentStudentId } from "@/lib/clerk/supabase";
// ...
const studentId = await getCurrentStudentId();
if (!studentId) throw new Error("No linked student for current user");
```

Repeat in `src/actions/tasks.ts` and `src/actions/alerts.ts`.

- [ ] **Step 6: Smoke-test**

Run: `pnpm dev`
Sign in. Visit `/`, `/tasks`, `/alerts`, `/grades`. Verify your data renders.
Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add scripts/backfill-clerk-user-id.ts src/lib/clerk/supabase.ts src/actions/transcript.ts src/actions/tasks.ts src/actions/alerts.ts
git commit -m "feat(auth): replace hardcoded roll-number with Clerk-bound student lookup"
```

---

## Task 8: RLS policies migration

**Files:**
- Create: `supabase/migrations/00005_rls_policies.sql`

- [ ] **Step 1: Write policies**

`supabase/migrations/00005_rls_policies.sql`:

```sql
-- Helper: current Clerk user → student id
CREATE OR REPLACE FUNCTION current_student_id() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT id FROM students WHERE clerk_user_id = auth.jwt() ->> 'sub'
$$;

-- Enable RLS on user-scoped tables
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs      ENABLE ROW LEVEL SECURITY;

-- Students: read your own row
CREATE POLICY students_self_read ON students
  FOR SELECT USING (id = current_student_id());

-- Enrollments / tasks / alerts: read+write your own
CREATE POLICY enrollments_owner ON enrollments
  FOR ALL USING (student_id = current_student_id())
         WITH CHECK (student_id = current_student_id());

CREATE POLICY tasks_owner ON tasks
  FOR ALL USING (student_id = current_student_id())
         WITH CHECK (student_id = current_student_id());

CREATE POLICY alerts_owner ON alerts
  FOR ALL USING (student_id = current_student_id())
         WITH CHECK (student_id = current_student_id());

CREATE POLICY agent_actions_owner ON agent_actions
  FOR ALL USING (student_id = current_student_id())
         WITH CHECK (student_id = current_student_id());

CREATE POLICY agent_runs_owner ON agent_runs
  FOR ALL USING (student_id = current_student_id() OR student_id IS NULL)
         WITH CHECK (student_id = current_student_id() OR student_id IS NULL);

-- Reference tables stay readable to anyone authenticated
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks  ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_read_authenticated ON courses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY knowledge_chunks_read_authenticated ON knowledge_chunks
  FOR SELECT USING (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply**

```bash
pnpm supabase migration up
```

Expected: success, policies installed.

- [ ] **Step 3: Verify in app**

Run `pnpm dev`, sign in, hit `/` — your data should still render (because Clerk JWT is now valid for RLS). If you see empty state, the JWT template name in Task 4 doesn't match what Task 5 uses (`template: "supabase"`); reconcile.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00005_rls_policies.sql
git commit -m "feat(db): RLS policies keyed on Clerk user id"
```

---

## Task 9: Agent-actions audit writer (TDD)

**Files:**
- Create: `src/lib/agent-actions.ts`
- Test: `src/lib/agent-actions.test.ts`

- [ ] **Step 1: Failing test**

`src/lib/agent-actions.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { recordAgentAction } from "./agent-actions";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({
  insert: insertMock.mockReturnValue({
    select: () => ({ single: async () => ({ data: { id: "abc" }, error: null }) }),
  }),
}));

vi.mock("@/lib/clerk/supabase", () => ({
  createClerkSupabaseServerClient: async () => ({ from: fromMock }),
  getCurrentStudentId: async () => "student-1",
}));

describe("recordAgentAction", () => {
  it("inserts an action row with status 'executed' for non-confirm tools", async () => {
    const id = await recordAgentAction({
      kind: "addTask",
      input: { title: "x" },
      diff: { taskId: "t1" },
      status: "executed",
    });
    expect(id).toBe("abc");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        kind: "addTask",
        status: "executed",
      })
    );
  });

  it("throws when no current student is linked", async () => {
    const mod = await import("@/lib/clerk/supabase");
    vi.mocked(mod.getCurrentStudentId).mockResolvedValueOnce(null);
    await expect(
      recordAgentAction({ kind: "addTask", input: {}, status: "executed" })
    ).rejects.toThrow(/no linked student/i);
  });
});
```

- [ ] **Step 2: Run test → expect failure**

```bash
pnpm test agent-actions
```

Expected: FAIL — `recordAgentAction` not exported.

- [ ] **Step 3: Implement**

`src/lib/agent-actions.ts`:

```ts
import {
  createClerkSupabaseServerClient,
  getCurrentStudentId,
} from "@/lib/clerk/supabase";

export type AgentActionStatus =
  | "proposed"
  | "approved"
  | "executed"
  | "undone"
  | "failed";

export interface RecordAgentActionInput {
  kind: string;
  input: unknown;
  diff?: unknown;
  undoInput?: unknown;
  status: AgentActionStatus;
  agentRunId?: string;
  errorText?: string;
}

export async function recordAgentAction(
  args: RecordAgentActionInput
): Promise<string> {
  const studentId = await getCurrentStudentId();
  if (!studentId) throw new Error("No linked student for current user");

  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase
    .from("agent_actions")
    .insert({
      student_id: studentId,
      agent_run_id: args.agentRunId ?? null,
      kind: args.kind,
      input_jsonb: args.input,
      diff_jsonb: args.diff ?? null,
      undo_input_jsonb: args.undoInput ?? null,
      status: args.status,
      error_text: args.errorText ?? null,
      executed_at: args.status === "executed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data!.id;
}
```

- [ ] **Step 4: Run tests → pass**

```bash
pnpm test agent-actions
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-actions.ts src/lib/agent-actions.test.ts
git commit -m "feat(agent): audit-log writer for agent_actions"
```

---

## Task 10: Vertex AI deps + local auth check

**Files:**
- Modify: `package.json`

- [ ] **Step 1: User action — gcloud setup**

In a terminal (use `! gcloud …` from the IDE prompt to run interactively):

```bash
gcloud auth application-default login
gcloud config set project <YOUR_GCP_PROJECT_ID>
gcloud services enable aiplatform.googleapis.com
```

Verify ADC file exists:

```bash
ls "$APPDATA/gcloud/application_default_credentials.json"
```

- [ ] **Step 2: Set Vercel env vars**

```bash
vercel env add GOOGLE_PROJECT_ID
vercel env add GOOGLE_LOCATION
```

For `GOOGLE_LOCATION` use `us-central1`. Production WIF setup is deferred to deployment time; local dev runs on ADC.

- [ ] **Step 3: Pull env down**

```bash
vercel env pull .env.local
```

- [ ] **Step 4: Install Vertex SDK + AI SDK Google Vertex provider**

```bash
pnpm add @google-cloud/vertexai @ai-sdk/google-vertex
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(ai): add Vertex AI SDK dependencies"
```

---

## Task 11: Vertex adapter + models constants

**Files:**
- Create: `src/lib/ai/vertex.ts`
- Create: `src/lib/ai/models.ts`

- [ ] **Step 1: Models constants**

`src/lib/ai/models.ts`:

```ts
export const MODELS = {
  pro: "gemini-2.5-pro",
  flash: "gemini-2.5-flash",
  embedding: "text-embedding-005",
} as const;

export type ModelKey = keyof typeof MODELS;

export const FEATURES = {
  briefing: "briefing",
  sidekick: "sidekick",
  simulator: "simulator",
  planner: "planner",
  radar: "radar",
  rag: "rag",
  study: "study",
  inbox: "inbox",
  voice: "voice",
  test: "test",
} as const;

export type FeatureKey = keyof typeof FEATURES;
```

- [ ] **Step 2: Adapter**

`src/lib/ai/vertex.ts`:

```ts
import { createVertex } from "@ai-sdk/google-vertex";
import { MODELS, type ModelKey } from "./models";

const projectId = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GOOGLE_LOCATION ?? "us-central1";

if (!projectId && process.env.NODE_ENV !== "test") {
  // Defer the hard error to first use so unit tests don't need the env var.
  console.warn("[vertex] GOOGLE_PROJECT_ID not set; calls will fail.");
}

export const vertex = createVertex({
  project: projectId,
  location,
});

export function model(key: ModelKey) {
  return vertex(MODELS[key]);
}
```

`@ai-sdk/google-vertex` reads ADC automatically when no explicit credentials are passed; that's why local dev "just works" after `gcloud auth application-default login`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/vertex.ts src/lib/ai/models.ts
git commit -m "feat(ai): Vertex SDK adapter and model constants"
```

---

## Task 12: Runtime orchestrator (TDD)

**Files:**
- Create: `src/lib/ai/runtime.ts`
- Test: `src/lib/ai/runtime.test.ts`

- [ ] **Step 1: Failing test**

`src/lib/ai/runtime.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

const insertSingle = vi.fn(async () => ({ data: { id: "run-1" }, error: null }));
const updateEq = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/clerk/supabase", () => ({
  createClerkSupabaseServerClient: async () => ({
    from: () => ({
      insert: () => ({
        select: () => ({ single: insertSingle }),
      }),
      update: () => ({ eq: updateEq }),
    }),
  }),
  getCurrentStudentId: async () => "student-1",
}));

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({
    text: "ok",
    usage: { promptTokens: 10, completionTokens: 5 },
  })),
}));

vi.mock("./vertex", () => ({
  model: (key: string) => ({ providerKey: key }),
}));

import { runVertex } from "./runtime";

describe("runVertex", () => {
  it("inserts an agent_runs row, calls generateText, then updates with usage", async () => {
    const result = await runVertex({
      feature: "test",
      modelKey: "flash",
      prompt: "hello",
    });

    expect(result.text).toBe("ok");
    expect(insertSingle).toHaveBeenCalledOnce();
    expect(updateEq).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run → fail**

```bash
pnpm test runtime
```

Expected: FAIL — `runVertex` not exported.

- [ ] **Step 3: Implement**

`src/lib/ai/runtime.ts`:

```ts
import { generateText } from "ai";
import {
  createClerkSupabaseServerClient,
  getCurrentStudentId,
} from "@/lib/clerk/supabase";
import { model } from "./vertex";
import { MODELS, type ModelKey, FEATURES, type FeatureKey } from "./models";

export interface RunVertexArgs {
  feature: FeatureKey;
  modelKey: ModelKey;
  prompt: string;
  system?: string;
}

export interface RunVertexResult {
  runId: string;
  text: string;
}

export async function runVertex(args: RunVertexArgs): Promise<RunVertexResult> {
  const studentId = await getCurrentStudentId();
  const supabase = await createClerkSupabaseServerClient();

  const { data: run, error: insertErr } = await supabase
    .from("agent_runs")
    .insert({
      student_id: studentId,
      feature: FEATURES[args.feature],
      model: MODELS[args.modelKey],
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;

  const startedAt = Date.now();
  const result = await generateText({
    model: model(args.modelKey),
    system: args.system,
    prompt: args.prompt,
  });
  const latencyMs = Date.now() - startedAt;

  await supabase
    .from("agent_runs")
    .update({
      input_tokens: result.usage.promptTokens,
      output_tokens: result.usage.completionTokens,
      latency_ms: latencyMs,
    })
    .eq("id", run!.id);

  return { runId: run!.id, text: result.text };
}
```

- [ ] **Step 4: Run → pass**

```bash
pnpm test runtime
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/runtime.ts src/lib/ai/runtime.test.ts
git commit -m "feat(ai): runtime orchestrator with agent_runs telemetry"
```

---

## Task 13: Hello-world Vertex endpoint

**Files:**
- Create: `src/app/api/agent/test-vertex/route.ts`

- [ ] **Step 1: Implement**

`src/app/api/agent/test-vertex/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runVertex } from "@/lib/ai/runtime";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("unauthorized", { status: 401 });

  const result = await runVertex({
    feature: "test",
    modelKey: "flash",
    prompt: "Say hi to Christopher in one sentence.",
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, sign in, then in the browser visit:

```
http://localhost:3000/api/agent/test-vertex
```

Expected response: `{ "runId": "...", "text": "..." }` with a Gemini-generated greeting.

In Supabase Studio (`http://127.0.0.1:54323`), open `agent_runs` — verify a new row exists with feature `test`, model `gemini-2.5-flash`, populated tokens and latency.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agent/test-vertex/route.ts
git commit -m "feat(ai): hello-world Vertex round-trip endpoint"
```

---

## Task 14: Refresh `globals.css` token system

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Read current file**

```bash
cat src/app/globals.css
```

Note any custom variables already in `:root`/`.dark` so you don't lose them.

- [ ] **Step 2: Replace the token block**

In `src/app/globals.css`, locate the `@theme` and `:root` blocks. Replace with the Linear/Vercel token system:

```css
@layer base {
  :root {
    --background: oklch(0.99 0 0);
    --foreground: oklch(0.18 0 0);
    --muted: oklch(0.96 0 0);
    --muted-foreground: oklch(0.45 0 0);
    --border: oklch(0.92 0 0);
    --input: oklch(0.94 0 0);
    --ring: oklch(0.55 0.18 270);

    --card: oklch(1 0 0);
    --card-foreground: oklch(0.18 0 0);

    --primary: oklch(0.55 0.18 270);
    --primary-foreground: oklch(0.99 0 0);

    --accent: oklch(0.96 0 0);
    --accent-foreground: oklch(0.18 0 0);

    --success: oklch(0.65 0.16 150);
    --warning: oklch(0.78 0.16 80);
    --danger:  oklch(0.62 0.20 25);

    --radius: 0.5rem;
  }

  .dark {
    --background: oklch(0.13 0 0);
    --foreground: oklch(0.96 0 0);
    --muted: oklch(0.18 0 0);
    --muted-foreground: oklch(0.65 0 0);
    --border: oklch(1 0 0 / 0.08);
    --input: oklch(1 0 0 / 0.06);
    --ring: oklch(0.65 0.18 270);

    --card: oklch(0.16 0 0);
    --card-foreground: oklch(0.96 0 0);

    --primary: oklch(0.7 0.18 270);
    --primary-foreground: oklch(0.13 0 0);

    --accent: oklch(0.2 0 0);
    --accent-foreground: oklch(0.96 0 0);
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "cv02","cv03","cv04","cv11", "tnum";
  }
}
```

(Keep any existing `@import` lines and the `@theme inline` block that maps these variables to Tailwind classes — only replace the `:root` / `.dark` token values.)

- [ ] **Step 3: Visual smoke check**

Run `pnpm dev`. Confirm dashboard renders with the new tokens (denser look, near-black background in dark mode). Stop dev.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): Linear/Vercel-style oklch token system"
```

---

## Task 15: Sidebar refactor to new aesthetic

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Read current implementation**

```bash
cat src/components/layout/app-sidebar.tsx
```

Note the existing nav items, user block, and any branding so the rewrite preserves them.

- [ ] **Step 2: Rewrite for the new aesthetic**

Open `src/components/layout/app-sidebar.tsx` and replace the visual layer (keep nav data, links, and any auth state). Target shape:

- 240px fixed width on `lg:` and above; collapses to icon rail at `md:`; hidden on `sm:` (bottom nav handles small screens).
- Top: small wordmark + roll number muted, divided by a 1px subtle border.
- Middle: nav list using `text-sm font-medium`, 32px row height, hover `bg-accent`, active `bg-accent text-foreground` with a 2px left accent bar.
- Bottom: Clerk `<UserButton />` (replaces current user block), wrapped with `appearance={{ elements: { rootBox: "w-full justify-start" }}}`, plus a `ThemeToggle` button.

Use `import { UserButton } from "@clerk/nextjs"` for the user block and remove any hardcoded "Christopher Pond · 2024370558 · BSIT" copy — pull name from `useUser()` and roll number from a server component prop you'll add later (for now, leave roll number static; Phase 1 will wire it).

- [ ] **Step 3: Smoke check**

Run `pnpm dev`. Confirm sidebar renders, nav clicks work, `UserButton` opens Clerk's account menu. Stop dev.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat(ui): sidebar refactor to Linear/Vercel aesthetic + Clerk UserButton"
```

---

## Task 16: Top bar with command-bar hint and sidekick toggle stub

**Files:**
- Modify: `src/components/layout/top-bar.tsx`

- [ ] **Step 1: Read current implementation**

```bash
cat src/components/layout/top-bar.tsx
```

- [ ] **Step 2: Rewrite**

Replace `src/components/layout/top-bar.tsx` with:

```tsx
"use client";

import { Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="text-xs text-muted-foreground">
        Term 3 · SY 2025–26
      </div>
      <div className="flex-1" />
      <button
        type="button"
        className="inline-flex h-8 w-72 items-center gap-2 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground transition hover:bg-muted"
        onClick={() => {
          // Phase 2 wires command palette
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search or ask…</span>
        <span className="ml-auto"><Kbd>⌘K</Kbd></span>
      </button>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-xs"
        onClick={() => {
          // Phase 2 wires the sidekick drawer
          window.dispatchEvent(new CustomEvent("open-sidekick"));
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Sidekick
      </Button>
    </header>
  );
}
```

- [ ] **Step 3: Add the missing `Kbd` primitive**

Create `src/components/ui/kbd.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function Kbd({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
```

- [ ] **Step 4: Smoke check**

Run `pnpm dev`. Confirm top bar renders, `⌘K` button is present, clicking it does nothing visible (events fire into the void until Phase 2). Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/top-bar.tsx src/components/ui/kbd.tsx
git commit -m "feat(ui): top bar with command-palette hint and sidekick toggle stub"
```

---

## Task 17: `/admin/runs` audit log shell

**Files:**
- Create: `src/app/admin/runs/page.tsx`

- [ ] **Step 1: Implement**

`src/app/admin/runs/page.tsx`:

```tsx
import { createClerkSupabaseServerClient } from "@/lib/clerk/supabase";

export const dynamic = "force-dynamic";

export default async function AdminRunsPage() {
  const supabase = await createClerkSupabaseServerClient();

  const [{ data: runs }, { data: actions }] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("id, feature, model, input_tokens, output_tokens, latency_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agent_actions")
      .select("id, kind, status, created_at, executed_at, undone_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-8 p-6">
      <section>
        <h1 className="mb-3 text-lg font-semibold">Agent runs</h1>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium">When</th>
              <th className="py-2 text-left font-medium">Feature</th>
              <th className="py-2 text-left font-medium">Model</th>
              <th className="py-2 text-right font-medium">In tok</th>
              <th className="py-2 text-right font-medium">Out tok</th>
              <th className="py-2 text-right font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-1.5">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-1.5">{r.feature}</td>
                <td className="py-1.5 text-muted-foreground">{r.model}</td>
                <td className="py-1.5 text-right">{r.input_tokens ?? "—"}</td>
                <td className="py-1.5 text-right">{r.output_tokens ?? "—"}</td>
                <td className="py-1.5 text-right">{r.latency_ms ?? "—"} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Agent actions</h2>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium">When</th>
              <th className="py-2 text-left font-medium">Kind</th>
              <th className="py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(actions ?? []).map((a) => (
              <tr key={a.id} className="border-b border-border/50">
                <td className="py-1.5">{new Date(a.created_at).toLocaleString()}</td>
                <td className="py-1.5">{a.kind}</td>
                <td className="py-1.5">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`. Visit `http://localhost:3000/admin/runs`. The runs table should show the row created by Task 13's hello-world endpoint.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/runs/page.tsx
git commit -m "feat(admin): audit log shell at /admin/runs"
```

---

## Task 18: Wrap dashboard in `dashboard.v2` flag

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current page**

```bash
cat src/app/page.tsx
```

- [ ] **Step 2: Add the flag wrap**

At the top of `src/app/page.tsx`, import the flag reader:

```ts
import { isFlagEnabled } from "@/lib/feature-flags";
```

Inside `DashboardPage` (the default export), branch on the flag:

```tsx
export default async function DashboardPage() {
  const v2 = await isFlagEnabled("dashboard.v2");
  if (!v2) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    );
  }

  // v2 placeholder — Phase 1 replaces this with the new briefing hero
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Dashboard v2 (foundation only)</h1>
      <p className="text-sm text-muted-foreground">
        Briefing, sidekick, and the rest land in subsequent phases.
      </p>
    </div>
  );
}
```

(`DashboardPage` is currently synchronous. Convert it to `async` since `isFlagEnabled` returns a `Promise`.)

- [ ] **Step 3: Verify both branches**

Run `pnpm dev`. Visit `/` — legacy dashboard renders.

In the browser DevTools console, set the flag:

```js
document.cookie = "ff=dashboard.v2=1; path=/";
location.reload();
```

The v2 placeholder renders. Clear the cookie to switch back:

```js
document.cookie = "ff=; path=/; max-age=0";
location.reload();
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(dashboard): gate v2 behind dashboard.v2 cookie flag"
```

---

## Task 19: README dev-setup append

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a "Phase 0 dev setup" section**

Append to `README.md`:

```markdown
## Phase 0 dev setup

1. `pnpm install`
2. `gcloud auth application-default login` (one-time, gives Vertex local access)
3. `pnpm supabase start && pnpm db:reset`
4. Copy `.env.example` → `.env.local`, fill Supabase + Clerk keys (or `vercel env pull .env.local`)
5. Run the Clerk + Supabase Third-Party Auth setup once:
   - Clerk dashboard → JWT Templates → New → "Supabase" template, named `supabase`
   - Supabase dashboard → Authentication → Third-Party Auth → add Clerk with your Clerk Frontend API URL
6. Backfill your student row with your Clerk user id:
   ```bash
   pnpm tsx scripts/backfill-clerk-user-id.ts <roll_number> <clerk_user_id>
   ```
7. `pnpm dev` and visit http://localhost:3000

### Feature flags

Set cookies via DevTools:
```js
document.cookie = "ff=dashboard.v2=1;feature.briefing=1; path=/";
```

### Verifying Vertex

GET `http://localhost:3000/api/agent/test-vertex` after sign-in. A row should appear in `agent_runs` and at `/admin/runs`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: Phase 0 dev setup notes"
```

---

## Task 20: Verification gate

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2: Tests**

```bash
pnpm test
```

Expected: all suites pass (feature-flags, agent-actions, runtime).

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: clean (or only intentional warnings).

- [ ] **Step 5: Manual end-to-end**

Run `pnpm dev` and walk through:
1. Sign in via Clerk → redirected to dashboard.
2. Hit `/api/agent/test-vertex` → JSON response with a Gemini greeting.
3. `/admin/runs` → run row visible with tokens and latency.
4. Toggle `dashboard.v2=1` → v2 placeholder renders.
5. Toggle off → legacy dashboard still works.

If any step fails, stop and fix before proceeding to Phase 1.

- [ ] **Step 6: Tag the phase**

```bash
git tag -a phase-0-foundation -m "Phase 0 foundation complete"
```

(Push with `git push origin phase-0-foundation` when ready.)

---

## Self-Review

**Spec coverage check:**
- Clerk auth + Supabase RLS via Clerk Third-Party Auth — Tasks 3, 4, 5, 6, 7, 8 ✓
- Vertex AI runtime adapter (ADC local, WIF prod deferred) — Tasks 10, 11, 12, 13 ✓
- `agent_actions` + `agent_runs` schema — Task 6 ✓
- Audit-log writer — Task 9 ✓
- Audit-log shell at `/admin/runs` — Task 17 ✓
- Linear/Vercel token system — Task 14 ✓
- Sidebar/topbar refactor — Tasks 15, 16 ✓
- Feature-flag plumbing — Tasks 2, 18 ✓
- Hello-world Vertex round-trip proves the foundation — Task 13 ✓
- Sentry tracing + Upstash Redis are NOT in Phase 0 — they're Phase 1+ concerns and don't block briefing/sidekick from shipping. Deferred intentionally.
- Workload Identity Federation production setup is documented (Task 10 Step 2 notes it) but not configured in Phase 0; configure it before first Vercel preview deploy that needs Vertex (Phase 1).

**Placeholder scan:** No "TBD", "TODO", or vague "implement appropriate X" steps. All code blocks present.

**Type consistency:** `recordAgentAction`, `runVertex`, `getCurrentStudentId`, `createClerkSupabaseServerClient`, `isFlagEnabled`, `MODELS`, `FEATURES` all referenced consistently across tasks.

**Production deploy gap:** Vercel WIF setup is one extra task before Phase 1 ships behind the flag publicly. Tracked as a note here; will be the first task of the Phase 1 plan.
