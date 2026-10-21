/**
 * Church time and date-only values.
 *
 * Two rules, applied everywhere:
 *
 *   "today" is Harare's today. The server may run in UTC; a member enrolled
 *   at 01:00 on a Monday in Harare was enrolled on Monday, not Sunday.
 *
 *   a date without a time (birthday, baptism date) is a calendar day, stored
 *   in a `@db.Date` column and carried in code as a `YYYY-MM-DD` string or as
 *   a `Date` at UTC midnight — never converted through a local time zone,
 *   which is how birthdays end up a day early.
 *
 * Birthday arithmetic arrives with the birthdays module (Phase 5).
 */

export const CHURCH_TIME_ZONE = "Africa/Harare";

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHURCH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Harare, as `YYYY-MM-DD`. `en-CA` formats dates in exactly that shape. */
export function harareToday(now: Date = new Date()): string {
  return isoDay.format(now);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written `YYYY-MM-DD` (so not `2026-02-30`). */
export function isDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** `YYYY-MM-DD` → a `Date` at UTC midnight, the shape Prisma writes to `@db.Date`. */
export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** A `@db.Date` value back to `YYYY-MM-DD`, for DTOs and form defaults. */
export function fromDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const longDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "4 March 2026" for a date-only value. UTC on purpose — see the rules above. */
export function formatDateOnly(value: string): string {
  return longDay.format(toDateOnly(value));
}
