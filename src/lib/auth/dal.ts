import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Role } from "@/generated/prisma/enums";

import { resolveSession } from "./session";

/**
 * The Data Access Layer.
 *
 * Every authorization decision in this system is made here or in something
 * that calls this. Not in the proxy, which runs on prefetches and has a
 * history of being bypassable, and not in a page component, which can be
 * skipped by a Server Action reaching the same data by another route.
 *
 * The spec's Key System Rule — "admins see everything, members see only their
 * own data plus data targeted at them, enforced at every module level" — is a
 * statement about *rows*, not about pages. So the important export here is not
 * `requireAdmin`; it is `ownerScope`, which turns a session into a Prisma
 * filter that feature code cannot forget to apply.
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

/** Require an administrator. Members get a 404 rather than a 403. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  // Not "forbidden": telling a member that an admin area exists at this exact
  // URL is information they have no use for.
  if (user.role !== "ADMIN") redirect("/dashboard");

  return user;
}

/**
 * The filter that makes the Key System Rule structural.
 *
 * Admins get `{}` — every row. Members get a filter pinning the query to their
 * own id. Feature code writes:
 *
 *     prisma.contribution.findMany({ where: { ...ownerScope(user), ...rest } })
 *
 * and cannot accidentally return the whole church's giving, because the scope
 * is a required argument rather than something to remember.
 *
 * `field` covers the models where the owning column is not called `userId`
 * (`authorId` on prayer requests, `senderId` on a sent message).
 */
export function ownerScope(user: SessionUser, field: string = "userId") {
  if (user.role === "ADMIN") return {};
  return { [field]: user.id } as Record<string, string>;
}

/**
 * True when this user may read this row.
 *
 * The last line of defence for a single-record read, where a scope filter on a
 * list query does not apply — a member opening `/giving/[id]` with an id that
 * is not theirs.
 */
export function ownsOrAdmin(user: SessionUser, ownerId: string) {
  return user.role === "ADMIN" || user.id === ownerId;
}
