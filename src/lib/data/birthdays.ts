import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { ageOn, fromDateOnly, harareToday, nextBirthday, weekOf } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/**
 * Birthdays, computed from `User.dateOfBirth` — there is no birthday table
 * (docs/SCOPE.md §9.15).
 *
 * Everyone signed in sees the active members' names, day and month and
 * groups. The year and the age are never in the DTO for anyone else: only the
 * person themselves and holders of `members.viewAll` (the Apostles) get them.
 * Nothing here is public — Q3 keeps birthdays inside the portal.
 */

export type BirthdayEntry = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  /** "MM-DD" — the day and month, without the year. */
  monthDay: string;
  /** The next time it comes round, `YYYY-MM-DD`; today counts. */
  next: string;
  inDays: number;
  groups: string[];
  /** Only for the person themselves and the Apostles. */
  age: number | null;
};

async function entries(viewer: SessionUser, where: Prisma.UserWhereInput = {}) {
  const today = harareToday();
  const rows = await prisma.user.findMany({
    where: { AND: [{ isActive: true, dateOfBirth: { not: null } }, where] },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      dateOfBirth: true,
      groupMemberships: { select: { group: { select: { name: true } } } },
    },
  });
  const seesAges = can(viewer, "members.viewAll");

  return rows
    .map((row): BirthdayEntry => {
      const dob = fromDateOnly(row.dateOfBirth!);
      const next = nextBirthday(dob, today);
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        avatarUrl: row.avatarUrl,
        monthDay: dob.slice(5),
        next: next.date,
        inDays: next.inDays,
        groups: row.groupMemberships.map(({ group }) => group.name),
        age: seesAges || row.id === viewer.id ? ageOn(dob, next.date) : null,
      };
    })
    .sort((a, b) => a.inDays - b.inDays || a.lastName.localeCompare(b.lastName));
}

/**
 * The birthday calendar: today, this week (Monday to Sunday), this month, and
 * everyone by month — searchable by name and filterable by group.
 */
export async function birthdayCalendar(
  viewer: SessionUser,
  filters: { q?: string; groupId?: string } = {},
) {
  const today = harareToday();
  const q = filters.q?.trim();
  const list = await entries(viewer, {
    AND: [
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      filters.groupId ? { groupMemberships: { some: { groupId: filters.groupId } } } : {},
    ],
  });

  const week = weekOf(today);
  const month = today.slice(0, 7);
  const byMonth = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    people: list
      .filter((entry) => Number(entry.monthDay.slice(0, 2)) === index + 1)
      .sort((a, b) => a.monthDay.localeCompare(b.monthDay)),
  }));

  return {
    today,
    todays: list.filter((entry) => entry.inDays === 0),
    week: list.filter((entry) => entry.next >= week.start && entry.next <= week.end),
    month: list.filter((entry) => entry.next.startsWith(month)),
    byMonth,
  };
}

/** Birthdays this week, for the dashboard card. */
export async function birthdaysThisWeek(viewer: SessionUser) {
  const week = weekOf(harareToday());
  return (await entries(viewer)).filter(
    (entry) => entry.next >= week.start && entry.next <= week.end,
  );
}

/** True when it is the signed-in person's birthday today in Harare, for the banner. */
export async function isMyBirthday(user: SessionUser) {
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { dateOfBirth: true },
  });
  if (!row?.dateOfBirth) return false;
  return nextBirthday(fromDateOnly(row.dateOfBirth), harareToday()).inDays === 0;
}

/** Today's celebrants: ids and names, for the morning job and the announcement. */
export async function todaysCelebrants() {
  const today = harareToday();
  const rows = await prisma.user.findMany({
    where: { isActive: true, dateOfBirth: { not: null } },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
  });
  return rows
    .filter((row) => nextBirthday(fromDateOnly(row.dateOfBirth!), today).inDays === 0)
    .map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}` }));
}
