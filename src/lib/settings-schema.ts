import { z } from "zod";

import type { SocialPlatform } from "@/generated/prisma/enums";

/**
 * What the settings forms may save, checked on the server (SCOPE §9.17–9.18).
 *
 * Pure, so the rules — above all the social-link domain rule — are unit
 * tested rather than trusted to the form.
 */

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optional = (max: number) =>
  z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .max(max, `Keep it under ${max.toLocaleString("en-GB")} characters.`)
      .optional(),
  );

const required = (message: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Keep it under ${max.toLocaleString("en-GB")} characters.`);

export const churchInfoSchema = z.object({
  name: required("Enter the church's name.", 120),
  shortName: required("Enter a short name, such as KMMI.", 20),
  tagline: optional(240),
  mission: optional(2000),
  vision: optional(2000),
  doctrine: optional(5000),
  address: optional(240),
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
});

export const themeSchema = z.object({
  year: z.coerce
    .number({ error: "Enter the year." })
    .int("Enter the year.")
    .min(2000, "Enter a year from 2000 on.")
    .max(2100, "Enter a year before 2100."),
  title: required("Enter the theme's title.", 120),
  scriptureRef: required("Enter the scripture reference, such as 2 Corinthians 5:20.", 80),
  verseText: required("Enter the verse.", 1000),
  description: optional(2000),
});

/** The domains each platform's links must live on. */
const PLATFORM_HOSTS: Record<SocialPlatform, readonly string[]> = {
  FACEBOOK: ["facebook.com", "fb.com"],
  INSTAGRAM: ["instagram.com"],
  YOUTUBE: ["youtube.com", "youtu.be"],
  WHATSAPP: ["wa.me"],
};

/**
 * True for an `https://` URL on the platform's own domain or a subdomain of
 * it (`www.`, `m.`). Anything else — another site, plain http, a
 * `javascript:` URL — is refused, because these links are rendered on the
 * public site as buttons visitors trust.
 */
export function isPlatformUrl(platform: SocialPlatform, value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  return PLATFORM_HOSTS[platform].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function platformHint(platform: SocialPlatform) {
  return `Must start with https:// and be on ${PLATFORM_HOSTS[platform].join(" or ")}.`;
}

/** One platform's row. A hidden link may be left empty; a visible one may not. */
export function socialLinkSchema(platform: SocialPlatform) {
  return z
    .object({
      handle: optional(80),
      url: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
      isVisible: z.boolean(),
    })
    .superRefine((value, ctx) => {
      if (value.url && !isPlatformUrl(platform, value.url)) {
        ctx.addIssue({ code: "custom", path: ["url"], message: platformHint(platform) });
      }
      if (value.isVisible && !value.url) {
        ctx.addIssue({
          code: "custom",
          path: ["url"],
          message: "Add a link, or hide this platform.",
        });
      }
      if (value.isVisible && !value.handle) {
        ctx.addIssue({
          code: "custom",
          path: ["handle"],
          message: "Add the handle shown under the button.",
        });
      }
    });
}
