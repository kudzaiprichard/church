import { z } from "zod";

import { harareToday, isDateOnly } from "@/lib/dates";

import { amountSchema } from "./money";

/**
 * What the finance forms may submit, checked on the server
 * (docs/SCOPE.md §9.9–9.10). Pure, so the rules are unit tested.
 */

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, `Keep it under ${max} characters.`).optional(),
  );

const optionalId = z.preprocess(blankToUndefined, z.string().max(40).optional());

/** A calendar day that is not after Harare's today. */
const pastOrToday = (message: string) =>
  z
    .string()
    .refine(isDateOnly, message)
    .refine((value) => value <= harareToday(), "That date is in the future.");

/**
 * Logging a payment (a member's own) or recording one (an officer's, for a
 * member). The chema amount is not taken from the form — it is the month's
 * expected amount — so `amount` is required for the other types only.
 */
export const paymentSchema = z
  .object({
    type: z.enum(["CHEMA", "WELFARE", "TITHE", "PARTNERSHIP"], { error: "Choose a type." }),
    amount: z.preprocess(blankToUndefined, amountSchema.optional()),
    paidAt: pastOrToday("Choose the date it was paid."),
    chemaYear: z.preprocess(blankToUndefined, z.coerce.number().int().optional()),
    chemaMonth: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(12).optional()),
    projectId: optionalId,
    pledgeId: optionalId,
    note: optionalText(500),
  })
  .superRefine((value, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (value.type === "CHEMA") {
      if (!value.chemaYear || !value.chemaMonth) {
        issue("chemaMonth", "Choose the month it pays for.");
      }
      const thisYear = Number(harareToday().slice(0, 4));
      if (value.chemaYear && Math.abs(value.chemaYear - thisYear) > 1) {
        issue("chemaMonth", "Choose a month this year, last year or next year.");
      }
      if (value.pledgeId) issue("pledgeId", "Chema cannot count toward a pledge.");
    } else if (!value.amount) {
      issue("amount", "Enter an amount.");
    }
    if (value.type === "PARTNERSHIP" && !value.projectId) issue("projectId", "Choose a project.");
  });

export type PaymentInput = z.infer<typeof paymentSchema>;

export const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Say why, so the member knows what to fix.")
    .max(300, "Keep the reason under 300 characters."),
});

/** A reversing entry: an officer cancels out a confirmed contribution, with a reason. */
export const reversalSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, "Say why it is being reversed.")
    .max(500, "Keep it under 500 characters."),
});

export const pledgeSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Say what the pledge is for.")
    .max(160, "Keep it under 160 characters."),
  totalAmount: amountSchema,
  dueDate: z
    .string()
    .refine(isDateOnly, "Choose the due date.")
    .refine((value) => value >= harareToday(), "Choose a due date from today on."),
  projectId: optionalId,
});

export const projectSchema = z
  .object({
    name: z.string().trim().min(2, "Name the project.").max(80, "Keep it under 80 characters."),
    description: optionalText(1000),
    targetAmount: amountSchema,
    startDate: z.string().refine(isDateOnly, "Choose the start date."),
    endDate: z.preprocess(
      blankToUndefined,
      z.string().refine(isDateOnly, "Choose a valid end date.").optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End on or after the start.",
      });
    }
  });
