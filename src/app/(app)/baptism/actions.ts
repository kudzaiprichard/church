"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/dal";
import { candidateSchema, classSchema, nextCertificateNumber } from "@/lib/baptism/rules";
import { harareToday, isDateOnly, toDateOnly } from "@/lib/dates";
import { fieldErrorsFrom } from "@/lib/forms";
import { idListSchema } from "@/lib/groups/schema";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

import type { GroupFormState as BaptismFormState } from "../groups/form-state";

/**
 * Baptism administration (docs/SCOPE.md §9.16) — the Matron's and the
 * Apostles'. Every action starts with `requirePermission("baptism.manage")`,
 * which is all the Matron holds besides enrolment: nothing here reaches
 * finance, settings or any group's data.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): BaptismFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

function changed() {
  revalidatePath("/baptism", "layout");
  revalidatePath("/profile");
}

/**
 * Issue the certificate for a baptismal record: the next number for this
 * Harare year, today's date and the issuer's name. Serializable, so two
 * certificates issued at the same moment cannot take the same number — the
 * unique index on the number is the backstop.
 */
export async function issueCertificate(recordId: string) {
  const actor = await requirePermission("baptism.manage");
  const year = Number(harareToday().slice(0, 4));

  const issued = await prisma
    .$transaction(
      async (tx) => {
        const record = await tx.baptismalRecord.findUnique({
          where: { id: recordId },
          select: { certificateNumber: true, user: { select: { id: true, email: true } } },
        });
        if (!record || record.certificateNumber) return null;

        const taken = await tx.baptismalRecord.findMany({
          where: { certificateNumber: { startsWith: `KMMI-BAP-${year}-` } },
          select: { certificateNumber: true },
        });
        const number = nextCertificateNumber(
          taken.map((row) => row.certificateNumber!),
          year,
        );

        await tx.baptismalRecord.update({
          where: { id: recordId },
          data: {
            certificateNumber: number,
            certificateIssuedAt: new Date(),
            certificateIssuedBy: `${actor.firstName} ${actor.lastName}`,
          },
        });
        await recordAuditIn(tx, {
          action: "CERTIFICATE_ISSUED",
          actor,
          target: record.user,
          detail: number,
        });
        return notify(tx, {
          userIds: [record.user.id],
          type: "GROUP_ACTIVITY",
          title: "Your baptism certificate has been issued",
          body: number,
          linkUrl: "/profile",
        });
      },
      { isolationLevel: "Serializable" },
    )
    // A concurrent issue won the race; nothing was written here.
    .catch(() => null);

  await issued?.();
  changed();
}

export async function updateRecord(
  recordId: string,
  _previous: BaptismFormState,
  formData: FormData,
): Promise<BaptismFormState> {
  const actor = await requirePermission("baptism.manage");

  const values = textValues(formData);
  const errors: Record<string, string> = {};
  const today = harareToday();
  if (!isDateOnly(values.baptismDate ?? "") || values.baptismDate > today) {
    errors.baptismDate = "Enter the baptism date, not in the future.";
  }
  if (!values.location?.trim()) errors.location = "Enter where.";
  if (!values.conductedBy?.trim()) errors.conductedBy = "Enter who conducted it.";
  const completed = values.classCompletedOn?.trim();
  if (completed && (!isDateOnly(completed) || completed > today)) {
    errors.classCompletedOn = "Enter a real date, not in the future.";
  }
  if (Object.keys(errors).length > 0) return failed(formData, errors);

  const record = await prisma.baptismalRecord.findUnique({
    where: { id: recordId },
    select: { user: { select: { id: true, email: true } } },
  });
  if (!record) return { error: "That record no longer exists." };

  await prisma.$transaction(async (tx) => {
    await tx.baptismalRecord.update({
      where: { id: recordId },
      data: {
        baptismDate: toDateOnly(values.baptismDate),
        location: values.location.trim().slice(0, 120),
        conductedBy: values.conductedBy.trim().slice(0, 120),
        classCompletedOn: completed ? toDateOnly(completed) : null,
        notes: values.notes?.trim().slice(0, 1000) || null,
      },
    });
    await recordAuditIn(tx, { action: "BAPTISM_RECORD_UPDATED", actor, target: record.user });
  });

  changed();
  return { done: "Saved.", attempt: Date.now() };
}

export async function createCandidate(
  _previous: BaptismFormState,
  formData: FormData,
): Promise<BaptismFormState> {
  await requirePermission("baptism.manage");
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  await prisma.baptismCandidate.create({
    data: { ...parsed.data, phone: parsed.data.phone ?? null, email: parsed.data.email ?? null },
  });
  changed();
  return { done: "Candidate added.", attempt: Date.now() };
}

/** Withdraw a candidate, or put them back in class. Baptized is set only by enrolment. */
export async function setCandidateStatus(candidateId: string, status: "IN_CLASS" | "WITHDRAWN") {
  await requirePermission("baptism.manage");
  await prisma.baptismCandidate.updateMany({
    where: { id: candidateId, userId: null },
    data: { status },
  });
  changed();
}

export async function createClass(
  _previous: BaptismFormState,
  formData: FormData,
): Promise<BaptismFormState> {
  await requirePermission("baptism.manage");
  const parsed = classSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const created = await prisma.baptismalClass.create({
    data: {
      name: parsed.data.name,
      instructor: parsed.data.instructor,
      startDate: toDateOnly(parsed.data.startDate),
      endDate: toDateOnly(parsed.data.endDate),
    },
    select: { id: true },
  });
  changed();
  redirect(`/baptism/classes/${created.id}`);
}

export async function enrollCandidates(
  classId: string,
  _previous: BaptismFormState,
  formData: FormData,
): Promise<BaptismFormState> {
  await requirePermission("baptism.manage");
  const parsed = idListSchema.safeParse(formData.getAll("candidateIds"));
  if (!parsed.success || parsed.data.length === 0) {
    return { fieldErrors: { candidateIds: "Choose at least one candidate." }, attempt: Date.now() };
  }

  const candidates = await prisma.baptismCandidate.findMany({
    where: { id: { in: parsed.data }, status: "IN_CLASS" },
    select: { id: true },
  });
  await prisma.baptismalClassEnrollment.createMany({
    data: candidates.map((candidate) => ({ classId, candidateId: candidate.id })),
    skipDuplicates: true,
  });
  changed();
  return { done: `Added ${candidates.length}.`, attempt: Date.now() };
}

export async function removeEnrollment(enrollmentId: string) {
  await requirePermission("baptism.manage");
  await prisma.baptismalClassEnrollment.deleteMany({ where: { id: enrollmentId } });
  changed();
}

/** Mark one enrollee as having completed the class, on a date (today by default). */
export async function markCompleted(enrollmentId: string, formData: FormData) {
  await requirePermission("baptism.manage");
  const date = String(formData.get("completedOn") ?? "") || harareToday();
  if (!isDateOnly(date) || date > harareToday()) return;
  await prisma.baptismalClassEnrollment.updateMany({
    where: { id: enrollmentId },
    data: { completedOn: toDateOnly(date) },
  });
  changed();
}

/** Close a class: it shows as completed whatever its dates say. */
export async function closeClass(classId: string) {
  await requirePermission("baptism.manage");
  await prisma.baptismalClass.updateMany({
    where: { id: classId, completedAt: null },
    data: { completedAt: new Date() },
  });
  changed();
}
