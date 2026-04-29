# Better Auth Migration — Design

**Date:** 2026-04-29
**Project:** academics-os
**Driver:** Clerk's production instance forbids `*.vercel.app` domains; we don't have a custom domain yet. Better Auth has no production-domain restriction and lives in our own Neon DB.

---

## Goal

Replace Clerk with Better Auth as the authentication layer. Support email+password and Google OAuth. Preserve all existing seeded data (transcript, courses, enrollments, scholarships) by repointing the single `students` row from a Clerk user id to a new Better Auth user id after first sign-in.

## Non-goals

- Migrating any auth provider beyond email/password + Google OAuth.
- Building a hosted account portal — Better Auth is headless.
- Migrating the database off Neon (DB stays).
- Multi-tenant or org-scoped auth.

## Architecture

### New library files

- `src/lib/auth.ts` — server-side Better Auth instance.
  - Drizzle adapter pointing at the Neon HTTP `db` client.
  - `emailAndPassword: { enabled: true }`.
  - `socialProviders: { google: { clientId, clientSecret } }`.
  - `secret: process.env.BETTER_AUTH_SECRET`.
- `src/lib/auth-client.ts` — `createAuthClient` for browser hooks (`useSession`, `signIn`, `signUp`, `signOut`).

### New routes

- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler (`toNextJsHandler(auth)`).
- `src/app/sign-in/[[...sign-in]]/page.tsx` — replaces Clerk `<SignIn>` with a custom form (email/password + "Continue with Google" button). Same gradient background.
- `src/app/sign-up/[[...sign-up]]/page.tsx` — same shape as sign-in.

### Middleware

- `src/proxy.ts` — replace `clerkMiddleware` with a function that calls `auth.api.getSession({ headers: req.headers })`. Public routes (`/sign-in`, `/sign-up`, `/api/auth/*`, `/api/health`) bypass; everything else redirects to `/sign-in` when no session.
- Keep the `DISABLE_AUTH=1` dev escape hatch.

### Layout

- Drop `<ClerkProvider>` from `src/app/layout.tsx`. No replacement needed — Better Auth client hooks read from cookies, no provider context.
- Replace `<UserButton>` in `src/components/layout/app-sidebar.tsx` with a small custom avatar+menu component (avatar, name, "Sign out" button, sign-out calls `signOut()` from auth-client).

### Schema changes (Drizzle)

- Add Better Auth's standard tables to `src/lib/db/schema.ts`:
  - `user` — `id` (text/cuid), `email`, `emailVerified`, `name`, `image`, `createdAt`, `updatedAt`
  - `session` — `id`, `userId` (FK), `expiresAt`, `token`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`
  - `account` — `id`, `userId` (FK), `accountId`, `providerId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password` (for email/password), `createdAt`, `updatedAt`
  - `verification` — `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`
- Rename `students.clerk_user_id` → `students.user_id`, FK to `user.id`.
- Drizzle Drop the `clerkUserId` field on the `students` definition; replace with `userId`.

### RLS policies

- All policies that read `current_setting('app.clerk_user_id', true)` are renamed to read `current_setting('app.user_id', true)`. Pure semantic rename. Files affected:
  - `drizzle/0001_rls_policies.sql`
  - `drizzle/0003_agent_conversations_rls.sql`
  - `drizzle/0004_scholarships.sql`
- New migration `drizzle/0005_better_auth_rls.sql`: RLS policies for `user`, `session`, `account`, `verification` (Better Auth handles writes; we only need to lock down reads — `user` row readable by self, `session`/`account`/`verification` readable by self).

### Auth helpers

- `src/lib/db/auth.ts` rewritten:
  - `withAuth(fn)` → reads Better Auth session via `auth.api.getSession({ headers: await headers() })`, throws if missing, calls `withExplicitAuth(session.user.id, fn)`.
  - `withExplicitAuth(userId, fn)` → opens transaction, sets `SELECT set_config('app.user_id', $1, true)`, runs `fn(tx)`. Same pattern as today.
  - `getCurrentStudentId()` → looks up `students.user_id = session.user.id`.
  - `devUserIdOrNull()` → reads `students.user_id` for the dev student row when `DISABLE_AUTH=1`.

### Call-site rewrites (Clerk `auth()` → Better Auth session)

Files: `src/actions/agent-tool.ts`, `src/actions/briefing.ts`, `src/actions/simulator.ts`, `src/app/api/agent/chat/route.ts`. Pattern:
```ts
// Before
const { userId } = await auth();
// After
const session = await auth.api.getSession({ headers: await headers() });
const userId = session?.user?.id ?? null;
```

### Env vars

| Var | Local | Vercel Prod | Vercel Preview | Source |
|---|---|---|---|---|
| `BETTER_AUTH_SECRET` | yes | yes | yes | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` | `https://academics-os-omega.vercel.app` | per-deployment | hardcoded by env |
| `GOOGLE_CLIENT_ID` | yes | yes | yes | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | yes | yes | yes | Google Cloud Console |
| `NEXT_PUBLIC_CLERK_*` | — | **remove** | **remove** | n/a |
| `CLERK_SECRET_KEY` | — | **remove** | **remove** | n/a |

### Google OAuth client setup (manual, user does this)

1. Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application.
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://academics-os-omega.vercel.app/api/auth/callback/google`
3. Copy `Client ID` and `Client secret` into the Vercel dashboard env (sensitive).

## Cutover sequence

1. Install: `pnpm add better-auth`. Remove: `pnpm remove @clerk/nextjs`.
2. Write `src/lib/auth.ts` + `src/lib/auth-client.ts`.
3. Add Better Auth tables + rename `students.clerk_user_id` in `src/lib/db/schema.ts`.
4. `pnpm db:push --force` (drops + recreates; we already accept this for RLS-affecting migrations).
5. Rename `app.clerk_user_id` → `app.user_id` in all RLS migrations; add `0005_better_auth_rls.sql`. Run `pnpm db:apply-rls` + manually apply renamed files.
6. Rewrite `src/lib/db/auth.ts` (`withAuth`, `withExplicitAuth`, `getCurrentStudentId`).
7. Replace `src/proxy.ts` middleware.
8. Drop `<ClerkProvider>` from `src/app/layout.tsx`.
9. Build sign-in / sign-up pages with email/password form + Google button.
10. Replace `<UserButton>` in sidebar with custom avatar+menu.
11. Add `/api/auth/[...all]/route.ts`.
12. Rewrite the 4 call sites that still use Clerk's `auth()`.
13. Re-seed (`pnpm seed:all`) — required because `db:push --force` dropped tables.
14. Local smoke test: sign up with email/password, log out, log in, log in with Google.
15. After first successful Better Auth sign-in, manually `UPDATE students SET user_id = '<new-id>' WHERE roll_number = '2024370558'` to repoint your seeded data.
16. Set Vercel env vars; remove old Clerk vars.
17. Deploy; verify production sign-in flow.

## Risks & mitigations

- **`db:push --force` wipes RLS** — same gotcha as before, accept it; re-apply RLS after every push.
- **Vercel CLI on Windows + Git Bash masks env values on write** — use the Vercel dashboard for `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`. The CLI works for non-sensitive values but the masking bug is real.
- **Google redirect URIs are deployment-specific** — Vercel preview URLs change per branch; either restrict to a stable domain or accept that previews can't OAuth-sign-in. For MVP we'll only register prod + localhost.
- **Single user repoint fragile** — if `students.user_id = X` UPDATE is forgotten, the dashboard shows zero data on first login. Document the manual step in the implementation plan.
- **Better Auth schema may evolve** — pin to a specific minor version (`better-auth@^1.x`) and verify CLI-generated schema matches.

## Acceptance criteria

- `/sign-in` accepts email/password and Google OAuth; both create a session.
- After signing in as the seeded user (`students.user_id` repointed), `/`, `/grades`, `/progress`, `/knowledge`, `/admin/runs`, `/tasks`, `/alerts` all render the seeded data without errors.
- `/api/agent/chat` works (Atlas chat with `simulateGpa` auto-execute returns a real GWA).
- `pnpm test` 37/37 still passing (auth helpers may need test updates).
- `pnpm build` clean.
- No Clerk imports anywhere in `src/`.
- Production deploy at `academics-os-omega.vercel.app` allows sign-in without `ERR_UNSAFE_REDIRECT`.
