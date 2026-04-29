# Better Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clerk with Better Auth (email/password + Google OAuth), preserve seeded data by repointing the existing `students` row from `clerk_user_id` → Better Auth `user.id`, rename RLS context setting `app.clerk_user_id` → `app.user_id`.

**Architecture:** Better Auth instance with Drizzle adapter on Neon. Server reads sessions via `auth.api.getSession({ headers })`; middleware gates non-public routes; `withAuth()` opens a transaction and sets `app.user_id` for RLS. Custom sign-in/up forms (Better Auth is headless).

**Tech Stack:** `better-auth`, Drizzle ORM, Neon (HTTP + Pool drivers), Next.js 16 App Router, Tailwind v4.

---

## Task 1 — Install + remove dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Clerk, install Better Auth**

```bash
pnpm remove @clerk/nextjs
pnpm add better-auth
```

- [ ] **Step 2: Verify**

Run: `pnpm ls better-auth @clerk/nextjs 2>&1 | grep -E "better-auth|clerk"`
Expected: `better-auth` listed, `@clerk/nextjs` absent.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(auth): swap @clerk/nextjs for better-auth"
```

## Task 2 — Auth instance + Drizzle adapter

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-client.ts`

- [ ] **Step 1: Server instance**

Create `src/lib/auth.ts`:
```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3000",
    "https://academics-os-omega.vercel.app",
  ],
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Client hooks**

Create `src/lib/auth-client.ts`:
```ts
"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
      : window.location.origin,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts
git commit -m "feat(auth): better-auth server instance + react client"
```

## Task 3 — Drizzle schema (Better Auth tables + students rename)

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add Better Auth tables to schema.ts**

Append to `src/lib/db/schema.ts` (after existing tables, before relations):
```ts
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Rename `clerk_user_id` → `user_id` on `students`**

In `src/lib/db/schema.ts`, find the `students` table and replace:
```ts
clerkUserId: text("clerk_user_id").unique(),
```
with:
```ts
userId: text("user_id").unique().references(() => user.id, { onDelete: "set null" }),
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): add Better Auth tables; rename students.clerk_user_id → user_id"
```

## Task 4 — Push schema + re-apply RLS (renamed)

**Files:**
- Modify: `drizzle/0001_rls_policies.sql`
- Modify: `drizzle/0003_agent_conversations_rls.sql`
- Modify: `drizzle/0004_scholarships.sql`
- Create: `drizzle/0005_better_auth_rls.sql`

- [ ] **Step 1: Rename in RLS files**

In each of `drizzle/0001_rls_policies.sql`, `drizzle/0003_agent_conversations_rls.sql`, `drizzle/0004_scholarships.sql`, replace every occurrence of `app.clerk_user_id` with `app.user_id`.

- [ ] **Step 2: New RLS for Better Auth tables**

Create `drizzle/0005_better_auth_rls.sql`:
```sql
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_self_read ON "user" FOR SELECT
  USING (id = current_setting('app.user_id', true));

CREATE POLICY session_self_read ON "session" FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY account_self_read ON "account" FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

-- verification has no user FK; Better Auth manages it server-side. Policy: deny all reads except via service role bypass (none in our setup, so no read policy = no SELECT access via RLS).
```

- [ ] **Step 3: Push schema**

Run: `pnpm db:push --force`
Expected: prompts about tables; accept; tables recreated.

- [ ] **Step 4: Re-apply RLS**

Run: `pnpm db:apply-rls`
Then manually:
```bash
psql "$DATABASE_URL" -f drizzle/0003_agent_conversations_rls.sql
psql "$DATABASE_URL" -f drizzle/0004_scholarships.sql
psql "$DATABASE_URL" -f drizzle/0005_better_auth_rls.sql
```

- [ ] **Step 5: Commit**

```bash
git add drizzle/0001_rls_policies.sql drizzle/0003_agent_conversations_rls.sql drizzle/0004_scholarships.sql drizzle/0005_better_auth_rls.sql
git commit -m "feat(db): rename app.clerk_user_id → app.user_id; RLS for Better Auth tables"
```

## Task 5 — Rewrite auth helpers

**Files:**
- Modify: `src/lib/db/auth.ts`

- [ ] **Step 1: Replace contents**

Rewrite `src/lib/db/auth.ts`:
```ts
import { headers as nextHeaders } from "next/headers";
import { sql } from "drizzle-orm";
import { db, schema, getInstance, type Tx } from "@/lib/db";
import { auth } from "@/lib/auth";

async function devUserIdOrNull(): Promise<string | null> {
  if (process.env.DISABLE_AUTH !== "1") return null;
  const roll = process.env.DEV_DEFAULT_ROLL_NUMBER ?? "2024370558";
  const rows = await getInstance()
    .select({ userId: schema.students.userId })
    .from(schema.students)
    .where(sql`roll_number = ${roll}`)
    .limit(1);
  return rows[0]?.userId ?? null;
}

export async function withAuth<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  let userId = session?.user?.id ?? null;
  if (!userId) userId = await devUserIdOrNull();
  if (!userId) throw new Error("withAuth: no authenticated user");
  return withExplicitAuth(userId, fn);
}

export async function withExplicitAuth<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return getInstance().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

export async function getCurrentStudentId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  let userId = session?.user?.id ?? null;
  if (!userId) userId = await devUserIdOrNull();
  if (!userId) return null;
  const rows = await getInstance()
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(sql`user_id = ${userId}`)
    .limit(1);
  return rows[0]?.id ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/auth.ts
git commit -m "feat(auth): withAuth reads Better Auth session; sets app.user_id"
```

## Task 6 — Middleware

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Replace contents**

Rewrite `src/proxy.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC = [/^\/sign-in/, /^\/sign-up/, /^\/api\/auth/, /^\/api\/health/];

const AUTH_DISABLED = process.env.DISABLE_AUTH === "1";

export default async function proxy(req: NextRequest) {
  if (AUTH_DISABLED) return NextResponse.next();
  if (PUBLIC.some((re) => re.test(req.nextUrl.pathname))) return NextResponse.next();

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(auth): middleware uses Better Auth session"
```

## Task 7 — Better Auth API handler

**Files:**
- Create: `src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Write handler**

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/[...all]/route.ts
git commit -m "feat(auth): /api/auth/[...all] handler"
```

## Task 8 — Sign-in / sign-up pages

**Files:**
- Modify: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Modify: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/components/auth/auth-form.tsx`

- [ ] **Step 1: Build shared AuthForm**

Create `src/components/auth/auth-form.tsx` (client component) with:
- Email + password inputs
- "Sign in"/"Sign up" submit button calling `signIn.email()` / `signUp.email()` from `@/lib/auth-client`
- Divider
- "Continue with Google" button calling `signIn.social({ provider: "google", callbackURL: "/" })`
- Error display from result `.error`
- Loading state on submit

- [ ] **Step 2: Replace sign-in page**

Rewrite `src/app/sign-in/[[...sign-in]]/page.tsx`:
```tsx
import { GradientBackground } from "@/components/ui/gradient-background";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in · Academics OS" };

export default function SignInPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center px-4">
      <GradientBackground />
      <AuthForm mode="sign-in" />
    </div>
  );
}
```

- [ ] **Step 3: Replace sign-up page**

Same shape with `mode="sign-up"`.

- [ ] **Step 4: Commit**

```bash
git add src/app/sign-in src/app/sign-up src/components/auth
git commit -m "feat(auth): sign-in/up pages with email+password + Google"
```

## Task 9 — Drop ClerkProvider + UserButton

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Create: `src/components/layout/user-menu.tsx`

- [ ] **Step 1: Remove ClerkProvider**

In `src/app/layout.tsx` remove `import { ClerkProvider } from "@clerk/nextjs"` and the `<ClerkProvider>` wrapping; root becomes plain `<html>`.

- [ ] **Step 2: Custom UserMenu component**

Create `src/components/layout/user-menu.tsx` (client):
```tsx
"use client";
import { signOut, useSession } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session } = useSession();
  if (!session) return null;
  const initial = session.user.name?.[0] ?? session.user.email?.[0] ?? "?";
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium">
        {initial.toUpperCase()}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto h-7 w-7"
        onClick={() => signOut()}
        aria-label="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Replace `<UserButton>` in sidebar**

In `src/components/layout/app-sidebar.tsx`, replace the `<UserButton>` block with `<UserMenu />`.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/components/layout/app-sidebar.tsx src/components/layout/user-menu.tsx
git commit -m "feat(auth): drop ClerkProvider; custom UserMenu"
```

## Task 10 — Rewrite remaining `auth()` call sites

**Files:**
- Modify: `src/actions/agent-tool.ts`
- Modify: `src/actions/briefing.ts`
- Modify: `src/actions/simulator.ts`
- Modify: `src/app/api/agent/chat/route.ts`

- [ ] **Step 1: Replace pattern in each file**

Find `import { auth } from "@clerk/nextjs/server"` → replace with:
```ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
```

Find `const { userId } = await auth();` → replace with:
```ts
const session = await auth.api.getSession({ headers: await headers() });
const userId = session?.user?.id ?? null;
```

Rename any local var `clerkUserId` → `userId` to match the new helper signatures.

- [ ] **Step 2: Update `resolveClerkUserId` helpers**

In `src/actions/agent-tool.ts` and `src/app/api/agent/chat/route.ts`, the `resolveClerkUserId` helper queries `students.clerkUserId`. Update to query `students.userId`.

- [ ] **Step 3: Commit**

```bash
git add src/actions src/app/api/agent/chat/route.ts
git commit -m "refactor(auth): swap Clerk auth() reads for Better Auth session"
```

## Task 11 — Re-seed + repoint student row

**Files:**
- Modify: (script invocation only)

- [ ] **Step 1: Re-seed**

Run: `pnpm seed:all`
Expected: courses + transcript + knowledge + scholarships seeded; students row created with `user_id = NULL` (since it was clerk-id'd before, now that column is gone).

- [ ] **Step 2: Set DISABLE_AUTH=1 and start dev**

Edit `.env.local`: uncomment `DISABLE_AUTH=1`. This is so the dev escape hatch can find the student row before we have a Better Auth user.

Wait — DISABLE_AUTH path requires `students.user_id` non-null. Adjustment: leave DISABLE_AUTH OFF for first sign-in.

- [ ] **Step 3: Sign up via Better Auth**

Start dev: `pnpm dev`. Visit `/sign-up`. Create account with your real email + password. Note the resulting user id from the `user` table:
```bash
psql "$DATABASE_URL" -c "SELECT id, email FROM \"user\" ORDER BY created_at DESC LIMIT 1;"
```

- [ ] **Step 4: Repoint student row**

```bash
psql "$DATABASE_URL" -c "UPDATE students SET user_id = '<NEW_USER_ID>' WHERE roll_number = '2024370558';"
```

- [ ] **Step 5: Verify**

Reload `/`. Expect briefing + dashboard to populate with your seeded transcript.

## Task 12 — Smoke + verify

- [ ] **Step 1: Type / lint / test**

Run:
```bash
pnpm exec tsc --noEmit | grep -v ".next/types"
pnpm lint
pnpm test
pnpm build
```
Expected: clean (zero errors; warnings ok).

- [ ] **Step 2: Local Playwright e2e**

Manually visit `/`, `/grades`, `/progress`, `/knowledge`, `/admin/runs`, `/tasks`, `/alerts`, `/sign-in`, `/sign-up`. Trigger Atlas chat: "What's my GWA and scholarship band?" — should auto-execute simulateGpa and answer with real data.

- [ ] **Step 3: Sign out + sign in via Google**

Sign out. Click "Continue with Google" on `/sign-in`. After OAuth, check that you land authenticated. (You may need to create another `students` row or repoint to the Google user_id.)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(auth): post-Better-Auth-cutover smoke fixes"
```

## Task 13 — Vercel env + deploy

**Files:**
- (no code; CLI + dashboard)

- [ ] **Step 1: Generate BETTER_AUTH_SECRET**

```bash
openssl rand -hex 32
```
Save the value.

- [ ] **Step 2: Set non-sensitive env via CLI**

```bash
vercel env add BETTER_AUTH_URL production --value "https://academics-os-omega.vercel.app" --yes
vercel env add BETTER_AUTH_URL preview "" --value "https://academics-os-omega.vercel.app" --yes
```

- [ ] **Step 3: Set sensitive env via dashboard**

Open https://vercel.com/crit-projects/academics-os/settings/environment-variables. Add (Production + Preview, sensitive):
- `BETTER_AUTH_SECRET` — value from Step 1
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

- [ ] **Step 4: Remove Clerk env**

```bash
for env in production preview development; do
  for var in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY NEXT_PUBLIC_CLERK_SIGN_IN_URL NEXT_PUBLIC_CLERK_SIGN_UP_URL NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL; do
    vercel env rm "$var" "$env" --yes 2>&1 | tail -1
  done
done
```

- [ ] **Step 5: Push branch + deploy**

```bash
git push -u origin feat/better-auth-migration
gh pr create --base main --head feat/better-auth-migration --title "feat(auth): migrate Clerk → Better Auth" --body "<summary>"
gh pr merge --squash --delete-branch
vercel deploy --prod --yes
```

- [ ] **Step 6: Production smoke test**

Visit `https://academics-os-omega.vercel.app/sign-up`. Create account. Verify dashboard renders. Sign out. Sign in with Google. Verify dashboard.

If `students.user_id` doesn't match the prod user, repoint via psql against the prod `DATABASE_URL`.
