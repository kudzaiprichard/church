import { describe, expect, it } from "vitest";

import { allMarkable, attendanceRate, entriesFrom, formatRate, markableFilter } from "./rules";

const apostle = { id: "a", role: "APOSTLE" as const };
/** Elder Mangezi: leads Youth Alive. */
const elder = { id: "e", role: "ELDER" as const };
const member = { id: "m", role: "MEMBER" as const };
const YOUTH = "g-youth";
const SUNDAY = "g-sunday";

describe("markableFilter — attendance marking scope", () => {
  it("lets a group's leader mark its members at its events, and no one at another group's", () => {
    expect(markableFilter({ groupId: YOUTH }, elder, [YOUTH])).toEqual({
      isActive: true,
      groupMemberships: { some: { groupId: YOUTH } },
    });
    expect(markableFilter({ groupId: SUNDAY }, elder, [YOUTH])).toBeNull();
  });

  it("lets each leader mark only their own groups' members at an all-church event", () => {
    expect(markableFilter({ groupId: null }, elder, [YOUTH])).toEqual({
      isActive: true,
      groupMemberships: { some: { groupId: { in: [YOUTH] } } },
    });
  });

  it("lets an Apostle mark anyone, and a member nobody", () => {
    expect(markableFilter({ groupId: null }, apostle, [])).toEqual({ isActive: true });
    expect(markableFilter({ groupId: YOUTH }, apostle, [])).toEqual({
      isActive: true,
      groupMemberships: { some: { groupId: YOUTH } },
    });
    expect(markableFilter({ groupId: null }, member, [])).toBeNull();
    expect(markableFilter({ groupId: YOUTH }, member, [])).toBeNull();
  });

  it("follows leadership as passed in, so a replaced leader marks nothing", () => {
    expect(markableFilter({ groupId: YOUTH }, elder, [])).toBeNull();
  });
});

describe("entriesFrom and allMarkable", () => {
  it("reads one status per person and ignores anything else", () => {
    const form: [string, string][] = [
      ["status:u1", "PRESENT"],
      ["status:u2", "ABSENT"],
      ["status:u3", "EXCUSED"],
      ["status:", "PRESENT"],
      ["$ACTION_ID", "x"],
      ["status:u1", "ABSENT"],
    ];
    expect(entriesFrom(form)).toEqual([
      { userId: "u1", status: "ABSENT" },
      { userId: "u2", status: "ABSENT" },
    ]);
  });

  it("fails the whole sheet when any one entry is outside the marker's people", () => {
    const markable = new Set(["u1", "u2"]);
    expect(allMarkable([{ userId: "u1", status: "PRESENT" }], markable)).toBe(true);
    expect(
      allMarkable(
        [
          { userId: "u1", status: "PRESENT" },
          { userId: "outsider", status: "PRESENT" },
        ],
        markable,
      ),
    ).toBe(false);
  });
});

describe("attendance rate", () => {
  it("is present over marked", () => {
    expect(attendanceRate(5, 1)).toBeCloseTo(5 / 6);
    expect(formatRate(attendanceRate(5, 1))).toBe("83%");
    expect(formatRate(attendanceRate(0, 3))).toBe("0%");
  });

  it("shows a dash for someone with no records, not 0%", () => {
    expect(attendanceRate(0, 0)).toBeNull();
    expect(formatRate(null)).toBe("—");
  });
});
