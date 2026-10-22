import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The privacy guarantee for sermon notes (docs/SCOPE.md §9.12): no code path
 * returns another user's note — not even to an Apostle.
 *
 * Prisma is replaced by a recorder, every exported read in `data/notes.ts` is
 * called with an Apostle's session, and each recorded `where` must pin the
 * query to that Apostle's own id. A new export that forgets the scope fails
 * here, because the loop covers whatever the module exports.
 */

const calls: { method: string; where: unknown }[] = [];

vi.mock("@/lib/prisma", () => {
  const record =
    (method: string) =>
    async (args: { where?: unknown } = {}) => {
      calls.push({ method, where: args.where });
      return method === "count" ? 0 : method === "findMany" ? [] : null;
    };
  return {
    prisma: {
      sermonNote: {
        findFirst: record("findFirst"),
        findUnique: record("findUnique"),
        findMany: record("findMany"),
        count: record("count"),
      },
    },
  };
});

const apostle = {
  id: "apostle-1",
  email: "apostle@example.org",
  firstName: "Takura",
  lastName: "Makamba",
  role: "APOSTLE" as const,
  avatarUrl: null,
  mustChangePassword: false,
};

describe("sermon notes are private from Apostles too", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("pins every read in data/notes.ts to the caller's own id", async () => {
    const notes = await import("./notes");
    const reads = Object.entries(notes).filter(([, value]) => typeof value === "function");
    expect(reads.length).toBeGreaterThanOrEqual(3);

    for (const [, read] of reads) {
      await (read as (user: typeof apostle, id: string) => Promise<unknown>)(apostle, "sermon-1");
    }

    expect(calls.length).toBeGreaterThanOrEqual(reads.length);
    for (const call of calls) {
      expect(call.where).toMatchObject({ userId: apostle.id });
    }
  });

  it("never widens for an Apostle the way ownerScope would", async () => {
    const { getOwnNote } = await import("./notes");
    await getOwnNote(apostle, "sermon-1");
    expect(calls[0].where).toEqual({ userId: apostle.id, sermonId: "sermon-1" });
  });
});
