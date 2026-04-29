import { neon } from "@neondatabase/serverless";

async function main() {
  const s = neon(process.env.DATABASE_URL_UNPOOLED!);
  const [tables, rls] = await Promise.all([
    s`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'agent_%' ORDER BY 1`,
    s`SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true AND tablename LIKE 'agent_%' ORDER BY 1`,
  ]);
  console.log(
    JSON.stringify({
      tables: tables.map((x: any) => x.tablename),
      rls: rls.map((x: any) => x.tablename),
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
