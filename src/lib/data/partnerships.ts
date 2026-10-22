import "server-only";

import type { PledgeStatus, ProjectStatus } from "@/generated/prisma/enums";
import { selfScope, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { fromDateOnly, harareToday } from "@/lib/dates";
import { toCents, type Cents } from "@/lib/finance/money";
import { pledgeState, type PledgeState } from "@/lib/finance/pledges";
import { prisma } from "@/lib/prisma";

/**
 * Partnership projects and pledges (docs/SCOPE.md §9.10).
 *
 * Raised and paid are computed live from CONFIRMED contributions — there is no
 * `amountRaised` or `amountPaid` column to drift. Everyone sees each project's
 * overall progress and their own giving to it; the contributor table is for
 * holders of `finance.viewAll`.
 */

/** Confirmed totals per key, reversals included. */
async function confirmedSums(by: "projectId" | "pledgeId", ids: string[], userId?: string) {
  const sums = new Map<string, Cents>();
  if (ids.length === 0) return sums;
  const rows = await prisma.contribution.groupBy({
    by: [by],
    where: { [by]: { in: ids }, status: "CONFIRMED", ...(userId ? { userId } : {}) },
    _sum: { amount: true },
  });
  for (const row of rows) {
    const key = row[by];
    if (key) sums.set(key, row._sum.amount ? toCents(row._sum.amount) : 0);
  }
  return sums;
}

export type ProjectCard = {
  id: string;
  name: string;
  description: string | null;
  targetCents: Cents;
  raisedCents: Cents;
  /** The viewer's own confirmed giving to it. */
  mineCents: Cents;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  /** Days until the end date, or null when there is none or it has passed. */
  daysLeft: number | null;
};

const projectSelect = {
  id: true,
  name: true,
  description: true,
  targetAmount: true,
  startDate: true,
  endDate: true,
  status: true,
} as const;

function daysUntil(date: string | null, today: string) {
  if (!date || date < today) return null;
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
}

export async function listProjects(user: SessionUser): Promise<ProjectCard[]> {
  const rows = await prisma.partnershipProject.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: projectSelect,
  });
  const ids = rows.map((row) => row.id);
  const [raised, mine] = await Promise.all([
    confirmedSums("projectId", ids),
    confirmedSums("projectId", ids, user.id),
  ]);
  const today = harareToday();

  return rows.map((row) => {
    const endDate = row.endDate ? fromDateOnly(row.endDate) : null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetCents: toCents(row.targetAmount),
      raisedCents: raised.get(row.id) ?? 0,
      mineCents: mine.get(row.id) ?? 0,
      startDate: fromDateOnly(row.startDate),
      endDate,
      status: row.status,
      daysLeft: daysUntil(endDate, today),
    };
  });
}

export type ProjectContribution = {
  id: string;
  member: { id: string; name: string };
  groups: string[];
  cents: Cents;
  paidAt: string;
  note: string | null;
};

/**
 * One project, with the contributor table for `finance.viewAll` and only the
 * viewer's own contributions for anyone else.
 */
export async function getProject(user: SessionUser, id: string) {
  const row = await prisma.partnershipProject.findUnique({ where: { id }, select: projectSelect });
  if (!row) return null;

  const seesAll = can(user, "finance.viewAll");
  const [raised, contributions] = await Promise.all([
    confirmedSums("projectId", [id]),
    prisma.contribution.findMany({
      where: { projectId: id, status: "CONFIRMED", ...(seesAll ? {} : selfScope(user)) },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        note: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            groupMemberships: { select: { group: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);
  const endDate = row.endDate ? fromDateOnly(row.endDate) : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetCents: toCents(row.targetAmount),
    targetAmount: row.targetAmount.toString(),
    raisedCents: raised.get(id) ?? 0,
    startDate: fromDateOnly(row.startDate),
    endDate,
    status: row.status,
    daysLeft: daysUntil(endDate, harareToday()),
    seesAll,
    contributions: contributions.map(
      (entry): ProjectContribution => ({
        id: entry.id,
        member: { id: entry.user.id, name: `${entry.user.firstName} ${entry.user.lastName}` },
        groups: entry.user.groupMemberships.map(({ group }) => group.name),
        cents: toCents(entry.amount),
        paidAt: fromDateOnly(entry.paidAt),
        note: seesAll || entry.user.id === user.id ? entry.note : null,
      }),
    ),
  };
}

export type PledgeRow = {
  id: string;
  member: { id: string; name: string };
  description: string;
  project: { id: string; name: string } | null;
  totalCents: Cents;
  paidCents: Cents;
  dueDate: string;
  status: PledgeStatus;
  state: PledgeState;
  mine: boolean;
};

async function pledgesWhere(user: SessionUser, where: object): Promise<PledgeRow[]> {
  const rows = await prisma.pledge.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    select: {
      id: true,
      userId: true,
      description: true,
      totalAmount: true,
      dueDate: true,
      status: true,
      project: { select: { id: true, name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  const paid = await confirmedSums("pledgeId", rows.map((row) => row.id));
  const today = harareToday();

  return rows.map((row) => {
    const totalCents = toCents(row.totalAmount);
    const paidCents = paid.get(row.id) ?? 0;
    const dueDate = fromDateOnly(row.dueDate);
    return {
      id: row.id,
      member: { id: row.userId, name: `${row.user.firstName} ${row.user.lastName}` },
      description: row.description,
      project: row.project,
      totalCents,
      paidCents,
      dueDate,
      status: row.status,
      state: pledgeState({ status: row.status, totalCents, paidCents, dueDate }, today),
      mine: row.userId === user.id,
    };
  });
}

/** The signed-in person's own pledges. */
export function myPledges(user: SessionUser) {
  return pledgesWhere(user, selfScope(user));
}

/** A member's pledges, for their member page. `null` without `finance.viewAll`. */
export async function memberPledges(viewer: SessionUser, memberId: string) {
  if (!can(viewer, "finance.viewAll")) return null;
  return pledgesWhere(viewer, { userId: memberId });
}

/** Every pledge, filtered, for officers. `null` without `finance.viewAll`. */
export async function allPledges(
  user: SessionUser,
  filters: { status?: PledgeStatus; projectId?: string; groupId?: string } = {},
) {
  if (!can(user, "finance.viewAll")) return null;
  return pledgesWhere(user, {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.groupId
      ? { user: { groupMemberships: { some: { groupId: filters.groupId } } } }
      : {}),
  });
}
