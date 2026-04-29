// Client-safe — no DB imports. Pure functions over the band shape.
export interface ScholarshipBand {
  id: string;
  name: string;
  minGpa: string;
  maxGpa: string;
  note: string | null;
  sourceChunkId: string | null;
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
