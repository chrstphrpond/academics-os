"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Lock, Clock, AlertTriangle, Circle, XCircle, Minus } from "lucide-react";
import type { CourseStatus } from "@/lib/types";

const statusConfig: Record<CourseStatus, { icon: typeof CheckCircle; label: string; className: string }> = {
  passed: { icon: CheckCircle, label: "Passed", className: "text-emerald-500" },
  in_progress: { icon: Clock, label: "In Progress", className: "text-blue-500" },
  available: { icon: Circle, label: "Available", className: "text-amber-500" },
  locked: { icon: Lock, label: "Locked", className: "text-muted-foreground" },
  inc: { icon: AlertTriangle, label: "Incomplete", className: "text-red-500" },
  drp: { icon: Minus, label: "Dropped", className: "text-muted-foreground" },
  failed: { icon: XCircle, label: "Failed", className: "text-red-500" },
  not_taken: { icon: Circle, label: "Not Taken", className: "text-muted-foreground" },
};

export interface CourseDetailData {
  code: string;
  title: string;
  units: number;
  type: string;
  status: CourseStatus;
  grade?: string | null;
  prerequisites: string[];
  unlocks: string[];
}

interface CourseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseDetailData | null;
}

export function CourseDetailSheet({ open, onOpenChange, course }: CourseDetailSheetProps) {
  if (!course) return null;
  const config = statusConfig[course.status];
  const StatusIcon = config.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-left">{course.title}</SheetTitle>
          <SheetDescription className="text-left font-mono">{course.code}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.className}`} />
            <span className="text-sm">{config.label}</span>
            {course.grade && <Badge variant="outline" className="ml-auto">{course.grade}</Badge>}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Units</p>
              <p className="font-medium">{course.units}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
              <p className="font-medium">{course.type}</p>
            </div>
          </div>
          {course.prerequisites.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Prerequisites</p>
              <div className="flex flex-wrap gap-1.5">
                {course.prerequisites.map((p) => (
                  <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {course.unlocks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Unlocks</p>
              <div className="flex flex-wrap gap-1.5">
                {course.unlocks.map((u) => (
                  <Badge key={u} variant="outline" className="font-mono text-xs">{u}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
