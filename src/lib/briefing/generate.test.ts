import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateObjectMock, dataMock, txInsertReturning, txUpdateWhere } = vi.hoisted(
  () => ({
    generateObjectMock: vi.fn(),
    dataMock: vi.fn(),
    txInsertReturning: vi.fn(),
    txUpdateWhere: vi.fn(),
  })
);

vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@/lib/ai/vertex", () => ({ model: (k: string) => ({ providerKey: k }) }));
vi.mock("@/lib/briefing/data", () => ({ gatherBriefingData: dataMock }));

vi.mock("@/lib/db/auth", () => ({
  withExplicitAuth: vi.fn(
    async (_userId: string, cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        insert: () => ({
          values: () => ({ returning: txInsertReturning }),
        }),
        update: () => ({
          set: () => ({ where: txUpdateWhere }),
        }),
      })
  ),
}));

vi.mock("@/lib/db", () => ({
  schema: { agentRuns: { id: "agentRuns_id_col" } },
}));

import { generateBriefing } from "./generate";

describe("generateBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txInsertReturning.mockResolvedValue([{ id: "run-1" }]);
    txUpdateWhere.mockResolvedValue(undefined);
    dataMock.mockResolvedValue({
      enrollments: [],
      activeAlerts: [],
      openTasks: [],
      upcomingEvents: [],
      currentTerm: { term: "Term 3", schoolYear: "SY 2025-26" },
    });
    generateObjectMock.mockResolvedValue({
      object: {
        headline: "All clear today",
        bullets: ["Sail through Discrete Structures", "Confirm Term 3 enrollment"],
        risks: [],
        studyFocus: [],
        ctaActions: [],
      },
      usage: { inputTokens: 200, outputTokens: 30 },
    });
  });

  it("returns the parsed Briefing object", async () => {
    const result = await generateBriefing("student-1", "user_test");
    expect(result.headline).toBe("All clear today");
    expect(result.bullets.length).toBeGreaterThan(0);
  });

  it("calls generateObject with the briefing schema and the gemini-2.5-pro model", async () => {
    await generateBriefing("student-1", "user_test");
    expect(generateObjectMock).toHaveBeenCalledOnce();
    const args = generateObjectMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toEqual({ providerKey: "pro" });
    expect(typeof args.system).toBe("string");
    expect(typeof args.prompt).toBe("string");
    expect(args.schema).toBeDefined();
  });

  it("throws a typed error if the model output fails schema validation", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        headline: "",
        bullets: [],
        risks: [],
        studyFocus: [],
        ctaActions: [],
      },
      usage: { inputTokens: 100, outputTokens: 10 },
    });
    await expect(generateBriefing("student-1", "user_test")).rejects.toThrow(/briefing/i);
  });
});
