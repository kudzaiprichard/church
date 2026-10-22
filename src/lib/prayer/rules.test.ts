import { describe, expect, it } from "vitest";

import { mayModerate, mayPin, mayPost, prayerGroups, prayerSchema, prayerScope } from "./rules";

const apostle = { id: "a", role: "APOSTLE" as const };
const leader = { id: "l", role: "MEMBER" as const };
const member = { id: "m", role: "MEMBER" as const };
const KTW = "g-ktw";
const YOUTH = "g-youth";

describe("prayer visibility", () => {
  it("limits a Youth Alive member to Youth Alive, so KTW's requests never appear", () => {
    expect(prayerScope(prayerGroups(member, [YOUTH], []))).toEqual({ groupId: { in: [YOUTH] } });
  });

  it("includes the groups a person leads, and everything for Apostles", () => {
    expect(prayerGroups(leader, [YOUTH], [KTW])).toEqual([YOUTH, KTW]);
    expect(prayerScope(prayerGroups(apostle, [], []))).toEqual({});
  });

  it("has no all-church wall: someone in no group sees nothing", () => {
    expect(prayerScope(prayerGroups(member, [], []))).toEqual({ groupId: { in: [] } });
  });
});

describe("prayer powers", () => {
  const request = { authorId: member.id, groupId: KTW };

  it("lets only members of a group post in it", () => {
    expect(mayPost(KTW, [KTW])).toBe(true);
    expect(mayPost(KTW, [YOUTH])).toBe(false);
  });

  it("lets the group's leader and Apostles pin, but not the author", () => {
    expect(mayPin(leader, KTW, [KTW])).toBe(true);
    expect(mayPin(apostle, KTW, [])).toBe(true);
    expect(mayPin(member, KTW, [])).toBe(false);
    expect(mayPin(leader, YOUTH, [KTW])).toBe(false);
  });

  it("lets the author, the leader and Apostles answer or remove", () => {
    expect(mayModerate(member, request, [])).toBe(true);
    expect(mayModerate(leader, request, [KTW])).toBe(true);
    expect(mayModerate(apostle, request, [])).toBe(true);
    expect(mayModerate({ id: "other", role: "MEMBER" }, request, [])).toBe(false);
  });

  it("caps a request at 1,000 characters", () => {
    expect(prayerSchema.safeParse({ groupId: KTW, body: "x".repeat(1000) }).success).toBe(true);
    expect(prayerSchema.safeParse({ groupId: KTW, body: "x".repeat(1001) }).success).toBe(false);
  });
});
