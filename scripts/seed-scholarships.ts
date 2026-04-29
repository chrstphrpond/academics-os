import { db, schema } from "@/lib/db";

const BANDS = [
  {
    name: "President's List",
    minGpa: "1.00",
    maxGpa: "1.20",
    note: "GWA between 1.00 and 1.20 with no grade lower than 1.50.",
  },
  {
    name: "Dean's List",
    minGpa: "1.21",
    maxGpa: "1.45",
    note: "GWA between 1.21 and 1.45 with no grade lower than 1.75.",
  },
  {
    name: "Summa Cum Laude",
    minGpa: "1.00",
    maxGpa: "1.20",
    note: "Latin honors at graduation.",
  },
  {
    name: "Magna Cum Laude",
    minGpa: "1.21",
    maxGpa: "1.45",
    note: "Latin honors at graduation.",
  },
  {
    name: "Cum Laude",
    minGpa: "1.46",
    maxGpa: "1.75",
    note: "Latin honors at graduation.",
  },
];

async function main() {
  for (const b of BANDS) {
    await db
      .insert(schema.scholarships)
      .values(b)
      .onConflictDoNothing({ target: schema.scholarships.name });
  }
  const all = await db.select().from(schema.scholarships);
  console.log(`Seeded scholarships (${all.length} rows):`);
  for (const s of all) console.log(`  ${s.name}: ${s.minGpa}–${s.maxGpa}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
