import { describe, it, expect, vi, beforeEach } from "vitest";

const { recordMock, getToolMock, fakeTool } = vi.hoisted(() => {
  const fakeTool = {
    name: "fake",
    description: "fake tool",
    inputSchema: { parse: (x: unknown) => x } as unknown,
    requiresConfirmation: false,
    readOnly: false,
    execute: vi.fn(async (input: unknown) => ({
      output: { ok: true, input },
      undoInput: { undoneOf: input },
      summary: "fake done",
    })),
    undo: vi.fn(async () => {}),
    render: () => null,
  };
  return {
    recordMock: vi.fn(async () => "action-1"),
    getToolMock: vi.fn(() => fakeTool),
    fakeTool,
  };
});

vi.mock("@/lib/agent-actions", () => ({
  recordAgentAction: recordMock,
}));
vi.mock("./registry", () => ({
  getTool: getToolMock,
}));

import { executeTool, undoTool } from "./runtime";

describe("executeTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordMock.mockResolvedValue("action-1");
    fakeTool.execute.mockClear();
    fakeTool.execute.mockResolvedValue({
      output: { ok: true, input: { foo: "bar" } },
      undoInput: { undoneOf: { foo: "bar" } },
      summary: "fake done",
    });
    getToolMock.mockReturnValue(fakeTool);
    fakeTool.readOnly = false;
  });

  it("validates input, executes, records executed action, returns diff + actionId", async () => {
    const out = await executeTool("fake", { foo: "bar" }, {
      studentId: "student-1",
      clerkUserId: "user_1",
    });

    expect(out.actionId).toBe("action-1");
    expect(out.diff.output).toEqual({ ok: true, input: { foo: "bar" } });
    expect(fakeTool.execute).toHaveBeenCalledOnce();
    expect(recordMock).toHaveBeenCalledOnce();
    const call = (recordMock.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(call.kind).toBe("fake");
    expect(call.status).toBe("executed");
  });

  it("records a failed action and rethrows on tool error", async () => {
    fakeTool.execute.mockRejectedValueOnce(new Error("boom"));
    await expect(
      executeTool("fake", {}, { studentId: "s1", clerkUserId: "u1" })
    ).rejects.toThrow(/boom/);
    const call = (recordMock.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(call.status).toBe("failed");
    expect(call.errorText).toMatch(/boom/);
  });

  it("throws if the tool is not registered", async () => {
    getToolMock.mockReturnValueOnce(undefined as never);
    await expect(
      executeTool("nope", {}, { studentId: "s1", clerkUserId: "u1" })
    ).rejects.toThrow(/not registered/i);
  });
});

describe("undoTool", () => {
  it("calls the tool's undo and records an undone action", async () => {
    fakeTool.readOnly = false;
    fakeTool.undo.mockClear();
    recordMock.mockResolvedValueOnce("action-2");

    await undoTool({
      kind: "fake",
      undoInput: { undoneOf: { foo: "bar" } },
    }, { studentId: "s1", clerkUserId: "u1" });

    expect(fakeTool.undo).toHaveBeenCalledOnce();
    const call = (recordMock.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(call.kind).toBe("fake.undo");
    expect(call.status).toBe("undone");
  });

  it("throws on read-only tools", async () => {
    fakeTool.readOnly = true;
    await expect(
      undoTool(
        { kind: "fake", undoInput: {} },
        { studentId: "s1", clerkUserId: "u1" }
      )
    ).rejects.toThrow(/read-only/i);
  });
});
