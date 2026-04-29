import { cacheTag, cacheLife } from "next/cache";
import { generateBriefing } from "./generate";
import type { Briefing } from "./schema";

/**
 * Returns a cached Briefing for the given (studentId, clerkUserId).
 *
 * The clerkUserId must be resolved by the caller via `auth()` outside this
 * function — Cache Components forbid calling dynamic APIs (auth, headers,
 * cookies) inside `'use cache'` scopes.
 *
 * Cached for 6 hours. Tagged `briefing-${studentId}` so the refresh
 * server action can selectively revalidate this user's entry without
 * affecting other cached pages.
 */
export async function getCachedBriefing(
  studentId: string,
  clerkUserId: string
): Promise<Briefing> {
  "use cache";
  cacheTag(`briefing-${studentId}`);
  cacheLife({ revalidate: 6 * 60 * 60 }); // 6 hours
  return generateBriefing(studentId, clerkUserId);
}

export function briefingTagFor(studentId: string): string {
  return `briefing-${studentId}`;
}
