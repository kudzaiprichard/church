import { describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";

import {
  composeSchema,
  mayCompose,
  mayRead,
  maySendTo,
  recipientFilter,
  replyThread,
  visibleThreads,
} from "./rules";

const person = (role: Role, id = `u-${role.toLowerCase()}`) => ({ id, role });

const apostle = person("APOSTLE");
const matron = person("MATRON");
const elder = person("ELDER");
const member = person("MEMBER");
/** Mai Madzana: a Member by office, leader of Kingdom Total Women. */
const leader = person("MEMBER", "u-leader");

const KTW = "g-ktw";
const YOUTH = "g-youth";

describe("maySendTo — the audience guard, per office", () => {
  it("lets only the Apostles message the whole church", () => {
    expect(maySendTo(apostle, { audience: "ALL" }, [])).toBe(true);
    for (const sender of [matron, elder, member, leader]) {
      expect(maySendTo(sender, { audience: "ALL" }, [KTW])).toBe(false);
    }
  });

  it("lets a leader message the group they lead, and no other", () => {
    expect(maySendTo(leader, { audience: "GROUP", groupId: KTW }, [KTW])).toBe(true);
    expect(maySendTo(leader, { audience: "GROUP", groupId: YOUTH }, [KTW])).toBe(false);
  });

  it("refuses a tampered group id even from an office holder who leads elsewhere", () => {
    // The Elder leads Youth Alive; posting KTW's id in the hidden field fails.
    expect(maySendTo(elder, { audience: "GROUP", groupId: KTW }, [YOUTH])).toBe(false);
    expect(maySendTo(matron, { audience: "GROUP", groupId: KTW }, [])).toBe(false);
  });

  it("lets an Apostle message any group or person", () => {
    expect(maySendTo(apostle, { audience: "GROUP", groupId: KTW }, [])).toBe(true);
    expect(
      maySendTo(apostle, { audience: "INDIVIDUAL", recipientId: "x", recipientGroupIds: [] }, []),
    ).toBe(true);
  });

  it("lets a leader message one person only when that person is in a group they lead", () => {
    const inKtw = { audience: "INDIVIDUAL" as const, recipientId: "m1", recipientGroupIds: [KTW] };
    const inYouth = { audience: "INDIVIDUAL" as const, recipientId: "m2", recipientGroupIds: [YOUTH] };
    expect(maySendTo(leader, inKtw, [KTW])).toBe(true);
    expect(maySendTo(leader, inYouth, [KTW])).toBe(false);
  });

  it("lets a plain member start nothing", () => {
    expect(maySendTo(member, { audience: "GROUP", groupId: KTW }, [])).toBe(false);
    expect(
      maySendTo(member, { audience: "INDIVIDUAL", recipientId: "x", recipientGroupIds: [KTW] }, []),
    ).toBe(false);
    expect(mayCompose(member, [])).toBe(false);
    expect(mayCompose(leader, [KTW])).toBe(true);
    expect(mayCompose(apostle, [])).toBe(true);
  });

  it("follows leadership as passed in, so a new leader can post on the next request", () => {
    const target = { audience: "GROUP" as const, groupId: KTW };
    expect(maySendTo(member, target, [])).toBe(false);
    expect(maySendTo(member, target, [KTW])).toBe(true);
  });
});

describe("recipientFilter — recipients are resolved at send time", () => {
  it("reaches the group's current active members, never the sender", () => {
    expect(recipientFilter({ audience: "GROUP", groupId: KTW }, leader.id)).toEqual({
      isActive: true,
      id: { not: leader.id },
      groupMemberships: { some: { groupId: KTW } },
    });
  });

  it("reaches every active account for All Church", () => {
    expect(recipientFilter({ audience: "ALL" }, apostle.id)).toEqual({
      isActive: true,
      id: { not: apostle.id },
    });
  });

  it("reaches exactly one active person for a personal message, and not oneself", () => {
    expect(
      recipientFilter({ audience: "INDIVIDUAL", recipientId: "m1", recipientGroupIds: [] }, leader.id),
    ).toEqual({ isActive: true, id: { equals: "m1", not: leader.id } });
  });

  it("decides readership by the recipient row, not current membership", () => {
    // Joined KTW after the message was sent: in the group now, but no row.
    const lateJoiner = person("MEMBER", "u-late");
    expect(mayRead(lateJoiner, { isSender: false, isRecipient: false })).toBe(false);
    expect(mayRead(member, { isSender: false, isRecipient: true })).toBe(true);
    expect(mayRead(leader, { isSender: true, isRecipient: false })).toBe(true);
    expect(mayRead(apostle, { isSender: false, isRecipient: false })).toBe(true);
  });
});

describe("reply threads stay private", () => {
  const a = person("MEMBER", "u-a");
  const b = person("MEMBER", "u-b");
  const threads = [a.id, b.id];
  const recipient = { isSender: false, isRecipient: true };
  const sender = { isSender: true, isRecipient: false };

  it("shows member A only their own thread, never member B's", () => {
    expect(visibleThreads(a, recipient, threads)).toEqual([a.id]);
    expect(visibleThreads(b, recipient, threads)).toEqual([b.id]);
  });

  it("shows the sender and the Apostles every thread", () => {
    expect(visibleThreads(leader, sender, threads)).toEqual(threads);
    expect(visibleThreads(apostle, { isSender: false, isRecipient: false }, threads)).toEqual(
      threads,
    );
  });

  it("shows an outsider nothing", () => {
    expect(visibleThreads(member, { isSender: false, isRecipient: false }, threads)).toEqual([]);
  });

  it("files a recipient's reply in their own thread whatever the form says", () => {
    expect(replyThread(a, recipient, b.id, threads)).toEqual({ threadUserId: a.id });
  });

  it("lets the sender answer only a recipient who has replied", () => {
    expect(replyThread(leader, sender, b.id, threads)).toEqual({ threadUserId: b.id });
    expect(replyThread(leader, sender, "u-silent", threads)).toHaveProperty("error");
    expect(replyThread(leader, sender, undefined, threads)).toHaveProperty("error");
  });

  it("lets an Apostle who did not send it read but not reply", () => {
    expect(
      replyThread(apostle, { isSender: false, isRecipient: false }, a.id, threads),
    ).toHaveProperty("error");
  });
});

describe("composeSchema", () => {
  const base = { subject: "Sunday", body: "See you there.", email: "" };

  it("requires the target that the audience names", () => {
    const group = composeSchema.safeParse({ ...base, audience: "GROUP" });
    expect(group.success).toBe(false);
    expect(group.error?.issues[0].path).toEqual(["groupId"]);

    const person = composeSchema.safeParse({ ...base, audience: "INDIVIDUAL", recipientId: "" });
    expect(person.success).toBe(false);
    expect(person.error?.issues[0].path).toEqual(["recipientId"]);
  });

  it("rejects an audience that does not exist", () => {
    expect(composeSchema.safeParse({ ...base, audience: "EVERYONE" }).success).toBe(false);
  });

  it("reads the email checkbox", () => {
    expect(composeSchema.parse({ ...base, audience: "ALL", email: "on" }).email).toBe(true);
    expect(composeSchema.parse({ ...base, audience: "ALL" }).email).toBe(false);
  });
});
