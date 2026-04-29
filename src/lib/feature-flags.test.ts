import { describe, it, expect, vi, beforeEach } from "vitest";
import { isFlagEnabled } from "./feature-flags";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";

describe("isFlagEnabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when cookie is missing", async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => undefined,
    });
    await expect(isFlagEnabled("dashboard.v2")).resolves.toBe(false);
  });

  it("returns true when cookie value is '1'", async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) =>
        name === "ff" ? { value: "dashboard.v2=1" } : undefined,
    });
    await expect(isFlagEnabled("dashboard.v2")).resolves.toBe(true);
  });

  it("supports multiple flags in one cookie", async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => ({ value: "dashboard.v2=1;feature.briefing=1" }),
    });
    await expect(isFlagEnabled("feature.briefing")).resolves.toBe(true);
    await expect(isFlagEnabled("feature.sidekick")).resolves.toBe(false);
  });
});
