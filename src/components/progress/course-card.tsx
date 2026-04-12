"use client";

import type { CourseStatus } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<CourseStatus, string> = {
  passed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  in_progress: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  available: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  locked: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
  inc: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
  failed: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
  drp: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
  not_taken: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<CourseStatus, string> = {
  passed: "Passed",
  in_progress: "In Progress",
  available: "Available",
  locked: "Locked",
  inc: "Incomplete",
  failed: "Failed",
  drp: "Dropped",
  not_taken: "Not Taken",
};

export interface CourseCardData {
  code: string;
  title: string;
  units: number;
  status: CourseStatus;
  grade?: string | null;
  prerequisites: string[];
  unlocks: string[];
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const isLocked = course.status === "locked";

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
          "hover:ring-1 hover:ring-ring/50 cursor-pointer",
          statusStyles[course.status]
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono font-semibold truncate">
            {course.code}
          </span>
          <span className="shrink-0 tabular-nums">{course.units}u</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] opacity-80">
          {isLocked && <Lock className="size-3 shrink-0" />}
          <span className="truncate">{course.title}</span>
        </div>
      </PopoverTrigger>

      <PopoverContent side="top" className="w-64">
        <PopoverHeader>
          <PopoverTitle>{course.code}</PopoverTitle>
          <PopoverDescription>{course.title}</PopoverDescription>
        </PopoverHeader>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{statusLabels[course.status]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Units</span>
            <span className="font-medium">{course.units}</span>
          </div>
          {course.grade && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Grade</span>
              <span className="font-medium">{course.grade}</span>
            </div>
          )}

          {course.prerequisites.length > 0 && (
            <div>
              <span className="text-muted-foreground">Prerequisites:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {course.prerequisites.map((code) => (
                  <span
                    key={code}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {course.unlocks.length > 0 && (
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowRight className="size-3" /> Unlocks:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {course.unlocks.map((code) => (
                  <span
                    key={code}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
