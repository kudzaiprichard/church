import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { loadCast } from "@/test/integration/cast";

import { TEMPLATE_HEADER } from "./import";
import { checkImport, countNotYetInvited, enrolImported, inviteNotYetInvited } from "./import-run";

const sendEmail = vi.fn();
vi.mock("@/lib/email", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));

/**
 * The member import end to end against a real database: the check, the
 * all-or-nothing enrolment, and invitations that pick up where they stopped.
 * Everything it creates is under @import.test and removed afterwards, so the
 * scope tests sharing this database see their fixture untouched. The
 * fixture's own people were never imported, so they are never invited here.
 */

const DOMAIN = "@import.test";
let cast: Awaited<ReturnType<typeof loadCast>>;

const csv = (...rows: string[]) => [TEMPLATE_HEADER, ...rows].join("\n");
const row = (email: string, groups = "Youth Alive") =>
  `Rudo,Moyo,${email},,,,F,${groups},14/03/2015,Main sanctuary,Apostle Makamba,,`;

beforeAll(async () => {
  cast = await loadCast();
});

beforeEach(() => {
  sendEmail.mockReset();
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { targetEmail: { endsWith: DOMAIN } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

describe("checkImport", () => {
  it("knows the roll and the groups as they are in the database", async () => {
    const plan = await checkImport(
      csv(row(`a${DOMAIN}`), row(cast.memberK.email), row(`b${DOMAIN}`, "Choir")),
    );
    expect(plan.ready.map((entry) => entry.input.email)).toEqual([`a${DOMAIN}`]);
    expect(plan.problems.map((problem) => problem.errors)).toEqual([
      ["Already on the roll."],
      ['Unknown connect group "Choir".'],
    ]);
  });
});

describe("enrolImported", () => {
  it("enrols each ready row with its baptismal record, groups and an audit entry", async () => {
    const plan = await checkImport(
      csv(row(`c${DOMAIN}`), row(`d${DOMAIN}`, "Youth Alive; Kingdom Total Women")),
    );
    await enrolImported(plan, cast.apostle, "roll.csv");

    const d = await prisma.user.findUniqueOrThrow({
      where: { email: `d${DOMAIN}` },
      include: { baptismalRecord: true, groupMemberships: { include: { group: true } } },
    });
    expect(d.role).toBe("MEMBER");
    expect(d.passwordHash).toBeNull();
    expect(d.baptismalRecord?.location).toBe("Main sanctuary");
    expect(d.groupMemberships.map((m) => m.group.name).sort()).toEqual([
      "Kingdom Total Women",
      "Youth Alive",
    ]);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: d.id } });
    expect(audit).toMatchObject({
      action: "MEMBER_ENROLLED",
      actorId: cast.apostle.id,
      detail: "imported from roll.csv",
    });
  });

  it("writes nothing when any row collides — all or none", async () => {
    const plan = await checkImport(csv(row(`e${DOMAIN}`), row(`f${DOMAIN}`)));
    // Somebody enrols f by hand between the check and the import.
    await prisma.user.create({ data: { email: `f${DOMAIN}`, firstName: "F", lastName: "Hand" } });

    await expect(enrolImported(plan, cast.apostle, "roll.csv")).rejects.toMatchObject({
      code: "P2002",
    });
    expect(await prisma.user.count({ where: { email: `e${DOMAIN}` } })).toBe(0);
  });
});

describe("inviteNotYetInvited", () => {
  it("invites imported members in batches, and nobody enrolled by hand", async () => {
    // c and d were imported; f was enrolled by hand and the fixture never invited.
    expect(await countNotYetInvited()).toBe(2);

    const first = await inviteNotYetInvited(cast.apostle, { limit: 1, spacingMs: 0 });
    expect(first).toEqual({ sent: 1, failure: null, remaining: 1 });
    expect(sendEmail.mock.calls[0][0].to).toBe(`c${DOMAIN}`);

    const second = await inviteNotYetInvited(cast.apostle, { limit: 5, spacingMs: 0 });
    expect(second).toEqual({ sent: 1, failure: null, remaining: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(
      await prisma.auditLog.count({
        where: { action: "USER_INVITED", targetEmail: { endsWith: DOMAIN } },
      }),
    ).toBe(2);
  });

  it("does not invite again once the invitation has been purged", async () => {
    await prisma.authToken.deleteMany({ where: { user: { email: { endsWith: DOMAIN } } } });
    expect(await countNotYetInvited()).toBe(0);
  });

  it("stops at a refused send and leaves that member to be invited next time", async () => {
    const plan = await checkImport(csv(row(`g${DOMAIN}`), row(`h${DOMAIN}`)));
    await enrolImported(plan, cast.apostle, "roll.csv");
    sendEmail.mockRejectedValueOnce(new Error("API key is invalid"));

    const result = await inviteNotYetInvited(cast.apostle, { limit: 10, spacingMs: 0 });
    expect(result).toEqual({ sent: 0, failure: "API key is invalid", remaining: 2 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
