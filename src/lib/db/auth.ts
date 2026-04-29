import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import * as schema from "./schema";

// Lazily initialised so tests can mock the Pool + drizzle before first use.
let _instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getInstance() {
  if (_instance) return _instance;
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  _instance = drizzle(pool, { schema });
  return _instance;
}

export const dbAuth = getInstance;

type Tx = Parameters<Parameters<ReturnType<typeof getInstance>["transaction"]>[0]>[0];

/**
 * Run a database operation inside a transaction with `app.clerk_user_id` set
 * from the current Clerk session, so RLS policies that reference
 * `current_setting('app.clerk_user_id', true)` see the right user.
 *
 * Throws if there's no authenticated Clerk user. For unauthenticated reads of
 * reference tables (courses, knowledge_chunks), use the plain HTTP `db` from
 * `@/lib/db` instead.
 */
// DEV ONLY: when DISABLE_AUTH=1, treat every request as if it came from the
// student row matching DEV_DEFAULT_ROLL_NUMBER (default: 2024370558). This
// lets Playwright and other smoke harnesses exercise the full app without
// running through Clerk's hosted sign-in flow.
async function devUserIdOrNull(): Promise<string | null> {
  if (process.env.DISABLE_AUTH !== "1") return null;
  const roll = process.env.DEV_DEFAULT_ROLL_NUMBER ?? "2024370558";
  const rows = await getInstance()
    .select({ clerkUserId: schema.students.clerkUserId })
    .from(schema.students)
    .where(sql`roll_number = ${roll}`)
    .limit(1);
  return rows[0]?.clerkUserId ?? `dev-${roll}`;
}

export async function withAuth<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let { userId } = await auth();
  if (!userId) {
    userId = await devUserIdOrNull();
  }
  if (!userId) throw new Error("withAuth: no authenticated Clerk user");
  return withExplicitAuth(userId, fn);
}

/**
 * Variant of `withAuth` that takes the Clerk user id explicitly instead of
 * reading it from Clerk's request-scoped `auth()`. Use this when the calling
 * context cannot access dynamic request APIs — e.g. inside a `'use cache'`
 * function. Resolve the user id outside the cache, then pass it in.
 */
export async function withExplicitAuth<T>(
  clerkUserId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return getInstance().transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`
    );
    return fn(tx);
  });
}

/**
 * Returns the students.id matching the current Clerk user, or null if not linked.
 * Uses the auth-aware client; safe inside RLS policies that depend on the same setting.
 */
export async function getCurrentStudentId(): Promise<string | null> {
  let { userId } = await auth();
  if (!userId) {
    userId = await devUserIdOrNull();
  }
  if (!userId) return null;
  const rows = await getInstance()
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(sql`clerk_user_id = ${userId}`)
    .limit(1);
  return rows[0]?.id ?? null;
}
