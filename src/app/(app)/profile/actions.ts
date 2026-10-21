"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/dal";
import { toDateOnly } from "@/lib/dates";
import { fieldErrorsFrom } from "@/lib/forms";
import { ownProfileSchema } from "@/lib/members/schema";
import { prisma } from "@/lib/prisma";

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
