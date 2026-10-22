import type { Prisma } from "@/generated/prisma/client";
import type { AttendanceStatus, Role } from "@/generated/prisma/enums";

/**
 * Who may mark whom, and what a rate is (docs/SCOPE.md §9.7). Pure, so the
 * all-or-nothing rule and the "—" for no records are unit tested.
 */

type Marker = { id: string; role: Role };

/**
 * The people this marker may mark at this event, as a `User` filter — or
 * `null` when they may mark nobody there.
 *
 *   group event       that group's leader, or an Apostle: the group's members
 *   all-church event  each leader: the members of the groups they lead;
 *                     an Apostle: every active member
 *
 * `ledGroupIds` is read from `Group.leaderId` on this request, so a leader
 * replaced this morning marks nothing this afternoon.
 */
export function markableFilter(
  event: { groupId: string | null },
  marker: Marker,
  ledGroupIds: readonly string[],
): Prisma.UserWhereInput | null {
  const active = { isActive: true };

  if (marker.role === "APOSTLE") {
    return event.groupId
      ? { ...active, groupMemberships: { some: { groupId: event.groupId } } }
      : active;
  }

  if (event.groupId) {
    if (!ledGroupIds.includes(event.groupId)) return null;
    return { ...active, groupMemberships: { some: { groupId: event.groupId } } };
  }

  if (ledGroupIds.length === 0) return null;
  return { ...active, groupMemberships: { some: { groupId: { in: [...ledGroupIds] } } } };
}

export type Entry = { userId: string; status: AttendanceStatus };

/**
 * The sheet's choices from the form: one `status:<userId>` field per person
 * marked, valued PRESENT or ABSENT. Anything else is ignored; people left
 * blank are not written at all.
 */
export function entriesFrom(formData: Iterable<[string, FormDataEntryValue]>): Entry[] {
  const entries = new Map<string, AttendanceStatus>();
  for (const [key, value] of formData) {
    if (!key.startsWith("status:")) continue;
    const userId = key.slice("status:".length);
    if (!userId || userId.length > 40) continue;
    if (value === "PRESENT" || value === "ABSENT") entries.set(userId, value);
  }
  return [...entries].map(([userId, status]) => ({ userId, status }));
}

/**
 * True only when every entry names somebody the marker may mark. One outsider
 * fails the whole sheet — a payload with a tampered id writes nothing at all,
 * rather than everything except the bad row.
 */
export function allMarkable(entries: readonly Entry[], markableIds: ReadonlySet<string>) {
  return entries.every((entry) => markableIds.has(entry.userId));
}

/** Present over marked, or `null` when nothing has been marked. */
export function attendanceRate(present: number, absent: number): number | null {
  const marked = present + absent;
  return marked === 0 ? null : present / marked;
}

/** "83%", or "—" for nobody marked — never "0%" for someone simply new. */
export function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

/** The default period for a rate: the last twelve months. */
export function rateSince(now: Date = new Date()): Date {
  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  return since;
}
