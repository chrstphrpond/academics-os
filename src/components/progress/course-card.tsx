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
import { Lock, ArrowRight, CheckCircle, Clock, AlertTriangle, Circle, XCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { InteractiveCard } from "@/components/ui/animated";

const statusStyles: Record<CourseStatus, { base: string; hover: string }> = {
  passed: {
    base: "border-l-2 border-l-emerald-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-emerald-500/[0.03]",
    hover: "hover:bg-emerald-500/[0.06] hover:shadow-[0_0_12px_rgba(16,185,129,0.1)]",
  },
  in_progress: {
    base: "border-l-2 border-l-blue-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-blue-500/[0.03]",
    hover: "hover:bg-blue-500/[0.06] hover:shadow-[0_0_12px_rgba(59,130,246,0.1)]",
  },
  available: {
    base: "border-l-2 border-l-amber-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-amber-500/[0.03]",
    hover: "hover:bg-amber-500/[0.06] hover:shadow-[0_0_12px_rgba(245,158,11,0.1)]",
  },
  locked: {
    base: "border-l-2 border-l-white/10 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-white/[0.01] opacity-50",
    hover: "",
  },
  inc: {
    base: "border-l-2 border-l-red-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-red-500/[0.03]",
    hover: "hover:bg-red-500/[0.06] hover:shadow-[0_0_12px_rgba(239,68,68,0.1)]",
  },
  failed: {
    base: "border-l-2 border-l-red-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-red-500/[0.03]",
    hover: "hover:bg-red-500/[0.06] hover:shadow-[0_0_12px_rgba(239,68,68,0.1)]",
  },
  drp: {
    base: "border-l-2 border-l-white/10 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-white/[0.02]",
    hover: "hover:bg-white/[0.04]",
  },
  not_taken: {
    base: "border-l-2 border-l-white/10 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-white/[0.02]",
    hover: "hover:bg-white/[0.04]",
  },
};

const statusTextColor: Record<CourseStatus, string> = {
  passed: "text-emerald-400",
  in_progress: "text-blue-400",
  available: "text-amber-400",
  locked: "text-zinc-500",
  inc: "text-red-400",
  failed: "text-red-400",
  drp: "text-zinc-500",
  not_taken: "text-muted-foreground",
};

const statusIcons: Record<CourseStatus, typeof CheckCircle> = {
  passed: CheckCircle,
  in_progress: Clock,
  available: Circle,
  locked: Lock,
  inc: AlertTriangle,
  failed: XCircle,
  drp: Minus,
  not_taken: Circle,
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
  type: string;
  status: CourseStatus;
  grade?: string | null;
  prerequisites: string[];
  unlocks: string[];
}

export function CourseCard({ course, onSelect }: { course: CourseCardData; onSelect?: (course: CourseCardData) => void }) {
  const isLocked = course.status === "locked";
  const StatusIcon = statusIcons[course.status];
  const styles = statusStyles[course.status];

  return (
    <InteractiveCard>
    <Popover>
      <PopoverTrigger
        className={cn(
          "w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-200 cursor-pointer backdrop-blur-sm",
          styles.base,
          styles.hover,
        )}
        onClick={(e) => {
          if (onSelect) {
            e.preventDefault();
            onSelect(course);
          }
        }}
      >
          <div className="flex items-center justify-between gap-1">
            <span className={cn("flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider truncate", statusTextColor[course.status])}>
              <StatusIcon className="size-3.5 shrink-0" />
              {course.code}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{course.units}u</span>
          </div>
          <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground/80">
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
    </InteractiveCard>
  );
}
