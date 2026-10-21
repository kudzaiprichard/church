"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { recordAudit, recordAuditIn } from "@/lib/auth/audit";
import { issueAuthToken } from "@/lib/auth/auth-tokens";
import { requirePermission, type SessionUser } from "@/lib/auth/dal";
import { inviteEmail, passwordResetEmail } from "@/lib/auth/emails";
import { ROLES, ROLE_LABELS, can } from "@/lib/auth/permissions";
import { destroyAllSessions } from "@/lib/auth/session";
import { toDateOnly } from "@/lib/dates";
import {
  BAPTISM_REQUIRED,
  enrolmentSchema,
  fieldErrorsFrom,
  memberFormValues,
  memberUpdateSchema,
  type MemberFormValues,
} from "@/lib/members/schema";
import { prisma } from "@/lib/prisma";

import type { MemberFormState } from "./form-state";

/**
 * Administration of the roll.
 *
 * Every action here begins with `requirePermission()`. That is not a
 * formality: a Server Action is a POST endpoint that anybody can call directly
 * with a session cookie, whether or not the button that normally calls it was
 * ever rendered for them. Hiding the nav from members protects nothing on its
 * own — this line is what does it.
 */

const office = z.enum(ROLES);

/**
 * True when someone other than `userId` is an active Apostle.
 *
 * Asked inside the transaction that would remove `userId` from the office, so
 * the check and the change see the same rows. Two Apostles demoting each
 * other at the same moment would each find the other still in office; the
 * serializable isolation on the callers is what makes one of them fail
 * instead of both succeeding and leaving the church with nobody who can
 * appoint anyone.
 */
async function anotherActiveApostle(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.user.count({
    where: { role: "APOSTLE", isActive: true, id: { not: userId } },
  });
  return count > 0;
}

/** Serializable, so the last-Apostle check above cannot be raced. */
const GUARDED = { isolationLevel: "Serializable" } as const;

/** True when every id names a real group — a tampered form cannot invent one. */
async function groupsExist(ids: string[]) {
  const found = await prisma.group.count({ where: { id: { in: ids } } });
  return found === ids.length;
}

/**
 * A failed submission: the errors, plus what was typed.
 *
 * React resets an uncontrolled form once its action settles, so without the
 * values coming back a single mistake would empty a fifteen-field enrolment.
 * They are the caller's own input, returned only to the caller.
 */
function retry(values: MemberFormValues, fieldErrors: Record<string, string>): MemberFormState {
  return { fieldErrors, values, attempt: Date.now() };
}

/** The baptismal record's columns from parsed form input. */
function baptismData(input: {
  baptismDate?: string;
  baptismLocation?: string;
  conductedBy?: string;
  classCompletedOn?: string;
  baptismNotes?: string;
}) {
  return {
    baptismDate: toDateOnly(input.baptismDate!),
    location: input.baptismLocation!,
    conductedBy: input.conductedBy!,
    classCompletedOn: input.classCompletedOn ? toDateOnly(input.classCompletedOn) : null,
    notes: input.baptismNotes ?? null,
  };
}

/**
 * Issue an invitation link and try to email it.
 *
 * Returns the link when the email could not be sent, so the person who just
 * enrolled them can pass it on by hand: the account exists and the link is
 * valid — only delivery failed, which on an install without mail configured
 * is the normal case.
 */
async function sendInvitation(
  user: { id: string; email: string; firstName: string },
  invitedBy: SessionUser,
): Promise<{ undeliveredUrl?: string }> {
  const { url } = await issueAuthToken(user.id, "INVITE");
  const mail = inviteEmail({
    firstName: user.firstName,
    url,
    invitedBy: `${invitedBy.firstName} ${invitedBy.lastName}`,
  });

  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
    return {};
  } catch (error) {
    console.error("[members] Could not send an invitation email:", error);
    return { undeliveredUrl: url };
  }
}

/**
 * Enrol a baptized person (docs/SCOPE.md §9.3).
 *
 * One transaction creates the account, the baptismal record and the group
 * memberships, with the audit entry beside them — so there is never a member
 * without proof of baptism, or an enrolment nobody can account for. The
 * account has no password until the invitation sent afterwards is accepted.
 */
export async function enrollMember(
  _previous: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const actor = await requirePermission("members.enroll");

  const values = memberFormValues(formData);
  const parsed = enrolmentSchema.safeParse(values);
  if (!parsed.success) return retry(values, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  // The Matron enrols; only an Apostle appoints.
  if (input.role !== "MEMBER" && !can(actor, "members.setRole")) {
    return retry(values, { role: "Only an Apostle can enrol someone into an office." });
  }

  if (!(await groupsExist(input.groupIds))) {
    return retry(values, { groupIds: "Choose connect groups from the list." });
  }

  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    return retry(values, { email: "Somebody already has an account with that address." });
  }

  let created: { id: string; email: string; firstName: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? null,
          address: input.address ?? null,
          dateOfBirth: input.dateOfBirth ? toDateOnly(input.dateOfBirth) : null,
          gender: input.gender ?? null,
          role: input.role,
          baptismalRecord: { create: baptismData(input) },
          groupMemberships: { create: input.groupIds.map((groupId) => ({ groupId })) },
        },
        select: { id: true, email: true, firstName: true },
      });

      await recordAuditIn(tx, {
        action: "MEMBER_ENROLLED",
        actor,
        target: user,
        detail: `enrolled as ${ROLE_LABELS[input.role]} into ${input.groupIds.length} group${input.groupIds.length === 1 ? "" : "s"}`,
      });

      return user;
    });
  } catch (error) {
    // The unique index on email settles a race with a second enrolment of the
    // same address submitted at the same moment.
    if ((error as { code?: string }).code === "P2002") {
      return retry(values, { email: "Somebody already has an account with that address." });
    }
    throw error;
  }

  const { undeliveredUrl } = await sendInvitation(created, actor);

  revalidatePath("/members", "layout");

  return {
    done: true,
    submissionId: Date.now(),
    memberId: created.id,
    ...(undeliveredUrl && {
      inviteUrl: undeliveredUrl,
      warning:
        "They are enrolled, but the invitation email could not be sent — mail is not configured. Send them this link yourself, or use “Resend invitation” once mail works.",
    }),
  };
}

/**
 * An Apostle's edit of any member's record, groups and baptism.
 *
 * The audit entry names the fields that changed but not their values: the log
 * records who touched a record, and copying addresses and birthdays into it
 * would make it a second copy of the roll.
 */
export async function updateMember(
  memberId: string,
  _previous: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const actor = await requirePermission("members.edit");

  const values = memberFormValues(formData);
  const parsed = memberUpdateSchema.safeParse(values);
  if (!parsed.success) return retry(values, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      dateOfBirth: true,
      gender: true,
      groupMemberships: { select: { groupId: true } },
      baptismalRecord: { select: { id: true } },
    },
  });
  if (!existing) return { error: "That member no longer exists." };

  // A baptismal record, once there, is never blanked — the roll is of the
  // baptized, and removing the proof would quietly make that untrue.
  if (existing.baptismalRecord && !input.baptismDate) {
    return retry(values, { baptismDate: BAPTISM_REQUIRED });
  }

  if (!(await groupsExist(input.groupIds))) {
    return retry(values, { groupIds: "Choose connect groups from the list." });
  }

  if (input.email !== existing.email) {
    const taken = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (taken)
      return retry(values, { email: "Somebody already has an account with that address." });
  }

  const dateOfBirth = input.dateOfBirth ? toDateOnly(input.dateOfBirth) : null;
  const before = new Set(existing.groupMemberships.map((membership) => membership.groupId));
  const after = new Set(input.groupIds);

  const changed = [
    input.firstName !== existing.firstName && "first name",
    input.lastName !== existing.lastName && "last name",
    input.email !== existing.email && "email",
    (input.phone ?? null) !== existing.phone && "phone",
    (input.address ?? null) !== existing.address && "address",
    (dateOfBirth?.getTime() ?? null) !== (existing.dateOfBirth?.getTime() ?? null) &&
      "date of birth",
    (input.gender ?? null) !== existing.gender && "gender",
    (before.size !== after.size || [...after].some((id) => !before.has(id))) && "groups",
    input.baptismDate && "baptismal record",
  ].filter((field): field is string => Boolean(field));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: memberId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone ?? null,
          address: input.address ?? null,
          dateOfBirth,
          gender: input.gender ?? null,
        },
      });

      await tx.groupMembership.deleteMany({
        where: { userId: memberId, groupId: { notIn: input.groupIds } },
      });
      await tx.groupMembership.createMany({
        data: input.groupIds.map((groupId) => ({ userId: memberId, groupId })),
        skipDuplicates: true,
      });

      if (input.baptismDate) {
        const record = baptismData(input);
        await tx.baptismalRecord.upsert({
          where: { userId: memberId },
          create: { userId: memberId, ...record },
          update: record,
        });
      }

      await recordAuditIn(tx, {
        action: "MEMBER_UPDATED",
        actor,
        target: { id: existing.id, email: input.email },
        detail: changed.length > 0 ? `changed ${changed.join(", ")}` : "saved with no changes",
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return retry(values, { email: "Somebody already has an account with that address." });
    }
    throw error;
  }

  revalidatePath("/members", "layout");
  redirect(`/members/${memberId}`);
}

export async function resendInvitation(userId: string) {
  const admin = await requirePermission("members.enroll");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  // Only for accounts that have never been activated — a live account gets a
  // password reset instead, which is a different email and a shorter link.
  if (!user || user.passwordHash) return;

  await sendInvitation(user, admin);

  await recordAudit({ action: "INVITE_RESENT", actor: admin, target: user });

  revalidatePath("/members", "layout");
}

/**
 * Send an activated member a reset link.
 *
 * The counterpart to "resend invitation", for someone who has an account and
 * cannot get into it. No password is generated and nothing is emailed in
 * plaintext — they choose their own, exactly as they did at the start.
 */
export async function sendPasswordReset(userId: string) {
  const admin = await requirePermission("members.edit");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  // An account that never activated needs its invitation resending instead.
  if (!user || !user.passwordHash || !user.isActive) return;

  const { url } = await issueAuthToken(user.id, "PASSWORD_RESET");
  const mail = passwordResetEmail({ firstName: user.firstName, url });

  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (error) {
    console.error("[members] Could not send a password reset email:", error);
  }

  await recordAudit({ action: "PASSWORD_RESET_SENT", actor: admin, target: user });

  revalidatePath("/members", "layout");
}

export async function setRole(userId: string, formData: FormData) {
  const admin = await requirePermission("members.setRole");

  const parsed = office.safeParse(formData.get("role"));
  if (!parsed.success) return;
  const role = parsed.data;

  // Demoting yourself is how a church ends up with no Apostle at all.
  if (userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === role) return;

  // The change and its record are one write. Granting somebody the run of every
  // member's finances is the single act most worth being able to trace, so it
  // must not be possible for it to land without a line saying who did it.
  const changed = await prisma
    .$transaction(async (tx) => {
      if (target.role === "APOSTLE" && !(await anotherActiveApostle(tx, userId))) return false;

      await tx.user.update({ where: { id: userId }, data: { role } });
      await recordAuditIn(tx, {
        action: "ROLE_CHANGED",
        actor: admin,
        target,
        detail: `${ROLE_LABELS[target.role]} → ${ROLE_LABELS[role]}`,
      });
      return true;
    }, GUARDED)
    // A serialization failure means a concurrent change won; nothing was written.
    .catch(() => false);

  if (!changed) return;

  // The old session carries the old role in everything it has already been
  // allowed to see, so it goes. They sign in again with the access they now have.
  await destroyAllSessions(userId);

  revalidatePath("/members", "layout");
}

export async function setActive(userId: string, isActive: boolean) {
  const admin = await requirePermission("members.setActive");

  // Same reasoning as above: do not let an Apostle lock themselves out.
  if (userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.isActive === isActive) return;

  const changed = await prisma
    .$transaction(async (tx) => {
      // Never switch off the last Apostle standing.
      if (!isActive && target.role === "APOSTLE" && !(await anotherActiveApostle(tx, userId))) {
        return false;
      }

      await tx.user.update({ where: { id: userId }, data: { isActive } });
      await recordAuditIn(tx, {
        action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
        actor: admin,
        target,
      });
      return true;
    }, GUARDED)
    .catch(() => false);

  if (!changed) return;

  // Deactivation has to bite now, not whenever a token would have expired.
  // This is the reason sessions live in the database at all.
  if (!isActive) await destroyAllSessions(userId);

  revalidatePath("/members", "layout");
}
