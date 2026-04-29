import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  insertReturning,
  insertValues,
  dbInsert,
  updateWhere,
  updateSet,
  dbUpdate,
  generateTextMock,
} = vi.hoisted(() => {
  const insertReturning = vi.fn();
  const insertValues = vi.fn(() => ({ returning: insertReturning }));
  const dbInsert = vi.fn(() => ({ values: insertValues }));

  const updateWhere = vi.fn(async () => {});
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const dbUpdate = vi.fn(() => ({ set: updateSet }));

  const generateTextMock = vi.fn();

  return {
    insertReturning,
    insertValues,
    dbInsert,
    updateWhere,
    updateSet,
    dbUpdate,
    generateTextMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: dbInsert, update: dbUpdate },
  schema: { agentRuns: { __id: "agent_runs" } },
}));

vi.mock("@/lib/db/auth", () => ({
  getCurrentStudentId: vi.fn(),
}));

vi.mock("ai", () => ({ generateText: generateTextMock }));

vi.mock("@/lib/ai/vertex", () => ({
  model: (k: string) => ({ providerKey: k }),
}));

import { runVertex } from "./runtime";
import { getCurrentStudentId } from "@/lib/db/auth";

describe("runVertex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturning.mockResolvedValue([{ id: "run-1" }]);
    generateTextMock.mockResolvedValue({
      text: "ok",
      usage: { inputTokens: 10, outputTokens: 5 },
    });
  });

  it("inserts an agent_runs row, calls generateText, updates with usage, returns text + runId", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce("student-1");

    const result = await runVertex({
      feature: "test",
      modelKey: "flash",
      prompt: "hi",
    });

    expect(result.runId).toBe("run-1");
    expect(result.text).toBe("ok");

    expect(dbInsert).toHaveBeenCalledOnce();
    const inserted = (insertValues.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(inserted).toMatchObject({
      studentId: "student-1",
      feature: "test",
      model: "gemini-2.5-flash",
    });

    expect(generateTextMock).toHaveBeenCalledOnce();
    const callArgs = generateTextMock.mock.calls[0][0];
    expect(callArgs.prompt).toBe("hi");
    expect(callArgs.model).toEqual({ providerKey: "flash" });

    expect(dbUpdate).toHaveBeenCalledOnce();
    const updateArgs = (updateSet.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(updateArgs.inputTokens).toBe(10);
    expect(updateArgs.outputTokens).toBe(5);
    expect(typeof updateArgs.latencyMs).toBe("number");
  });

  it("works when there's no current student (unauthenticated test ping)", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce(null);

    const result = await runVertex({
      feature: "test",
      modelKey: "flash",
      prompt: "ping",
    });

    expect(result.text).toBe("ok");
    const inserted = (insertValues.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(inserted.studentId).toBeNull();
  });

  it("supports an optional system prompt", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce("student-1");

    await runVertex({
      feature: "briefing",
      modelKey: "pro",
      prompt: "summarize",
      system: "You are an assistant.",
    });

    const callArgs = generateTextMock.mock.calls[0][0];
    expect(callArgs.system).toBe("You are an assistant.");
    expect(callArgs.model).toEqual({ providerKey: "pro" });
  });
});
