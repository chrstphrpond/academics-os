import { describe, it, expect, vi, beforeEach } from "vitest";

// ── db (anonymous / null-student path) ──────────────────────────────────────
const {
  dbInsertReturning,
  dbInsertValues,
  dbInsert,
  dbUpdateWhere,
  dbUpdateSet,
  dbUpdate,
  generateTextMock,
} = vi.hoisted(() => {
  const dbInsertReturning = vi.fn();
  const dbInsertValues = vi.fn(() => ({ returning: dbInsertReturning }));
  const dbInsert = vi.fn(() => ({ values: dbInsertValues }));

  const dbUpdateWhere = vi.fn(async () => {});
  const dbUpdateSet = vi.fn(() => ({ where: dbUpdateWhere }));
  const dbUpdate = vi.fn(() => ({ set: dbUpdateSet }));

  const generateTextMock = vi.fn();

  return {
    dbInsertReturning,
    dbInsertValues,
    dbInsert,
    dbUpdateWhere,
    dbUpdateSet,
    dbUpdate,
    generateTextMock,
  };
});

// ── withAuth (authenticated path) ───────────────────────────────────────────
const {
  txInsertReturning,
  txInsertValues,
  txInsert,
  txUpdateWhere,
  txUpdateSet,
  txUpdate,
  withAuthMock,
} = vi.hoisted(() => {
  const txInsertReturning = vi.fn();
  const txInsertValues = vi.fn(() => ({ returning: txInsertReturning }));
  const txInsert = vi.fn(() => ({ values: txInsertValues }));

  const txUpdateWhere = vi.fn(async () => {});
  const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
  const txUpdate = vi.fn(() => ({ set: txUpdateSet }));

  // withAuth calls fn(tx) and returns whatever fn returns
  const withAuthMock = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ insert: txInsert, update: txUpdate })
  );

  return {
    txInsertReturning,
    txInsertValues,
    txInsert,
    txUpdateWhere,
    txUpdateSet,
    txUpdate,
    withAuthMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: dbInsert, update: dbUpdate },
  schema: { agentRuns: { __id: "agent_runs" } },
}));

vi.mock("@/lib/db/auth", () => ({
  getCurrentStudentId: vi.fn(),
  withAuth: withAuthMock,
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
    // withAuth re-creates the tx mock on each call
    withAuthMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ insert: txInsert, update: txUpdate })
    );
    txInsertReturning.mockResolvedValue([{ id: "run-1" }]);
    dbInsertReturning.mockResolvedValue([{ id: "run-anon" }]);
    generateTextMock.mockResolvedValue({
      text: "ok",
      usage: { inputTokens: 10, outputTokens: 5 },
    });
  });

  it("inserts an agent_runs row via withAuth, calls generateText, updates with usage, returns text + runId", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce("student-1");

    const result = await runVertex({
      feature: "test",
      modelKey: "flash",
      prompt: "hi",
    });

    expect(result.runId).toBe("run-1");
    expect(result.text).toBe("ok");

    // withAuth should have been called twice (insert + update)
    expect(withAuthMock).toHaveBeenCalledTimes(2);

    // Check insert values
    expect(txInsert).toHaveBeenCalledOnce();
    const inserted = (txInsertValues.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(inserted).toMatchObject({
      studentId: "student-1",
      feature: "test",
      model: "gemini-2.5-flash",
    });

    expect(generateTextMock).toHaveBeenCalledOnce();
    const callArgs = generateTextMock.mock.calls[0][0];
    expect(callArgs.prompt).toBe("hi");
    expect(callArgs.model).toEqual({ providerKey: "flash" });

    // Check update values
    expect(txUpdate).toHaveBeenCalledOnce();
    const updateArgs = (txUpdateSet.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(updateArgs.inputTokens).toBe(10);
    expect(updateArgs.outputTokens).toBe(5);
    expect(typeof updateArgs.latencyMs).toBe("number");

    // db (anonymous path) should NOT be used
    expect(dbInsert).not.toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("works when there's no current student (unauthenticated test ping) — uses plain db", async () => {
    vi.mocked(getCurrentStudentId).mockResolvedValueOnce(null);

    const result = await runVertex({
      feature: "test",
      modelKey: "flash",
      prompt: "ping",
    });

    expect(result.text).toBe("ok");

    // Anonymous path: db used, withAuth NOT used
    expect(withAuthMock).not.toHaveBeenCalled();
    expect(dbInsert).toHaveBeenCalledOnce();

    const inserted = (dbInsertValues.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(inserted.studentId).toBeNull();

    expect(dbUpdate).toHaveBeenCalledOnce();
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
