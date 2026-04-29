import { describe, it, expect, vi, beforeEach } from "vitest";

const { txQueryEnrollments, txQueryAlerts, txQueryTasks, getUpcomingEventsMock } =
  vi.hoisted(() => ({
    txQueryEnrollments: vi.fn(),
    txQueryAlerts: vi.fn(),
    txQueryTasks: vi.fn(),
    getUpcomingEventsMock: vi.fn(),
  }));

vi.mock("@/lib/db/auth", () => ({
  withAuth: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      query: {
        enrollments: { findMany: txQueryEnrollments },
        alerts: { findMany: txQueryAlerts },
        tasks: { findMany: txQueryTasks },
      },
    })
  ),
}));

vi.mock("@/lib/db", () => ({
  schema: {
    enrollments: {
      studentId: "studentId_col",
      schoolYear: "schoolYear_col",
      term: "term_col",
    },
    alerts: { studentId: "studentId_col", dismissed: "dismissed_col", createdAt: "createdAt_col" },
    tasks: { studentId: "studentId_col", completed: "completed_col", createdAt: "createdAt_col" },
  },
}));

vi.mock("@/lib/academic-calendar", () => ({
  getUpcomingEvents: getUpcomingEventsMock,
}));

import { gatherBriefingData } from "./data";

describe("gatherBriefingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUpcomingEventsMock.mockReturnValue([
      { title: "End of Classes (Term 3)", date: "2026-07-29", type: "event" as const },
    ]);
    txQueryEnrollments.mockResolvedValue([
      {
        grade: "1.00",
        status: "passed",
        term: "Term 2",
        schoolYear: "SY 2025-26",
        course: { code: "MO-IT118", title: "Cloud Computing", units: 3 },
      },
      {
        grade: null,
        status: "in_progress",
        term: "Term 3",
        schoolYear: "SY 2025-26",
        course: { code: "MO-IT108", title: "Discrete Structures", units: 3 },
      },
    ]);
    txQueryAlerts.mockResolvedValue([
      {
        id: "a1",
        title: "Clear INC",
        severity: "critical",
        dueDate: "2026-05-29",
        message: "Submit makeup work",
      },
    ]);
    txQueryTasks.mockResolvedValue([
      {
        id: "t1",
        title: "Submit makeup",
        dueDate: "2026-05-15",
        completed: false,
        course: null,
      },
    ]);
  });

  it("fetches enrollments, alerts, tasks, and calendar in parallel", async () => {
    const result = await gatherBriefingData("student-1");

    expect(result.enrollments).toHaveLength(2);
    expect(result.activeAlerts).toHaveLength(1);
    expect(result.openTasks).toHaveLength(1);
    expect(result.upcomingEvents).toHaveLength(1);
    expect(result.upcomingEvents[0].title).toMatch(/end of classes/i);
  });

  it("identifies the current term as the most recent in_progress enrollment", async () => {
    const result = await gatherBriefingData("student-1");
    expect(result.currentTerm).toEqual({ term: "Term 3", schoolYear: "SY 2025-26" });
  });

  it("falls back to the most recent term when no enrollments are in_progress", async () => {
    txQueryEnrollments.mockResolvedValueOnce([
      {
        grade: "2.50",
        status: "passed",
        term: "Term 2",
        schoolYear: "SY 2025-26",
        course: { code: "MO-MATH035", title: "Math in Modern World", units: 3 },
      },
    ]);
    const result = await gatherBriefingData("student-1");
    expect(result.currentTerm).toEqual({ term: "Term 2", schoolYear: "SY 2025-26" });
  });
});
