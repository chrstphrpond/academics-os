import { Client } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sqlText = readFileSync("drizzle/0004_scholarships.sql", "utf-8");
  const statements = sqlText
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  const client = new Client(url);
  await client.connect();
  console.log(`Applying ${statements.length} statements from drizzle/0004_scholarships.sql ...`);
  try {
    for (const stmt of statements) {
      await client.query(stmt);
      const preview = stmt.slice(0, 80).replace(/\s+/g, " ");
      console.log(`  ✓ ${preview}${stmt.length > 80 ? "…" : ""}`);
    }
  } finally {
    await client.end();
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
