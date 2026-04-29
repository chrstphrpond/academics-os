import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface ScholarshipBand {
  id: string;
  name: string;
  minGpa: string;
  maxGpa: string;
  note: string | null;
  sourceChunkId: string | null;
}

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

export interface BandStatus {
  band: ScholarshipBand;
  inBand: boolean;
  /** Negative means above (worse than) the band; positive means below the floor. */
  gapToFloor: number;
}

export function bandStatusFor(
  gpa: number,
  bands: ScholarshipBand[]
): BandStatus[] {
  return bands.map((b) => {
    const min = parseFloat(b.minGpa);
    const max = parseFloat(b.maxGpa);
    const inBand = gpa >= min && gpa <= max;
    const gapToFloor = parseFloat((max - gpa).toFixed(2));
    return { band: b, inBand, gapToFloor };
  });
}
