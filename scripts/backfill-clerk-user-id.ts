import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

async function main() {
  const rollNumber = process.argv[2];
  const clerkUserId = process.argv[3];

  if (!rollNumber || !clerkUserId) {
    console.error(
      "Usage: pnpm tsx scripts/backfill-clerk-user-id.ts <roll_number> <clerk_user_id>"
    );
    console.error(
      'Example: pnpm tsx scripts/backfill-clerk-user-id.ts 2024370558 user_2xxxxxxxxxxxxxxxxxxxxx'
    );
    process.exit(1);
  }

  const updated = await db
    .update(schema.students)
    .set({ clerkUserId })
    .where(eq(schema.students.rollNumber, rollNumber))
    .returning({
      id: schema.students.id,
      name: schema.students.name,
      rollNumber: schema.students.rollNumber,
      clerkUserId: schema.students.clerkUserId,
    });

  if (updated.length === 0) {
    console.error(`No student found with roll_number=${rollNumber}`);
    process.exit(1);
  }

  console.log("Backfilled:", updated[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
