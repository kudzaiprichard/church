import { z } from "zod";

import type { Role } from "@/generated/prisma/enums";

/**
 * Who may see, post, pin, answer and remove prayer requests
 * (docs/SCOPE.md §9.8). Pure, over group ids the caller has already read.
 *
 * Requests belong to one group and are seen only inside it — by its members,
 * its leader and the Apostles. There is no all-church prayer wall.
 */

type Person = { id: string; role: Role };

/** The groups whose requests this person may read, or `"all"` for Apostles. */
export function prayerGroups(
  person: Person,
  memberGroupIds: readonly string[],
  ledGroupIds: readonly string[],
): readonly string[] | "all" {
  if (person.role === "APOSTLE") return "all";
  return [...new Set([...memberGroupIds, ...ledGroupIds])];
}

/** The `PrayerRequest` filter for those groups. */
export function prayerScope(groups: readonly string[] | "all") {
  return groups === "all" ? {} : { groupId: { in: [...groups] } };
}

export function mayPost(groupId: string, memberGroupIds: readonly string[]) {
  return memberGroupIds.includes(groupId);
}

/** Pinning is the group leader's (or an Apostle's) to do. */
export function mayPin(person: Person, groupId: string, ledGroupIds: readonly string[]) {
  return person.role === "APOSTLE" || ledGroupIds.includes(groupId);
}

/** Marking answered and removing: the author, the group's leader, an Apostle. */
export function mayModerate(
  person: Person,
  request: { authorId: string; groupId: string },
  ledGroupIds: readonly string[],
) {
  return request.authorId === person.id || mayPin(person, request.groupId, ledGroupIds);
}

export const PRAYER_MAX = 1000;

export const prayerSchema = z.object({
  groupId: z.string().min(1, "Choose a group.").max(40),
  body: z
    .string()
    .trim()
    .min(1, "Write your request.")
    .max(PRAYER_MAX, `Keep it under ${PRAYER_MAX.toLocaleString("en-GB")} characters.`),
});
