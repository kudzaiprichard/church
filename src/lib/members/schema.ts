import { z } from "zod";

import { ROLES } from "@/lib/auth/permissions";
import { harareToday, isDateOnly } from "@/lib/dates";

/**
 * What a member record may contain, checked on the server.
 *
 * Pure and shared: the enrolment, edit and own-profile actions parse with
 * these, and the unit tests exercise them directly. The browser runs none of
 * this — any client-side hint is a courtesy, and these rules hold even when
 * the form is bypassed entirely.
 */

/**
 * The scope's wording, exactly (docs/SCOPE.md §9.3). Used for a missing date
 * and for one in the future alike: a baptism that has not happened yet means
 * the person is not baptized, which is what the sentence says.
 */
export const BAPTISM_REQUIRED = "Baptism date is required. Only baptized members can be enrolled.";

/** Blank form fields arrive as "" — treat them as absent. */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number, message?: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, message).optional());

const requiredText = (message: string, max = 120) =>
  z.string().trim().min(1, message).max(max, `Keep it under ${max} characters.`);

/** A calendar day that is not after Harare's today. */
const pastOrToday = (message: string) =>
  z
    .string()
    .refine(isDateOnly, message)
    .refine((value) => value <= harareToday(), message);

const optionalPastDate = (message: string) =>
  z.preprocess(blankToUndefined, pastOrToday(message).optional());

const phone = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, "Enter a phone number, for example +263 77 123 4567.")
    .optional(),
);

/** The fields a member may change about themselves (SCOPE §9.3). */
export const ownProfileSchema = z.object({
  phone,
  address: optionalText(200, "Keep the address under 200 characters."),
  dateOfBirth: optionalPastDate("Enter a real date of birth, not in the future.").refine(
    (value) => value === undefined || value >= "1900-01-01",
    "Enter a real date of birth, not in the future.",
  ),
  gender: z.preprocess(blankToUndefined, z.enum(["MALE", "FEMALE"]).optional()),
});

const person = z.object({
  firstName: requiredText("Enter a first name.", 80),
  lastName: requiredText("Enter a last name.", 80),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("Enter a valid email address."),
  ),
});

const groups = z
  .array(z.string().min(1))
  .min(1, "Choose at least one connect group.")
  .max(20)
  .transform((ids) => [...new Set(ids)]);

const baptism = z.object({
  baptismDate: z.preprocess(blankToUndefined, pastOrToday(BAPTISM_REQUIRED).optional()),
  baptismLocation: optionalText(160),
  conductedBy: optionalText(120),
  classCompletedOn: optionalPastDate("Enter a real date, not in the future."),
  baptismNotes: optionalText(1000, "Keep the notes under 1,000 characters."),
});

/** Baptism date, place and minister are required together. */
function requireBaptism(value: z.infer<typeof baptism>, ctx: z.RefinementCtx) {
  if (!value.baptismDate) {
    ctx.addIssue({ code: "custom", path: ["baptismDate"], message: BAPTISM_REQUIRED });
  }
  if (!value.baptismLocation) {
    ctx.addIssue({
      code: "custom",
      path: ["baptismLocation"],
      message: "Enter where they were baptized.",
    });
  }
  if (!value.conductedBy) {
    ctx.addIssue({
      code: "custom",
      path: ["conductedBy"],
      message: "Enter who conducted the baptism.",
    });
  }
}

/**
 * Enrolment: a new person, their groups, and proof of baptism — all required.
 * Only the baptized may be enrolled, and this is where that is enforced.
 */
export const enrolmentSchema = person
  .extend(ownProfileSchema.shape)
  .extend({ groupIds: groups, role: z.enum(ROLES).default("MEMBER") })
  .extend(baptism.shape)
  .superRefine(requireBaptism);

/**
 * An Apostle's edit of any member.
 *
 * The baptism block is required only when any of it is filled in: accounts
 * that predate enrolment (the bootstrapped Apostle) have no record, and fixing
 * someone's name must not demand one. The action additionally refuses to blank
 * an existing record.
 */
export const memberUpdateSchema = person
  .extend(ownProfileSchema.shape)
  .extend({ groupIds: groups })
  .extend(baptism.shape)
  .superRefine((value, ctx) => {
    if (value.baptismDate || value.baptismLocation || value.conductedBy || value.classCompletedOn) {
      requireBaptism(value, ctx);
    }
  });

export type EnrolmentInput = z.infer<typeof enrolmentSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type OwnProfileInput = z.infer<typeof ownProfileSchema>;

/** Every field a member form posts, read out of the FormData in one place. */
export type MemberFormValues = ReturnType<typeof memberFormValues>;

export function memberFormValues(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };

  return {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    dateOfBirth: text("dateOfBirth"),
    gender: text("gender"),
    role: text("role"),
    groupIds: formData.getAll("groupIds").filter((value) => typeof value === "string"),
    baptismDate: text("baptismDate"),
    baptismLocation: text("baptismLocation"),
    conductedBy: text("conductedBy"),
    classCompletedOn: text("classCompletedOn"),
    baptismNotes: text("baptismNotes"),
  };
}
