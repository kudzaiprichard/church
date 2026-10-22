import { z } from "zod";

import { isDateOnly } from "@/lib/dates";
import { isYouTubeUrl } from "@/lib/storage-rules";

/**
 * Sermons, notes and devotions — the rules (docs/SCOPE.md §9.11–9.14). Pure,
 * so the date rule that hides a scheduled devotion is unit tested.
 */

/** The church's two preachers; anyone else is entered as a guest speaker. */
export const PREACHERS = ["Apostle Takura James Makamba", "Apostle Edna Makamba"] as const;

/** Offered as suggestions in the series field, beside any series already used. */
export const SERIES_SUGGESTIONS = ["Kingdom Living", "Ambassadors of Christ", "Faith Foundations"];

export type DevotionStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

/** Null is a draft; a day after Harare's today is scheduled; today or earlier is published. */
export function devotionStatus(publishOn: string | null, today: string): DevotionStatus {
  if (!publishOn) return "DRAFT";
  return publishOn > today ? "SCHEDULED" : "PUBLISHED";
}

/**
 * The filter every reader's devotion query carries: published on or before
 * Harare's today. This is the whole of "scheduling" — nothing publishes a
 * devotion; tomorrow's simply does not match until tomorrow.
 */
export function publishedBy(today: string) {
  return { publishOn: { not: null, lte: new Date(`${today}T00:00:00.000Z`) } };
}

/** "Kingdom, faith ,  , prayer" → ["kingdom", "faith", "prayer"]. */
export function parseTags(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, " "))
        .filter((tag) => tag.length > 0 && tag.length <= 30),
    ),
  ].slice(0, 12);
}

/** Paragraphs as typed: blank lines separate them. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// ─── Form input ─────────────────────────────────────────────────────────────

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, `Keep it under ${max} characters.`).optional(),
  );

const required = (message: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Keep it under ${max.toLocaleString("en-GB")} characters.`);

export const sermonSchema = z
  .object({
    title: required("Give the sermon a title.", 160),
    /** One of PREACHERS, or "GUEST" with `guestName`. */
    preacher: z.string().min(1, "Choose the preacher."),
    guestName: optionalText(80),
    preachedAt: z.string().refine(isDateOnly, "Choose the date it was preached."),
    seriesName: optionalText(80),
    scriptureRef: optionalText(80),
    summary: required("Write a short summary.", 2000).refine(
      (value) => paragraphs(value).length <= 2,
      "Keep the summary to two paragraphs.",
    ),
    videoUrl: z.preprocess(
      blankToUndefined,
      z
        .string()
        .trim()
        .refine(isYouTubeUrl, "Paste a YouTube link (youtube.com or youtu.be).")
        .optional(),
    ),
    tags: z.preprocess(parseTags, z.array(z.string())),
    isPublished: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  })
  .superRefine((value, context) => {
    if (value.preacher === "GUEST" && !value.guestName) {
      context.addIssue({
        code: "custom",
        path: ["guestName"],
        message: "Enter the guest's name.",
      });
    }
    if (value.preacher !== "GUEST" && !(PREACHERS as readonly string[]).includes(value.preacher)) {
      context.addIssue({ code: "custom", path: ["preacher"], message: "Choose the preacher." });
    }
  });

export type SermonInput = z.infer<typeof sermonSchema>;

/** The preacher's name to store, from the select and the guest field. */
export function preacherName(input: Pick<SermonInput, "preacher" | "guestName">) {
  return input.preacher === "GUEST" ? input.guestName! : input.preacher;
}

export const devotionSchema = z.object({
  title: required("Give it a title.", 120),
  authorId: z.string().min(1, "Choose the author.").max(40),
  scriptureRef: required("Enter the scripture reference.", 80),
  scriptureQuote: required("Quote the scripture.", 800),
  body: required("Write the devotion.", 6000),
  publishOn: z.preprocess(
    blankToUndefined,
    z.string().refine(isDateOnly, "Choose a valid date, or leave it empty for a draft.").optional(),
  ),
});

export const NOTE_MAX = 20_000;

export const noteSchema = z.object({
  body: z
    .string()
    .max(NOTE_MAX, `Notes are limited to ${NOTE_MAX.toLocaleString("en-GB")} characters.`),
});
