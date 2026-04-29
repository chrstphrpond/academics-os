import { neon } from "@neondatabase/serverless";

async function main() {
  const s = neon(process.env.DATABASE_URL_UNPOOLED!);
  const [newTable, rlsTables] = await Promise.all([
    s`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='scholarships'`,
    s`SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true ORDER BY 1`,
  ]);
  console.log({
    newTable,
    rlsTables: rlsTables.map((x) => (x as { tablename: string }).tablename),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
