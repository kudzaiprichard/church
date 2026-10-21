import type { Prisma } from "@/generated/prisma/client";

import { can, type Permission } from "./permissions";

/**
 * The row filters behind the Key System Rule, as pure functions.
 *
 * Each takes a person (and, for the group-based ones, the group ids already
 * looked up for them) and returns a Prisma `where` fragment. They live apart
 * from `dal.ts` so they can be unit tested without a database; feature code
 * never calls them directly — it calls the async versions in the Data Access
 * Layer, which fetch the group ids first, so there is no way to pass the wrong
 * list in.
 *
 * Every function returns a *narrower* filter by default and widens only on an
 * explicit permission. Forgetting a branch therefore fails closed.
 */

type ScopedUser = { id: string; role: Parameters<typeof can>[0]["role"] };

/**
 * Rows the person owns — or every row, for holders of `permission`.
 *
 * The permission is a required argument because "may see everyone's" differs
 * by module: the Elder sees all giving but not all prayer requests. It used to
 * mean "is an administrator", which is exactly the conflation this replaces.
 */
export function buildOwnerScope(user: ScopedUser, permission: Permission, field = "userId") {
  if (can(user, permission)) return {};
  return { [field]: user.id } as Record<string, string>;
}

/**
 * Rows the person owns, for everyone, Apostles included.
 *
 * For data that is private from leadership too: sermon notes, a person's own
 * inbox and notifications. Never substitute `buildOwnerScope` here — it hands
 * an Apostle every row.
 */
export function buildSelfScope(user: { id: string }, field = "userId") {
  return { [field]: user.id } as Record<string, string>;
}

/**
 * Content addressed to the whole church (`groupId: null`) or to a group the
 * person belongs to. Apostles see every group's.
 */
export function buildGroupContentScope(user: ScopedUser, memberGroupIds: readonly string[]) {
  if (user.role === "APOSTLE") return {};
  return { OR: [{ groupId: null }, { groupId: { in: [...memberGroupIds] } }] };
}

/**
 * Which people may appear in a list.
 *
 *   Apostle          everyone
 *   Matron           everyone — she enrols members and keeps their baptismal
 *                    records, so she needs the whole roll (SCOPE §9.3); what
 *                    she may *see about* them is limited by the page, not here
 *   a group leader   themselves and the members of the groups they lead
 *   anyone else      themselves
 */
export function buildMemberScope(
  user: ScopedUser,
  ledGroupIds: readonly string[],
): Prisma.UserWhereInput {
  if (can(user, "members.viewAll") || can(user, "baptism.manage")) return {};

  if (ledGroupIds.length > 0) {
    return {
      OR: [{ id: user.id }, { groupMemberships: { some: { groupId: { in: [...ledGroupIds] } } } }],
    };
  }

  return { id: user.id };
}
