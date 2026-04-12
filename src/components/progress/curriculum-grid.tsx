import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CourseCard } from "./course-card";

import type { CourseWithStatus } from "./types";

const termLabels: Record<number, string> = {
  1: "1st Semester",
  2: "2nd Semester",
  3: "Summer",
};

interface CurriculumGridProps {
  courses: CourseWithStatus[];
  /** Map from course code to array of codes it unlocks */
  unlocksMap: Record<string, string[]>;
}

export function CurriculumGrid({ courses, unlocksMap }: CurriculumGridProps) {
  const years = [1, 2, 3, 4];

  return (
    <div className="space-y-8">
      {years.map((year) => {
        const yearCourses = courses.filter((c) => c.year === year);
        if (yearCourses.length === 0) return null;

        return (
          <section key={year}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Year {year}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((term) => {
                const termCourses = yearCourses.filter((c) => c.term === term);
                return (
                  <div key={term} className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground border-b pb-1">
                      {termLabels[term]}
                    </h4>
                    {termCourses.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 italic py-2">
                        No courses
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {termCourses.map((course) => (
                          <CourseCard
                            key={course.code}
                            course={{
                              code: course.code,
                              title: course.title,
                              units: course.units,
                              status: course.status,
                              grade: course.grade,
                              prerequisites: course.prerequisites,
                              unlocks: unlocksMap[course.code] ?? [],
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
