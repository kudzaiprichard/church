import { describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";

import {
  buildGroupContentScope,
  buildMemberScope,
  buildOwnerScope,
  buildSelfScope,
} from "./scopes";

const person = (role: Role) => ({ id: `u-${role.toLowerCase()}`, role });

const apostle = person("APOSTLE");
const matron = person("MATRON");
const elder = person("ELDER");
const member = person("MEMBER");

describe("buildOwnerScope", () => {
  it("widens to every row only for holders of the named permission", () => {
    expect(buildOwnerScope(apostle, "finance.viewAll")).toEqual({});
    expect(buildOwnerScope(elder, "finance.viewAll")).toEqual({});
    expect(buildOwnerScope(matron, "finance.viewAll")).toEqual({ userId: matron.id });
    expect(buildOwnerScope(member, "finance.viewAll")).toEqual({ userId: member.id });
  });

  it("is per permission: the Elder's finance reach does not extend to prayer", () => {
    expect(buildOwnerScope(elder, "prayer.viewAll", "authorId")).toEqual({ authorId: elder.id });
  });

  it("uses the named owner column", () => {
    expect(buildOwnerScope(member, "attendance.viewAll", "markedById")).toEqual({
      markedById: member.id,
    });
  });
});

describe("buildSelfScope", () => {
  it("pins every office, Apostles included, to their own rows", () => {
    for (const user of [apostle, matron, elder, member]) {
      expect(buildSelfScope(user)).toEqual({ userId: user.id });
    }
  });
});

describe("buildGroupContentScope", () => {
  it("shows an Apostle every group's content", () => {
    expect(buildGroupContentScope(apostle, [])).toEqual({});
  });

  it("limits everyone else to all-church content plus their own groups", () => {
    for (const user of [matron, elder, member]) {
      expect(buildGroupContentScope(user, ["g1", "g2"])).toEqual({
        OR: [{ groupId: null }, { groupId: { in: ["g1", "g2"] } }],
      });
    }
  });

  it("leaves someone in no group with all-church content only", () => {
    expect(buildGroupContentScope(member, [])).toEqual({
      OR: [{ groupId: null }, { groupId: { in: [] } }],
    });
  });
});

describe("buildMemberScope", () => {
  it("lists the whole roll for the Apostle and the Matron", () => {
    expect(buildMemberScope(apostle, [])).toEqual({});
    expect(buildMemberScope(matron, [])).toEqual({});
  });

  it("lists a leader themselves and the members of the groups they lead", () => {
    expect(buildMemberScope(elder, ["youth"])).toEqual({
      OR: [{ id: elder.id }, { groupMemberships: { some: { groupId: { in: ["youth"] } } } }],
    });
    expect(buildMemberScope(member, ["women"])).toEqual({
      OR: [{ id: member.id }, { groupMemberships: { some: { groupId: { in: ["women"] } } } }],
    });
  });

  it("lists anyone else only themselves — the Elder included, when leading nothing", () => {
    expect(buildMemberScope(elder, [])).toEqual({ id: elder.id });
    expect(buildMemberScope(member, [])).toEqual({ id: member.id });
  });
});
