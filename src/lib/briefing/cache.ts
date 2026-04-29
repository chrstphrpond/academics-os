import {
  unstable_cacheTag as cacheTag,
  unstable_cacheLife as cacheLife,
} from "next/cache";
import { generateBriefing } from "./generate";
import type { Briefing } from "./schema";

/**
 * Returns a cached Briefing for the given student.
 *
 * Cached for 6 hours. Tagged `briefing-${studentId}` so the refresh
 * server action can selectively revalidate this user's entry without
 * affecting other cached pages.
 */
export async function getCachedBriefing(studentId: string): Promise<Briefing> {
  "use cache";
  cacheTag(`briefing-${studentId}`);
  cacheLife({ revalidate: 6 * 60 * 60 }); // 6 hours
  return generateBriefing(studentId);
}

export function briefingTagFor(studentId: string): string {
  return `briefing-${studentId}`;
}
