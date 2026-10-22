import { describe, expect, it } from "vitest";

import { classStatus, formatCertificateNumber, nextCertificateNumber } from "./baptism/rules";
import { cronAuthorized, pledgeReminder, reminderWindow } from "./cron-rules";
import { ageOn, birthdayIn, nextBirthday, weekOf } from "./dates";

describe("birthdays on Harare's calendar", () => {
  it("keeps 29 February on the 28th in a non-leap year", () => {
    expect(birthdayIn("2000-02-29", 2027)).toBe("2027-02-28");
    expect(birthdayIn("2000-02-29", 2028)).toBe("2028-02-29");
    expect(birthdayIn("1990-07-04", 2027)).toBe("2027-07-04");
  });

  it("counts today as the next birthday, and rolls into next year after it passes", () => {
    expect(nextBirthday("1990-10-22", "2026-10-22")).toEqual({ date: "2026-10-22", inDays: 0 });
    expect(nextBirthday("1990-10-25", "2026-10-22")).toEqual({ date: "2026-10-25", inDays: 3 });
    expect(nextBirthday("1990-01-02", "2026-12-31")).toEqual({ date: "2027-01-02", inDays: 2 });
    expect(nextBirthday("2000-02-29", "2027-02-28")).toEqual({ date: "2027-02-28", inDays: 0 });
  });

  it("works out an age, turning over on the birthday", () => {
    expect(ageOn("1990-10-22", "2026-10-21")).toBe(35);
    expect(ageOn("1990-10-22", "2026-10-22")).toBe(36);
    expect(ageOn("2000-02-29", "2027-02-28")).toBe(27);
  });

  it("gives the Monday-to-Sunday week", () => {
    expect(weekOf("2026-10-22")).toEqual({ start: "2026-10-19", end: "2026-10-25" });
    expect(weekOf("2026-10-19")).toEqual({ start: "2026-10-19", end: "2026-10-25" });
  });
});

describe("baptism", () => {
  it("numbers certificates per year in sequence", () => {
    expect(formatCertificateNumber(2026, 7)).toBe("KMMI-BAP-2026-0007");
    expect(nextCertificateNumber([], 2026)).toBe("KMMI-BAP-2026-0001");
    expect(
      nextCertificateNumber(
        ["KMMI-BAP-2026-0002", "KMMI-BAP-2026-0009", "KMMI-BAP-2025-0040"],
        2026,
      ),
    ).toBe("KMMI-BAP-2026-0010");
  });

  it("derives a class's status from its dates or its closing", () => {
    const klass = { startDate: "2026-10-01", endDate: "2026-11-30", completedAt: null };
    expect(classStatus(klass, "2026-09-30")).toBe("UPCOMING");
    expect(classStatus(klass, "2026-10-22")).toBe("ONGOING");
    expect(classStatus(klass, "2026-12-01")).toBe("COMPLETED");
    expect(classStatus({ ...klass, completedAt: "2026-10-20T10:00:00Z" }, "2026-10-22")).toBe(
      "COMPLETED",
    );
  });
});

describe("cron", () => {
  it("rejects a missing or wrong secret, and everything when none is configured", () => {
    expect(cronAuthorized("Bearer s3cret-value", "s3cret-value")).toBe(true);
    expect(cronAuthorized(null, "s3cret-value")).toBe(false);
    expect(cronAuthorized("Bearer wrong", "s3cret-value")).toBe(false);
    expect(cronAuthorized("s3cret-value", "s3cret-value")).toBe(false);
    expect(cronAuthorized("Bearer ", undefined)).toBe(false);
    expect(cronAuthorized("Bearer anything", "")).toBe(false);
  });

  it("reminds about events 23 to 25 hours away", () => {
    const now = new Date("2026-10-22T08:00:00Z");
    expect(reminderWindow(now)).toEqual({
      from: new Date("2026-10-23T07:00:00Z"),
      to: new Date("2026-10-23T09:00:00Z"),
    });
  });

  it("reminds about a pledge a week before, a day before and the day it is overdue", () => {
    expect(pledgeReminder("2026-10-29", "2026-10-22")).toBe("WEEK");
    expect(pledgeReminder("2026-10-23", "2026-10-22")).toBe("DAY");
    expect(pledgeReminder("2026-10-21", "2026-10-22")).toBe("OVERDUE");
    expect(pledgeReminder("2026-10-22", "2026-10-22")).toBeNull();
    expect(pledgeReminder("2026-10-01", "2026-10-22")).toBeNull();
  });
});
