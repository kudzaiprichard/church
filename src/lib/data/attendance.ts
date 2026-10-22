import "server-only";

import type { AttendanceStatus } from "@/generated/prisma/enums";
import { attendanceRate, markableFilter, rateSince } from "@/lib/attendance/rules";
import { groupContentScope, ledGroupIds, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { attendanceOpen, harareParts } from "@/lib/events/rules";
import { prisma } from "@/lib/prisma";

/**
 * Reads of attendance (docs/SCOPE.md §9.7).
 *
 *   own record        everyone, always
 *   another person's  Apostles, and the leader of a group that person is in
 *   a sheet           whoever `markableFilter` lets mark at that event
 *
 * Rates are computed here from the records — never stored — over the last
 * twelve months, and are `null` (shown as "—") for someone with none.
 */

/** Present and absent counts per person since `since`, as rates. */
export async function ratesFor(userIds: readonly string[], since: Date = rateSince()) {
  const rates = new Map<string, number | null>(userIds.map((id) => [id, null]));
  if (userIds.length === 0) return rates;

  const rows = await prisma.attendanceRecord.groupBy({
    by: ["userId", "status"],
    where: { userId: { in: [...userIds] }, event: { startsAt: { gte: since } } },
    _count: { _all: true },
  });

  const tally = new Map<string, { present: number; absent: number }>();
  for (const row of rows) {
    const entry = tally.get(row.userId) ?? { present: 0, absent: 0 };
    entry[row.status === "PRESENT" ? "present" : "absent"] += row._count._all;
    tally.set(row.userId, entry);
  }
  for (const [userId, { present, absent }] of tally) {
    rates.set(userId, attendanceRate(present, absent));
  }
  return rates;
}

export type SheetPerson = {
  id: string;
  name: string;
  groups: string;
  status: AttendanceStatus | null;
  markedBy: string | null;
  markedAt: string | null;
};

export type Sheet = {
  event: { id: string; title: string; date: string; time: string; group: string | null };
  open: boolean;
  people: SheetPerson[];
};

/** The attendance sheet for one event, or `null` when the caller marks nobody there. */
export async function attendanceSheet(user: SessionUser, eventId: string): Promise<Sheet | null> {
  const event = await prisma.event.findFirst({
    where: { AND: [await groupContentScope(user), { id: eventId }] },
    select: {
      id: true,
      title: true,
      startsAt: true,
      groupId: true,
      group: { select: { name: true } },
    },
  });
  if (!event) return null;

  const filter = markableFilter(event, user, await ledGroupIds(user));
  if (!filter) return null;

  const people = await prisma.user.findMany({
    where: filter,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      groupMemberships: { select: { group: { select: { name: true } } } },
      attendance: {
        where: { eventId },
        select: {
          status: true,
          markedAt: true,
          markedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const start = harareParts(event.startsAt);
  return {
    event: {
      id: event.id,
      title: event.title,
      date: start.date,
      time: start.time,
      group: event.group?.name ?? null,
    },
    open: attendanceOpen(event.startsAt),
    people: people.map((person) => {
      const record = person.attendance[0];
      return {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`,
        groups: person.groupMemberships.map(({ group }) => group.name).join(", "),
        status: record?.status ?? null,
        markedBy: record ? `${record.markedBy.firstName} ${record.markedBy.lastName}` : null,
        markedAt: record?.markedAt.toISOString() ?? null,
      };
    }),
  };
}

export type HistoryRow = {
  eventId: string;
  title: string;
  date: string;
  group: string | null;
  status: AttendanceStatus;
};

async function historyOf(userId: string, since: Date) {
  const rows = await prisma.attendanceRecord.findMany({
    where: { userId, event: { startsAt: { gte: since } } },
    orderBy: { event: { startsAt: "desc" } },
    select: {
      status: true,
      event: {
        select: { id: true, title: true, startsAt: true, group: { select: { name: true } } },
      },
    },
  });

  const present = rows.filter((row) => row.status === "PRESENT").length;
  return {
    rows: rows.map(
      (row): HistoryRow => ({
        eventId: row.event.id,
        title: row.event.title,
        date: harareParts(row.event.startsAt).date,
        group: row.event.group?.name ?? null,
        status: row.status,
      }),
    ),
    rate: attendanceRate(present, rows.length - present),
  };
}

/** The signed-in person's own history and rate, last twelve months. */
export async function ownAttendance(user: SessionUser) {
  return historyOf(user.id, rateSince());
}

/**
 * Another person's history, for their member page — or `null` when the viewer
 * may not see it: only the person, Apostles, and leaders of a group they are in.
 */
export async function memberAttendance(viewer: SessionUser, memberId: string) {
  if (viewer.id !== memberId && !can(viewer, "attendance.viewAll")) {
    const led = await ledGroupIds(viewer);
    if (led.length === 0) return null;
    const shared = await prisma.groupMembership.count({
      where: { userId: memberId, groupId: { in: led } },
    });
    if (shared === 0) return null;
  }
  return historyOf(memberId, rateSince());
}

export type GroupMatrix = {
  group: { id: string; name: string };
  events: { id: string; title: string; date: string }[];
  members: {
    id: string;
    name: string;
    rate: number | null;
    /** By event id. */
    marks: Record<string, AttendanceStatus>;
  }[];
};

/**
 * A leader's view of one group: its members against the recent events they
 * could have attended — the group's own and the all-church ones — with each
 * member's twelve-month rate. `null` unless the caller leads it or is an Apostle.
 */
export async function groupMatrix(
  user: SessionUser,
  groupId: string,
  now: Date = new Date(),
): Promise<GroupMatrix | null> {
  if (user.role !== "APOSTLE" && !(await ledGroupIds(user)).includes(groupId)) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });
  if (!group) return null;

  const [events, members] = await Promise.all([
    prisma.event.findMany({
      where: {
        OR: [{ groupId }, { groupId: null }],
        startsAt: { gte: rateSince(now), lte: now },
      },
      orderBy: { startsAt: "desc" },
      take: 8,
      select: { id: true, title: true, startsAt: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, groupMemberships: { some: { groupId } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const [records, rates] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        eventId: { in: events.map((event) => event.id) },
        userId: { in: members.map((member) => member.id) },
      },
      select: { userId: true, eventId: true, status: true },
    }),
    ratesFor(members.map((member) => member.id)),
  ]);

  return {
    group,
    events: events
      .reverse()
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: harareParts(event.startsAt).date,
      })),
    members: members.map((member) => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      rate: rates.get(member.id) ?? null,
      marks: Object.fromEntries(
        records
          .filter((record) => record.userId === member.id)
          .map((record) => [record.eventId, record.status]),
      ),
    })),
  };
}

export type ChurchEventRow = {
  id: string;
  title: string;
  date: string;
  group: string | null;
  present: number;
  absent: number;
};

/**
 * The Apostles' church-wide view: recent events with present and absent
 * counts — optionally counting only one group's members. `null` for anyone
 * without `attendance.viewAll`.
 */
export async function churchAttendance(
  user: SessionUser,
  filters: { groupId?: string } = {},
  now: Date = new Date(),
): Promise<ChurchEventRow[] | null> {
  if (!can(user, "attendance.viewAll")) return null;

  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: rateSince(now), lte: now },
      ...(filters.groupId ? { OR: [{ groupId: filters.groupId }, { groupId: null }] } : {}),
    },
    orderBy: { startsAt: "desc" },
    take: 50,
    select: { id: true, title: true, startsAt: true, group: { select: { name: true } } },
  });

  const counts = await prisma.attendanceRecord.groupBy({
    by: ["eventId", "status"],
    where: {
      eventId: { in: events.map((event) => event.id) },
      ...(filters.groupId
        ? { user: { groupMemberships: { some: { groupId: filters.groupId } } } }
        : {}),
    },
    _count: { _all: true },
  });
  const count = (eventId: string, status: AttendanceStatus) =>
    counts.find((row) => row.eventId === eventId && row.status === status)?._count._all ?? 0;

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    date: harareParts(event.startsAt).date,
    group: event.group?.name ?? null,
    present: count(event.id, "PRESENT"),
    absent: count(event.id, "ABSENT"),
  }));
}

/**
 * For a leader's dashboard card: how the group's members did at the most
 * recent event they could have attended that has any marks for them.
 */
export async function lastEventAttendance(groupId: string, now: Date = new Date()) {
  const event = await prisma.event.findFirst({
    where: {
      OR: [{ groupId }, { groupId: null }],
      startsAt: { lte: now },
      attendance: { some: { user: { groupMemberships: { some: { groupId } } } } },
    },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true },
  });
  if (!event) return null;

  const present = await prisma.attendanceRecord.count({
    where: {
      eventId: event.id,
      status: "PRESENT",
      user: { groupMemberships: { some: { groupId } } },
    },
  });
  const members = await prisma.groupMembership.count({
    where: { groupId, user: { isActive: true } },
  });
  return { ...event, present, members };
}
