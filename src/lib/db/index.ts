import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

export const sql = neon(url);
export const db = drizzle(sql, { schema });
export { schema };

export async function getCurrentStudentIdLegacy(): Promise<string> {
  const rows = await db
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(eq(schema.students.rollNumber, "2024370558"))
    .limit(1);
  if (rows.length === 0) throw new Error("Student not found");
  return rows[0].id;
}
