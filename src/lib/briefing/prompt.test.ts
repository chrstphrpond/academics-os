import { describe, it, expect } from "vitest";
import { buildBriefingPrompt, BRIEFING_SYSTEM_PROMPT } from "./prompt";
import type { BriefingData } from "./data";

const fixture: BriefingData = {
  enrollments: [
    {
      grade: null,
      status: "in_progress",
      term: "Term 3",
      schoolYear: "SY 2025-26",
      course: { code: "MO-IT108", title: "Discrete Structures", units: 3 },
    },
    {
      grade: "INC",
      status: "inc",
      term: "Term 2",
      schoolYear: "SY 2025-26",
      course: { code: "MO-IT101", title: "Computer Programming 1", units: 2 },
    },
  ],
  activeAlerts: [
    {
      id: "a1",
      title: "Clear INC for MO-IT101",
      severity: "critical",
      dueDate: "2026-05-29",
      message: "Submit makeup work to your professor.",
    },
  ],
  openTasks: [
    {
      id: "t1",
      title: "Read DSA chapter 4",
      dueDate: "2026-05-02",
      completed: false,
      course: { code: "MO-IT108", title: "Discrete Structures" },
    },
  ],
  upcomingEvents: [
    { title: "Last Day for Enrollment", date: "2026-04-30", type: "deadline" },
  ],
  currentTerm: { term: "Term 3", schoolYear: "SY 2025-26" },
};

describe("BRIEFING_SYSTEM_PROMPT", () => {
  it("instructs the model to be specific and grounded", () => {
    expect(BRIEFING_SYSTEM_PROMPT).toMatch(/grounded/i);
    expect(BRIEFING_SYSTEM_PROMPT).toMatch(/specific/i);
  });
});

describe("buildBriefingPrompt", () => {
  it("includes the current term and date", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Term 3/);
    expect(out).toMatch(/SY 2025-26/);
    expect(out).toMatch(/2026-04-29/);
  });

  it("includes critical alerts and upcoming deadlines", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Clear INC for MO-IT101/);
    expect(out).toMatch(/2026-05-29/);
    expect(out).toMatch(/Last Day for Enrollment/);
  });

  it("includes the open tasks", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Read DSA chapter 4/);
  });

  it("lists in-progress enrollments distinctly from INCs", () => {
    const out = buildBriefingPrompt(fixture, new Date("2026-04-29"));
    expect(out).toMatch(/Discrete Structures/);
    expect(out).toMatch(/Computer Programming 1/);
    expect(out).toMatch(/INC/);
  });
});
