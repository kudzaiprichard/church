import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { can, type Permission } from "./permissions";
import {
  buildGroupContentScope,
  buildMemberScope,
  buildOwnerScope,
  buildSelfScope,
} from "./scopes";
import { resolveSession } from "./session";

/**
 * The Data Access Layer.
 *
 * Every authorization decision in this system is made here or in something
 * that calls this. Not in the proxy, which runs on prefetches and has a
 * history of being bypassable, and not in a page component, which can be
 * skipped by a Server Action reaching the same data by another route.
 *
 * The Key System Rule — "leadership sees what its office entitles it to; a
 * member sees only their own data plus content targeted at them, enforced at
 * every module level" — is a statement about *rows*, not about pages. So the
 * important exports here are not the `require…` guards; they are the scopes,
 * which turn a session into a Prisma filter that feature code cannot forget to
 * apply. The rules themselves live in `permissions.ts` and `scopes.ts`.
 */

/** What the rest of the app is allowed to know about the signed-in person. */
export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;
  mustChangePassword: boolean;
};

/**
 * Read the session once per request.
 *
 * `cache` memoises this for the duration of a single render pass, so a layout,
 * three pages and a Server Action can each ask independently and still cost one
 * database round trip. Without it, every guard would be another query.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const session = await resolveSession();
  if (!session) return null;

  // A DTO, not the Prisma row: `passwordHash`, lockout counters and the rest
  // of the user record never leave this function, so they cannot be leaked by
  // a component that happens to spread the object into a client prop.
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    mustChangePassword: user.mustChangePassword,
  };
});

/**
 * Require a signed-in user, or leave for the sign-in page.
 *
 * Also enforces the one gate that sits in front of everything else: a user
 * carrying `mustChangePassword` may reach nothing but the change-password
 * screen. Pass `allowPasswordChange` from that screen itself, or it would
 * redirect to itself forever.
 */
export async function requireSession({ allowPasswordChange = false } = {}): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");

  if (user.mustChangePassword && !allowPasswordChange) redirect("/change-password");

  return user;
}

/**
 * Require an office-based permission (docs/SCOPE.md §4.2).
 *
 * Failure redirects to the dashboard rather than answering 403: telling a
 * member that a finance area exists at this exact URL is information they have
 * no use for. Every page *and* every Server Action calls this again — an action
 * is a POST endpoint anybody with a session can reach, whatever the UI showed.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireSession();
  if (!can(user, permission)) redirect("/dashboard");

  return user;
}

/**
 * The filter that makes the Key System Rule structural.
 *
 * Holders of `permission` get `{}` — every row. Everyone else gets a filter
 * pinning the query to their own id. Feature code writes:
 *
 *     prisma.contribution.findMany({ where: { ...ownerScope(user, "finance.viewAll"), ...rest } })
 *
 * and cannot accidentally return the whole church's giving, because the scope
 * is a required argument rather than something to remember — and the
 * permission says *which* office's view is meant, so the Elder seeing all
 * giving does not also mean the Elder seeing all prayer requests.
 *
 * `field` covers the models where the owning column is not called `userId`
 * (`authorId` on prayer requests, `senderId` on a sent message).
 */
export function ownerScope(user: SessionUser, permission: Permission, field: string = "userId") {
  return buildOwnerScope(user, permission, field);
}

/**
 * Rows the user owns — for everyone, Apostles included.
 *
 * For what is private from leadership as well: a person's own notifications
 * and inbox, and above all sermon notes. ⚠ Never use `ownerScope` for those;
 * it returns every row to an Apostle.
 */
export function selfScope(user: SessionUser, field: string = "userId") {
  return buildSelfScope(user, field);
}

/**
 * True when this user may read this row.
 *
 * The last line of defence for a single-record read, where a scope filter on a
 * list query does not apply — a member opening `/members/[id]` with an id that
 * is not theirs.
 */
export function ownsOrCan(user: SessionUser, ownerId: string, permission: Permission) {
  return user.id === ownerId || can(user, permission);
}

/**
 * The ids of the groups this person leads.
 *
 * Read from `Group.leaderId` on every request — cached for the length of one
 * render pass, never on the session — so appointing or replacing a leader
 * changes their powers on their very next page load, with no sign-out needed.
 */
export const ledGroupIds = cache(async (user: SessionUser): Promise<string[]> => {
  const groups = await prisma.group.findMany({
    where: { leaderId: user.id },
    select: { id: true },
  });
  return groups.map((group) => group.id);
});

/** The ids of the groups this person belongs to, cached the same way. */
export const memberGroupIds = cache(async (user: SessionUser): Promise<string[]> => {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  });
  return memberships.map((membership) => membership.groupId);
});

/**
 * Require leadership of one group — its leader, or an Apostle.
 *
 * Fails the same way `requirePermission` does: back to the dashboard, with
 * nothing said about whether the group exists.
 */
export async function requireGroupLeader(groupId: string): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role === "APOSTLE") return user;

  if (!(await ledGroupIds(user)).includes(groupId)) redirect("/dashboard");

  return user;
}

/**
 * Content for all church (`groupId: null`) or for groups the person belongs
 * to; everything for Apostles. For events, prayer requests and group messages.
 */
export async function groupContentScope(user: SessionUser) {
  return buildGroupContentScope(user, await memberGroupIds(user));
}

/**
 * Which `User` rows this person may list: everyone (Apostle, Matron), members
 * of the groups they lead (leaders), or only themselves.
 */
export async function memberScope(user: SessionUser) {
  return buildMemberScope(user, await ledGroupIds(user));
}
