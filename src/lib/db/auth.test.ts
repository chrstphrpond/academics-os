import { describe, it, expect, vi, beforeEach } from "vitest";

// Set dummy env before any module import so the URL check passes.
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

const txExecute = vi.fn(async () => {});
const transaction = vi.fn(async (cb: any) =>
  cb({
    execute: txExecute,
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ id: "abc" }] }),
      }),
    }),
  })
);

vi.mock("./schema", () => ({ students: { id: "id_col" } }));

vi.mock("drizzle-orm/neon-serverless", () => ({
  drizzle: () => ({
    transaction,
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ id: "student-1" }] }),
      }),
    }),
  }),
}));

vi.mock("@neondatabase/serverless", () => ({
  Pool: vi.fn(),
}));

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));

describe("withAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    txExecute.mockClear();
    transaction.mockClear();
  });

  it("throws when no authenticated user", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const { withAuth } = await import("./auth");
    await expect(withAuth(async () => "x")).rejects.toThrow(/no authenticated/i);
  });

  it("opens a transaction and sets app.clerk_user_id", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_123" });
    const { withAuth } = await import("./auth");
    const result = await withAuth(async () => "ok");
    expect(result).toBe("ok");
    expect(transaction).toHaveBeenCalledOnce();
    expect(txExecute).toHaveBeenCalledOnce();
  });
});

describe("getCurrentStudentId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null when no authenticated user", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const { getCurrentStudentId } = await import("./auth");
    await expect(getCurrentStudentId()).resolves.toBeNull();
  });

  it("returns the student id when linked", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_123" });
    const { getCurrentStudentId } = await import("./auth");
    await expect(getCurrentStudentId()).resolves.toBe("student-1");
  });
});
