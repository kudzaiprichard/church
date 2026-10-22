import "server-only";

import type { Gender, Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { memberScope, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { fromDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/**
 * Reads of the church roll, with the access rule written once.
 *
 * Every function takes the signed-in person first and starts from
 * `memberScope(user)`, so a query here cannot return somebody the caller is
 * not entitled to list — a leader asking for a member outside their groups
 * gets `null`, exactly as if the id did not exist. What may be *seen about*
 * a person in scope is decided here too, by `visibilityFor`, so the pages only
 * ever receive fields they are allowed to draw.
 *
 * Everything returned is a plain DTO: dates as strings, no Prisma rows, and
 * never a password hash — activation is asked of the database as a yes/no.
 */

export const PAGE_SIZE = 50;

export type MemberFilters = {
  q?: string;
  groupId?: string;
  role?: Role;
  /** "active" (default), "inactive" or "all". */
  status?: "active" | "inactive" | "all";
  page?: number;
};

export type GroupRef = { id: string; name: string };

export type MemberListRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  activated: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  groups: GroupRef[];
};

/** Fields every list and detail read selects. Never `passwordHash`. */
const listSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  joinedAt: true,
  lastLoginAt: true,
  groupMemberships: {
    select: { group: { select: { id: true, name: true } } },
    orderBy: { group: { name: "asc" } },
  },
} satisfies Prisma.UserSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof listSelect }>;

/**
 * Which of these ids have never set a password.
 *
 * Asked as its own question so the hashes themselves never enter application
 * memory, where a later edit could log or serialise them.
 */
async function unactivated(ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const rows = await prisma.user.findMany({
    where: { id: { in: ids }, passwordHash: null },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

function toListRow(row: ListRow, pending: Set<string>): MemberListRow {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    role: row.role,
    isActive: row.isActive,
    activated: !pending.has(row.id),
    joinedAt: row.joinedAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    groups: row.groupMemberships.map(({ group }) => group),
  };
}

/** The directory, filtered, searched and paginated — inside the caller's scope. */
export async function listMembers(user: SessionUser, filters: MemberFilters = {}) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const q = filters.q?.trim();
  const status = filters.status ?? "active";

  const where: Prisma.UserWhereInput = {
    AND: [
      await memberScope(user),
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {},
      filters.groupId ? { groupMemberships: { some: { groupId: filters.groupId } } } : {},
      filters.role ? { role: filters.role } : {},
      status === "all" ? {} : { isActive: status === "active" },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: listSelect,
    }),
    prisma.user.count({ where }),
  ]);

  const pending = await unactivated(rows.map((row) => row.id));

  return {
    rows: rows.map((row) => toListRow(row, pending)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** How many people the caller can see who have not accepted their invitation. */
export async function countPendingInvitations(user: SessionUser) {
  return prisma.user.count({
    where: { AND: [await memberScope(user), { passwordHash: null, isActive: true }] },
  });
}

/** Every group, for pickers and filters. Group names are public (they are on the website). */
export async function groupOptions(): Promise<GroupRef[]> {
  return prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export type BaptismDto = {
  baptismDate: string;
  location: string;
  conductedBy: string;
  classCompletedOn: string | null;
  notes: string | null;
  /** "KMMI-BAP-2026-0007" once issued; null while pending. */
  certificateNumber: string | null;
  certificateIssuedAt: string | null;
};

/**
 * What the viewer may see about a person who is already in their scope.
 *
 *   contact   name, photo, email, phone, groups — everyone in scope (leaders
 *             need it to shepherd; the Matron needs it to keep records)
 *   personal  address, date of birth, gender — the person themselves and the
 *             Apostles, who hold the full roll
 *   baptism   the person themselves, and the offices that keep the records
 */
export function visibilityFor(viewer: SessionUser, memberId: string) {
  const self = viewer.id === memberId;
  return {
    personal: self || can(viewer, "members.viewAll"),
    baptism: self || can(viewer, "baptism.manage"),
  };
}

export type MemberDetail = MemberListRow & {
  personal: { address: string | null; dateOfBirth: string | null; gender: Gender | null } | null;
  baptism: BaptismDto | null | "hidden";
};

function toBaptism(record: {
  baptismDate: Date;
  location: string;
  conductedBy: string;
  classCompletedOn: Date | null;
  notes: string | null;
  certificateNumber: string | null;
  certificateIssuedAt: Date | null;
}): BaptismDto {
  return {
    baptismDate: fromDateOnly(record.baptismDate),
    location: record.location,
    conductedBy: record.conductedBy,
    classCompletedOn: record.classCompletedOn ? fromDateOnly(record.classCompletedOn) : null,
    notes: record.notes,
    certificateNumber: record.certificateNumber,
    certificateIssuedAt: record.certificateIssuedAt?.toISOString() ?? null,
  };
}

/**
 * One member, or `null` when they are outside the caller's scope.
 *
 * The scope is part of the query — not a check after it — so "exists but not
 * yours" and "does not exist" are the same answer, and the page turns both
 * into a 404.
 */
export async function getMember(user: SessionUser, id: string): Promise<MemberDetail | null> {
  const row = await prisma.user.findFirst({
    where: { AND: [await memberScope(user), { id }] },
    select: {
      ...listSelect,
      address: true,
      dateOfBirth: true,
      gender: true,
      baptismalRecord: {
        select: {
          baptismDate: true,
          location: true,
          conductedBy: true,
          classCompletedOn: true,
          notes: true,
          certificateNumber: true,
          certificateIssuedAt: true,
        },
      },
    },
  });
  if (!row) return null;

  const pending = await unactivated([row.id]);
  const may = visibilityFor(user, row.id);

  return {
    ...toListRow(row, pending),
    personal: may.personal
      ? {
          address: row.address,
          dateOfBirth: row.dateOfBirth ? fromDateOnly(row.dateOfBirth) : null,
          gender: row.gender,
        }
      : null,
    baptism: !may.baptism ? "hidden" : row.baptismalRecord ? toBaptism(row.baptismalRecord) : null,
  };
}

export type OwnProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  joinedAt: string;
  groups: GroupRef[];
  baptism: BaptismDto | null;
};

/** The signed-in person's own record. Scoped by construction: the id is theirs. */
export async function getOwnProfile(user: SessionUser): Promise<OwnProfile> {
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      dateOfBirth: true,
      gender: true,
      joinedAt: true,
      groupMemberships: listSelect.groupMemberships,
      baptismalRecord: {
        select: {
          baptismDate: true,
          location: true,
          conductedBy: true,
          classCompletedOn: true,
          notes: true,
          certificateNumber: true,
          certificateIssuedAt: true,
        },
      },
    },
  });

  return {
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    dateOfBirth: row.dateOfBirth ? fromDateOnly(row.dateOfBirth) : null,
    gender: row.gender,
    joinedAt: row.joinedAt.toISOString(),
    groups: row.groupMemberships.map(({ group }) => group),
    baptism: row.baptismalRecord ? toBaptism(row.baptismalRecord) : null,
  };
}

export type MemberForEdit = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  groupIds: string[];
  baptism: BaptismDto | null;
};

/**
 * Everything the edit form needs. Only for holders of `members.edit` — the
 * page guards too, but a data function that returns the full record must not
 * depend on its caller remembering.
 */
export async function getMemberForEdit(
  user: SessionUser,
  id: string,
): Promise<MemberForEdit | null> {
  if (!can(user, "members.edit")) return null;

  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      dateOfBirth: true,
      gender: true,
      groupMemberships: { select: { groupId: true } },
      baptismalRecord: {
        select: {
          baptismDate: true,
          location: true,
          conductedBy: true,
          classCompletedOn: true,
          notes: true,
          certificateNumber: true,
          certificateIssuedAt: true,
        },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    dateOfBirth: row.dateOfBirth ? fromDateOnly(row.dateOfBirth) : null,
    gender: row.gender,
    groupIds: row.groupMemberships.map((membership) => membership.groupId),
    baptism: row.baptismalRecord ? toBaptism(row.baptismalRecord) : null,
  };
}
