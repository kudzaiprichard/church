import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ContributionStatus, ContributionType } from "@/generated/prisma/enums";
import { ledGroupIds, selfScope, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { fromDateOnly, harareToday, toDateOnly } from "@/lib/dates";
import { chemaGrid, chemaStatus, compliance, complianceRow } from "@/lib/finance/chema";
import { toCents, type Cents } from "@/lib/finance/money";
import { byGroup, byMonth, summarise } from "@/lib/finance/totals";
import { prisma } from "@/lib/prisma";

/**
 * Reads of giving (docs/SCOPE.md §9.9), with the access rule written once:
 *
 *   own giving         everyone — `selfScope`, Apostles included: "My giving"
 *                      is the person's own, not the church's
 *   church finance     `finance.viewAll` (Apostles and the Elder, SCOPE §11 Q1)
 *   review queue       `finance.confirm`
 *   chema compliance   `finance.viewAll`, or a leader for the groups they lead —
 *                      status and date only, never an amount of tithe, welfare
 *                      or partnership
 *
 * Every amount leaves here as whole cents. Totals come from `summarise` and
 * friends, which count CONFIRMED only and report PENDING apart.
 */

export type ContributionRow = {
  id: string;
  member: { id: string; name: string; email: string };
  type: ContributionType;
  cents: Cents;
  paidAt: string;
  status: ContributionStatus;
  note: string | null;
  chema: { year: number; month: number } | null;
  project: { id: string; name: string } | null;
  pledge: { id: string; description: string } | null;
  recordedBy: string;
  /** Recorded by someone other than the member — an officer, for cash handed in. */
  recordedByOfficer: boolean;
  reviewedBy: string | null;
  rejectReason: string | null;
  /** This row is a reversing entry. */
  isReversal: boolean;
  /** An officer has reversed this row. */
  reversed: boolean;
  groups: string[];
};

const rowSelect = {
  id: true,
  userId: true,
  type: true,
  amount: true,
  paidAt: true,
  status: true,
  note: true,
  chemaYear: true,
  chemaMonth: true,
  rejectReason: true,
  reversalOfId: true,
  recordedById: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      groupMemberships: { select: { group: { select: { name: true } } } },
    },
  },
  project: { select: { id: true, name: true } },
  pledge: { select: { id: true, description: true } },
  recordedBy: { select: { firstName: true, lastName: true } },
  reviewedBy: { select: { firstName: true, lastName: true } },
  reversedBy: { select: { id: true } },
} satisfies Prisma.ContributionSelect;

type Row = Prisma.ContributionGetPayload<{ select: typeof rowSelect }>;

const name = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`;

function toRow(row: Row): ContributionRow {
  return {
    id: row.id,
    member: { id: row.userId, name: name(row.user), email: row.user.email },
    type: row.type,
    cents: toCents(row.amount),
    paidAt: fromDateOnly(row.paidAt),
    status: row.status,
    note: row.note,
    chema: row.chemaYear && row.chemaMonth ? { year: row.chemaYear, month: row.chemaMonth } : null,
    project: row.project,
    pledge: row.pledge,
    recordedBy: name(row.recordedBy),
    recordedByOfficer: row.recordedById !== row.userId,
    reviewedBy: row.reviewedBy ? name(row.reviewedBy) : null,
    rejectReason: row.rejectReason,
    isReversal: row.reversalOfId !== null,
    reversed: row.reversedBy !== null,
    groups: row.user.groupMemberships.map(({ group }) => group.name),
  };
}

function currentMonth(now: Date = new Date()) {
  const today = harareToday(now);
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** Chema rows for one person and year, by month, as the grid needs them. */
function chemaByMonth(rows: readonly ContributionRow[], year: number) {
  const byMonthRows = new Map<number, { status: ContributionStatus; reversed: boolean }[]>();
  for (const row of rows) {
    if (row.type !== "CHEMA" || row.isReversal || row.chema?.year !== year) continue;
    byMonthRows.set(row.chema.month, [
      ...(byMonthRows.get(row.chema.month) ?? []),
      { status: row.status, reversed: row.reversed },
    ]);
  }
  return byMonthRows;
}

async function givingOf(userId: string, filters: { year: number; type?: ContributionType }) {
  const rows = (
    await prisma.contribution.findMany({
      where: { userId },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: rowSelect,
    })
  ).map(toRow);

  const now = currentMonth();
  const inYear = rows.filter((row) => row.paidAt.startsWith(String(filters.year)));
  return {
    year: filters.year,
    totals: summarise(inYear),
    grid: chemaGrid(filters.year, chemaByMonth(rows, filters.year), now),
    history: inYear.filter((row) => !filters.type || row.type === filters.type),
    years: [...new Set([now.year, ...rows.map((row) => Number(row.paidAt.slice(0, 4)))])].sort(
      (a, b) => b - a,
    ),
  };
}

/** The signed-in person's own giving: a year's totals, chema grid and history. */
export async function myGiving(
  user: SessionUser,
  filters: { year?: number; type?: ContributionType } = {},
) {
  // The caller's own rows, Apostles included — the self scope, by id.
  return givingOf(user.id, { ...filters, year: filters.year ?? currentMonth().year });
}

/** Another member's giving, for their member page. `null` without `finance.viewAll`. */
export async function memberGiving(viewer: SessionUser, memberId: string, year?: number) {
  if (!can(viewer, "finance.viewAll")) return null;
  return givingOf(memberId, { year: year ?? currentMonth().year });
}

/** What is waiting for review, oldest first. `null` without `finance.confirm`. */
export async function reviewQueue(user: SessionUser): Promise<ContributionRow[] | null> {
  if (!can(user, "finance.confirm")) return null;
  const rows = await prisma.contribution.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: rowSelect,
  });
  return rows.map(toRow);
}

export async function pendingCount(user: SessionUser) {
  if (!can(user, "finance.confirm")) return 0;
  return prisma.contribution.count({ where: { status: "PENDING" } });
}

export type ChurchFilters = { from: string; to: string; groupId?: string };

/** January 1st to today in Harare, the church page's default period. */
export function defaultPeriod(now: Date = new Date()): { from: string; to: string } {
  const today = harareToday(now);
  return { from: `${today.slice(0, 4)}-01-01`, to: today };
}

/**
 * Every confirmed and pending contribution in a period, optionally for one
 * group's members — and the KPIs and both charts computed from that same
 * list, so their totals agree with the table by construction.
 * `null` without `finance.viewAll`.
 */
export async function churchFinance(user: SessionUser, filters: ChurchFilters) {
  if (!can(user, "finance.viewAll")) return null;

  const rows = (
    await prisma.contribution.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        paidAt: { gte: toDateOnly(filters.from), lte: toDateOnly(filters.to) },
        ...(filters.groupId
          ? { user: { groupMemberships: { some: { groupId: filters.groupId } } } }
          : {}),
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: rowSelect,
    })
  ).map(toRow);

  return {
    rows,
    totals: summarise(rows),
    byGroup: byGroup(rows),
    byMonth: byMonth(rows),
  };
}

/**
 * Chema compliance for one month (SCOPE §9.9).
 *
 * Holders of `finance.viewAll` see everyone (or one group); a leader sees only
 * the members of the groups they lead, whatever group the URL asks for. Each
 * row carries the month's expected chema, a status and a date — nothing about
 * any other kind of giving. `null` for anyone else.
 */
export async function chemaCompliance(
  user: SessionUser,
  filters: { year: number; month: number; groupId?: string },
) {
  const officer = can(user, "finance.viewAll");
  const led = officer ? [] : await ledGroupIds(user);
  if (!officer && led.length === 0) return null;

  const groupIds = officer
    ? filters.groupId
      ? [filters.groupId]
      : null
    : filters.groupId && led.includes(filters.groupId)
      ? [filters.groupId]
      : led;

  const members = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(groupIds ? { groupMemberships: { some: { groupId: { in: groupIds } } } } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      groupMemberships: { select: { group: { select: { name: true } } } },
      contributions: {
        where: {
          type: "CHEMA",
          chemaYear: filters.year,
          chemaMonth: filters.month,
          reversalOfId: null,
        },
        select: { status: true, paidAt: true, reversedBy: { select: { id: true } } },
      },
    },
  });

  const rows = members.map((member) =>
    complianceRow(
      {
        id: member.id,
        name: name(member),
        groups: member.groupMemberships.map(({ group }) => group.name),
      },
      filters.month,
      member.contributions.map((row) => ({
        status: row.status,
        reversed: row.reversedBy !== null,
        paidAt: fromDateOnly(row.paidAt),
      })),
    ),
  );

  return { rows, ...compliance(rows.map((row) => row.status)), officer, ledGroupIds: led };
}

/** A person's chema standing this month, for the dashboard. */
export async function myChemaThisMonth(user: SessionUser) {
  const { year, month } = currentMonth();
  const rows = await prisma.contribution.findMany({
    where: {
      ...selfScope(user),
      type: "CHEMA",
      chemaYear: year,
      chemaMonth: month,
      reversalOfId: null,
    },
    select: { status: true, reversedBy: { select: { id: true } } },
  });
  return {
    month,
    status: chemaStatus(
      rows.map((row) => ({ status: row.status, reversed: row.reversedBy !== null })),
    ),
  };
}

/** The church's confirmed giving this Harare month by type, for officers' dashboards. */
export async function churchThisMonth(user: SessionUser) {
  if (!can(user, "finance.viewAll")) return null;
  const today = harareToday();
  const result = await churchFinance(user, { from: `${today.slice(0, 7)}-01`, to: today });
  return result?.totals ?? null;
}

export type PaymentOptions = {
  projects: { id: string; name: string }[];
  pledges: { id: string; description: string; projectId: string | null }[];
};

/** Active projects, and the person's own active pledges, for the payment form. */
export async function paymentOptions(user: SessionUser): Promise<PaymentOptions> {
  const [projects, pledges] = await Promise.all([
    prisma.partnershipProject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.pledge.findMany({
      where: { ...selfScope(user), status: "ACTIVE" },
      orderBy: { dueDate: "asc" },
      select: { id: true, description: true, projectId: true },
    }),
  ]);
  return { projects, pledges };
}

/** Active members, for an officer recording a payment on someone's behalf. */
export async function memberOptions(user: SessionUser) {
  if (!can(user, "finance.confirm")) return [];
  const rows = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  return rows.map((row) => ({ id: row.id, name: name(row), detail: row.email }));
}
