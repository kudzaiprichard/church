"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/dal";
import { toDateOnly } from "@/lib/dates";
import { projectSchema } from "@/lib/finance/schema";
import { fieldErrorsFrom } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

import type { FinanceFormState } from "../finance/form-state";

/**
 * Partnership projects (docs/SCOPE.md §9.10). Apostles only — `projects.manage`
 * opens every action. A project's raised amount is never written anywhere; it
 * is the sum of confirmed partnership giving, read live.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): FinanceFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

function data(input: ReturnType<typeof projectSchema.parse>) {
  return {
    name: input.name,
    description: input.description ?? null,
    targetAmount: input.targetAmount,
    startDate: toDateOnly(input.startDate),
    endDate: input.endDate ? toDateOnly(input.endDate) : null,
  };
}

const NAME_TAKEN = "A project with that name already exists.";

export async function createProject(
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const actor = await requirePermission("projects.manage");

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      const project = await tx.partnershipProject.create({
        data: { ...data(parsed.data), createdById: actor.id },
        select: { id: true },
      });
      await recordAuditIn(tx, {
        action: "PROJECT_CREATED",
        actor,
        detail: `${parsed.data.name}, target ${parsed.data.targetAmount}`,
      });
      return project.id;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return failed(formData, { name: NAME_TAKEN });
    }
    throw error;
  }

  revalidatePath("/partnerships", "layout");
  redirect(`/partnerships/${id}`);
}

export async function updateProject(
  projectId: string,
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const actor = await requirePermission("projects.manage");

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const before = await prisma.partnershipProject.findUnique({
    where: { id: projectId },
    select: { targetAmount: true, status: true },
  });
  if (!before) return { error: "That project no longer exists." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.partnershipProject.update({ where: { id: projectId }, data: data(parsed.data) });
      await recordAuditIn(tx, {
        action: "PROJECT_UPDATED",
        actor,
        detail: `${parsed.data.name}, target ${before.targetAmount.toString()} → ${
          parsed.data.targetAmount
        }`,
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return failed(formData, { name: NAME_TAKEN });
    }
    throw error;
  }

  revalidatePath("/partnerships", "layout");
  return { done: "Saved.", attempt: Date.now() };
}

/**
 * Close a project: no further partnership giving is accepted for it. Asks for
 * a ticked confirmation, since there is no way to reopen one from the portal.
 */
export async function completeProject(
  projectId: string,
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const actor = await requirePermission("projects.manage");
  if (formData.get("confirm") !== "on") {
    return { error: "Tick the box to confirm.", attempt: Date.now() };
  }

  const project = await prisma.partnershipProject.findUnique({
    where: { id: projectId },
    select: { name: true, status: true },
  });
  if (!project || project.status !== "ACTIVE") {
    return { error: "Only an active project can be completed." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.partnershipProject.update({
      where: { id: projectId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await recordAuditIn(tx, { action: "PROJECT_COMPLETED", actor, detail: project.name });
  });

  revalidatePath("/partnerships", "layout");
  revalidatePath("/finance", "layout");
  return { done: "Completed. It no longer accepts contributions.", attempt: Date.now() };
}
