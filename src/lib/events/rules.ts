import { z } from "zod";

import { CHURCH_TIME_ZONE, harareToday, isDateOnly } from "@/lib/dates";

/**
 * Event times and the calendar, in church time (docs/SCOPE.md §9.6).
 *
 * Harare keeps Central Africa Time, UTC+2 all year with no daylight saving,
 * so a wall-clock time there is turned into an instant with a fixed offset.
 * Pure, so the arithmetic is unit tested.
 */

const HARARE_OFFSET = "+02:00";

/** "2026-10-25" + "09:00" in Harare → the instant. */
export function harareInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${HARARE_OFFSET}`);
}

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHURCH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** An instant back to Harare's calendar day and clock, for forms and grouping. */
export function harareParts(instant: Date): { date: string; time: string } {
  const get = (type: string) =>
    parts.formatToParts(instant).find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** A `?month=YYYY-MM` value, or Harare's current month when it is missing or junk. */
export function parseMonth(value: unknown, now: Date = new Date()): string {
  return typeof value === "string" && MONTH.test(value) ? value : harareToday(now).slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The instants that open and close a Harare month: [start, end). */
export function monthBounds(month: string): { start: Date; end: Date } {
  return {
    start: harareInstant(`${month}-01`, "00:00"),
    end: harareInstant(`${shiftMonth(month, 1)}-01`, "00:00"),
  };
}

/**
 * The month as weeks of `YYYY-MM-DD`, Monday first, padded with the days of
 * the neighbouring months so every week has seven.
 */
export function monthGrid(month: string): { day: string; inMonth: boolean }[][] {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  // getUTCDay: Sunday 0 … Saturday 6 → days back to the Monday on or before.
  const back = (first.getUTCDay() + 6) % 7;
  const cursor = new Date(first.getTime() - back * 86_400_000);

  const weeks: { day: string; inMonth: boolean }[][] = [];
  do {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({
        day: cursor.toISOString().slice(0, 10),
        inMonth: cursor.getUTCMonth() === index - 1,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === index - 1);

  return weeks;
}

/**
 * Attendance may be taken from a day before an event onwards — early enough
 * to prepare the sheet, not so early that someone marks a service that has
 * not happened (SCOPE §9.7).
 */
export function attendanceOpen(startsAt: Date, now: Date = new Date()): boolean {
  return startsAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;
}

// ─── Form input ─────────────────────────────────────────────────────────────

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, `Keep it under ${max} characters.`).optional(),
  );

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the event a title.")
      .max(120, "Keep the title under 120 characters."),
    description: optionalText(2000),
    location: optionalText(160),
    date: z.string().refine(isDateOnly, "Choose the date."),
    startTime: z.string().regex(TIME, "Choose the start time."),
    endTime: z.preprocess(
      blankToUndefined,
      z.string().regex(TIME, "Choose a valid end time.").optional(),
    ),
    /** "ALL" for the whole church, or a group's id. */
    target: z.string().min(1, "Choose who it is for.").max(40),
  })
  .superRefine((value, context) => {
    if (value.endTime && value.endTime <= value.startTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End after it starts, on the same day.",
      });
    }
  });

export type EventInput = z.infer<typeof eventSchema>;

/** The instants and group an event's parsed input describes. */
export function eventTimes(input: EventInput) {
  return {
    startsAt: harareInstant(input.date, input.startTime),
    endsAt: input.endTime ? harareInstant(input.date, input.endTime) : null,
    groupId: input.target === "ALL" ? null : input.target,
  };
}

export const duplicateSchema = z.object({
  date: z.string().refine(isDateOnly, "Choose the new date."),
});
