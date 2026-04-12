"use client";

import { useState } from "react";
import { CurriculumGrid } from "./curriculum-grid";
import { UnitsSummary } from "./units-summary";
import { CourseDetailSheet, type CourseDetailData } from "./course-detail-sheet";
import type { CourseCardData } from "./course-card";
import type { CourseWithStatus } from "./types";

interface ProgressContentProps {
  courses: CourseWithStatus[];
  unlocksMap: Record<string, string[]>;
}

export function ProgressContent({ courses, unlocksMap }: ProgressContentProps) {
  const [selectedCourse, setSelectedCourse] = useState<CourseDetailData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleSelect(course: CourseCardData) {
    setSelectedCourse({
      code: course.code,
      title: course.title,
      units: course.units,
      type: course.type,
      status: course.status,
      grade: course.grade,
      prerequisites: course.prerequisites,
      unlocks: course.unlocks,
    });
    setSheetOpen(true);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <CurriculumGrid courses={courses} unlocksMap={unlocksMap} onSelect={handleSelect} />
        <div className="order-first lg:order-last">
          <div className="lg:sticky lg:top-20">
            <UnitsSummary courses={courses} />
          </div>
        </div>
      </div>
      <CourseDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        course={selectedCourse}
      />
    </>
  );
}
