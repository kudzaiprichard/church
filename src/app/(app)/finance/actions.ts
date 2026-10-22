"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission, requireSession, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { harareToday, toDateOnly } from "@/lib/dates";
import { expectedChema, MONTHS } from "@/lib/finance/chema";
import { formatMoney, fromCents, toCents } from "@/lib/finance/money";
import {
  paymentSchema,
  pledgeSchema,
  rejectSchema,
  reversalSchema,
  type PaymentInput,
} from "@/lib/finance/schema";
import { TYPE_LABELS } from "@/lib/finance/totals";
import { fieldErrorsFrom } from "@/lib/forms";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

import type { FinanceFormState } from "./form-state";

/**
 * Giving (docs/SCOPE.md §9.9–9.10).
 *
 * The rules this file keeps:
 *   * a member's own log is PENDING; only an Apostle or the Elder confirms it
 *     (SCOPE §11 Q2), and never their own
 *   * an officer recording cash handed in creates it CONFIRMED, audited
 *   * a CONFIRMED row is never edited or deleted — no action here updates an
 *     amount or deletes a contribution. A mistake is answered with a reversing
 *     entry: a negative amount that points at the row it cancels
 *   * one chema per member per month, enforced by the database
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

function changed() {
  revalidatePath("/finance", "layout");
  revalidatePath("/partnerships", "layout");
  revalidatePath("/members", "layout");
  revalidatePath("/dashboard");
}

const CHEMA_TAKEN =
  "That month's chema is already logged. If it was rejected you can log it again; otherwise ask the church office.";

/** Unique-index violations — here only the one-chema-per-month index can fire. */
const isDuplicate = (error: unknown) => (error as { code?: string }).code === "P2002";

/** Set a pledge FULFILLED when its confirmed payments reach the total, or back to ACTIVE. */
async function settlePledge(tx: Prisma.TransactionClient, pledgeId: string | null) {
  if (!pledgeId) return;
  const pledge = await tx.pledge.findUnique({
    where: { id: pledgeId },
    select: { status: true, totalAmount: true },
  });
  if (!pledge || pledge.status === "CANCELLED") return;

  const sum = await tx.contribution.aggregate({
    where: { pledgeId, status: "CONFIRMED" },
    _sum: { amount: true },
  });
  const paid = sum._sum.amount ? toCents(sum._sum.amount) : 0;
  const status = paid >= toCents(pledge.totalAmount) ? "FULFILLED" : "ACTIVE";
  if (status !== pledge.status) {
    await tx.pledge.update({ where: { id: pledgeId }, data: { status } });
  }
}

/**
 * The columns a payment becomes, after checking what the form named: the
 * project must be active, the pledge the member's own and still open, and the
 * chema amount is the month's — not whatever was typed.
 */
type PaymentData = Omit<Prisma.ContributionUncheckedCreateInput, "recordedById" | "status">;

async function paymentData(
  memberId: string,
  input: PaymentInput,
): Promise<{ data: PaymentData } | { fieldErrors: Record<string, string> }> {
  if (input.type === "PARTNERSHIP") {
    const project = await prisma.partnershipProject.findUnique({
      where: { id: input.projectId! },
      select: { status: true },
    });
    if (!project || project.status !== "ACTIVE") {
      return { fieldErrors: { projectId: "Choose an active project." } };
    }
  }

  if (input.pledgeId) {
    const pledge = await prisma.pledge.findFirst({
      where: { id: input.pledgeId, userId: memberId, status: "ACTIVE" },
      select: { projectId: true },
    });
    if (!pledge) return { fieldErrors: { pledgeId: "Choose one of your open pledges." } };
    if (pledge.projectId && pledge.projectId !== (input.projectId ?? null)) {
      return { fieldErrors: { pledgeId: "That pledge is for a different project." } };
    }
  }

  const chema = input.type === "CHEMA";
  return {
    data: {
      userId: memberId,
      type: input.type,
      amount: chema ? fromCents(expectedChema(input.chemaMonth!)) : input.amount!,
      paidAt: toDateOnly(input.paidAt),
      note: input.note ?? null,
      chemaYear: chema ? input.chemaYear! : null,
      chemaMonth: chema ? input.chemaMonth! : null,
      projectId: input.type === "PARTNERSHIP" ? input.projectId! : null,
      pledgeId: chema ? null : (input.pledgeId ?? null),
    },
  };
}

/** What a payment was, in a few words, for notifications and the audit log. */
function describe(row: {
  type: keyof typeof TYPE_LABELS;
  amount: { toString(): string };
  chemaMonth: number | null;
  chemaYear: number | null;
}) {
  const what =
    row.type === "CHEMA" && row.chemaMonth
      ? `${MONTHS[row.chemaMonth - 1]} ${row.chemaYear} chema`
      : TYPE_LABELS[row.type].toLowerCase();
  return `${formatMoney(toCents(row.amount))} ${what}`;
}

/** A member logs their own payment. It counts once an officer confirms it. */
export async function logPayment(
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const member = await requireSession();

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const resolved = await paymentData(member.id, parsed.data);
  if ("fieldErrors" in resolved) return failed(formData, resolved.fieldErrors);

  try {
    await prisma.contribution.create({
      data: { ...resolved.data, status: "PENDING", recordedById: member.id },
    });
  } catch (error) {
    if (isDuplicate(error)) return failed(formData, { chemaMonth: CHEMA_TAKEN });
    throw error;
  }

  changed();
  return {
    done: "Logged. It shows as pending until the church office confirms it.",
    attempt: Date.now(),
  };
}

/** An officer records a payment handed in — confirmed at once, and audited. */
export async function recordForMember(
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const officer = await requirePermission("finance.confirm");

  const memberId = String(formData.get("memberId") ?? "");
  const member = await prisma.user.findFirst({
    where: { id: memberId, isActive: true },
    select: { id: true, email: true },
  });
  if (!member) return failed(formData, { memberId: "Choose a member." });

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const resolved = await paymentData(member.id, parsed.data);
  if ("fieldErrors" in resolved) return failed(formData, resolved.fieldErrors);

  let deliver: () => Promise<void>;
  try {
    deliver = await prisma.$transaction(async (tx) => {
      const row = await tx.contribution.create({
        data: {
          ...resolved.data,
          status: "CONFIRMED",
          recordedById: officer.id,
          reviewedById: officer.id,
          reviewedAt: new Date(),
        },
      });
      await settlePledge(tx, row.pledgeId);
      await recordAuditIn(tx, {
        action: "CONTRIBUTION_RECORDED_FOR_MEMBER",
        actor: officer,
        target: member,
        detail: describe(row),
      });
      return notify(tx, {
        userIds: [member.id],
        type: "CONTRIBUTION_REVIEWED",
        title: `Recorded: ${describe(row)}`,
        body: `By ${officer.firstName} ${officer.lastName}`,
        linkUrl: "/finance",
      });
    });
  } catch (error) {
    if (isDuplicate(error)) return failed(formData, { chemaMonth: CHEMA_TAKEN });
    throw error;
  }
  await deliver();

  changed();
  return { done: "Recorded and confirmed.", attempt: Date.now() };
}

/**
 * Confirm pending payments. Only PENDING rows move, so a confirmed or rejected
 * one is untouched however often this is called; an officer's own payments
 * are left for another officer.
 */
async function confirm(officer: SessionUser, ids: string[]) {
  const rows = await prisma.contribution.findMany({
    where: { id: { in: ids }, status: "PENDING", userId: { not: officer.id } },
    select: {
      id: true,
      type: true,
      amount: true,
      chemaMonth: true,
      chemaYear: true,
      pledgeId: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (rows.length === 0) return 0;

  const deliveries = await prisma.$transaction(async (tx) => {
    const sends = [];
    for (const row of rows) {
      const updated = await tx.contribution.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: { status: "CONFIRMED", reviewedById: officer.id, reviewedAt: new Date() },
      });
      if (updated.count === 0) continue;
      await settlePledge(tx, row.pledgeId);
      await recordAuditIn(tx, {
        action: "CONTRIBUTION_CONFIRMED",
        actor: officer,
        target: row.user,
        detail: describe(row),
      });
      sends.push(
        await notify(tx, {
          userIds: [row.user.id],
          type: "CONTRIBUTION_REVIEWED",
          title: `Confirmed: ${describe(row)}`,
          linkUrl: "/finance",
        }),
      );
    }
    return sends;
  });
  for (const deliver of deliveries) await deliver();

  changed();
  return deliveries.length;
}

export async function confirmContribution(id: string) {
  const officer = await requirePermission("finance.confirm");
  await confirm(officer, [id]);
}

/** Bulk confirm: every ticked row in the review queue. */
export async function confirmSelected(
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const officer = await requirePermission("finance.confirm");
  const ids = formData
    .getAll("ids")
    .filter((value): value is string => typeof value === "string" && value.length <= 40)
    .slice(0, 200);
  if (ids.length === 0) return { error: "Tick the payments to confirm.", attempt: Date.now() };

  const count = await confirm(officer, ids);
  return {
    done:
      count === 0
        ? "Nothing to confirm."
        : `Confirmed ${count} ${count === 1 ? "payment" : "payments"}.`,
    attempt: Date.now(),
  };
}

export async function rejectContribution(
  id: string,
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const officer = await requirePermission("finance.confirm");

  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const row = await prisma.contribution.findFirst({
    where: { id, status: "PENDING", userId: { not: officer.id } },
    select: {
      type: true,
      amount: true,
      chemaMonth: true,
      chemaYear: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!row) return { error: "That payment is no longer waiting for review." };

  const deliver = await prisma.$transaction(async (tx) => {
    const updated = await tx.contribution.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "REJECTED",
        rejectReason: parsed.data.reason,
        reviewedById: officer.id,
        reviewedAt: new Date(),
      },
    });
    if (updated.count === 0) return async () => {};
    await recordAuditIn(tx, {
      action: "CONTRIBUTION_REJECTED",
      actor: officer,
      target: row.user,
      detail: `${describe(row)}: ${parsed.data.reason}`,
    });
    return notify(tx, {
      userIds: [row.user.id],
      type: "CONTRIBUTION_REVIEWED",
      title: `Not confirmed: ${describe(row)}`,
      body: parsed.data.reason,
      linkUrl: "/finance",
    });
  });
  await deliver();

  changed();
  return { done: "Rejected. The member has been told why.", attempt: Date.now() };
}

/**
 * Correct a confirmed contribution with a reversing entry — the only way a
 * confirmed row's effect is ever undone. The original stays exactly as it was.
 */
export async function reverseContribution(
  id: string,
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const officer = await requirePermission("finance.confirm");

  const parsed = reversalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const original = await prisma.contribution.findFirst({
    where: { id, status: "CONFIRMED", reversalOfId: null, reversedBy: null },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      chemaYear: true,
      chemaMonth: true,
      projectId: true,
      pledgeId: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!original) return { error: "Only a confirmed payment that has not been reversed can be." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contribution.create({
        data: {
          userId: original.userId,
          type: original.type,
          amount: fromCents(-toCents(original.amount)),
          paidAt: toDateOnly(harareToday()),
          note: parsed.data.note,
          chemaYear: original.chemaYear,
          chemaMonth: original.chemaMonth,
          projectId: original.projectId,
          pledgeId: original.pledgeId,
          status: "CONFIRMED",
          recordedById: officer.id,
          reviewedById: officer.id,
          reviewedAt: new Date(),
          reversalOfId: original.id,
        },
      });
      await settlePledge(tx, original.pledgeId);
      await recordAuditIn(tx, {
        action: "CONTRIBUTION_RECORDED_FOR_MEMBER",
        actor: officer,
        target: original.user,
        detail: `reversal of ${describe(original)}: ${parsed.data.note}`,
      });
    });
  } catch (error) {
    // The unique index on `reversalOfId` settles two officers reversing at once.
    if (isDuplicate(error)) return { error: "That payment has already been reversed." };
    throw error;
  }

  changed();
  return {
    done: "Reversed. The original stays on record beside the reversal.",
    attempt: Date.now(),
  };
}

export async function createPledge(
  _previous: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const member = await requireSession();

  const parsed = pledgeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  if (input.projectId) {
    const project = await prisma.partnershipProject.findUnique({
      where: { id: input.projectId },
      select: { status: true },
    });
    if (project?.status !== "ACTIVE") {
      return failed(formData, { projectId: "Choose an active project." });
    }
  }

  await prisma.pledge.create({
    data: {
      userId: member.id,
      description: input.description,
      totalAmount: input.totalAmount,
      dueDate: toDateOnly(input.dueDate),
      projectId: input.projectId ?? null,
    },
  });

  changed();
  return {
    done: "Pledge made. Payments you log against it fill its progress bar.",
    attempt: Date.now(),
  };
}

/** Cancel a pledge: the member's own, or anyone's for a finance officer (audited). */
export async function cancelPledge(id: string) {
  const user = await requireSession();
  const pledge = await prisma.pledge.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      description: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!pledge || pledge.status !== "ACTIVE") return;

  const own = pledge.userId === user.id;
  if (!own && !can(user, "finance.viewAll")) return;

  await prisma.$transaction(async (tx) => {
    await tx.pledge.update({ where: { id }, data: { status: "CANCELLED" } });
    if (!own) {
      await recordAuditIn(tx, {
        action: "PLEDGE_CANCELLED",
        actor: user,
        target: pledge.user,
        detail: pledge.description,
      });
    }
  });

  changed();
}
