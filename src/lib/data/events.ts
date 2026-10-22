import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { groupContentScope, ledGroupIds, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { markableFilter } from "@/lib/attendance/rules";
import { attendanceOpen, harareParts, monthBounds } from "@/lib/events/rules";
import { prisma } from "@/lib/prisma";

/**
 * Reads of the church calendar, with the access rule written once
 * (docs/SCOPE.md §9.6): everybody sees the all-church events and those of the
 * groups they belong to; Apostles see all. Every query here starts from
 * `groupContentScope`, so a Youth Alive member's calendar, list, counts and
 * direct links never include a Kingdom Total Women event.
 */

export type EventRow = {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  /** Harare calendar day and clock, for grouping and display. */
  date: string;
  time: string;
  endTime: string | null;
  group: { id: string; name: string } | null;
};

const rowSelect = {
  id: true,
  title: true,
  location: true,
  startsAt: true,
  endsAt: true,
  group: { select: { id: true, name: true } },
} satisfies Prisma.EventSelect;

function toRow(row: Prisma.EventGetPayload<{ select: typeof rowSelect }>): EventRow {
  const start = harareParts(row.startsAt);
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    date: start.date,
    time: start.time,
    endTime: row.endsAt ? harareParts(row.endsAt).time : null,
    group: row.group,
  };
}

/** Events the caller may see in one Harare month, in order. */
export async function eventsInMonth(user: SessionUser, month: string): Promise<EventRow[]> {
  const { start, end } = monthBounds(month);
  const rows = await prisma.event.findMany({
    where: { AND: [await groupContentScope(user), { startsAt: { gte: start, lt: end } }] },
    orderBy: { startsAt: "asc" },
    select: rowSelect,
  });
  return rows.map(toRow);
}

/** The list view: what is still to come, soonest first; and the recent past, newest first. */
export async function eventList(user: SessionUser, now: Date = new Date()) {
  const scope = await groupContentScope(user);
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [scope, { startsAt: { gte: now } }] },
      orderBy: { startsAt: "asc" },
      take: 100,
      select: rowSelect,
    }),
    prisma.event.findMany({
      where: { AND: [scope, { startsAt: { lt: now } }] },
      orderBy: { startsAt: "desc" },
      take: 30,
      select: rowSelect,
    }),
  ]);
  return { upcoming: upcoming.map(toRow), past: past.map(toRow) };
}

/** The next few the caller may see, for the dashboard. */
export async function upcomingEvents(user: SessionUser, take = 3, now: Date = new Date()) {
  const rows = await prisma.event.findMany({
    where: { AND: [await groupContentScope(user), { startsAt: { gte: now } }] },
    orderBy: { startsAt: "asc" },
    take,
    select: rowSelect,
  });
  return rows.map(toRow);
}

/**
 * One group's own events, for its Events tab. The caller has already been
 * allowed to see the group; all-church events are on the calendar instead.
 */
export async function groupEvents(groupId: string, now: Date = new Date()) {
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { groupId, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 20,
      select: rowSelect,
    }),
    prisma.event.findMany({
      where: { groupId, startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 10,
      select: rowSelect,
    }),
  ]);
  return { upcoming: upcoming.map(toRow), past: past.map(toRow) };
}

export type EventDetail = EventRow & {
  description: string | null;
  createdBy: string;
  viewer: {
    /** Create, edit, delete, duplicate — `events.manage`. */
    manages: boolean;
    /** May open the attendance sheet for somebody at this event. */
    marks: boolean;
    /** The sheet is open: from 24 hours before the start onwards. */
    attendanceOpen: boolean;
  };
  attendance: { present: number; absent: number } | null;
};

/** One event, or `null` when it is not the caller's to see. */
export async function getEvent(user: SessionUser, id: string): Promise<EventDetail | null> {
  const row = await prisma.event.findFirst({
    where: { AND: [await groupContentScope(user), { id }] },
    select: {
      ...rowSelect,
      description: true,
      groupId: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!row) return null;

  const marks = markableFilter(row, user, await ledGroupIds(user)) !== null;

  // Counts for the people who take attendance; members see their own record
  // on /attendance instead.
  const counts = marks
    ? await prisma.attendanceRecord.groupBy({
        by: ["status"],
        where: { eventId: id },
        _count: { _all: true },
      })
    : null;
  const count = (status: "PRESENT" | "ABSENT") =>
    counts?.find((entry) => entry.status === status)?._count._all ?? 0;

  return {
    ...toRow(row),
    description: row.description,
    createdBy: `${row.createdBy.firstName} ${row.createdBy.lastName}`,
    viewer: {
      manages: can(user, "events.manage"),
      marks,
      attendanceOpen: attendanceOpen(row.startsAt),
    },
    attendance: counts ? { present: count("PRESENT"), absent: count("ABSENT") } : null,
  };
}

export type EventForEdit = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  target: string;
  attendanceCount: number;
};

/** Everything the edit form needs. Only for holders of `events.manage`. */
export async function getEventForEdit(
  user: SessionUser,
  id: string,
): Promise<EventForEdit | null> {
  if (!can(user, "events.manage")) return null;

  const row = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      groupId: true,
      _count: { select: { attendance: true } },
    },
  });
  if (!row) return null;

  const start = harareParts(row.startsAt);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    date: start.date,
    startTime: start.time,
    endTime: row.endsAt ? harareParts(row.endsAt).time : null,
    target: row.groupId ?? "ALL",
    attendanceCount: row._count.attendance,
  };
}
