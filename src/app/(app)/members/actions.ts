"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { recordAudit, recordAuditIn } from "@/lib/auth/audit";
import { issueAuthToken } from "@/lib/auth/auth-tokens";
import { requirePermission } from "@/lib/auth/dal";
import { inviteEmail, passwordResetEmail } from "@/lib/auth/emails";
import { ROLES, ROLE_LABELS, can } from "@/lib/auth/permissions";
import { destroyAllSessions } from "@/lib/auth/session";
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

const invitation = z.object({
  email: z.email("Enter a valid email address."),
  firstName: z.string().trim().min(1, "Enter a first name.").max(80),
  lastName: z.string().trim().min(1, "Enter a last name.").max(80),
  role: z.enum(ROLES),
});

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

export async function inviteMember(
  _previous: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const admin = await requirePermission("members.enroll");

  const parsed = invitation.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    role: String(formData.get("role") ?? "MEMBER"),
  });

  if (!parsed.success) {
    const fieldErrors: MemberFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key as keyof NonNullable<MemberFormState["fieldErrors"]>] = issue.message;
      }
    }
    return { fieldErrors };
  }

  // Only an Apostle may create anything but a Member. The Matron enrols; she
  // does not appoint.
  if (parsed.data.role !== "MEMBER" && !can(admin, "members.setRole")) {
    return { fieldErrors: { role: "Only an Apostle can enrol someone into an office." } };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { fieldErrors: { email: "Somebody already has an account with that address." } };
  }

  // Created without a password. Until the invitation is accepted the row exists
  // but cannot be signed in to — `passwordHash` is null and sign-in treats that
  // as a failure.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        role: parsed.data.role,
      },
    });

    await recordAuditIn(tx, {
      action: "USER_INVITED",
      actor: admin,
      target: created,
      detail: `invited as ${parsed.data.role}`,
    });

    return created;
  });

  const { url } = await issueAuthToken(user.id, "INVITE");
  const mail = inviteEmail({
    firstName: user.firstName,
    url,
    invitedBy: `${admin.firstName} ${admin.lastName}`,
  });

  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (error) {
    console.error("[members] Could not send an invitation email:", error);
    revalidatePath("/members");
    // The account exists and the link is valid — only the delivery failed. On
    // a self-hosted install with no mail service configured yet, that is the
    // normal case, so hand the link to the administrator rather than leaving
    // them with an account nobody can reach.
    return {
      done: true,
      submissionId: Date.now(),
      inviteUrl: url,
      warning:
        "The account was created, but the invitation email could not be sent — mail is not configured. Send them this link yourself, or use “Resend invitation” once mail works.",
    };
  }

  revalidatePath("/members");
  return { done: true, submissionId: Date.now() };
}

export async function resendInvitation(userId: string) {
  const admin = await requirePermission("members.enroll");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  // Only for accounts that have never been activated — a live account gets a
  // password reset instead, which is a different email and a shorter link.
  if (!user || user.passwordHash) return;

  const { url } = await issueAuthToken(user.id, "INVITE");
  const mail = inviteEmail({
    firstName: user.firstName,
    url,
    invitedBy: `${admin.firstName} ${admin.lastName}`,
  });

  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (error) {
    console.error("[members] Could not resend an invitation email:", error);
  }

  await recordAudit({ action: "INVITE_RESENT", actor: admin, target: user });

  revalidatePath("/members");
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

  revalidatePath("/members");
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

  revalidatePath("/members");
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

  revalidatePath("/members");
}
