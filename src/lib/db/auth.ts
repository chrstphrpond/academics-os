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
export async function withAuth<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const { userId } = await auth();
  if (!userId) throw new Error("withAuth: no authenticated Clerk user");

  return getInstance().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.clerk_user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/**
 * Returns the students.id matching the current Clerk user, or null if not linked.
 * Uses the auth-aware client; safe inside RLS policies that depend on the same setting.
 */
export async function getCurrentStudentId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const rows = await getInstance()
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(sql`clerk_user_id = ${userId}`)
    .limit(1);
  return rows[0]?.id ?? null;
}
