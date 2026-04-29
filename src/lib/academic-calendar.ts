export interface CalendarEvent {
  title: string;
  date: string;
  type: "enrollment" | "deadline" | "exam" | "holiday" | "event";
  description?: string;
}

export const academicCalendar: CalendarEvent[] = [
  // Term 3 SY 2025-26 (per MyCamu portal)
  { title: "Start of Classes (Term 3)", date: "2026-04-17", type: "event" },
  { title: "Last Day for Enrollment", date: "2026-04-30", type: "deadline" },
  { title: "Last Day for Dropping Courses", date: "2026-04-30", type: "deadline" },
  { title: "End of Classes (Term 3)", date: "2026-07-29", type: "event" },
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
