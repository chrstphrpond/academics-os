This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Phase 0 dev setup

This branch is the foundation for the smart-dashboard redesign — Clerk auth, Neon + Drizzle, Vertex AI runtime, audit log, feature flags. See `docs/superpowers/specs/2026-04-29-smart-dashboard-design.md` for the design spec and `docs/superpowers/plans/2026-04-29-phase-0-foundation.md` for the implementation plan.

### One-time setup

1. **Install deps**

   ```bash
   pnpm install
   ```

2. **Environment**

   The Vercel project (`crit-projects/academics-os`) is already linked. Pull env vars to local:

   ```bash
   vercel env pull .env.local
   ```

   This brings down Neon (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, …) and Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

3. **Vertex AI (Google Cloud)**

   ```bash
   gcloud auth application-default login
   gcloud config set project <YOUR_GCP_PROJECT_ID>
   gcloud services enable aiplatform.googleapis.com
   vercel env add GOOGLE_PROJECT_ID
   vercel env add GOOGLE_LOCATION   # use "us-central1"
   vercel env pull .env.local
   ```

4. **Database**

   First-time provisioning of the Neon dev branch:

   ```bash
   pnpm db:prep      # enables uuid-ossp + pgvector
   pnpm db:push      # applies the Drizzle schema
   pnpm seed:all     # seeds courses, transcript, knowledge chunks
   ```

   For schema changes after the initial push:

   ```bash
   pnpm db:generate  # generates a new migration from schema.ts
   pnpm db:push      # applies it (or commit and run via CI)
   ```

5. **Run**

   ```bash
   pnpm dev
   ```

   Visit http://localhost:3000 — Clerk redirects to a hosted sign-in page on the first request.

### Feature flags

Flags are cookie-driven. Toggle via DevTools console:

```js
document.cookie = "ff=dashboard.v2=1;feature.briefing=1; path=/";
```

Available flags: `dashboard.v2`, `feature.briefing`, `feature.sidekick`, `feature.simulator`, `feature.planner`, `feature.radar`, `feature.rag`, `feature.study`, `feature.inbox`, `feature.voice`.

### Verifying Vertex

After signing in, GET `http://localhost:3000/api/agent/test-vertex` (created in a later task). A row should appear in `agent_runs`, visible at `/admin/runs`.

### Useful scripts

| Command                             | What it does                                    |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Next.js dev server                              |
| `pnpm build`                        | Production build                                |
| `pnpm test`                         | Vitest unit tests                               |
| `pnpm tsc --noEmit`                 | Typecheck                                       |
| `pnpm lint`                         | ESLint                                          |
| `pnpm db:prep`                      | Enable Postgres extensions on Neon              |
| `pnpm db:generate`                  | Generate a Drizzle migration from `schema.ts`   |
| `pnpm db:push`                      | Apply the schema directly to the database       |
| `pnpm db:studio`                    | Open Drizzle Studio against the Neon dev branch |
| `pnpm seed:all`                     | Run all three seed scripts                      |
