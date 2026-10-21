import { describe, expect, it } from "vitest";

import { harareToday } from "@/lib/dates";
import { fieldErrorsFrom } from "@/lib/forms";

import {
  BAPTISM_REQUIRED,
  enrolmentSchema,
  memberUpdateSchema,
  ownProfileSchema,
} from "./schema";


const valid = {
  firstName: "Tendai",
  lastName: "Moyo",
  email: "  Tendai.Moyo@Example.org ",
  groupIds: ["youth-alive"],
  baptismDate: "2019-04-21",
  baptismLocation: "Lake Chivero",
  conductedBy: "Apostle Takura James Makamba",
};

const errorsOf = (input: unknown) => {
  const result = enrolmentSchema.safeParse(input);
  return result.success ? {} : fieldErrorsFrom(result.error.issues);
};

/** Tomorrow in Harare, computed the same way the schema computes today. */
function harareTomorrow() {
  const [y, m, d] = harareToday().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

describe("enrolmentSchema", () => {
  it("accepts a baptized member and normalises the email", () => {
    const result = enrolmentSchema.parse(valid);
    expect(result.email).toBe("tendai.moyo@example.org");
    expect(result.role).toBe("MEMBER");
  });

  it.each([
    ["missing", undefined],
    ["blank", ""],
    ["not a date", "21/04/2019"],
    ["an impossible date", "2019-02-30"],
  ])("rejects a %s baptism date with the scope's exact message", (_label, baptismDate) => {
    expect(errorsOf({ ...valid, baptismDate }).baptismDate).toBe(BAPTISM_REQUIRED);
  });

  it("rejects a baptism date in the future with the same message", () => {
    expect(errorsOf({ ...valid, baptismDate: harareTomorrow() }).baptismDate).toBe(
      BAPTISM_REQUIRED,
    );
  });

  it("accepts a baptism today, in Harare", () => {
    expect(errorsOf({ ...valid, baptismDate: harareToday() })).toEqual({});
  });

  it("uses the exact wording the scope specifies", () => {
    expect(BAPTISM_REQUIRED).toBe(
      "Baptism date is required. Only baptized members can be enrolled.",
    );
  });

  it("requires the place and the minister of the baptism", () => {
    const errors = errorsOf({ ...valid, baptismLocation: "", conductedBy: " " });
    expect(errors.baptismLocation).toBeDefined();
    expect(errors.conductedBy).toBeDefined();
  });

  it("requires at least one connect group and drops duplicates", () => {
    expect(errorsOf({ ...valid, groupIds: [] }).groupIds).toBe(
      "Choose at least one connect group.",
    );
    expect(enrolmentSchema.parse({ ...valid, groupIds: ["a", "a", "b"] }).groupIds).toEqual([
      "a",
      "b",
    ]);
  });

  it("rejects an office that does not exist", () => {
    expect(errorsOf({ ...valid, role: "BISHOP" }).role).toBeDefined();
  });
});

describe("memberUpdateSchema", () => {
  const base = { firstName: "Tendai", lastName: "Moyo", email: "t@example.org", groupIds: ["g"] };

  it("allows a record with no baptism block at all", () => {
    expect(memberUpdateSchema.safeParse(base).success).toBe(true);
  });

  it("requires the whole baptism block once any of it is given", () => {
    const result = memberUpdateSchema.safeParse({ ...base, baptismLocation: "Harare" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error.issues).baptismDate).toBe(BAPTISM_REQUIRED);
    }
  });
});

describe("ownProfileSchema", () => {
  it("treats blank fields as cleared", () => {
    expect(
      ownProfileSchema.parse({ phone: "", address: " ", dateOfBirth: "", gender: "" }),
    ).toEqual({
      phone: undefined,
      address: undefined,
      dateOfBirth: undefined,
      gender: undefined,
    });
  });

  it("rejects a birthday in the future and a malformed phone number", () => {
    const result = ownProfileSchema.safeParse({ dateOfBirth: harareTomorrow(), phone: "call me" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFrom(result.error.issues);
      expect(errors.dateOfBirth).toBeDefined();
      expect(errors.phone).toBeDefined();
    }
  });
});
