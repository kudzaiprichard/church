import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { ledGroupIds, memberGroupIds, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Reads of the connect groups, with the access rule written once
 * (docs/SCOPE.md §9.4).
 *
 *   Apostle    every group, every member, with contact details
 *   leader     the groups they lead, with their members' contact details
 *   member     the groups they belong to: fellow members' names and faces and
 *              the leader — no phone numbers or addresses (SCOPE §11 Q5)
 *
 * A group the caller may not see comes back `null`, the same as one that does
 * not exist, so the page answers both with a 404. Leadership is read from the
 * database on every request, so appointing a leader changes what they see on
 * their next page load.
 */

export type GroupCard = {
  id: string;
  name: string;
  audience: string | null;
  description: string | null;
  leader: { id: string; name: string } | null;
  memberCount: number;
  /** The viewer's relation to it, for the badge on the card. */
  relation: "leader" | "member" | "none";
};

const activeMembers = { where: { user: { isActive: true } } } as const;

/** The groups the caller may see: all of them for an Apostle, otherwise their own. */
export async function listGroups(user: SessionUser): Promise<GroupCard[]> {
  const [led, joined] = await Promise.all([ledGroupIds(user), memberGroupIds(user)]);
  const where: Prisma.GroupWhereInput = can(user, "groups.manage")
    ? {}
    : { id: { in: [...new Set([...led, ...joined])] } };

  const rows = await prisma.group.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      audience: true,
      description: true,
      leader: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: activeMembers } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    audience: row.audience,
    description: row.description,
    leader: row.leader
      ? { id: row.leader.id, name: `${row.leader.firstName} ${row.leader.lastName}` }
      : null,
    memberCount: row._count.members,
    relation: led.includes(row.id) ? "leader" : joined.includes(row.id) ? "member" : "none",
  }));
}

export type GroupMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  isLeader: boolean;
  /** Only for the group's leader and the Apostles. */
  contact: { email: string; phone: string | null } | null;
};

export type GroupDetail = {
  id: string;
  slug: string;
  name: string;
  audience: string | null;
  description: string | null;
  leader: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  members: GroupMember[];
  viewer: {
    /** Leads this group, or is an Apostle — the group-scoped powers of SCOPE §4.2. */
    leads: boolean;
    /** May create, edit, delete and change membership (`groups.manage`). */
    manages: boolean;
  };
};

/** One group, or `null` when it is not the caller's to see. */
export async function getGroup(user: SessionUser, id: string): Promise<GroupDetail | null> {
  const [led, joined] = await Promise.all([ledGroupIds(user), memberGroupIds(user)]);
  const manages = can(user, "groups.manage");
  if (!manages && !led.includes(id) && !joined.includes(id)) return null;

  const leads = user.role === "APOSTLE" || led.includes(id);

  const row = await prisma.group.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      audience: true,
      description: true,
      leaderId: true,
      leader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      members: {
        // Deactivated accounts are kept on the list for whoever manages it, so
        // they can be removed; nobody else needs to see them.
        where: manages ? {} : { user: { isActive: true } },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              role: true,
              isActive: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    audience: row.audience,
    description: row.description,
    leader: row.leader,
    members: row.members.map(({ user: member }) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarUrl: member.avatarUrl,
      role: member.role,
      isActive: member.isActive,
      isLeader: member.id === row.leaderId,
      contact: leads ? { email: member.email, phone: member.phone } : null,
    })),
    viewer: { leads, manages },
  };
}

export type PersonOption = { id: string; name: string; detail: string };

/**
 * Active people, for the leader and add-members pickers. Only for holders of
 * `groups.manage` — the whole roll is not something a picker should hand to
 * anybody else.
 */
export async function peopleForGroup(
  user: SessionUser,
  groupId: string,
): Promise<{ all: PersonOption[]; notInGroup: PersonOption[] }> {
  if (!can(user, "groups.manage")) return { all: [], notInGroup: [] };

  const rows = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      groupMemberships: { where: { groupId }, select: { id: true } },
    },
  });

  const all = rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`,
    detail: row.email,
  }));
  return { all, notInGroup: all.filter((_, index) => rows[index].groupMemberships.length === 0) };
}

/** The groups this person leads, by name, for the dashboard and the composer. */
export async function ledGroups(user: SessionUser) {
  const ids = await ledGroupIds(user);
  if (ids.length === 0) return [];

  const rows = await prisma.group.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { members: activeMembers } } },
  });
  return rows.map((row) => ({ id: row.id, name: row.name, memberCount: row._count.members }));
}
