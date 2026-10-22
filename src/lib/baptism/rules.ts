import { z } from "zod";

import { isDateOnly } from "@/lib/dates";

/**
 * Baptism administration — the rules (docs/SCOPE.md §9.16). Pure, so the
 * certificate numbering and the derived class status are unit tested.
 */

export type ClassStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

/** Upcoming before its start, ongoing until its end, completed after — or once closed. */
export function classStatus(
  klass: { startDate: string; endDate: string; completedAt: string | null },
  today: string,
): ClassStatus {
  if (klass.completedAt || klass.endDate < today) return "COMPLETED";
  if (klass.startDate > today) return "UPCOMING";
  return "ONGOING";
}

const NUMBER = /^KMMI-BAP-(\d{4})-(\d{4,})$/;

/** "KMMI-BAP-2026-0007". */
export function formatCertificateNumber(year: number, sequence: number): string {
  return `KMMI-BAP-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * The next certificate number for a year, from the ones already issued: one
 * more than the highest sequence that year, starting at 0001.
 */
export function nextCertificateNumber(issued: readonly string[], year: number): string {
  let highest = 0;
  for (const number of issued) {
    const match = NUMBER.exec(number);
    if (match && Number(match[1]) === year) highest = Math.max(highest, Number(match[2]));
  }
  return formatCertificateNumber(year, highest + 1);
}

// ─── Form input ─────────────────────────────────────────────────────────────

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, `Keep it under ${max} characters.`).optional(),
  );

const name = (message: string) =>
  z.string().trim().min(1, message).max(60, "Keep it under 60 characters.");

export const candidateSchema = z.object({
  firstName: name("Enter the first name."),
  lastName: name("Enter the last name."),
  phone: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, "Enter a phone number, for example +263 77 123 4567.")
      .optional(),
  ),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() || undefined : value),
    z.email("Enter a valid email address.").optional(),
  ),
  notes: optionalText(1000),
  status: z.enum(["IN_CLASS", "BAPTIZED", "WITHDRAWN"]).default("IN_CLASS"),
});

export const classSchema = z
  .object({
    name: z.string().trim().min(2, "Name the class.").max(80, "Keep it under 80 characters."),
    instructor: z.string().trim().min(2, "Enter the instructor.").max(80),
    startDate: z.string().refine(isDateOnly, "Choose the start date."),
    endDate: z.string().refine(isDateOnly, "Choose the end date."),
  })
  .superRefine((value, context) => {
    const dated = isDateOnly(value.startDate) && isDateOnly(value.endDate);
    if (dated && value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End on or after the start.",
      });
    }
  });
