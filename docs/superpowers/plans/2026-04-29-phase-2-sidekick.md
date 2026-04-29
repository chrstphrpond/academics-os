# Phase 2 — Sidekick + Tool Vocabulary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the global agent sidekick (`⌘K`-triggered drawer) backed by a typed tool framework. Six tools (`addTask`, `dismissAlert`, `searchKnowledge`, `simulateGpa`, `proposePlan`, `clearInc`) demonstrate read-only, no-confirm, and confirm-required flows. Every mutation writes to `agent_actions` with full undo support. Conversations persist to `agent_conversations` + `agent_messages`.

**Architecture:** A registry-based tool framework defines each tool as `{ schema, execute, undo, requiresConfirmation, render }`. The `/api/agent/chat` route streams `useChat` messages through Vertex Gemini Flash, escalating to Pro on heavy tools. Tool calls render inline as `<ToolCard>` components with three states (proposed → executing → executed) and a unified Approve / Edit / Cancel / Undo footer. Server Actions execute tools through the registry, validate inputs with Zod, write `agent_actions` rows, and return diffs. Undo replays the inverse operation through the same audit-log pipeline.

**Tech Stack:** AI SDK 6 (`@ai-sdk/react` + `useChat`, `streamText`, tool calling), Vertex Gemini 2.5 Flash + Pro, Drizzle, Zod 4, Base UI Dialog, shadcn/ui, framer-motion (existing), nuqs for `?c=<id>` URL state.

**Pre-conditions:**
- Phase 1 complete and tagged `phase-1-briefing`.
- `feature.sidekick` flag declared in `src/lib/feature-flags.ts` (Phase 0).
- `recordAgentAction` audit writer working (Phase 0 Task 9).
- Vertex round-trip verified (Phase 0 + Phase 1).
- The existing `BriefingHero.ctaActions` proposes tools (`addTask`, `dismissAlert`, etc.) — Phase 2 wires those proposals to executable tool calls.

**Plan structure:** This is a large phase. Tasks are grouped into four arcs:
- **Arc A — Schema & framework primitives** (Tasks 1–6): nothing user-visible yet.
- **Arc B — Chat shell + 1 demo tool** (Tasks 7–10): proves the pattern end-to-end. **Recommend a check-in here** before mechanically replicating tool implementations.
- **Arc C — Remaining 5 tools** (Tasks 11–15): mechanical, follows the pattern from Arc B.
- **Arc D — Undo + verification** (Tasks 16–17).

---

## File Structure

**Create:**
- `drizzle/0002_agent_conversations.sql` — manual migration adding `agent_conversations` + `agent_messages` (also re-runs `db:push` to update Drizzle's metadata)
- `src/lib/db/schema.ts` — extend with `agentConversations`, `agentMessages`, relations, and types
- `src/lib/agent/tools/types.ts` — `ToolDefinition`, `ToolContext`, `ToolStatus` types
- `src/lib/agent/tools/registry.ts` — central registry + lookup + zod-to-AI-SDK adapter
- `src/lib/agent/tools/runtime.ts` — `executeTool` + `undoTool` server-side primitives that wrap `recordAgentAction`
- `src/lib/agent/tools/runtime.test.ts` — TDD coverage for execute + undo
- `src/lib/agent/conversations.ts` — load/persist messages helpers (uses `withExplicitAuth`)
- `src/actions/agent-tool.ts` — Server Action: `runTool({ tool, input })` and `undoToolAction(actionId)`
- `src/actions/agent-conversation.ts` — Server Action: `createConversation()`, `appendMessage()`
- `src/app/api/agent/chat/route.ts` — replace existing chat route with sidekick chat (Vertex Gemini Flash + tool wiring)
- `src/components/agent/tool-card.tsx` — generic ToolCard shell (header / body / footer / status pill)
- `src/components/agent/tool-card.test.tsx` — RTL tests for the four states
- `src/components/agent/sidekick-drawer.tsx` — Base UI Dialog wrapper, listens for `open-sidekick` event
- `src/components/agent/sidekick-chat.tsx` — `useChat`-backed chat UI inside the drawer
- `src/components/agent/tool-renderer.tsx` — switches on `tool` name, calls each tool's `render(props)`
- `src/lib/agent/tools/add-task.tsx` — first concrete tool (schema + execute + undo + render)
- `src/lib/agent/tools/dismiss-alert.tsx`
- `src/lib/agent/tools/search-knowledge.tsx`
- `src/lib/agent/tools/simulate-gpa.tsx`
- `src/lib/agent/tools/propose-plan.tsx`
- `src/lib/agent/tools/clear-inc.tsx`

**Modify:**
- `src/lib/db/schema.ts` — append the two tables + relations
- `src/components/layout/command-palette.tsx` — wire `⌘K` to dispatch `open-sidekick` event (Phase 0 left it as a stub)
- `src/app/page.tsx` — render `<SidekickDrawer />` behind `feature.sidekick` flag in v2 path
- `src/app/layout.tsx` — already wraps in `<TooltipProvider>` (good); confirm `<SidekickDrawer />` is rendered at this layer so `⌘K` works on every page
- `src/components/briefing/cta-actions.tsx` — wire each proposal to `runTool` so clicking "Approve" actually executes (uses Phase 2 framework)

**Delete:**
- The old `/api/chat` endpoint stays alongside `/api/agent/chat` until Phase 6 (RAG upgrade) cuts it over. No deletion in Phase 2.

---

## Task 1: Schema additions for conversations + messages

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Append new tables to schema**

Open `src/lib/db/schema.ts` and add (just before the `// Inferred select/insert types` block):

```ts
export const agentConversations = pgTable(
  "agent_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  (t) => ({
    studentLastMsgIdx: index("agent_conversations_student_idx").on(
      t.studentId,
      t.lastMessageAt
    ),
  })
);

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => agentConversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
    partsJsonb: jsonb("parts_jsonb").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    conversationCreatedIdx: index("agent_messages_conversation_idx").on(
      t.conversationId,
      t.createdAt
    ),
  })
);
```

In the inferred-types block, append:

```ts
export type AgentConversation = typeof agentConversations.$inferSelect;
export type NewAgentConversation = typeof agentConversations.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
```

In the `relations` block at the bottom of the file, append:

```ts
export const agentConversationsRelations = relations(agentConversations, ({ many, one }) => ({
  student: one(students, { fields: [agentConversations.studentId], references: [students.id] }),
  messages: many(agentMessages),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one }) => ({
  conversation: one(agentConversations, {
    fields: [agentMessages.conversationId],
    references: [agentConversations.id],
  }),
}));
```

- [ ] **Step 2: Generate + push migration**

```bash
pnpm db:generate
pnpm db:push --force
```

Expected: a new `drizzle/0002_*.sql` file. The push is non-destructive (additive tables only).

- [ ] **Step 3: Apply RLS policies for the new tables**

Append to `drizzle/0001_rls_policies.sql` (we'll re-apply the file via `pnpm db:apply-rls` — the script is idempotent for existing policies because `CREATE POLICY` errors on duplicates; instead, write a separate SQL file):

Create `drizzle/0003_agent_conversations_rls.sql`:

```sql
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_conversations_owner ON agent_conversations
  FOR ALL
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

-- agent_messages doesn't have a direct student_id column; gate via the parent
-- conversation
CREATE POLICY agent_messages_owner ON agent_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations WHERE student_id = current_student_id()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM agent_conversations WHERE student_id = current_student_id()
    )
  );
```

Update `scripts/apply-rls.ts` to accept a filename argument (or create `scripts/apply-rls-file.ts` that takes a path). Simplest: just call the `Client` directly inline:

```bash
dotenv -e .env.local --override -- tsx -e "import {Client} from '@neondatabase/serverless'; import {readFileSync} from 'fs'; const c=new Client(process.env.DATABASE_URL_UNPOOLED); await c.connect(); const sql=readFileSync('drizzle/0003_agent_conversations_rls.sql','utf-8'); for(const stmt of sql.split(/;\s*\n/).map(s=>s.split('\n').filter(l=>!l.trim().startsWith('--')).join('\n').trim()).filter(s=>s)) { console.log('  ✓',stmt.slice(0,80)); await c.query(stmt); } await c.end()"
```

Or simpler, run `pnpm db:apply-rls` after editing the script to accept a `--file` flag. Whichever path, the goal is: `agent_conversations` + `agent_messages` have RLS policies installed.

- [ ] **Step 4: Verify**

Run a smoke from the shell:

```bash
dotenv -e .env.local --override -- tsx -e "import {neon} from '@neondatabase/serverless'; const s=neon(process.env.DATABASE_URL_UNPOOLED); s\`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'agent_%' ORDER BY 1\`.then(r=>console.log(r))"
```

Expected output includes `agent_actions, agent_conversations, agent_messages, agent_runs`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(db): agent_conversations + agent_messages tables with RLS"
```

---

## Task 2: Tool registry types

**Files:**
- Create: `src/lib/agent/tools/types.ts`

- [ ] **Step 1: Implement**

```ts
import { z } from "zod";
import type { ReactNode } from "react";

export type ToolStatus = "proposed" | "executing" | "executed" | "undone" | "failed";

export interface ToolContext {
  studentId: string;
  clerkUserId: string;
  agentRunId?: string;
  conversationId?: string;
}

export interface ToolDiff<TOutput = unknown> {
  output: TOutput;
  /**
   * Inverse-input: the args needed to undo this execution.
   * Set to `null` for read-only tools.
   */
  undoInput: unknown | null;
  /** Human-readable summary of what happened, for the executed-state card. */
  summary: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Stable identifier; matches the LLM tool name and the dispatch in render. */
  name: string;
  /** One-line description shown to the model. */
  description: string;
  /** Zod schema for input validation. Also used to derive AI SDK tool schema. */
  inputSchema: z.ZodType<TInput>;
  /** When true, the UI requires an explicit Approve click before `execute`. */
  requiresConfirmation: boolean;
  /** True for tools that don't mutate state; UI hides Undo. */
  readOnly: boolean;
  /** Server-side execution. */
  execute: (input: TInput, ctx: ToolContext) => Promise<ToolDiff<TOutput>>;
  /** Server-side undo. Throws if the tool is read-only. */
  undo: (undoInput: unknown, ctx: ToolContext) => Promise<void>;
  /** Renders the body of the ToolCard in any state. */
  render: (props: ToolRenderProps<TInput, TOutput>) => ReactNode;
}

export interface ToolRenderProps<TInput = unknown, TOutput = unknown> {
  status: ToolStatus;
  input: TInput;
  output: TOutput | null;
  errorText: string | null;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agent/tools/types.ts
git commit -m "feat(agent): tool framework types"
```

---

## Task 3: Tool registry + AI SDK adapter

**Files:**
- Create: `src/lib/agent/tools/registry.ts`

- [ ] **Step 1: Implement**

```ts
import { tool } from "ai";
import type { ToolDefinition } from "./types";

const _registry = new Map<string, ToolDefinition>();

export function registerTool<I, O>(def: ToolDefinition<I, O>) {
  if (_registry.has(def.name)) {
    throw new Error(`Tool already registered: ${def.name}`);
  }
  _registry.set(def.name, def as unknown as ToolDefinition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return _registry.get(name);
}

export function listTools(): ToolDefinition[] {
  return Array.from(_registry.values());
}

/**
 * Convert all registered tools into the AI SDK 6 `tools` map shape so we can
 * pass them to `streamText`/`generateText`.
 *
 * AI SDK execution intentionally returns just an `executionId` placeholder —
 * actual work happens in the server action `runTool`, gated by Approve in the
 * UI for confirm-required tools.
 */
export function aiSdkTools() {
  const out: Record<string, ReturnType<typeof tool>> = {};
  for (const def of _registry.values()) {
    out[def.name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: async (_input) => {
        // The model sees the tool call result as a placeholder; the actual
        // mutation happens via the user-approved server action.
        return {
          status: def.requiresConfirmation ? "awaiting-approval" : "auto-approved",
          name: def.name,
        };
      },
    });
  }
  return out;
}

/**
 * Module side-effect: importing this file registers nothing on its own.
 * Each tool file calls `registerTool(...)` at module load. To make sure all
 * tools are discoverable, import the barrel `./all.ts` (created by Task 11).
 */
```

(Note: the `aiSdkTools` shape — passing `awaiting-approval` placeholder — is intentional. The model emits a tool call → the UI renders a `<ToolCard>` in `proposed` state → the user approves → the Server Action runs the real `execute`. This separates LLM-visible behavior from authoritative execution.)

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/registry.ts
git commit -m "feat(agent): tool registry + AI SDK adapter"
```

---

## Task 4: Tool runtime (TDD)

**Files:**
- Create: `src/lib/agent/tools/runtime.ts`
- Create: `src/lib/agent/tools/runtime.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { recordMock, getToolMock, fakeTool } = vi.hoisted(() => {
  const fakeTool = {
    name: "fake",
    description: "fake tool",
    inputSchema: { parse: (x: unknown) => x } as unknown,
    requiresConfirmation: false,
    readOnly: false,
    execute: vi.fn(async (input: unknown) => ({
      output: { ok: true, input },
      undoInput: { undoneOf: input },
      summary: "fake done",
    })),
    undo: vi.fn(async () => {}),
    render: () => null,
  };
  return {
    recordMock: vi.fn(async () => "action-1"),
    getToolMock: vi.fn(() => fakeTool),
    fakeTool,
  };
});

vi.mock("@/lib/agent-actions", () => ({
  recordAgentAction: recordMock,
}));
vi.mock("./registry", () => ({
  getTool: getToolMock,
}));

import { executeTool, undoTool } from "./runtime";

describe("executeTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordMock.mockResolvedValue("action-1");
  });

  it("validates input, executes the tool, records an executed action, returns the diff and actionId", async () => {
    const out = await executeTool("fake", { foo: "bar" }, {
      studentId: "student-1",
      clerkUserId: "user_1",
    });

    expect(out.actionId).toBe("action-1");
    expect(out.diff.output).toEqual({ ok: true, input: { foo: "bar" } });
    expect(fakeTool.execute).toHaveBeenCalledOnce();
    expect(recordMock).toHaveBeenCalledOnce();
    const call = recordMock.mock.calls[0][0] as Record<string, unknown>;
    expect(call.kind).toBe("fake");
    expect(call.status).toBe("executed");
  });

  it("records a failed action and rethrows when the tool throws", async () => {
    fakeTool.execute.mockRejectedValueOnce(new Error("boom"));
    await expect(
      executeTool("fake", {}, { studentId: "s1", clerkUserId: "u1" })
    ).rejects.toThrow(/boom/);
    const call = recordMock.mock.calls[0][0] as Record<string, unknown>;
    expect(call.status).toBe("failed");
    expect(call.errorText).toMatch(/boom/);
  });

  it("throws if the tool is not registered", async () => {
    getToolMock.mockReturnValueOnce(undefined as never);
    await expect(
      executeTool("nope", {}, { studentId: "s1", clerkUserId: "u1" })
    ).rejects.toThrow(/not registered/i);
  });
});

describe("undoTool", () => {
  it("calls the tool's undo and records an undone action", async () => {
    const fake = { ...fakeTool };
    getToolMock.mockReturnValue(fake);
    fake.undo = vi.fn(async () => {});
    recordMock.mockResolvedValueOnce("action-2");

    await undoTool({
      kind: "fake",
      undoInput: { undoneOf: { foo: "bar" } },
    }, { studentId: "s1", clerkUserId: "u1" });

    expect(fake.undo).toHaveBeenCalledOnce();
    const call = recordMock.mock.calls[0][0] as Record<string, unknown>;
    expect(call.kind).toBe("fake.undo");
    expect(call.status).toBe("undone");
  });
});
```

- [ ] **Step 2: Run → fail**

`pnpm test runtime` → FAIL.

- [ ] **Step 3: Implement**

```ts
import { recordAgentAction } from "@/lib/agent-actions";
import { getTool } from "./registry";
import type { ToolContext, ToolDiff } from "./types";

export interface ExecuteResult<TOutput = unknown> {
  actionId: string;
  diff: ToolDiff<TOutput>;
}

export async function executeTool<TOutput = unknown>(
  toolName: string,
  rawInput: unknown,
  ctx: ToolContext
): Promise<ExecuteResult<TOutput>> {
  const def = getTool(toolName);
  if (!def) throw new Error(`Tool not registered: ${toolName}`);

  // Zod schemas have `.parse(...)` — use it to validate.
  type Parseable = { parse(x: unknown): unknown };
  const input = (def.inputSchema as unknown as Parseable).parse(rawInput);

  try {
    const diff = (await def.execute(input, ctx)) as ToolDiff<TOutput>;
    const actionId = await recordAgentAction({
      kind: def.name,
      input,
      diff: diff.output,
      undoInput: diff.undoInput,
      status: "executed",
      agentRunId: ctx.agentRunId,
    });
    return { actionId, diff };
  } catch (e) {
    const errorText = e instanceof Error ? e.message : String(e);
    await recordAgentAction({
      kind: def.name,
      input,
      status: "failed",
      errorText,
      agentRunId: ctx.agentRunId,
    });
    throw e;
  }
}

export async function undoTool(
  args: { kind: string; undoInput: unknown },
  ctx: ToolContext
): Promise<void> {
  const def = getTool(args.kind);
  if (!def) throw new Error(`Tool not registered: ${args.kind}`);
  if (def.readOnly) throw new Error(`Tool ${args.kind} is read-only; nothing to undo`);

  await def.undo(args.undoInput, ctx);
  await recordAgentAction({
    kind: `${def.name}.undo`,
    input: args.undoInput,
    status: "undone",
  });
}
```

- [ ] **Step 4: Tests pass**

`pnpm test runtime` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/tools/runtime.ts src/lib/agent/tools/runtime.test.ts
git commit -m "feat(agent): tool runtime — execute + undo with audit logging"
```

---

## Task 5: Conversation persistence helpers

**Files:**
- Create: `src/lib/agent/conversations.ts`

- [ ] **Step 1: Implement**

```ts
import { eq, desc, asc } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessageAt: Date | null;
}

export async function listConversations(
  studentId: string,
  clerkUserId: string,
  limit = 20
): Promise<ConversationSummary[]> {
  return withExplicitAuth(clerkUserId, async (tx) => {
    const rows = await tx
      .select({
        id: schema.agentConversations.id,
        title: schema.agentConversations.title,
        lastMessageAt: schema.agentConversations.lastMessageAt,
      })
      .from(schema.agentConversations)
      .where(eq(schema.agentConversations.studentId, studentId))
      .orderBy(desc(schema.agentConversations.lastMessageAt))
      .limit(limit);
    return rows;
  });
}

export async function createConversation(
  studentId: string,
  clerkUserId: string,
  title: string | null = null
): Promise<string> {
  return withExplicitAuth(clerkUserId, async (tx) => {
    const inserted = await tx
      .insert(schema.agentConversations)
      .values({ studentId, title })
      .returning({ id: schema.agentConversations.id });
    return inserted[0].id;
  });
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: unknown;
  createdAt: Date | null;
}

export async function loadMessages(
  conversationId: string,
  clerkUserId: string
): Promise<PersistedMessage[]> {
  return withExplicitAuth(clerkUserId, async (tx) => {
    const rows = await tx
      .select({
        id: schema.agentMessages.id,
        role: schema.agentMessages.role,
        parts: schema.agentMessages.partsJsonb,
        createdAt: schema.agentMessages.createdAt,
      })
      .from(schema.agentMessages)
      .where(eq(schema.agentMessages.conversationId, conversationId))
      .orderBy(asc(schema.agentMessages.createdAt));
    return rows as PersistedMessage[];
  });
}

export async function appendMessage(
  conversationId: string,
  clerkUserId: string,
  role: PersistedMessage["role"],
  parts: unknown
): Promise<void> {
  await withExplicitAuth(clerkUserId, async (tx) => {
    await tx.insert(schema.agentMessages).values({ conversationId, role, partsJsonb: parts });
    await tx
      .update(schema.agentConversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.agentConversations.id, conversationId));
  });
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/lib/agent/conversations.ts
git commit -m "feat(agent): conversation persistence helpers"
```

---

## Task 6: Server actions — runTool, undoToolAction, conversation CRUD

**Files:**
- Create: `src/actions/agent-tool.ts`
- Create: `src/actions/agent-conversation.ts`

- [ ] **Step 1: agent-tool.ts**

```ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getCurrentStudentId } from "@/lib/db/auth";
import { executeTool, undoTool, type ExecuteResult } from "@/lib/agent/tools/runtime";
// Importing this barrel ensures all tool files are loaded → registered.
import "@/lib/agent/tools/all";

export interface RunToolArgs {
  tool: string;
  input: unknown;
  conversationId?: string;
  agentRunId?: string;
}

export async function runTool(
  args: RunToolArgs
): Promise<{ ok: true; result: ExecuteResult } | { ok: false; error: string }> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) {
    return { ok: false, error: "unauthenticated" };
  }
  try {
    const result = await executeTool(args.tool, args.input, {
      studentId,
      clerkUserId,
      conversationId: args.conversationId,
      agentRunId: args.agentRunId,
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function undoToolAction(
  args: { kind: string; undoInput: unknown }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return { ok: false, error: "unauthenticated" };
  try {
    await undoTool(args, { studentId, clerkUserId });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
```

- [ ] **Step 2: agent-conversation.ts**

```ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getCurrentStudentId } from "@/lib/db/auth";
import {
  createConversation,
  listConversations,
  type ConversationSummary,
} from "@/lib/agent/conversations";

export async function startConversation(
  title: string | null = null
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return { ok: false, error: "unauthenticated" };
  const id = await createConversation(studentId, clerkUserId, title);
  return { ok: true, id };
}

export async function recentConversations(): Promise<ConversationSummary[]> {
  const { userId: clerkUserId } = await auth();
  const studentId = await getCurrentStudentId();
  if (!clerkUserId || !studentId) return [];
  return listConversations(studentId, clerkUserId);
}
```

- [ ] **Step 3: Commit**

(The `@/lib/agent/tools/all` barrel doesn't exist yet — Task 11 creates it. For now, create an empty barrel to satisfy the import:)

```ts
// src/lib/agent/tools/all.ts
// Tool barrel — imported by server actions to register all tools at module load.
// Each tool file calls `registerTool(...)` at the top level.
// Tools added in subsequent tasks: addTask, dismissAlert, searchKnowledge,
// simulateGpa, proposePlan, clearInc.
export {};
```

```bash
pnpm tsc --noEmit
git add src/actions/agent-tool.ts src/actions/agent-conversation.ts src/lib/agent/tools/all.ts
git commit -m "feat(agent): server actions for tool runner + conversation CRUD"
```

---

## Task 7: First tool — addTask (Arc B starts)

**Files:**
- Create: `src/lib/agent/tools/add-task.tsx`
- Modify: `src/lib/agent/tools/all.ts` — add the import

- [ ] **Step 1: Implement add-task tool**

```tsx
import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().date().optional(),
  courseCode: z.string().min(1).max(20).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  taskId: string;
  resolvedCourseId: string | null;
}

export const addTaskTool: ToolDefinition<Input, Output> = {
  name: "addTask",
  description: "Add a task to the student's task list. Optional due date (YYYY-MM-DD) and course code (e.g. MO-IT108).",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: false,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      let courseId: string | null = null;
      if (input.courseCode) {
        const found = await tx
          .select({ id: schema.courses.id })
          .from(schema.courses)
          .where(eq(schema.courses.code, input.courseCode))
          .limit(1);
        courseId = found[0]?.id ?? null;
      }
      const inserted = await tx
        .insert(schema.tasks)
        .values({
          studentId: ctx.studentId,
          title: input.title,
          dueDate: input.dueDate ?? null,
          courseId,
          createdByAgent: true,
        })
        .returning({ id: schema.tasks.id });
      const taskId = inserted[0].id;
      return {
        output: { taskId, resolvedCourseId: courseId },
        undoInput: { taskId },
        summary: `Added task: "${input.title}"${input.dueDate ? ` (due ${input.dueDate})` : ""}`,
      };
    });
  },
  async undo(undoInput, ctx) {
    const { taskId } = undoInput as { taskId: string };
    await withExplicitAuth(ctx.clerkUserId, async (tx) => {
      await tx.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
    });
  },
  render({ status, input, output, errorText }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div className="font-medium">{input.title}</div>
        {input.dueDate && (
          <div className="text-xs text-muted-foreground">Due {input.dueDate}</div>
        )}
        {input.courseCode && (
          <div className="text-xs text-muted-foreground">Course {input.courseCode}</div>
        )}
        {status === "executed" && output && (
          <div className="text-xs text-emerald-400">Task added.</div>
        )}
        {status === "failed" && errorText && (
          <div className="text-xs text-red-400">{errorText}</div>
        )}
      </div>
    );
  },
};

registerTool(addTaskTool);
```

- [ ] **Step 2: Wire in barrel**

`src/lib/agent/tools/all.ts`:

```ts
import "./add-task";

export {};
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/add-task.tsx src/lib/agent/tools/all.ts
git commit -m "feat(agent): addTask tool — schema, execute, undo, render"
```

---

## Task 8: ToolCard shell + tool-renderer

**Files:**
- Create: `src/components/agent/tool-card.tsx`
- Create: `src/components/agent/tool-renderer.tsx`

- [ ] **Step 1: ToolCard**

```tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Undo2, AlertCircle } from "lucide-react";
import { runTool, undoToolAction } from "@/actions/agent-tool";
import type { ToolStatus } from "@/lib/agent/tools/types";

const STATUS_LABEL: Record<ToolStatus, string> = {
  proposed: "Proposed",
  executing: "Executing",
  executed: "Done",
  undone: "Undone",
  failed: "Failed",
};

export interface ToolCardProps {
  tool: string;
  toolLabel: string;
  status: ToolStatus;
  requiresConfirmation: boolean;
  readOnly: boolean;
  /** Auto-approve summary or manual approval label. */
  body: React.ReactNode;
  input: unknown;
  /** Set after execute completes — used for undo wiring. */
  actionId?: string;
  undoInput?: unknown;
  onStatusChange?(next: ToolStatus, actionId?: string, undoInput?: unknown): void;
  errorText?: string | null;
}

export function ToolCard({
  tool,
  toolLabel,
  status,
  requiresConfirmation,
  readOnly,
  body,
  input,
  actionId,
  undoInput,
  onStatusChange,
  errorText,
}: ToolCardProps) {
  const [pending, start] = useTransition();

  const approve = () => {
    onStatusChange?.("executing");
    start(async () => {
      const r = await runTool({ tool, input });
      if (r.ok) {
        onStatusChange?.("executed", r.result.actionId, r.result.diff.undoInput);
      } else {
        onStatusChange?.("failed");
      }
    });
  };

  const undo = () => {
    if (!undoInput) return;
    start(async () => {
      const r = await undoToolAction({ kind: tool, undoInput });
      onStatusChange?.(r.ok ? "undone" : "failed");
    });
  };

  return (
    <div className="rounded-md border border-border bg-card text-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{toolLabel}</span>
        <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wide ${
          status === "failed" ? "text-red-400"
          : status === "executed" ? "text-emerald-400"
          : status === "executing" ? "text-amber-400"
          : status === "undone" ? "text-muted-foreground"
          : "text-foreground/70"
        }`}>
          {status === "executing" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {status === "executed" && <Check className="h-3 w-3" aria-hidden />}
          {status === "failed" && <AlertCircle className="h-3 w-3" aria-hidden />}
          {STATUS_LABEL[status]}
        </span>
      </header>
      <div className="px-3 py-2">{body}</div>
      <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-3 py-1.5">
        {status === "proposed" && !readOnly && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onStatusChange?.("undone")} disabled={pending}>
              <X className="h-3 w-3" aria-hidden /> Cancel
            </Button>
            <Button size="sm" onClick={approve} disabled={pending}>
              <Check className="h-3 w-3" aria-hidden /> Approve
            </Button>
          </>
        )}
        {status === "executed" && !readOnly && undoInput != null && (
          <Button size="sm" variant="ghost" onClick={undo} disabled={pending}>
            <Undo2 className="h-3 w-3" aria-hidden /> Undo
          </Button>
        )}
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: tool-renderer.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { ToolCard } from "./tool-card";
import type { ToolStatus } from "@/lib/agent/tools/types";

interface Props {
  tool: string;
  input: unknown;
  /** True if the tool requires Approve before execute. The model passes this. */
  requiresConfirmation: boolean;
  readOnly: boolean;
  /** UI render function from the tool definition (mirrored client-side). */
  renderBody: (args: {
    status: ToolStatus;
    input: unknown;
    output: unknown;
    errorText: string | null;
  }) => React.ReactNode;
  toolLabel: string;
}

export function ToolRenderer(props: Props) {
  const [status, setStatus] = useState<ToolStatus>(
    props.requiresConfirmation ? "proposed" : "proposed"
  );
  const [actionId, setActionId] = useState<string | undefined>();
  const [undoInput, setUndoInput] = useState<unknown>();
  const [output, setOutput] = useState<unknown>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Auto-approve no-confirm tools on first render.
  useEffect(() => {
    // Phase 2: leave manual approve always; auto-approve is opt-in for Phase 3+.
  }, []);

  return (
    <ToolCard
      tool={props.tool}
      toolLabel={props.toolLabel}
      status={status}
      requiresConfirmation={props.requiresConfirmation}
      readOnly={props.readOnly}
      input={props.input}
      actionId={actionId}
      undoInput={undoInput}
      errorText={errorText}
      body={props.renderBody({ status, input: props.input, output, errorText })}
      onStatusChange={(next, aId, undo) => {
        setStatus(next);
        if (aId) setActionId(aId);
        if (undo !== undefined) setUndoInput(undo);
        if (next === "failed") setErrorText("Tool execution failed.");
      }}
    />
  );
}
```

- [ ] **Step 3: Build smoke (no lint errors)**

```bash
pnpm tsc --noEmit
pnpm build
```

PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/agent/tool-card.tsx src/components/agent/tool-renderer.tsx
git commit -m "feat(agent): ToolCard shell + ToolRenderer driver"
```

---

## Task 9: Chat API route + Sidekick chat UI

**Files:**
- Create: `src/app/api/agent/chat/route.ts` (REPLACES existing `/api/chat` for now — keep both until Phase 6)
- Create: `src/components/agent/sidekick-chat.tsx`

Existing `/api/chat` stays alive for the legacy knowledge-chat. We add a new `/api/agent/chat` route at a separate path so the Phase 2 sidekick has its own surface.

- [ ] **Step 1: Chat route**

```ts
import { auth } from "@clerk/nextjs/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { model } from "@/lib/ai/vertex";
import { aiSdkTools } from "@/lib/agent/tools/registry";
import "@/lib/agent/tools/all";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the academic sidekick for an MMDC student. You can:
- Answer questions about their academic state grounded in tool results.
- Propose actions via tool calls. The user reviews and approves each one.
Tone: direct, calm, no greetings or signoffs. When you call a tool, write a one-sentence rationale before the tool call.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: model("flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: aiSdkTools(),
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Sidekick chat UI**

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolRenderer } from "./tool-renderer";

export function SidekickChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    api: "/api/agent/chat",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Ask anything about your academic state.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div
                    key={i}
                    className={`text-sm ${
                      m.role === "user" ? "text-foreground" : "text-foreground/85"
                    }`}
                  >
                    {part.text}
                  </div>
                );
              }
              // AI SDK 6 emits tool calls under part.type === "tool-<name>"
              if (part.type?.startsWith?.("tool-")) {
                const toolName = part.type.replace(/^tool-/, "");
                const toolPart = part as unknown as {
                  input?: unknown;
                };
                return (
                  <ToolRenderer
                    key={i}
                    tool={toolName}
                    toolLabel={toolName}
                    input={toolPart.input ?? {}}
                    requiresConfirmation={true}
                    readOnly={false}
                    renderBody={({ input }) => (
                      <pre className="text-xs text-muted-foreground">
                        {JSON.stringify(input, null, 2)}
                      </pre>
                    )}
                  />
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="border-t border-border p-2">
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask sidekick…"
            className="text-sm"
            disabled={status === "streaming"}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || status === "streaming"}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

(The default `renderBody` here is a JSON dump — it works for the Arc B check-in. Tool-specific render bodies come in Tasks 11–15.)

- [ ] **Step 3: Build**

```bash
pnpm tsc --noEmit
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agent/chat src/components/agent/sidekick-chat.tsx
git commit -m "feat(agent): sidekick chat API + useChat client UI"
```

---

## Task 10: Sidekick drawer + command palette wiring

**Files:**
- Create: `src/components/agent/sidekick-drawer.tsx`
- Modify: `src/components/layout/command-palette.tsx`
- Modify: `src/app/layout.tsx` — render the drawer at root
- Modify: `src/app/page.tsx` — gate behind `feature.sidekick`

- [ ] **Step 1: Sidekick drawer**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { Sparkles, X } from "lucide-react";
import { SidekickChat } from "./sidekick-chat";

export function SidekickDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("open-sidekick", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-sidekick", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <BaseDialog.Root open={open} onOpenChange={setOpen}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <BaseDialog.Popup
          className="fixed right-0 top-0 z-50 flex h-svh w-full max-w-md flex-col border-l border-border bg-background/95 backdrop-blur-md shadow-2xl transition-transform data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full"
        >
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <BaseDialog.Title className="text-sm font-medium">Sidekick</BaseDialog.Title>
            </div>
            <BaseDialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </BaseDialog.Close>
          </header>
          <div className="flex-1 overflow-hidden">
            <SidekickChat />
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
```

(If the project's `Dialog` is shadcn-based and doesn't expose Base UI primitives directly, swap for `@/components/ui/dialog` + tweak the styling. The behavior is what matters: opens on `⌘K` event, closes on Escape, slides in from the right.)

- [ ] **Step 2: Wire layout**

In `src/app/layout.tsx`, add at the bottom of the `<body>` (before `<Toaster />`):

```tsx
<SidekickDrawer />
```

Import: `import { SidekickDrawer } from "@/components/agent/sidekick-drawer";`

Wrap in `<Suspense fallback={null}>` if needed for Cache Components.

- [ ] **Step 3: Wire command palette**

Open `src/components/layout/command-palette.tsx`. The TopBar already dispatches `open-sidekick` events when the user clicks the search bar / sidekick button. The command palette currently does its own thing — add a "Open Sidekick" command that dispatches the event:

(Read the existing command-palette.tsx first; adapt to its existing pattern. If it has a list of `commands`, add one with `name: "Open Sidekick"`, `shortcut: "⌘K"`, `onSelect: () => window.dispatchEvent(new CustomEvent("open-sidekick"))`.)

- [ ] **Step 4: Gate behind feature.sidekick**

In `src/app/layout.tsx`, only render `<SidekickDrawer />` when `feature.sidekick` is enabled. Since the layout is async and reads cookies via `isFlagEnabled`, this needs a small server boundary:

Actually layouts can be async in App Router. Use:

```tsx
const sidekickOn = await isFlagEnabled("feature.sidekick");
// ...
{sidekickOn && <SidekickDrawer />}
```

- [ ] **Step 5: Smoke + commit**

```bash
pnpm tsc --noEmit
pnpm build
git add src/components/agent/sidekick-drawer.tsx src/components/layout/command-palette.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat(agent): sidekick drawer with ⌘K trigger + layout wiring"
```

---

## ⏸ ARC B CHECK-IN

After Task 10, the sidekick can be opened with `⌘K`, the chat streams from Vertex Flash, and `addTask` proposals render as ToolCards with working Approve / Cancel / Undo. Pause here, run a Playwright smoke (or manual smoke), and confirm the pattern works before mechanically replicating tools. If anything is off, fix it now — the next 5 tasks just stamp out the same pattern.

---

## Task 11: dismissAlert tool

**Files:**
- Create: `src/lib/agent/tools/dismiss-alert.tsx`
- Modify: `src/lib/agent/tools/all.ts`

- [ ] **Step 1: Implement**

```tsx
import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  alertId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  alertId: string;
  prevDismissed: boolean;
}

export const dismissAlertTool: ToolDefinition<Input, Output> = {
  name: "dismissAlert",
  description: "Dismiss an active alert by id, with an optional reason.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: false,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const prev = await tx
        .select({ dismissed: schema.alerts.dismissed })
        .from(schema.alerts)
        .where(eq(schema.alerts.id, input.alertId))
        .limit(1);
      const prevDismissed = prev[0]?.dismissed ?? false;
      await tx
        .update(schema.alerts)
        .set({ dismissed: true })
        .where(eq(schema.alerts.id, input.alertId));
      return {
        output: { alertId: input.alertId, prevDismissed },
        undoInput: { alertId: input.alertId, prevDismissed },
        summary: `Dismissed alert ${input.alertId.slice(0, 8)}…`,
      };
    });
  },
  async undo(undoInput, ctx) {
    const { alertId, prevDismissed } = undoInput as { alertId: string; prevDismissed: boolean };
    await withExplicitAuth(ctx.clerkUserId, async (tx) => {
      await tx
        .update(schema.alerts)
        .set({ dismissed: prevDismissed })
        .where(eq(schema.alerts.id, alertId));
    });
  },
  render({ input }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div>Dismiss alert <span className="font-mono text-xs">{input.alertId.slice(0, 8)}…</span></div>
        {input.reason && <div className="text-xs text-muted-foreground">{input.reason}</div>}
      </div>
    );
  },
};

registerTool(dismissAlertTool);
```

- [ ] **Step 2: Add to barrel**

`src/lib/agent/tools/all.ts`:
```ts
import "./add-task";
import "./dismiss-alert";
export {};
```

- [ ] **Step 3: Commit**

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/dismiss-alert.tsx src/lib/agent/tools/all.ts
git commit -m "feat(agent): dismissAlert tool"
```

---

## Task 12: searchKnowledge tool (read-only)

**Files:**
- Create: `src/lib/agent/tools/search-knowledge.tsx`
- Modify: `src/lib/agent/tools/all.ts`

- [ ] **Step 1: Implement**

```tsx
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  query: z.string().min(1).max(500),
  k: z.number().int().min(1).max(10).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Hit {
  title: string;
  source: string;
  url: string | null;
  snippet: string;
}
interface Output {
  hits: Hit[];
}

export const searchKnowledgeTool: ToolDefinition<Input, Output> = {
  name: "searchKnowledge",
  description: "Search the MMDC FAQ + handbook for the user's query. Returns up to k=4 grounded snippets with citations.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: true,
  async execute(input) {
    const k = input.k ?? 4;
    const fts = sql`to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${input.query})`;
    const rows = await db
      .select({
        title: schema.knowledgeChunks.title,
        source: schema.knowledgeChunks.source,
        url: schema.knowledgeChunks.url,
        content: schema.knowledgeChunks.content,
      })
      .from(schema.knowledgeChunks)
      .where(fts)
      .limit(k);
    const hits: Hit[] = rows.map((r) => ({
      title: r.title,
      source: r.source,
      url: r.url,
      snippet: r.content.slice(0, 240) + (r.content.length > 240 ? "…" : ""),
    }));
    return {
      output: { hits },
      undoInput: null,
      summary: `Found ${hits.length} relevant ${hits.length === 1 ? "chunk" : "chunks"}.`,
    };
  },
  async undo() {
    throw new Error("searchKnowledge is read-only");
  },
  render({ input, output }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Query: {input.query}</div>
        {output?.hits.map((h, i) => (
          <div key={i} className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
            <div className="text-xs font-medium">{h.title}</div>
            <div className="text-xs text-muted-foreground">{h.snippet}</div>
            {h.url && (
              <a href={h.url} className="text-[10px] text-primary underline" target="_blank" rel="noreferrer">
                Source [{h.source}]
              </a>
            )}
          </div>
        ))}
      </div>
    );
  },
};

registerTool(searchKnowledgeTool);
```

- [ ] **Step 2: Barrel + commit**

```ts
// src/lib/agent/tools/all.ts
import "./add-task";
import "./dismiss-alert";
import "./search-knowledge";
export {};
```

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/search-knowledge.tsx src/lib/agent/tools/all.ts
git commit -m "feat(agent): searchKnowledge tool (read-only)"
```

---

## Task 13: simulateGpa tool (read-only)

**Files:**
- Create: `src/lib/agent/tools/simulate-gpa.tsx`
- Modify: `src/lib/agent/tools/all.ts`

- [ ] **Step 1: Implement**

```tsx
import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { calculateGpa } from "@/lib/gpa";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  overrides: z
    .array(
      z.object({
        courseCode: z.string().min(1),
        grade: z.string().min(1),
      })
    )
    .max(20),
  target: z.number().min(1).max(5).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  baselineGwa: number;
  simulatedGwa: number;
  unitsPassed: number;
  notes: string[];
}

export const simulateGpaTool: ToolDefinition<Input, Output> = {
  name: "simulateGpa",
  description: "Simulate a what-if cumulative GWA by overriding grades for specific courses. Read-only. Optional `target` returns the gap.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: true,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const enrollments = await tx.query.enrollments.findMany({
        where: eq(schema.enrollments.studentId, ctx.studentId),
        with: { course: true },
      });
      const baseline = calculateGpa(
        enrollments.map((e) => ({
          grade: e.grade,
          status: e.status,
          term: e.term,
          school_year: e.schoolYear,
          course: {
            code: e.course?.code ?? "",
            title: e.course?.title ?? "",
            units: e.course?.units ?? 0,
          },
        }))
      );
      const overrideMap = new Map(input.overrides.map((o) => [o.courseCode, o.grade]));
      const simulated = calculateGpa(
        enrollments.map((e) => ({
          grade: overrideMap.get(e.course?.code ?? "") ?? e.grade,
          status: overrideMap.has(e.course?.code ?? "") ? "passed" : e.status,
          term: e.term,
          school_year: e.schoolYear,
          course: {
            code: e.course?.code ?? "",
            title: e.course?.title ?? "",
            units: e.course?.units ?? 0,
          },
        }))
      );
      const notes: string[] = [];
      if (input.target != null) {
        const gap = simulated.cumulativeGwa - input.target;
        notes.push(
          gap >= 0
            ? `Target ${input.target.toFixed(2)} met (margin ${gap.toFixed(2)}).`
            : `Target ${input.target.toFixed(2)} short by ${Math.abs(gap).toFixed(2)}.`
        );
      }
      return {
        output: {
          baselineGwa: baseline.cumulativeGwa,
          simulatedGwa: simulated.cumulativeGwa,
          unitsPassed: simulated.totalUnitsPassed,
          notes,
        },
        undoInput: null,
        summary: `Simulated GWA: ${simulated.cumulativeGwa.toFixed(2)} (baseline ${baseline.cumulativeGwa.toFixed(2)})`,
      };
    });
  },
  async undo() {
    throw new Error("simulateGpa is read-only");
  },
  render({ input, output }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div className="text-xs text-muted-foreground">
          {input.overrides.length} grade override{input.overrides.length === 1 ? "" : "s"}
          {input.target != null && ` · target ${input.target.toFixed(2)}`}
        </div>
        {output && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
            <div>
              <div className="text-muted-foreground">Baseline</div>
              <div className="text-base font-medium">{output.baselineGwa.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Simulated</div>
              <div className="text-base font-medium">{output.simulatedGwa.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Units</div>
              <div className="text-base font-medium">{output.unitsPassed}</div>
            </div>
            {output.notes.map((n, i) => (
              <div key={i} className="col-span-3 text-xs text-foreground/80">{n}</div>
            ))}
          </div>
        )}
      </div>
    );
  },
};

registerTool(simulateGpaTool);
```

- [ ] **Step 2: Barrel + commit**

```ts
// src/lib/agent/tools/all.ts
import "./add-task";
import "./dismiss-alert";
import "./search-knowledge";
import "./simulate-gpa";
export {};
```

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/simulate-gpa.tsx src/lib/agent/tools/all.ts
git commit -m "feat(agent): simulateGpa tool (read-only)"
```

---

## Task 14: proposePlan tool (read-only)

**Files:**
- Create: `src/lib/agent/tools/propose-plan.tsx`
- Modify: `src/lib/agent/tools/all.ts`

- [ ] **Step 1: Implement**

For Phase 2, `proposePlan` returns a placeholder structured response. Phase 4 (Planner) replaces this with the real constraint solver. We ship the read-only stub now so the sidekick can exercise the tool surface end-to-end.

```tsx
import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  termHint: z.string().optional(),
  maxUnits: z.number().int().min(3).max(24).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface PlanCandidate {
  label: string;
  courseCodes: string[];
  units: number;
  rationale: string;
}
interface Output {
  candidates: PlanCandidate[];
}

export const proposePlanTool: ToolDefinition<Input, Output> = {
  name: "proposePlan",
  description: "Propose 1-3 next-term plan candidates given the student's progress. Read-only. Phase 4 will replace this stub with a real solver.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: true,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const incs = await tx.query.enrollments.findMany({
        where: eq(schema.enrollments.studentId, ctx.studentId),
        with: { course: true },
      });
      const incCourses = incs
        .filter((e) => e.status === "inc")
        .map((e) => e.course?.code)
        .filter((c): c is string => Boolean(c));
      const candidates: PlanCandidate[] = [
        {
          label: "Light + clear INCs",
          courseCodes: [...incCourses, "MO-IT108"].slice(0, 4),
          units: incCourses.length * 3 + 3,
          rationale: "Resolves outstanding INCs first; lighter on new IT cores.",
        },
      ];
      return {
        output: { candidates },
        undoInput: null,
        summary: `Proposed ${candidates.length} plan candidate${candidates.length === 1 ? "" : "s"}.`,
      };
    });
  },
  async undo() {
    throw new Error("proposePlan is read-only");
  },
  render({ input, output }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-2 text-sm">
        {input.termHint && (
          <div className="text-xs text-muted-foreground">Term hint: {input.termHint}</div>
        )}
        {output?.candidates.map((c, i) => (
          <div key={i} className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
            <div className="font-medium">{c.label}</div>
            <div className="text-xs font-mono text-muted-foreground">
              {c.courseCodes.join(", ")} ({c.units}u)
            </div>
            <div className="text-xs text-foreground/80 mt-0.5">{c.rationale}</div>
          </div>
        ))}
      </div>
    );
  },
};

registerTool(proposePlanTool);
```

- [ ] **Step 2: Barrel + commit**

```ts
// src/lib/agent/tools/all.ts
import "./add-task";
import "./dismiss-alert";
import "./search-knowledge";
import "./simulate-gpa";
import "./propose-plan";
export {};
```

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/propose-plan.tsx src/lib/agent/tools/all.ts
git commit -m "feat(agent): proposePlan stub (Phase 4 will replace with real solver)"
```

---

## Task 15: clearInc tool (confirm required)

**Files:**
- Create: `src/lib/agent/tools/clear-inc.tsx`
- Modify: `src/lib/agent/tools/all.ts`

- [ ] **Step 1: Implement**

```tsx
import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  enrollmentId: z.string().uuid(),
  newGrade: z.string().regex(/^(1\.00|1\.25|1\.50|1\.75|2\.00|2\.25|2\.50|2\.75|3\.00|5\.00|P|F|INC|DRP)$/),
  evidenceTaskId: z.string().uuid().optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  enrollmentId: string;
  prevGrade: string | null;
  prevStatus: string;
}

function gradeToStatus(grade: string): string {
  const u = grade.toUpperCase();
  if (u === "INC") return "inc";
  if (u === "DRP") return "drp";
  if (u === "5.00" || u === "F") return "failed";
  return "passed";
}

export const clearIncTool: ToolDefinition<Input, Output> = {
  name: "clearInc",
  description: "Clear an INC enrollment by setting a final grade. Requires explicit user approval. Logs an audit row.",
  inputSchema: InputSchema,
  requiresConfirmation: true,
  readOnly: false,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const prev = await tx
        .select({ grade: schema.enrollments.grade, status: schema.enrollments.status })
        .from(schema.enrollments)
        .where(eq(schema.enrollments.id, input.enrollmentId))
        .limit(1);
      const prevGrade = prev[0]?.grade ?? null;
      const prevStatus = prev[0]?.status ?? "in_progress";
      await tx
        .update(schema.enrollments)
        .set({ grade: input.newGrade, status: gradeToStatus(input.newGrade) as "passed" | "inc" | "drp" | "in_progress" | "failed" })
        .where(eq(schema.enrollments.id, input.enrollmentId));
      return {
        output: { enrollmentId: input.enrollmentId, prevGrade, prevStatus },
        undoInput: { enrollmentId: input.enrollmentId, prevGrade, prevStatus },
        summary: `Set grade to ${input.newGrade} for enrollment ${input.enrollmentId.slice(0, 8)}…`,
      };
    });
  },
  async undo(undoInput, ctx) {
    const { enrollmentId, prevGrade, prevStatus } = undoInput as {
      enrollmentId: string;
      prevGrade: string | null;
      prevStatus: string;
    };
    await withExplicitAuth(ctx.clerkUserId, async (tx) => {
      await tx
        .update(schema.enrollments)
        .set({ grade: prevGrade, status: prevStatus as "passed" | "inc" | "drp" | "in_progress" | "failed" })
        .where(eq(schema.enrollments.id, enrollmentId));
    });
  },
  render({ input }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div>
          Set enrollment <span className="font-mono text-xs">{input.enrollmentId.slice(0, 8)}…</span>{" "}
          to grade <span className="font-mono font-medium">{input.newGrade}</span>
        </div>
        {input.evidenceTaskId && (
          <div className="text-xs text-muted-foreground">
            Evidence task {input.evidenceTaskId.slice(0, 8)}…
          </div>
        )}
        <div className="text-xs text-amber-300">Requires approval</div>
      </div>
    );
  },
};

registerTool(clearIncTool);
```

- [ ] **Step 2: Barrel + commit**

```ts
// src/lib/agent/tools/all.ts
import "./add-task";
import "./dismiss-alert";
import "./search-knowledge";
import "./simulate-gpa";
import "./propose-plan";
import "./clear-inc";
export {};
```

```bash
pnpm tsc --noEmit
git add src/lib/agent/tools/clear-inc.tsx src/lib/agent/tools/all.ts
git commit -m "feat(agent): clearInc tool (confirm-required)"
```

---

## Task 16: Wire briefing CTAs to runTool

**Files:**
- Modify: `src/components/briefing/cta-actions.tsx`

The Phase 1 CTAs are currently inert. Now that the tool framework exists, wire each proposal so clicking "Approve" actually executes via the same `<ToolCard>` renderer.

- [ ] **Step 1: Refactor**

```tsx
"use client";

import type { AgentToolProposal } from "@/lib/briefing/schema";
import { ToolRenderer } from "@/components/agent/tool-renderer";

export function CtaActions({ actions }: { actions: AgentToolProposal[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Suggested actions
      </h3>
      <ul className="space-y-2">
        {actions.map((a, i) => (
          <li key={i}>
            <ToolRenderer
              tool={a.tool}
              toolLabel={a.tool}
              input={a.args}
              requiresConfirmation
              readOnly={a.tool === "searchKnowledge" || a.tool === "simulateGpa" || a.tool === "proposePlan"}
              renderBody={() => (
                <p className="text-foreground/85">{a.rationale}</p>
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Note: this file is already `"use client"`-compatible — the parent (`BriefingHero`) is a Server Component but `cta-actions.tsx` becomes a Client Component now.

- [ ] **Step 2: Commit**

```bash
pnpm tsc --noEmit
pnpm build
git add src/components/briefing/cta-actions.tsx
git commit -m "feat(briefing): wire CTA proposals to runTool via ToolRenderer"
```

---

## Task 17: Verification gate

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```

PASS.

- [ ] **Step 2: Tests**

```bash
pnpm test
```

Phase 1 had 25; Phase 2 adds at least 4 (Task 4 = 4 runtime tests). Expect 29+ passing.

- [ ] **Step 3: Build**

```bash
pnpm build
```

PASS. Confirm new routes appear: `/api/agent/chat`.

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

0 errors. Existing warnings carry over.

- [ ] **Step 5: Manual smoke**

1. `pnpm dev`
2. Sign in (or `DISABLE_AUTH=1` for Playwright).
3. Set flags:
   ```js
   document.cookie = "ff=dashboard.v2=1,feature.briefing=1,feature.sidekick=1; path=/";
   ```
4. Open `⌘K` — sidekick drawer slides in from the right.
5. Type "add a task to read DSA chapter 4 for next week" — assistant proposes `addTask` as a `<ToolCard>`. Click Approve. New row appears in `tasks` table; `agent_actions` row written; `Undo` works and reverses it.
6. Type "what does the handbook say about INC clearance" — `searchKnowledge` returns inline hits with citations.
7. From the Briefing CTAs, click Approve on one — same flow as the chat.
8. Visit `/admin/runs` — see `agent_actions` rows for each tool execution + undo.

If any of those fails, fix before tagging.

- [ ] **Step 6: Tag**

```bash
git tag -a phase-2-sidekick -m "Phase 2 — sidekick + tool vocabulary shipped"
```

---

## Self-Review

**Spec coverage (§F2 + §B2 + §B3):**
- Right-docked drawer, `⌘K`-triggered → Tasks 9–10 ✓
- `useChat` over `app/api/agent/chat/route.ts`, Gemini Flash → Task 9 ✓
- Tool calls render inline as `<ToolCard>` → Task 8 ✓
- Three states: `proposed` → `executing` → `executed` (+ `failed`/`undone`) → Task 8 ✓
- Approve / Edit / Cancel / Undo footer → Task 8 ✓ (Edit deferred to Phase 2.5; current footer is Approve / Cancel / Undo)
- Server Action wraps execution + `agent_actions` + tag revalidation → Task 6 ✓
- Conversation persistence in `agent_conversations` + `agent_messages` → Tasks 1, 5, 6 ✓
- All six tools shipped → Tasks 7, 11–15 ✓

**Explicit YAGNI cuts:**
- "Edit" footer button on `<ToolCard>` is deferred (Phase 2.5).
- `proposePlan` ships as a stub; Phase 4 replaces with the real solver.
- Conversation deep-linking via `?c=<id>` (`nuqs`) is not wired in Phase 2 — the chat starts a fresh conversation per drawer open. Phase 2.5 can add it.
- Per-conversation token budget (spec §B6) is not enforced in Phase 2 — Phase 3+ adds it before any heavier flows ship.

**Placeholder scan:** No "TBD". Each step has runnable code or a discoverable script. The two soft-references (`@base-ui-components/react/dialog` import, `command-palette` extension) include explicit fallback instructions.

**Type consistency:** `ToolDefinition`, `ToolContext`, `ToolDiff`, `ToolStatus`, `ToolRenderProps` all defined in Task 2 and consumed in Tasks 4, 7, 11–15. `executeTool` and `undoTool` defined in Task 4, consumed in Task 6. `runTool` server action defined in Task 6, consumed in Task 8 (`<ToolCard>`) and Task 16 (briefing CTAs).

**Phase 1 dependency:** `BriefingHero.ctaActions` (Task 16) consumes the new framework. Phase 1 left the CTAs inert — Phase 2 makes them executable.

**Risk:** the Base UI Dialog import (`@base-ui-components/react/dialog`) may need adaptation depending on what the project's `@base-ui/react` package actually exports. Task 10 includes the fallback instruction to swap for `@/components/ui/dialog` if needed.
