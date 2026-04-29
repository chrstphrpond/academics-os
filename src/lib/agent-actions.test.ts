import { describe, it, expect, vi, beforeEach } from "vitest";

const insertReturning = vi.fn();
const insertValues = vi.fn(() => ({ returning: insertReturning }));
const dbAuthInsert = vi.fn(() => ({ values: insertValues }));

vi.mock("@/lib/db/auth", () => ({
  dbAuth: () => ({ insert: dbAuthInsert }),
  getCurrentStudentId: vi.fn(),
}));

vi.mock("@/lib/db/schema", () => ({
  agentActions: { __id: "agent_actions" },
}));

import { recordAgentAction } from "./agent-actions";
import { getCurrentStudentId } from "@/lib/db/auth";

describe("recordAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturning.mockResolvedValue([{ id: "abc" }]);
  });

  it("inserts an action row with status 'executed' for a non-confirm tool", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce("student-1");

    const id = await recordAgentAction({
      kind: "addTask",
      input: { title: "x" },
      diff: { taskId: "t1" },
      status: "executed",
    });

    expect(id).toBe("abc");
    expect(dbAuthInsert).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        kind: "addTask",
        status: "executed",
        inputJsonb: { title: "x" },
        diffJsonb: { taskId: "t1" },
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (insertValues.mock.calls as any[][])[0][0];
    expect(args.executedAt).toBeInstanceOf(Date);
  });

  it("does not set executedAt when status is 'proposed'", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce("student-1");

    await recordAgentAction({
      kind: "clearInc",
      input: { enrollmentId: "e1", newGrade: "1.75" },
      status: "proposed",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (insertValues.mock.calls as any[][])[0][0];
    expect(args.executedAt).toBeNull();
    expect(args.status).toBe("proposed");
  });

  it("throws when no current student is linked", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce(null);

    await expect(
      recordAgentAction({ kind: "addTask", input: {}, status: "executed" })
    ).rejects.toThrow(/no linked student/i);

    expect(dbAuthInsert).not.toHaveBeenCalled();
  });

  it("propagates errorText when status is 'failed'", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce("student-1");

    await recordAgentAction({
      kind: "addTask",
      input: {},
      status: "failed",
      errorText: "boom",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (insertValues.mock.calls as any[][])[0][0];
    expect(args.errorText).toBe("boom");
  });
});
