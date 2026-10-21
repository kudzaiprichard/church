import type { Role } from "@/generated/prisma/enums";

/**
 * What each office may do, in one table.
 *
 * Office-based powers are a static map from permission to the roles that hold
 * it, so "who can confirm a payment?" has exactly one answer and it is written
 * down here, not scattered across `role === …` checks in pages and actions.
 *
 * Group-scoped powers — a leader marking their own group's attendance — are
 * deliberately *not* in this table. They depend on which group, which a role
 * cannot say; they are checked against `Group.leaderId` by
 * `requireGroupLeader()` in the Data Access Layer.
 *
 * This module is pure: no database, no `server-only`. Navigation, which runs
 * in the browser, filters by the same table the server enforces with — it just
 * cannot be trusted to, which is why every page and action asks again.
 *
 * The source is docs/SCOPE.md §4.2; change both together.
 */
export const PERMISSIONS = {
  "members.viewAll": ["APOSTLE"],
  "members.enroll": ["APOSTLE", "MATRON"],
  "members.edit": ["APOSTLE"],
  "members.setRole": ["APOSTLE"],
  "members.setActive": ["APOSTLE"],
  "groups.manage": ["APOSTLE"],
  "messages.sendAll": ["APOSTLE"],
  "events.manage": ["APOSTLE"],
  "attendance.viewAll": ["APOSTLE"],
  "prayer.viewAll": ["APOSTLE"],
  "finance.viewAll": ["APOSTLE", "ELDER"],
  "finance.confirm": ["APOSTLE", "ELDER"],
  "finance.export": ["APOSTLE", "ELDER"],
  "projects.manage": ["APOSTLE"],
  "sermons.manage": ["APOSTLE"],
  "devotions.manage": ["APOSTLE"],
  "baptism.manage": ["APOSTLE", "MATRON"],
  "birthdays.announce": ["APOSTLE"],
  // Church information, the theme of the year and social links.
  "settings.manage": ["APOSTLE"],
  "audit.view": ["APOSTLE"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Anything carrying a role — a `SessionUser`, or a bare `{ role }` in a test. */
type HasRole = { role: Role };

/** True when this person's office grants the permission. */
export function can(user: HasRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(user.role);
}

/** The offices, in order of seniority, with the names the church uses for them. */
export const ROLE_LABELS: Record<Role, string> = {
  APOSTLE: "Apostle",
  MATRON: "Matron",
  ELDER: "Elder",
  MEMBER: "Member",
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];
