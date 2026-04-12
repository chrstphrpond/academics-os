export interface CalendarEvent {
  title: string;
  date: string;
  type: "enrollment" | "deadline" | "exam" | "holiday" | "event";
  description?: string;
}

export const academicCalendar: CalendarEvent[] = [
  // Term 3 SY 2025-26
  { title: "Start of Classes", date: "2026-03-23", type: "event" },
  { title: "Last Day of Late Enrollment", date: "2026-03-29", type: "deadline" },
  { title: "Last Day for Cancellation (with refund)", date: "2026-04-04", type: "deadline" },
  { title: "Start of First Academic Week", date: "2026-04-06", type: "event" },
  { title: "Post-Enrollment System Clean-up", date: "2026-04-13", type: "event" },
  { title: "Last Day for Shifting Program", date: "2026-05-18", type: "deadline" },
  { title: "Student Webinar", date: "2026-05-22", type: "event" },
  { title: "Last Day to Complete Courses", date: "2026-05-29", type: "deadline" },
  { title: "Last Day for Dropping Courses", date: "2026-06-01", type: "deadline" },
  { title: "Last Day for Cancellation (no refund)", date: "2026-06-01", type: "deadline" },
  { title: "Last Day of Regular Classes", date: "2026-06-22", type: "event" },
  { title: "Submission of Final Outputs", date: "2026-06-22", type: "deadline" },
  { title: "Viewing of Final Grades", date: "2026-07-03", type: "event" },
  // Term 1 SY 2026-27
  { title: "Course Enlistment & Sectioning", date: "2026-08-10", type: "enrollment" },
  { title: "Enrollment & Payment", date: "2026-08-17", type: "enrollment" },
  { title: "Start of Classes (Term 1)", date: "2026-08-24", type: "event" },
];

const typeColors: Record<string, string> = {
  enrollment: "text-blue-400 bg-blue-400/10",
  deadline: "text-red-400 bg-red-400/10",
  exam: "text-amber-400 bg-amber-400/10",
  holiday: "text-emerald-400 bg-emerald-400/10",
  event: "text-violet-400 bg-violet-400/10",
};

export function getTypeColor(type: string): string {
  return typeColors[type] || "text-muted-foreground bg-muted/50";
}

export function getUpcomingEvents(limit = 5): CalendarEvent[] {
  const now = new Date().toISOString().split("T")[0];
  return academicCalendar
    .filter((e) => e.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
