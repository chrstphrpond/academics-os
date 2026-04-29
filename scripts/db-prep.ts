import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set");
    process.exit(1);
  }
  const sql = neon(url);
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`CREATE EXTENSION IF NOT EXISTS "vector"`;
  console.log("Extensions ready: uuid-ossp, vector");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
