"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import type { AuthTokenPurpose } from "@/generated/prisma/enums";
import { consumeAuthToken, issueAuthToken, resetRequestedRecently } from "@/lib/auth/auth-tokens";
import { getSession } from "@/lib/auth/dal";
import { passwordResetEmail } from "@/lib/auth/emails";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  RESET_LIMIT,
  SIGN_IN_LIMIT,
  clearRateLimit,
  rateLimit,
} from "@/lib/auth/rate-limit";
import { createSession, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import type { AuthFormState } from "./form-state";

/**
 * Where to send somebody after they sign in.
 *
 * The proxy puts the page they were trying to reach in `?next=`, which means an
 * attacker can put anything there too. Only a plain path on this site is
 * allowed through: a single leading slash, no scheme, and no `//evil.com` or
 * `/\evil.com` — browsers normalise a backslash to a slash, so both forms are
 * protocol-relative URLs wearing a disguise.
 *
 * Anything else is discarded rather than rejected; the person still gets in,
 * they just land on the dashboard.
 */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (value.includes("://")) return null;
  return value;
}

/**
 * Eight tries, then a quarter of an hour off.
 *
 * Enough that nobody locks themselves out fumbling a password, few enough that
 * online guessing is hopeless — Argon2 already makes each attempt cost about a
 * tenth of a second, and this caps the rate on top of that.
 */
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

/**
 * A real Argon2id hash of a random string nobody has.
 *
 * When the email is unknown we verify against this instead of returning early,
 * so a wrong address and a wrong password take the same time. Without it, the
 * sign-in form quietly answers the question "does this person attend here?" —
 * which for a church register is a disclosure worth avoiding.
 */
const DECOY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$8uZKtMEZ+5cyJh3+ukh8NA$BGa1UB2ZB1wlLEWGpa4zzFs9gDjcpff4l3RKC9reNa8";

/** One message for every failure, for the same reason. */
const SIGN_IN_FAILED = "That email and password combination is not correct.";

const credentials = z.object({
  email: z.email("Enter the email address you were invited with."),
  password: z.string().min(1, "Enter your password."),
});

const newPassword = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });

function fieldErrorsFrom(issues: z.core.$ZodIssue[]) {
  const errors: AuthFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as keyof NonNullable<AuthFormState["fieldErrors"]>] = issue.message;
    }
  }
  return errors;
}

async function requestMeta() {
  const head = await headers();
  return {
    userAgent: head.get("user-agent") ?? undefined,
    // Behind a proxy the first hop is the client. Best effort — it is recorded
    // for the operator's benefit, never trusted for an access decision.
    ip: head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  };
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const meta = await requestMeta();

  /**
   * Throttle by client address as well as by account.
   *
   * The lockout on `User` stops somebody working through one person's
   * passwords. It does nothing about the attack that actually happens: one
   * common password tried against every address on the roll, where no single
   * account ever reaches eight failures. This counts the attempts themselves.
   */
  const throttle = rateLimit(`signin:${meta.ip ?? "unknown"}`, SIGN_IN_LIMIT.limit, SIGN_IN_LIMIT.windowMs);
  if (!throttle.allowed) {
    const minutes = Math.max(1, Math.ceil(throttle.retryAfter / 60));
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(DECOY_HASH, parsed.data.password);
    return { error: SIGN_IN_FAILED };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000));
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  // Deactivated and never-activated accounts are told the same thing as a bad
  // password, so the form cannot be used to map who is on the roll.
  if (!user.isActive || !user.passwordHash) {
    await verifyPassword(DECOY_HASH, parsed.data.password);
    return { error: SIGN_IN_FAILED };
  }

  if (!(await verifyPassword(user.passwordHash, parsed.data.password))) {
    const attempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS) : null,
      },
    });
    return { error: SIGN_IN_FAILED };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  clearRateLimit(`signin:${meta.ip ?? "unknown"}`);

  // Retire whatever session this browser was carrying before issuing a new one.
  // Without it, a session planted in the victim's browser beforehand survives
  // their sign-in — the classic fixation, and cheap to close.
  await destroySession();
  await createSession(user.id, meta);

  const next = safeNext(formData.get("next"));

  // A forced password change outranks wherever they were heading; they can
  // carry on to it once the password is their own.
  redirect(user.mustChangePassword ? "/change-password" : (next ?? "/dashboard"));
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

/**
 * Change your own password.
 *
 * Used both by the forced gate after an admin resets someone, and voluntarily
 * from the account page. Every other session is dropped afterwards: if the
 * reason for changing it was that somebody else knew the old one, leaving their
 * browser signed in would defeat the exercise.
 */
export async function changePassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = newPassword.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");

  // Someone sent here by a forced reset has, by definition, a password they did
  // not choose — so we ask for it only when they still know it matters.
  if (!user.mustChangePassword) {
    if (!current) return { fieldErrors: { current: "Enter your current password." } };
    if (!(await verifyPassword(user.passwordHash, current))) {
      return { fieldErrors: { current: "That is not your current password." } };
    }
  }

  if (await verifyPassword(user.passwordHash, parsed.data.password)) {
    return { fieldErrors: { password: "Choose a password you have not used here before." } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await destroyAllSessions(user.id);
  await createSession(user.id, await requestMeta());

  redirect("/dashboard");
}

/**
 * Ask for a reset link.
 *
 * Always reports success, whatever happened. The form is public, so answering
 * honestly would turn it into a tool for checking whether a given person has an
 * account here — and a church roll is exactly the kind of list people should
 * not be able to confirm membership of from the outside.
 */
export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").toLowerCase().trim());

  if (!parsed.success) return { fieldErrors: { email: "Enter a valid email address." } };

  const meta = await requestMeta();

  // Five an hour from one address. Without this the form is a free mail cannon
  // pointed at anybody whose address you can guess, and the church's sending
  // reputation is the thing that pays for it.
  const throttle = rateLimit(`reset:${meta.ip ?? "unknown"}`, RESET_LIMIT.limit, RESET_LIMIT.windowMs);
  if (!throttle.allowed) {
    // Still the same answer. Saying "you are being throttled" would confirm
    // that earlier attempts hit something.
    return { done: true };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });

  // A deactivated account, or one that never accepted its invitation, gets
  // nothing — but the caller is told the same story either way.
  const eligible = Boolean(user?.isActive && user.passwordHash);

  if (user && eligible && !(await resetRequestedRecently(user.id))) {
    const { url } = await issueAuthToken(user.id, "PASSWORD_RESET");
    const mail = passwordResetEmail({ firstName: user.firstName, url });

    /**
     * Send after the response has gone out.
     *
     * This is the whole point. Awaiting the send here made a known address take
     * as long as the mail provider does and an unknown one return instantly —
     * so the identical wording was undone by a stopwatch, and the form answered
     * "does this person attend here?" after all. `after` moves the work past
     * the response, leaving both branches the same length.
     */
    after(async () => {
      try {
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          to: user.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
      } catch (error) {
        // The visitor cannot fix a mail outage and must not learn from the
        // difference that this address exists. Log it for the operator instead.
        console.error("[auth] Could not send a password reset email:", error);
      }
    });
  }

  return { done: true };
}

/**
 * Set a password from an emailed link — the last step of both an invitation
 * and a reset.
 *
 * The token is spent before the password is written, so a link cannot be
 * replayed, and every existing session for that user is dropped afterwards: a
 * reset is the one moment where somebody else may be holding a live session,
 * and it is the moment to end it.
 */
async function setPasswordFromToken(
  purpose: AuthTokenPurpose,
  token: string,
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPassword.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const redeemed = await consumeAuthToken(token, purpose);

  if (!redeemed.ok) {
    return {
      error:
        redeemed.reason === "expired"
          ? "That link has expired. Ask for a new one."
          : redeemed.reason === "used"
            ? "That link has already been used. Ask for a new one."
            : "That link is not valid. Ask for a new one.",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: redeemed.userId } });
  if (!user || !user.isActive) return { error: "That account is no longer active." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await destroyAllSessions(user.id);
  await createSession(user.id, await requestMeta());

  redirect("/dashboard");
}

/** Bound to the token from the URL by the page that renders the form. */
export async function acceptInvite(token: string, previous: AuthFormState, formData: FormData) {
  return setPasswordFromToken("INVITE", token, previous, formData);
}

export async function resetPassword(token: string, previous: AuthFormState, formData: FormData) {
  return setPasswordFromToken("PASSWORD_RESET", token, previous, formData);
}
