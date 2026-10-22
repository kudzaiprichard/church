"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/dal";
import { devotionSchema } from "@/lib/content/rules";
import { DEVOTIONS_TAG } from "@/lib/data/devotions";
import { toDateOnly } from "@/lib/dates";
import { fieldErrorsFrom } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

import type { SermonFormState } from "../sermons/form-state";

/**
 * Daily devotions (docs/SCOPE.md §9.14). Apostles only — `devotions.manage`
 * opens each action. Saving one never "publishes" it: whether readers see it
 * is decided by its date at read time, so there is no publish step to forget
 * and no job to run.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): SermonFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

function changed(id?: string) {
  updateTag(DEVOTIONS_TAG);
  revalidatePath("/devotions", "layout");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/devotions/${id}`);
}

type DevotionData = {
  title: string;
  authorId: string;
  scriptureRef: string;
  scriptureQuote: string;
  body: string;
  publishOn: Date | null;
};

async function parse(
  formData: FormData,
): Promise<{ state: SermonFormState } | { data: DevotionData }> {
  const parsed = devotionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { state: failed(formData, fieldErrorsFrom(parsed.error.issues)) };

  // The author must be an Apostle; a tampered id cannot name anyone else.
  const author = await prisma.user.findFirst({
    where: { id: parsed.data.authorId, role: "APOSTLE", isActive: true },
    select: { id: true },
  });
  if (!author) return { state: failed(formData, { authorId: "Choose one of the Apostles." }) };

  const input = parsed.data;
  return {
    data: {
      title: input.title,
      authorId: author.id,
      scriptureRef: input.scriptureRef,
      scriptureQuote: input.scriptureQuote,
      body: input.body,
      publishOn: input.publishOn ? toDateOnly(input.publishOn) : null,
    },
  };
}

export async function createDevotion(
  _previous: SermonFormState,
  formData: FormData,
): Promise<SermonFormState> {
  await requirePermission("devotions.manage");
  const result = await parse(formData);
  if ("state" in result) return result.state;

  const devotion = await prisma.devotion.create({ data: result.data, select: { id: true } });

  changed();
  redirect(`/devotions/${devotion.id}`);
}

export async function updateDevotion(
  devotionId: string,
  _previous: SermonFormState,
  formData: FormData,
): Promise<SermonFormState> {
  await requirePermission("devotions.manage");
  const result = await parse(formData);
  if ("state" in result) return result.state;

  const updated = await prisma.devotion.updateMany({
    where: { id: devotionId },
    data: result.data,
  });
  if (updated.count === 0) return { error: "That devotion no longer exists." };

  changed(devotionId);
  redirect(`/devotions/${devotionId}`);
}

export async function deleteDevotion(devotionId: string) {
  const actor = await requirePermission("devotions.manage");

  const devotion = await prisma.devotion.findUnique({
    where: { id: devotionId },
    select: { title: true },
  });
  if (!devotion) redirect("/devotions");

  await prisma.$transaction(async (tx) => {
    await tx.devotion.delete({ where: { id: devotionId } });
    await recordAuditIn(tx, { action: "DEVOTION_DELETED", actor, detail: devotion.title });
  });

  changed();
  redirect("/devotions");
}
