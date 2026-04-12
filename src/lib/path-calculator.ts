export interface CourseForPath {
  code: string;
  title: string;
  units: number;
  prerequisites: string[];
  status: string; // "passed", "inc", "available", "locked", etc.
}

export interface TermPlan {
  termNumber: number;
  label: string; // e.g. "Term 1", "Term 2"
  courses: CourseForPath[];
  totalUnits: number;
}

export function calculateOptimalPath(
  allCourses: CourseForPath[],
  maxUnitsPerTerm: number = 18
): TermPlan[] {
  // 1. Filter to remaining courses (not passed)
  const remaining = allCourses.filter((c) => c.status !== "passed");
  const passedCodes = new Set(
    allCourses.filter((c) => c.status === "passed").map((c) => c.code)
  );

  // 2. Topological sort + greedy scheduling
  const scheduled = new Set<string>();
  const terms: TermPlan[] = [];
  let termNum = 1;

  while (scheduled.size < remaining.length) {
    // Find available courses this term — prerequisites must ALL be in passedCodes
    // (completed in previous terms, NOT scheduled in the current term)
    const available = remaining.filter((c) => {
      if (scheduled.has(c.code)) return false;
      return c.prerequisites.every((p) => passedCodes.has(p));
    });

    if (available.length === 0) {
      // No more courses can be scheduled (circular deps or all done)
      break;
    }

    // Sort by downstream impact (courses that unlock more should go first)
    available.sort((a, b) => {
      const aUnlocks = remaining.filter((r) =>
        r.prerequisites.includes(a.code)
      ).length;
      const bUnlocks = remaining.filter((r) =>
        r.prerequisites.includes(b.code)
      ).length;
      return bUnlocks - aUnlocks; // More unlocks first
    });

    // Greedily fill the term
    const termCourses: CourseForPath[] = [];
    let termUnits = 0;

    for (const course of available) {
      // Check prerequisites are in passedCodes (not just scheduled this term)
      const prereqsMet = course.prerequisites.every((p) =>
        passedCodes.has(p)
      );
      if (!prereqsMet) continue;

      if (termUnits + course.units <= maxUnitsPerTerm) {
        termCourses.push(course);
        termUnits += course.units;
        scheduled.add(course.code);
      }
    }

    if (termCourses.length === 0) break;

    terms.push({
      termNumber: termNum,
      label: `Term ${termNum}`,
      courses: termCourses,
      totalUnits: termUnits,
    });

    // Mark these as "passed" for next term's prerequisite check
    termCourses.forEach((c) => passedCodes.add(c.code));
    termNum++;
  }

  return terms;
}
