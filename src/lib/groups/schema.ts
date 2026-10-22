import { z } from "zod";

/**
 * What a connect group may contain, checked on the server (docs/SCOPE.md §9.4).
 *
 * Pure, like the member schema beside it: the actions parse with this and the
 * unit tests exercise it directly.
 */

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, `Keep it under ${max} characters.`).optional(),
  );

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the group's name.")
    .max(60, "Keep the name under 60 characters.")
    .refine((value) => slugify(value).length > 0, "Use letters or numbers in the name."),
  audience: optionalText(80),
  description: optionalText(600),
});

export type GroupInput = z.infer<typeof groupSchema>;

/**
 * "Kingdom Total Women" → "kingdom-total-women".
 *
 * Derived from the name rather than typed, so it is never something a leader
 * has to think about. Accents are folded (`é` → `e`) and anything else that is
 * not a letter or digit becomes a single hyphen.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Ids posted as one form field per value, de-duplicated and bounded. */
export const idListSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(200, "Choose fewer people at once.")
  .transform((ids) => [...new Set(ids)]);
