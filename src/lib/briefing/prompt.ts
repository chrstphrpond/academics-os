import type { BriefingData } from "./data";

export const BRIEFING_SYSTEM_PROMPT = `You are an academic assistant for an MMDC student. Produce a daily briefing that is short, specific, and grounded in the data provided. Do not invent courses, grades, or deadlines that aren't in the input. The reader is a busy student — every line must earn its place.

Output a structured object with:
- headline: one sentence (≤120 chars) capturing the single most important thing today
- bullets: 3–6 short, scannable bullets covering academic state and what to do next
- risks: zero or more concrete risks (INC deadlines, enrollment cutoffs, falling-behind signals); set severity to "critical" if a deadline is within 7 days, "warning" within 30 days, "info" otherwise
- studyFocus: 1–3 specific things to study today, each tied to a course code and topic
- ctaActions: 0–3 suggested actions the student could click; each names a tool ("addTask" | "dismissAlert" | "clearInc" | "searchKnowledge" | "simulateGpa" | "proposePlan"), provides args, and a one-sentence rationale

Tone: direct, calm, no exclamation marks, no greetings, no signoffs.`;

function fmtEnrollment(e: BriefingData["enrollments"][number]): string {
  const grade = e.grade ?? "-";
  const code = e.course?.code ?? "?";
  const title = e.course?.title ?? "?";
  const units = e.course?.units ?? 0;
  return `  • [${e.status}] ${code} — ${title} (${units}u, ${e.schoolYear} ${e.term}, grade ${grade})`;
}

function fmtAlert(a: BriefingData["activeAlerts"][number]): string {
  const due = a.dueDate ? ` (due ${a.dueDate})` : "";
  return `  • [${a.severity}] ${a.title}${due}: ${a.message}`;
}

function fmtTask(t: BriefingData["openTasks"][number]): string {
  const due = t.dueDate ? ` (due ${t.dueDate})` : "";
  const code = t.course?.code ? `[${t.course.code}] ` : "";
  return `  • ${code}${t.title}${due}`;
}

function fmtEvent(e: BriefingData["upcomingEvents"][number]): string {
  return `  • [${e.type}] ${e.title} — ${e.date}`;
}

export function buildBriefingPrompt(data: BriefingData, today: Date): string {
  const todayStr = today.toISOString().slice(0, 10);
  const term = data.currentTerm
    ? `${data.currentTerm.term} ${data.currentTerm.schoolYear}`
    : "no current term";

  const inProgress = data.enrollments.filter((e) => e.status === "in_progress");
  const incs = data.enrollments.filter((e) => e.status === "inc");
  const recent = data.enrollments
    .filter((e) => e.status !== "in_progress" && e.status !== "inc")
    .slice(0, 8);

  return [
    `Today's date: ${todayStr}`,
    `Current term: ${term}`,
    "",
    "=== In-progress courses ===",
    inProgress.length ? inProgress.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Incomplete (INC) courses ===",
    incs.length ? incs.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Recent enrollments (most recent first) ===",
    recent.length ? recent.map(fmtEnrollment).join("\n") : "  (none)",
    "",
    "=== Active alerts ===",
    data.activeAlerts.length ? data.activeAlerts.map(fmtAlert).join("\n") : "  (none)",
    "",
    "=== Open tasks ===",
    data.openTasks.length ? data.openTasks.map(fmtTask).join("\n") : "  (none)",
    "",
    "=== Upcoming calendar events ===",
    data.upcomingEvents.length ? data.upcomingEvents.map(fmtEvent).join("\n") : "  (none)",
    "",
    "Produce the briefing now.",
  ].join("\n");
}
