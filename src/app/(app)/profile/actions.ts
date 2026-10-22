"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/dal";
import { toDateOnly } from "@/lib/dates";
import { env } from "@/lib/env";
import { fieldErrorsFrom } from "@/lib/forms";
import { ownProfileSchema } from "@/lib/members/schema";
import { prisma } from "@/lib/prisma";
import { acceptUpload, remove } from "@/lib/storage";
import { isKeyIn, keyFromUrl } from "@/lib/storage-rules";

import type { ProfileFormState } from "./form-state";

/**
 * A member's edit of their own record (docs/SCOPE.md §9.3).
 *
 * Only the personal fields: phone, address, date of birth, gender. Name and
 * email are the church office's to change — the email is what they sign in
 * with — so they are not read from the form at all, whatever it posts. The
 * row being written is the session's own; there is no id to tamper with.
 */
export async function updateOwnProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireSession();

  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  const values = {
    phone: text("phone"),
    address: text("address"),
    dateOfBirth: text("dateOfBirth"),
    gender: text("gender"),
  };

  const parsed = ownProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values, attempt: Date.now() };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      dateOfBirth: parsed.data.dateOfBirth ? toDateOnly(parsed.data.dateOfBirth) : null,
      gender: parsed.data.gender ?? null,
    },
  });

  revalidatePath("/profile");
  return { done: true, attempt: Date.now() };
}

/**
 * Set the signed-in person's photo from a finished upload.
 *
 * The key must be one the app issued for avatars, and `acceptUpload` checks
 * the stored file is an image under 2 MB before the profile points at it. The
 * previous photo is deleted from storage afterwards.
 */
export async function setAvatar(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireSession();

  const key = formData.get("avatarKey");
  if (!isKeyIn("avatars", key)) {
    return { fieldErrors: { avatarKey: "Choose a photo first." }, attempt: Date.now() };
  }
  const accepted = await acceptUpload("avatars", key);
  if ("error" in accepted) {
    return { fieldErrors: { avatarKey: accepted.error }, attempt: Date.now() };
  }

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { avatarUrl: true },
  });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: accepted.url } });
  await remove(avatarKeyOf(before.avatarUrl));

  revalidatePath("/", "layout");
  return { done: true, attempt: Date.now() };
}

export async function removeAvatar() {
  const user = await requireSession();
  const before = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { avatarUrl: true },
  });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  await remove(avatarKeyOf(before.avatarUrl));
  revalidatePath("/", "layout");
}

/** The storage key behind a photo URL the app stored — never anything else. */
function avatarKeyOf(url: string | null) {
  const key = env.R2_PUBLIC_URL ? keyFromUrl(env.R2_PUBLIC_URL, url) : null;
  return isKeyIn("avatars", key) ? key : null;
}
