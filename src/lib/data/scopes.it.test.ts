import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { loadCast, OFFICES, titles, valuesOf } from "@/test/integration/cast";
import type { CastName } from "@/test/integration/fixture";

import {
  attendanceSheet,
  churchAttendance,
  groupMatrix,
  memberAttendance,
  ownAttendance,
} from "./attendance";
import { listCandidates, listClasses, listRecords } from "./baptism";
import { birthdayCalendar } from "./birthdays";
import { getDevotion, listDevotions } from "./devotions";
import { eventList, getEvent } from "./events";
import { chemaCompliance, churchFinance, memberGiving, myGiving, reviewQueue } from "./finance";
import { getGroup, listGroups, peopleForGroup } from "./groups";
import { getMember, getMemberForEdit, listMembers } from "./members";
import { composeOptions, getMessage, listInbox } from "./messages";
import { getOwnNote, listOwnNotes } from "./notes";
import { bellPreview } from "./notifications";
import { allPledges, getProject, memberPledges, myPledges } from "./partnerships";
import { prayerBoard } from "./prayer";
import { getSermon, listSermons } from "./sermons";

/**
 * The access rule, proved against a real database (docs/SCOPE.md §4.3, §10):
 * each `src/lib/data` read is called as an Apostle, the Matron, the Elder
 * (who leads Youth Alive), a member who leads Kingdom Total Women, a KTW
 * member and a Youth Alive member, and must return exactly what that person
 * may see. The cast and its content are in src/test/integration/fixture.ts.
 */

let cast: Awaited<ReturnType<typeof loadCast>>;
const ids = {} as Record<string, string>;

beforeAll(async () => {
  cast = await loadCast();
  const find = async <T extends { id: string }>(promise: Promise<T | null>) => (await promise)!.id;
  ids.ktw = await find(prisma.group.findUnique({ where: { slug: "ktw" } }));
  ids.youth = await find(prisma.group.findUnique({ where: { slug: "youth" } }));
  ids.ktwMessage = await find(prisma.message.findFirst({ where: { subject: "KTW message" } }));
  ids.youthMessage = await find(prisma.message.findFirst({ where: { subject: "YOUTH message" } }));
  ids.ktwEvent = await find(prisma.event.findFirst({ where: { title: "KTW meeting" } }));
  ids.youthEvent = await find(prisma.event.findFirst({ where: { title: "YOUTH meeting" } }));
  ids.allEvent = await find(prisma.event.findFirst({ where: { title: "ALL service" } }));
  ids.sermon = await find(prisma.sermon.findFirst({ where: { title: "PUBLISHED sermon" } }));
  ids.draftSermon = await find(prisma.sermon.findFirst({ where: { title: "DRAFT sermon" } }));
  ids.tomorrow = await find(prisma.devotion.findFirst({ where: { title: "TOMORROW devotion" } }));
  ids.draftDevotion = await find(prisma.devotion.findFirst({ where: { title: "DRAFT devotion" } }));
  ids.project = await find(prisma.partnershipProject.findFirst({ where: { name: "IT Project" } }));
});

/** Who, by the matrix, should get a non-null result. */
const only = (allowed: CastName[]) => (name: CastName) => allowed.includes(name);

describe("members (§9.3)", () => {
  const expected: Record<CastName, string[]> = {
    apostle: ["Apostle", "Matron", "Elder", "Leader", "MemberK", "MemberY"],
    matron: ["Apostle", "Matron", "Elder", "Leader", "MemberK", "MemberY"],
    elder: ["Elder", "MemberY"],
    leader: ["Leader", "MemberK"],
    memberK: ["MemberK"],
    memberY: ["MemberY"],
  };

  it.each(OFFICES)("lists exactly the people %s may list", async (name) => {
    const { rows } = await listMembers(cast[name], { status: "all" });
    expect(rows.map((row) => row.firstName).sort()).toEqual([...expected[name]].sort());
  });

  it("gives a leader nobody outside their groups, even by id", async () => {
    expect(await getMember(cast.leader, cast.memberY.id)).toBeNull();
    expect(await getMember(cast.leader, cast.memberK.id)).not.toBeNull();
    expect(await getMember(cast.memberK, cast.memberY.id)).toBeNull();
  });

  it("shows personal details only to the person and Apostles", async () => {
    expect((await getMember(cast.leader, cast.memberK.id))!.personal).toBeNull();
    expect((await getMember(cast.apostle, cast.memberK.id))!.personal).not.toBeNull();
    expect((await getMember(cast.memberK, cast.memberK.id))!.personal).not.toBeNull();
  });

  it.each(OFFICES)("lets only Apostles load a member for editing (%s)", async (name) => {
    const record = await getMemberForEdit(cast[name], cast.memberK.id);
    expect(record !== null).toBe(only(["apostle"])(name));
  });
});

describe("connect groups (§9.4)", () => {
  it.each(OFFICES)("lists %s's own groups, or all for an Apostle", async (name) => {
    const groups = (await listGroups(cast[name])).map((group) => group.name).sort();
    const expected: Record<CastName, string[]> = {
      apostle: ["Kingdom Total Women", "Youth Alive"],
      matron: [],
      elder: ["Youth Alive"],
      leader: ["Kingdom Total Women"],
      memberK: ["Kingdom Total Women"],
      memberY: ["Youth Alive"],
    };
    expect(groups).toEqual(expected[name]);
  });

  it("hides another group entirely and fellow members' contact details from members", async () => {
    expect(await getGroup(cast.memberY, ids.ktw)).toBeNull();
    const asMember = await getGroup(cast.memberK, ids.ktw);
    expect(asMember!.members.every((member) => member.contact === null)).toBe(true);
    const asLeader = await getGroup(cast.leader, ids.ktw);
    expect(asLeader!.members.every((member) => member.contact !== null)).toBe(true);
  });

  it("hands the people picker only to Apostles", async () => {
    for (const name of OFFICES) {
      const people = await peopleForGroup(cast[name], ids.ktw);
      expect(people.all.length > 0).toBe(name === "apostle");
    }
  });
});

describe("messages (§9.5)", () => {
  it.each(OFFICES)("keeps %s's inbox to their own recipient rows", async (name) => {
    const subjects = (await listInbox(cast[name])).rows.map((row) => row.subject);
    const expected: Partial<Record<CastName, string[]>> = {
      memberK: ["KTW message"],
      memberY: ["YOUTH message"],
    };
    expect(subjects).toEqual(expected[name] ?? []);
  });

  it.each(OFFICES)("lets %s open the KTW message only as its parties or an Apostle", async (name) => {
    const message = await getMessage(cast[name], ids.ktwMessage);
    expect(message !== null).toBe(only(["apostle", "leader", "memberK"])(name));
  });

  it("shows the reply thread to the sender, its member and Apostles only", async () => {
    for (const name of ["apostle", "leader", "memberK"] as const) {
      const message = await getMessage(cast[name], ids.ktwMessage);
      expect(titles(message!.threads)).toContain("KTW reply");
    }
  });

  it("offers the composer nothing to plain members and only led groups to leaders", async () => {
    expect((await composeOptions(cast.memberK)).groups).toEqual([]);
    expect((await composeOptions(cast.leader)).groups.map((group) => group.name)).toEqual([
      "Kingdom Total Women",
    ]);
    expect((await composeOptions(cast.matron)).groups).toEqual([]);
  });
});

describe("events and attendance (§9.6–9.7)", () => {
  it.each(OFFICES)("shows %s all-church events and their own groups' only", async (name) => {
    const { past } = await eventList(cast[name]);
    const seen = past.map((event) => event.title).sort();
    const expected: Record<CastName, string[]> = {
      apostle: ["ALL service", "KTW meeting", "YOUTH meeting"],
      matron: ["ALL service"],
      elder: ["ALL service", "YOUTH meeting"],
      leader: ["ALL service", "KTW meeting"],
      memberK: ["ALL service", "KTW meeting"],
      memberY: ["ALL service", "YOUTH meeting"],
    };
    expect(seen).toEqual(expected[name].sort());
  });

  it("gives a Youth Alive member no KTW event by id", async () => {
    expect(await getEvent(cast.memberY, ids.ktwEvent)).toBeNull();
  });

  it.each(OFFICES)("gives %s the KTW sheet only as its leader or an Apostle", async (name) => {
    const sheet = await attendanceSheet(cast[name], ids.ktwEvent);
    expect(sheet !== null).toBe(only(["apostle", "leader"])(name));
  });

  it("lets a leader mark only their own groups at an all-church event", async () => {
    const sheet = await attendanceSheet(cast.leader, ids.allEvent);
    expect(sheet!.people.map((person) => person.name).sort()).toEqual(
      ["Leader Test", "MemberK Test"].sort(),
    );
  });

  it("shows others' attendance only to Apostles and their group leaders", async () => {
    expect(await memberAttendance(cast.elder, cast.memberK.id)).toBeNull();
    expect(await memberAttendance(cast.leader, cast.memberK.id)).not.toBeNull();
    expect(await memberAttendance(cast.matron, cast.memberK.id)).toBeNull();
    expect(await groupMatrix(cast.leader, ids.youth)).toBeNull();
    for (const name of OFFICES) {
      expect((await churchAttendance(cast[name])) !== null).toBe(name === "apostle");
    }
    expect(titles((await ownAttendance(cast.memberK)).rows)).not.toContain("YOUTH");
  });
});

describe("prayer (§9.8)", () => {
  it.each(OFFICES)("shows %s only their groups' requests", async (name) => {
    const board = await prayerBoard(cast[name]);
    const text = titles(board.items);
    const sees = { ktw: text.includes("KTW prayer"), youth: text.includes("YOUTH prayer") };
    const expected: Record<CastName, { ktw: boolean; youth: boolean }> = {
      apostle: { ktw: true, youth: true },
      matron: { ktw: false, youth: false },
      elder: { ktw: false, youth: true },
      leader: { ktw: true, youth: false },
      memberK: { ktw: true, youth: false },
      memberY: { ktw: false, youth: true },
    };
    expect(sees).toEqual(expected[name]);
  });

  it("ignores a group in the URL that is not the caller's", async () => {
    const board = await prayerBoard(cast.memberY, ids.ktw);
    expect(titles(board.items)).not.toContain("KTW prayer");
  });
});

describe("finance (§9.9–9.10)", () => {
  it.each(OFFICES)("keeps %s's own giving to their own rows", async (name) => {
    const giving = await myGiving(cast[name]);
    const people = new Set(giving.history.map((row) => row.member.id));
    expect([...people].every((id) => id === cast[name].id)).toBe(true);
  });

  it.each(OFFICES)("opens church-wide finance to %s only as a finance officer", async (name) => {
    const officer = only(["apostle", "elder"])(name);
    const today = new Date().toISOString().slice(0, 10);
    const church = await churchFinance(cast[name], { from: "2000-01-01", to: today });
    expect(church !== null).toBe(officer);
    expect((await reviewQueue(cast[name])) !== null).toBe(officer);
    expect((await memberGiving(cast[name], cast.memberK.id)) !== null).toBe(officer);
    expect((await allPledges(cast[name])) !== null).toBe(officer);
    expect((await memberPledges(cast[name], cast.memberK.id)) !== null).toBe(officer);
  });

  it("gives a leader chema compliance for their own groups only, without amounts", async () => {
    const year = new Date().getFullYear();
    const asLeader = await chemaCompliance(cast.leader, { year, month: 1, groupId: ids.youth });
    expect(asLeader!.rows.map((row) => row.member.name).sort()).toEqual(
      ["Leader Test", "MemberK Test"].sort(),
    );
    expect(valuesOf(asLeader!.rows)).not.toMatch(/2000|4000/);
    expect(await chemaCompliance(cast.memberK, { year, month: 1 })).toBeNull();
    expect(await chemaCompliance(cast.matron, { year, month: 1 })).toBeNull();
  });

  it("shows the contributor table to finance officers and own gifts to everyone else", async () => {
    expect((await getProject(cast.elder, ids.project))!.contributions).toHaveLength(1);
    expect((await getProject(cast.memberY, ids.project))!.contributions).toHaveLength(0);
    expect((await getProject(cast.memberK, ids.project))!.contributions).toHaveLength(1);
    expect((await myPledges(cast.memberY)).length).toBe(0);
    expect((await myPledges(cast.memberK)).length).toBe(1);
  });
});

describe("sermons, notes and devotions (§9.11–9.14)", () => {
  it.each(OFFICES)("hides draft sermons from %s unless an Apostle", async (name) => {
    const { rows } = await listSermons(cast[name]);
    expect(titles(rows).includes("DRAFT sermon")).toBe(name === "apostle");
    expect((await getSermon(cast[name], ids.draftSermon)) !== null).toBe(name === "apostle");
  });

  it.each(OFFICES)("never returns memberK's note to %s unless it is theirs", async (name) => {
    const note = await getOwnNote(cast[name], ids.sermon);
    const all = await listOwnNotes(cast[name]);
    const mine = name === "memberK";
    expect(note !== null).toBe(mine);
    expect(titles(all).includes("PRIVATE note")).toBe(mine);
  });

  it.each(OFFICES)("hides scheduled and draft devotions from %s unless an Apostle", async (name) => {
    const feed = titles((await listDevotions(cast[name])).rows);
    expect(feed).toContain("TODAY devotion");
    expect(feed).not.toContain("TOMORROW devotion");
    expect((await getDevotion(cast[name], ids.tomorrow)) !== null).toBe(name === "apostle");
    expect((await getDevotion(cast[name], ids.draftDevotion)) !== null).toBe(name === "apostle");
  });
});

describe("birthdays, baptism and notifications (§9.13, §9.15–9.16)", () => {
  it.each(OFFICES)("shows %s an age only for themselves, or everyone's as an Apostle", async (name) => {
    const calendar = await birthdayCalendar(cast[name]);
    const everyone = calendar.byMonth.flatMap((month) => month.people);
    for (const entry of everyone) {
      const allowed = name === "apostle" || entry.id === cast[name].id;
      expect(entry.age !== null).toBe(allowed);
      expect(valuesOf(entry)).not.toMatch(/1990|1995/);
    }
  });

  it.each(OFFICES)("opens baptism administration to %s only as Matron or Apostle", async (name) => {
    const allowed = only(["apostle", "matron"])(name);
    expect((await listRecords(cast[name])) !== null).toBe(allowed);
    expect((await listCandidates(cast[name])) !== null).toBe(allowed);
    expect((await listClasses(cast[name])) !== null).toBe(allowed);
  });

  it.each(OFFICES)("keeps %s's bell to their own notifications", async (name) => {
    const { items } = await bellPreview(cast[name]);
    const text = titles(items);
    expect(text.includes("KTW notification")).toBe(name === "memberK");
    expect(text.includes("YOUTH notification")).toBe(name === "memberY");
  });
});
