"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { issueAuthToken } from "@/lib/auth/auth-tokens";
import { requireAdmin } from "@/lib/auth/dal";
import { inviteEmail, passwordResetEmail } from "@/lib/auth/emails";
import { destroyAllSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import type { MemberFormState } from "./form-state";

/**
 * Administration of the roll.
 *
 * Every action here begins with `requireAdmin()`. That is not a formality: a
 * Server Action is a POST endpoint that anybody can call directly with a
 * session cookie, whether or not the button that normally calls it was ever
 * rendered for them. Hiding the admin nav from members protects nothing on its
 * own — this line is what does it.
 */

const invitation = z.object({
  email: z.email("Enter a valid email address."),
  firstName: z.string().trim().min(1, "Enter a first name.").max(80),
  lastName: z.string().trim().min(1, "Enter a last name.").max(80),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function inviteMember(
  _previous: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const admin = await requireAdmin();

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

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { fieldErrors: { email: "Somebody already has an account with that address." } };
  }

  // Created without a password. Until the invitation is accepted the row exists
  // but cannot be signed in to — `passwordHash` is null and sign-in treats that
  // as a failure.
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
    },
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
  const admin = await requireAdmin();

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
  await requireAdmin();

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

  revalidatePath("/members");
}

export async function setRole(userId: string, role: "ADMIN" | "MEMBER") {
  const admin = await requireAdmin();

  // Demoting yourself is how a church ends up with no administrator at all.
  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });

  // The old session carries the old role in everything it has already been
  // allowed to see, so it goes. They sign in again with the access they now have.
  await destroyAllSessions(userId);

  revalidatePath("/members");
}

export async function setActive(userId: string, isActive: boolean) {
  const admin = await requireAdmin();

  // Same reasoning as above: do not let an admin lock themselves out.
  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  // Deactivation has to bite now, not whenever a token would have expired.
  // This is the reason sessions live in the database at all.
  if (!isActive) await destroyAllSessions(userId);

  revalidatePath("/members");
}
