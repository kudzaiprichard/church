import { timingSafeEqual } from "node:crypto";

/**
 * The scheduled jobs' rules (docs/SCOPE.md §9.21), kept pure for the tests:
 * who may trigger them, and which events and pledges are due a reminder.
 * The jobs themselves are in `src/app/api/cron/*`.
 */

/**
 * True only for `Authorization: Bearer <secret>` with the configured secret.
 * With no secret configured nothing is authorized — an unset variable must
 * not leave the jobs open to anyone who finds the URL. Compared in constant
 * time.
 */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Events starting 23 to 25 hours from now get their reminder — the hourly job's window. */
export function reminderWindow(now: Date): { from: Date; to: Date } {
  const hour = 60 * 60 * 1000;
  return { from: new Date(now.getTime() + 23 * hour), to: new Date(now.getTime() + 25 * hour) };
}

const DAY_MS = 86_400_000;

/**
 * Which pledge reminder, if any, is due today: 7 days before, 1 day before,
 * and the day it becomes overdue (the day after its due date).
 */
export function pledgeReminder(dueDate: string, today: string): "WEEK" | "DAY" | "OVERDUE" | null {
  const days = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS,
  );
  if (days === 7) return "WEEK";
  if (days === 1) return "DAY";
  if (days === -1) return "OVERDUE";
  return null;
}
