import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// Re-export the client-safe types + helper so callers only need this module.
export {
  type ScholarshipBand,
  type BandStatus,
  bandStatusFor,
} from "./scholarship-status";

import type { ScholarshipBand } from "./scholarship-status";

export async function listScholarshipBands(): Promise<ScholarshipBand[]> {
  return db
    .select({
      id: schema.scholarships.id,
      name: schema.scholarships.name,
      minGpa: schema.scholarships.minGpa,
      maxGpa: schema.scholarships.maxGpa,
      note: schema.scholarships.note,
      sourceChunkId: schema.scholarships.sourceChunkId,
    })
    .from(schema.scholarships)
    .orderBy(asc(schema.scholarships.minGpa));
}

