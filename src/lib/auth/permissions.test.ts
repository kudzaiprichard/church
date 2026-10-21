import { describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";

import { PERMISSIONS, ROLES, can, type Permission } from "./permissions";

const as = (role: Role) => ({ role });

/**
 * The permission map, pinned to docs/SCOPE.md §4.2.
 *
 * Written out in full rather than derived from the map, on purpose: a test
 * that reads the table it is checking proves nothing. Changing who may do
 * something should mean changing this list too, in the same review.
 */
const EXPECTED: Record<Permission, readonly Role[]> = {
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
  "settings.manage": ["APOSTLE"],
  "audit.view": ["APOSTLE"],
};

describe("PERMISSIONS", () => {
  it("matches the scope's catalogue exactly", () => {
    expect(PERMISSIONS).toEqual(EXPECTED);
  });
});

describe("can", () => {
  it.each(Object.entries(EXPECTED) as [Permission, readonly Role[]][])(
    "%s is held by exactly its offices",
    (permission, holders) => {
      for (const role of ROLES) {
        expect(can(as(role), permission)).toBe(holders.includes(role));
      }
    },
  );

  it("gives an Apostle every permission", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can(as("APOSTLE"), permission)).toBe(true);
    }
  });

  it("gives a Member no office permission at all", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can(as("MEMBER"), permission)).toBe(false);
    }
  });

  it("keeps the Matron out of finance and settings", () => {
    expect(can(as("MATRON"), "finance.viewAll")).toBe(false);
    expect(can(as("MATRON"), "settings.manage")).toBe(false);
    expect(can(as("MATRON"), "members.edit")).toBe(false);
    expect(can(as("MATRON"), "members.setRole")).toBe(false);
  });
});
