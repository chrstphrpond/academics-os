import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateObjectMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@/lib/ai/vertex", () => ({
  model: (k: string) => ({ providerKey: k }),
}));

import { solveTarget } from "./target-solver";
import type { EnrollmentWithCourse } from "@/lib/gpa";

const enrollments: EnrollmentWithCourse[] = [
  {
    grade: "1.50",
    status: "passed",
    term: "Term 2",
    school_year: "SY 2025-26",
    course: { code: "MO-IT118", title: "Cloud Computing", units: 3 },
  },
];

describe("solveTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateObjectMock.mockResolvedValue({
      object: {
        plans: [
          {
            label: "Aggressive",
            picks: [{ courseCode: "MO-IT108", grade: "1.00" }],
            expectedGwa: 1.4,
            confidence: 0.7,
            rationale: "Maxing the next course gets you closest to 1.40.",
          },
        ],
        assumptions: ["MO-IT101 INC clears at 1.75"],
        caveat: "Confidence shrinks as you require more 1.00 grades.",
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    });
  });

  it("returns the parsed TargetSolverOutput", async () => {
    const out = await solveTarget({
      enrollments,
      target: 1.4,
      upcomingCourseCodes: ["MO-IT108"],
    });
    expect(out.plans).toHaveLength(1);
    expect(out.plans[0].label).toBe("Aggressive");
  });

  it("calls generateObject with gemini-2.5-pro and the schema", async () => {
    await solveTarget({
      enrollments,
      target: 1.4,
      upcomingCourseCodes: ["MO-IT108"],
    });
    const args = generateObjectMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toEqual({ providerKey: "pro" });
    expect(typeof args.system).toBe("string");
    expect(typeof args.prompt).toBe("string");
    expect(args.schema).toBeDefined();
  });

  it("re-validates and throws on invalid output", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { plans: [], assumptions: [], caveat: "" },
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    await expect(
      solveTarget({
        enrollments,
        target: 1.4,
        upcomingCourseCodes: ["MO-IT108"],
      })
    ).rejects.toThrow(/target solver/i);
  });
});
