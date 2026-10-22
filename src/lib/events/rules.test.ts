import { describe, expect, it } from "vitest";

import { buildGroupContentScope } from "@/lib/auth/scopes";

import {
  attendanceOpen,
  eventSchema,
  eventTimes,
  harareInstant,
  harareParts,
  monthBounds,
  monthGrid,
  parseMonth,
  shiftMonth,
} from "./rules";

describe("Harare time", () => {
  it("turns a Harare wall-clock time into the instant two hours earlier in UTC", () => {
    expect(harareInstant("2026-10-25", "09:00").toISOString()).toBe("2026-10-25T07:00:00.000Z");
  });

  it("reads an instant back on Harare's calendar, across the UTC midnight", () => {
    expect(harareParts(new Date("2026-10-24T23:30:00.000Z"))).toEqual({
      date: "2026-10-25",
      time: "01:30",
    });
  });
});

describe("months", () => {
  it("parses ?month= and falls back to Harare's current month", () => {
    const now = new Date("2026-10-31T23:00:00.000Z"); // 1 Nov in Harare
    expect(parseMonth("2026-02", now)).toBe("2026-02");
    expect(parseMonth("2026-13", now)).toBe("2026-11");
    expect(parseMonth(undefined, now)).toBe("2026-11");
  });

  it("steps across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("bounds a month at Harare midnight", () => {
    const { start, end } = monthBounds("2026-10");
    expect(start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-31T22:00:00.000Z");
  });

  it("lays out whole Monday-first weeks", () => {
    const grid = monthGrid("2026-10"); // 1 October 2026 is a Thursday
    expect(grid[0][0]).toEqual({ day: "2026-09-28", inMonth: false });
    expect(grid[0][3]).toEqual({ day: "2026-10-01", inMonth: true });
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid.at(-1)!.some((cell) => cell.day === "2026-10-31")).toBe(true);
    expect(grid.flat().filter((cell) => cell.inMonth)).toHaveLength(31);
  });
});

describe("event visibility by group", () => {
  const youth = "g-youth";
  const ktw = "g-ktw";

  it("shows a Youth Alive member all-church events and Youth Alive's, never KTW's", () => {
    const scope = buildGroupContentScope({ id: "m", role: "MEMBER" }, [youth]);
    expect(scope).toEqual({ OR: [{ groupId: null }, { groupId: { in: [youth] } }] });
    expect(JSON.stringify(scope)).not.toContain(ktw);
  });

  it("shows an Apostle every group's", () => {
    expect(buildGroupContentScope({ id: "a", role: "APOSTLE" }, [])).toEqual({});
  });
});

describe("eventSchema", () => {
  const base = { title: "Sunday service", date: "2026-10-25", startTime: "09:00", target: "ALL" };

  it("accepts an all-church event and maps its times and group", () => {
    const input = eventSchema.parse({ ...base, endTime: "11:30" });
    expect(eventTimes(input)).toEqual({
      startsAt: new Date("2026-10-25T07:00:00.000Z"),
      endsAt: new Date("2026-10-25T09:30:00.000Z"),
      groupId: null,
    });
    expect(eventTimes(eventSchema.parse({ ...base, target: "g1" })).groupId).toBe("g1");
  });

  it("rejects an end before the start, a bad date and a missing title", () => {
    expect(eventSchema.safeParse({ ...base, endTime: "08:00" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, date: "2026-02-30" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, title: " " }).success).toBe(false);
  });
});

describe("attendanceOpen", () => {
  const now = new Date("2026-10-22T10:00:00.000Z");

  it("opens a day ahead and stays open afterwards", () => {
    expect(attendanceOpen(new Date("2026-10-23T09:00:00.000Z"), now)).toBe(true);
    expect(attendanceOpen(new Date("2026-10-20T09:00:00.000Z"), now)).toBe(true);
    expect(attendanceOpen(new Date("2026-10-24T09:00:00.000Z"), now)).toBe(false);
  });
});
