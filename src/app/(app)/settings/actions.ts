"use server";

import { revalidatePath, updateTag } from "next/cache";

import type { SocialPlatform } from "@/generated/prisma/enums";
import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/dal";
import { fieldErrorsFrom } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { SETTINGS_TAG, SOCIAL_PLATFORMS } from "@/lib/settings";
import { churchInfoSchema, socialLinkSchema, themeSchema } from "@/lib/settings-schema";

import type { SettingsFormState } from "./form-state";

/**
 * Church information, the Theme of the Year and social links (SCOPE §9.17–9.18).
 *
 * Apostles only, checked first in every action. Each save writes its audit
 * entry in the same transaction, then expires the `church-settings` cache
 * with `updateTag` — not `revalidateTag`, which would serve the old theme to
 * the next visitor while it refreshed in the background. The scope promises
 * the change on the next load.
 */

/** Every string field of a form, for refilling it after a failed save. */
function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): SettingsFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

function saved(): SettingsFormState {
  updateTag(SETTINGS_TAG);
  revalidatePath("/settings", "layout");
  return { done: true, attempt: Date.now() };
}

export async function updateChurchInfo(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await requirePermission("settings.manage");

  const parsed = churchInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const data = {
    name: parsed.data.name,
    shortName: parsed.data.shortName,
    tagline: parsed.data.tagline ?? null,
    mission: parsed.data.mission ?? null,
    vision: parsed.data.vision ?? null,
    doctrine: parsed.data.doctrine ?? null,
    address: parsed.data.address ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
  };

  await prisma.$transaction(async (tx) => {
    const before = await tx.churchSettings.findUnique({ where: { id: "church" } });
    const changed = (Object.keys(data) as (keyof typeof data)[]).filter(
      (key) => !before || before[key] !== data[key],
    );

    await tx.churchSettings.upsert({
      where: { id: "church" },
      create: { id: "church", ...data, updatedById: actor.id },
      update: { ...data, updatedById: actor.id },
    });
    await recordAuditIn(tx, {
      action: "SETTINGS_UPDATED",
      actor,
      detail: `church information: ${changed.length > 0 ? changed.join(", ") : "no changes"}`,
    });
  });

  return saved();
}

/**
 * Save one year's theme. An existing year is updated; a new year is created,
 * and becomes the current theme if it is the highest.
 */
export async function saveTheme(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await requirePermission("settings.manage");

  const parsed = themeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const { year, ...rest } = parsed.data;
  const data = { ...rest, description: rest.description ?? null, updatedById: actor.id };

  await prisma.$transaction(async (tx) => {
    const existed = await tx.themeOfYear.findUnique({ where: { year }, select: { id: true } });
    await tx.themeOfYear.upsert({ where: { year }, create: { year, ...data }, update: data });
    await recordAuditIn(tx, {
      action: "THEME_UPDATED",
      actor,
      detail: `${year} theme ${existed ? "updated" : "created"}: ${rest.title}`,
    });
  });

  return saved();
}

/** All four platforms in one save, so the public buttons change together. */
export async function updateSocialLinks(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await requirePermission("settings.manage");

  const rows: {
    platform: SocialPlatform;
    handle?: string;
    url?: string;
    isVisible: boolean;
  }[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const { platform } of SOCIAL_PLATFORMS) {
    const parsed = socialLinkSchema(platform).safeParse({
      handle: formData.get(`${platform}.handle`) ?? undefined,
      url: formData.get(`${platform}.url`) ?? undefined,
      isVisible: formData.get(`${platform}.isVisible`) === "on",
    });
    if (!parsed.success) {
      for (const [field, message] of Object.entries(fieldErrorsFrom(parsed.error.issues))) {
        fieldErrors[`${platform}.${field}`] = message;
      }
    } else {
      rows.push({ platform, ...parsed.data });
    }
  }

  if (Object.keys(fieldErrors).length > 0) return failed(formData, fieldErrors);

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      // A platform with no link is removed rather than stored empty, so the
      // public site never renders a button that goes nowhere.
      if (!row.url) {
        await tx.socialLink.deleteMany({ where: { platform: row.platform } });
        continue;
      }
      const data = { handle: row.handle ?? "", url: row.url, isVisible: row.isVisible };
      await tx.socialLink.upsert({
        where: { platform: row.platform },
        create: { platform: row.platform, ...data },
        update: data,
      });
    }
    await recordAuditIn(tx, {
      action: "SETTINGS_UPDATED",
      actor,
      detail: `social links: ${rows
        .map(
          (row) =>
            `${row.platform.toLowerCase()} ${row.url ? (row.isVisible ? "shown" : "hidden") : "removed"}`,
        )
        .join(", ")}`,
    });
  });

  return saved();
}
