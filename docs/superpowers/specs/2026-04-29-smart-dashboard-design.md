# Smart Dashboard Redesign — Design Spec

**Date:** 2026-04-29
**Status:** Approved
**Owner:** Christopher Pond Maquidato

## 1. Goal

Transform `academics-os` from a static MMDC student dashboard into a smart, agentic academic command center powered by Google Cloud Vertex AI (Gemini) with a Linear/Vercel-style aesthetic, Clerk auth, Supabase RLS, and a permanent audit log on every agent action.

The redesign delivers ten capabilities, in shipping order:

1. Daily AI briefing hero on the dashboard
2. Global agent sidekick (`⌘K`) with tool calling
3. GPA / grade simulator with AI explanations
4. Optimal next-term planner
5. INC / risk radar (daily cron)
6. Knowledge RAG upgrade (hybrid retrieval, citations)
7. Study session companion
8. Smart inbox (Gmail triage + drafted replies)
9. Voice journal → tasks
10. Audit log + undo for every agent mutation (foundation, always-on)

## 2. Non-Goals

- Multi-tenant onboarding for arbitrary students. The app stays single-user behind Clerk for now; RLS makes the upgrade additive later.
- Native mobile apps. PWA only.
- Real-time collaborative features. Single-user means single-session.
- Replacing MyCamu. We integrate where useful (transcript scrape, calendar) but never claim parity.

## 3. Architectural Shape

**Approach 1 — Monolithic Next.js 16 app.** One repo, one deploy. Vertex round-trips happen server-side via a thin adapter (`src/lib/ai/`). All agent tools execute as Server Actions gated by Clerk session + Supabase RLS. Audit log is a single `agent_actions` table.

The runtime layer is shaped so it can later be lifted into Vercel Workflow DevKit (durable, checkpointed) for long-running flows (planner, radar, study, email) without changing call sites.

### Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS v4 + shadcn/ui (existing) + a new `lib/ui/primitives` layer for Linear-style defaults
- AI SDK 6 (`ai`, `@ai-sdk/react`) — provider-agnostic surface; provider implementation is Vertex Node SDK
- `@clerk/nextjs` for auth; Supabase as Clerk Third-Party Auth provider
- Supabase Postgres with `pgvector` + RLS
- Vercel Blob (private) for audio + uploads
- Vercel Cron for scheduled agent runs
- Upstash Redis (via Vercel Marketplace) for rate limiting + session-scoped state
- `@sentry/nextjs` with AI-monitoring integration
- Framer Motion for micro-interactions; Recharts (restyled monochrome) + a sparkline SVG component
- Zod 4 for tool schemas + `generateObject`
- TanStack Query for client cache where Server Actions don't suffice
- `nuqs` for URL-state (sidekick conversation ID, planner run ID, etc.)
- `date-fns` for date math

## 4. Visual System

**Aesthetic:** Linear/Vercel — flat panels, 1px subtle borders, dense data presentation, monochrome with one accent color, no global blur. Glass surfaces are reserved for two: the AI sidekick panel and the daily briefing hero.

- **Color tokens** (in `globals.css`, `oklch`-based, dark + light):
  - background `oklch(0.13 0 0)` dark / `oklch(0.99 0 0)` light
  - foreground, muted, border, accent (Mapúa-tinted indigo), success, warning, danger
- **Typography:** Geist Sans (display + UI) + Geist Mono (numerics, codes); tabular-nums for all stats
- **Spacing:** 4px base scale; row heights 32–36px
- **Motion:** Framer Motion only on (a) AI streaming text, (b) tool-call card state transitions, (c) list reorders. No idle decorative motion.
- **Charts:** Recharts restyled monochrome with single accent; sparklines (no axes) inline in tables via tiny custom SVG.
- **Navigation:** keep left sidebar; add a persistent top command bar with `⌘K` hint, current term/week, and a docked sidekick toggle on the right.

## 5. Auth (Clerk + Supabase RLS)

- Install `@clerk/nextjs`, wrap root layout in `<ClerkProvider>`, register Clerk middleware.
- Configure Supabase as a **Clerk Third-Party Auth integration** (Clerk's own helper) so Supabase JWT validation accepts Clerk tokens.
- Add `students.clerk_user_id TEXT UNIQUE`. Backfill the existing student row to your Clerk user. Drop the hardcoded `roll_number = '2024370558'` lookups.
- RLS on every user-scoped table: `student_id IN (SELECT id FROM students WHERE clerk_user_id = auth.jwt()->>'sub')`.
- Tables that get RLS: `enrollments`, `tasks`, `alerts`, `agent_actions`, `agent_runs`, `study_sessions`, `voice_notes`, `agent_conversations`, `emails`. Reference tables (`courses`, `course_offerings`, `knowledge_chunks`) stay world-readable.
- Server Actions read the Clerk session via `auth()` from `@clerk/nextjs/server`; Supabase client is created with the Clerk-issued JWT so RLS evaluates as the user.

## 6. Data Model Additions

Schema changes are purely additive in Phase 0; destructive cleanup deferred to Phase 10.

**New tables:**

- `agent_actions` — `id, student_id, kind, input_jsonb, diff_jsonb, status (proposed|approved|executed|undone|failed), agent_run_id, created_at, executed_at, undone_at, undo_input_jsonb`. Source of truth for the audit log + undo.
- `agent_runs` — `id, student_id, feature, model, input_tokens, output_tokens, cost_usd_micros, latency_ms, trace_id, created_at`.
- `agent_conversations` — `id, student_id, title, created_at, updated_at, last_message_at`. Messages stored alongside in `agent_messages`.
- `agent_messages` — `id, conversation_id, role, parts_jsonb, created_at`.
- `study_sessions` — `id, student_id, course_id, started_at, ended_at, plan_jsonb, recall_log_jsonb, summary, weak_topics`.
- `voice_notes` — `id, student_id, blob_url, transcript, extracted_jsonb, mood, created_at`.
- `emails` — `id, student_id, gmail_id, thread_id, sender, subject, snippet, body_text, body_blob_url, received_at, labels (text[]), summary, category, is_actionable, suggested_actions_jsonb, embedding (vector), processed_at`.
- `course_offerings` — `id, course_id, term INTEGER, school_year TEXT`. Seeded from `MMDC BSIT Program Offerings v4.2 _ SY25-26  - NW & Cybersecurity.csv`.
- `scholarships` — `id, name, gwa_threshold, source_chunk_id`. Seeded from handbook RAG.

**Column additions:**

- `tasks.created_by_agent BOOLEAN DEFAULT FALSE`
- `tasks.agent_action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL`
- `alerts.agent_action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL`
- `students.clerk_user_id TEXT UNIQUE`

**Embedding migration:** `knowledge_chunks` gains a second column `embedding_vertex VECTOR(768)` populated by `text-embedding-005`. Both columns coexist until Phase 6 cutover; the legacy 1536-dim column is dropped in Phase 10.

## 7. Vertex AI Runtime (`src/lib/ai/`)

Authentication:

- **Local development:** `gcloud auth application-default login` provides ADC; the Node SDK picks it up automatically.
- **Vercel production:** Workload Identity Federation. Vercel issues an OIDC token; GCP exchanges it for a short-lived service account token. No long-lived JSON in env vars. Configured via `GOOGLE_PROJECT_ID`, `GOOGLE_LOCATION`, `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

Files:

- `vertex.ts` — adapter exposing `streamText`, `generateObject`, `streamObject`, `generateAudio` over the Vertex Node SDK; matches the AI SDK 6 surface so call sites are provider-agnostic.
- `models.ts` — model routing constants:
  - `gemini-2.5-pro` → briefing, planner, simulator targets, study plan, email body extraction
  - `gemini-2.5-flash` → sidekick chat, classification, ranker, lightweight tool use
  - `text-embedding-005` → knowledge embeddings + email embeddings
- `tools/` — one file per tool. Each tool exports:
  - Zod input schema (validated server-side)
  - Zod output schema
  - `requiresConfirmation: boolean` (mutations on grades/transcripts/enrollments are always `true`)
  - `execute(input, ctx)` — runs the mutation, writes the `agent_actions` row, revalidates tags, returns the diff
  - `undo(actionId, ctx)` — reverses the diff
- `runtime.ts` — orchestrator: builds tool registry, system prompt, attaches Sentry span + `agent_runs` row, streams to caller. Designed so call sites can later be wrapped in Vercel Workflow DevKit `step()` calls without changes.
- `prompts/` — system prompts per feature, kept as TypeScript constants with input variables.

Region: `us-central1` (Vertex default; same Vercel default region). Vertex request labels mirror feature tags for cost attribution.

## 8. AI Surface Patterns

### Daily Briefing hero (Feature 1)

- Server Component fetches transcript + alerts + tasks + calendar + current courses, packs into a structured prompt for `gemini-2.5-pro`.
- `generateObject` for first paint, `streamObject` for partials. Output schema:
  ```ts
  { headline: string; bullets: string[]; risks: { title, severity, dueDate? }[]; studyFocus: { course, topic, why }[]; ctaActions: AgentToolProposal[] }
  ```
- Cached via Next.js Cache Components (`use cache` + `cacheTag('briefing-${userId}')`) for 6h. `updateTag` triggered on any tracked write.
- Manual refresh button revalidates the tag.
- Renders with typed components, never raw markdown.

### Sidekick (Feature 2)

- Right-docked drawer (Base UI Dialog), full-screen sheet on mobile, opens with `⌘K`.
- `useChat` over `app/api/agent/chat/route.ts`, `gemini-2.5-flash` for chat, escalates to `pro` when invoking heavy tools.
- Conversation persisted in `agent_conversations` + `agent_messages`. URL param `?c=<id>` via `nuqs`.
- Tool calls render inline as `<ToolCard>` (see below).

### Tool-call vocabulary

A `<ToolCard>` shell wraps every tool render:

- **States:** `proposed` → `executing` → `executed` → `undone` (or `failed`).
- **Header:** icon + tool name + status pill.
- **Body:** rendered from the tool's output schema; editable when `proposed` and `requiresConfirmation`.
- **Footer:** Approve / Edit / Cancel / Undo buttons depending on state and undo window.

Server Action wraps every tool execution:

1. Validate Clerk session.
2. Validate input against tool's Zod schema.
3. Open transaction, run mutation, insert `agent_actions` row, `updateTag` affected tags.
4. Return diff to client; client renders `executed` state with optimistic UI.
5. On error, return structured error → `failed` state with retry.

### Generative UI

`streamUI` from AI SDK 6 used for briefing, planner output, and study session — model picks from a closed set of registered server-rendered components. Never freeform HTML.

### Observability

- Every Vertex call logs to `agent_runs`: model, latency, tokens, cost, feature tag, trace ID.
- Sentry tracing + AI-monitoring captures span per tool call.
- `/admin/runs` page (Clerk role-gated) shows cost/latency over time, top features, errors.
- Each AI surface wraps a feature-level error boundary: Vertex outage degrades to "couldn't reach the model, here's your data without the smart layer."

### Safety rails

- Every tool declares `requiresConfirmation`. Grade/transcript/enrollment mutations always confirmed.
- Per-user-per-minute rate limit via Upstash Redis.
- Per-conversation token budget; warn at 80%, hard-stop at 100%.
- All tool inputs validated with Zod; model output never trusted directly.
- Tool registry is a closed set; new tools require a code change + review.

## 9. Feature Designs

### F1 — Daily Briefing (covered in §8)

### F2 — Sidekick (covered in §8)

First six tools shipped with sidekick:

- `addTask({ title, dueDate?, courseCode? })` — no confirm, undoable
- `dismissAlert({ alertId, reason? })` — no confirm, undoable
- `searchKnowledge({ query, k? })` — read-only
- `simulateGpa({ overrides[], term?, target? })` — read-only
- `proposePlan({ termHint? })` — read-only (writes happen via lock-in)
- `clearInc({ enrollmentId, newGrade, evidenceTaskId? })` — confirm required, undoable

### F3 — GPA / Grade Simulator

- Existing `gpa-simulator.tsx` becomes the deterministic engine; AI is a layer on top.
- New `<SimulatorPanel>` views:
  - **What-If**: live GWA + units-toward-graduation as you slide grades
  - **Targets**: "I want a 1.50 cumulative" → `generateObject` against a constraint schema; outputs feasible grade combos with confidence
  - **Scholarship band tracker**: thresholds from `scholarships` table + RAG citations
- Tool exposed: `simulateGpa` (above).
- Output always includes assumptions ("assuming MO-IT101 INC clears at 1.75; handbook §X cited").

### F4 — Optimal Next-Term Planner

- Constraint solver in TypeScript (`src/lib/planner/`):
  1. Filter `courses` by prereqs/coreqs met
  2. Filter by `course_offerings` for the target term
  3. Enumerate combinations under `MAX_UNITS_PER_TERM`
  4. Score by (cleared INCs first, balance of IT vs GE, lighter loads after heavy terms)
  5. Return top 5 candidates
- Gemini 2.5 Pro ranks the top 5 to a final 2–3 with rationale via `generateObject`.
- UI: `/progress/planner` — three plan cards side-by-side: course list, unit count, schedule preview, AI rationale, "Lock in" button.
- Lock-in flow drafts tasks ("Confirm enrollment for MO-IT108", "Verify prereq met for X") via the agent-action pattern.
- Re-runnable; previous runs stored in `agent_runs` for diffing.

### F5 — INC / Risk Radar

- Vercel Cron daily 06:00 PHT → `app/api/agent/radar/route.ts`.
- Agent run scans `enrollments` for `inc` status, cross-references handbook deadlines via RAG, checks `tasks` for clearance plans.
- Output: zero or more `alerts` rows + zero or more proposed `agent_actions` (e.g., add task "Submit makeup work for MO-IT101 by 2026-05-29").
- Proposals land in **/alerts → Proposals tab**; batch Approve / Reject UI.
- Severity escalates `warning` → `critical` if deadline within 7 days and no progress; surfaces in briefing hero.
- Optional email escalation via Resend (off by default; flag-controlled).
- Dashboard widget `<RiskRadar>` summarizes "2 risks tracked, 1 needs attention" with deep-link.

### F6 — Knowledge RAG upgrade

- Migrate embeddings to `text-embedding-005` (768-dim) on `knowledge_chunks.embedding_vertex`. Re-seed via `scripts/seed-knowledge.ts`.
- Hybrid retrieval: pgvector cosine + existing FTS, RRF merge, top-k=8, then `gemini-2.5-flash` re-ranker → top-4.
- Answers grounded with inline citations `[1]` `[2]`; footnote list with source link. `react-markdown` + a citation plugin.
- Tool exposed: `searchKnowledge`. Reused by planner, radar, briefing, and inbox.
- `/knowledge` page rebuilt as a research surface: search bar, filter by source (faq / handbook / curriculum / personal-transcript), saved answers list.
- `/api/chat` switches from Anthropic Claude to Vertex Gemini; legacy Anthropic provider removed in Phase 6.

### F7 — Study Session Companion

- Page `/study/[course]` (and a global "Start a study session" CTA in sidekick).
- Flow: pick course → optional topic → AI plans 25/45/90-min session as steps (Recall → Apply → Reflect), each with a timer.
- **Multimodal:** student uploads notes/PDFs via Vercel Blob; Gemini grounds questions on those + curriculum RAG.
- During session: AI generates recall questions one at a time; student answers in chat; AI grades and notes weak topics. Logged to `study_sessions.recall_log_jsonb`.
- Post-session: `summary` + `weak_topics` written; linked from course detail sheet on `/progress`.
- Tool exposed: `startStudySession`.

### F8 — Smart Inbox (Gmail triage)

- **OAuth via Clerk** Google connection; refresh token retrieved server-side via `users.getUserOauthAccessToken()`.
- **Sync:** Vercel Cron every 15 min. Initial window: last 7 days. Incremental via Gmail `historyId`. (Future: push notifications via Pub/Sub.)
- **Storage:** `emails` table; bodies stripped to text, HTML kept as Blob URL only when needed.
- **Pipeline per new email:**
  1. `gemini-2.5-flash` classifier → category in {academic-deadline, grade-update, announcement, finance, scheduling, noise}
  2. If non-noise → `gemini-2.5-flash` extracts `suggested_actions[]`
  3. Write proposed `agent_actions` rows; nothing executes without approval
- **UI:** `/inbox` — three columns (Needs your attention / Filed / Archive). Hover → AI summary + suggested actions stacked as `<ToolCard>`s. Bulk approve. Drafts tab for replies; one-click confirm to send.
- **Sending:** `gmail.users.messages.send` via OAuth token; logged in `agent_actions`.
- **Privacy:** RLS keyed to Clerk user; bodies excluded from sidekick context unless explicitly invoked via tool.
- **Rollout:** behind a quieter flag; manual approve everything for two weeks before any auto-categorization is allowed.

### F9 — Voice Journal → Tasks

- Hot-key `⌘⇧V` opens a recorder UI; MediaRecorder API; up to 5 min.
- Upload to Vercel Blob (private). Send audio directly to Gemini 2.5 Pro (Vertex audio input — no separate transcription step).
- `generateObject` schema: `{ transcript, tasks[], events[], notes, mood?: 1-5 }`.
- Each extracted task/event renders as `<ToolCard>` proposal in a "Voice journal review" surface.
- `voice_notes` table holds blob URL, transcript, extracted JSON, mood. Indexed in RAG (Phase 6).

### F10 — Audit Log + Undo (foundation, always-on)

- Every agent mutation writes an `agent_actions` row with `input_jsonb`, `diff_jsonb`, and `undo_input_jsonb`.
- `/admin/runs` page (Clerk role-gated) lists all actions with filters (feature, status, date), shows the diff, offers Undo within a per-tool window (default 24h, configurable per tool).
- Undo replays the inverse via the tool's `undo()` function in a transaction; writes a child `agent_actions` row of kind `undo`.

## 10. Mobile

- Bottom nav refined; sidebar collapses on narrow viewports.
- Sidekick is a full-screen sheet on mobile.
- Briefing condenses to single scroll-snap section.
- Planner shows one card at a time with horizontal swipe.
- All tool-card interactions are touch-first (44px min tap target).
- PWA: keep `manifest.ts`; add iOS install prompt + an offline shell for dashboard read view.

## 11. Performance Budget

- Initial dashboard JS payload < 100KB post-RSC.
- AI surfaces are client islands, dynamically imported.
- Vertex calls streamed where possible; non-streamed `generateObject` calls show a 2s skeleton; >5s shows a fallback view with retry.
- Next.js 16 Cache Components for transcript, curriculum, knowledge reads; `updateTag` on writes for precise revalidation.
- Recharts monochrome + lazy-loaded. Sparklines via tiny SVG component, not Recharts.

## 12. Testing & Evals

- **Unit (Vitest):** `gpa.ts`, `path-calculator.ts`, planner constraint solver, every tool input schema, every tool `execute()` with mocked Vertex.
- **Integration:** Server Actions + Tools against a real local Supabase via `pnpm supabase start`.
- **E2E (Playwright via MCP):** three golden flows
  1. Sidekick → ask question → approve tool call → see audit log entry
  2. Run planner end-to-end → lock in a plan → tasks created
  3. INC radar produces alert → approve clearance task → alert resolved
- **AI evals:** `evals/` folder with golden prompts for briefing, planner, RAG, classifier; `pnpm eval` runs against a fixed seed dataset; CI gate before merge to `main`.
- New eval added per shipped feature.

## 13. Deployment

- Vercel project (linked).
- Environments: development, preview, production.
- Secrets via `vercel env`:
  - `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
  - `GOOGLE_PROJECT_ID`, `GOOGLE_LOCATION`, `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
  - `BLOB_READ_WRITE_TOKEN`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
  - `RESEND_API_KEY` (optional, for F5 email escalation)
- Vercel Cron jobs:
  - `/api/agent/radar` daily 06:00 PHT
  - `/api/agent/gmail-sync` every 15 min
  - `/api/agent/briefing-prewarm` daily 05:30 PHT
- Sentry tracing + AI-monitoring + logging wired via `sentry:` setup skills.
- Rolling Releases on for production deploys (canary → 100%).

## 14. Migration & Rollout Safety

- New dashboard lands behind cookie-driven `dashboard.v2` flag. Old `/` keeps working until v2 is signed off.
- Schema migrations are additive in Phase 0; no destructive drops until Phase 10.
- Each feature ships behind its own flag (`feature.briefing`, `feature.sidekick`, …). Disabling a feature flag never breaks the build.
- Phase 10 cleanup migration: drop legacy `embedding (vector(1536))`, drop hardcoded student lookups, drop deprecated `dashboard.v2` flag.

## 15. Phasing & Ship Order

| Phase | Week | Deliverable |
|---|---|---|
| 0 — Foundation | 1 | Clerk auth, RLS, Vertex runtime, tokens, sidebar/topbar, audit-log shell, feature flags. F10 functionally live. |
| 1 — Briefing | 2 | F1 |
| 2 — Sidekick | 3 | F2 + tool vocabulary + first 6 tools |
| 3 — Simulator | 4 | F3 |
| 4 — Planner | 5 | F4 |
| 5 — Risk Radar | 6 | F5 |
| 6 — RAG upgrade | 7 | F6; Anthropic decommissioned |
| 7 — Study Companion | 8 | F7 |
| 8 — Email triage | 9–10 | F8 (quieter rollout) |
| 9 — Voice Journal | 10 | F9 |
| 10 — Cleanup | 11 | Drop flags, retire legacy, migration cleanup, README + architecture diagram |

Cross-phase, every week:

- One Playwright golden-flow test added per shipped feature.
- One eval set added per shipped agent flow.
- Cost review; flip `pro` → `flash` where evals say it's safe.
- Memory entries written for non-obvious decisions.

## 16. Open Questions (none blocking Phase 0)

- Resend for F5 email escalation: opt-in or off? (Default: off; revisit when F5 ships.)
- Briefing morning time: 05:30 PHT prewarm assumes you read it during commute. Adjust after first week of usage.
- Whether to expose the audit log read-only to a future "shared with adviser" view. Out of scope until multi-tenant.
