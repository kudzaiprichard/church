import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import { expiryFrom, generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "church_session";

/**
 * Thirty days, rolling: the clock restarts every time the session is used, so
 * a member who checks their giving once a month never gets signed out, and an
 * abandoned session on a shared machine still dies a month after its last use.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The database row is only rewritten once a day. Without this every request
 * from every signed-in person would be a write, which is a lot of churn to buy
 * a more precise `lastSeenAt` than anybody needs.
 */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/**
 * Start a session and put its token in the response.
 *
 * Only callable from a Server Action or Route Handler — Next does not allow a
 * Server Component to write cookies.
 */
export async function createSession(userId: string, meta: { userAgent?: string; ip?: string } = {}) {
  const token = generateToken();
  const expiresAt = expiryFrom(SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 500),
      ip: meta.ip?.slice(0, 100),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });

  return token;
}

/**
 * Look up the session behind the current cookie.
 *
 * Returns null for every failure mode — no cookie, unknown token, expired row,
 * deactivated account — so callers have one thing to check. An expired row is
 * deleted on the way past, which keeps the table tidy without a cron job.
 */
export async function resolveSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // An admin can deactivate a member, and the spec expects that to bite
  // immediately. This is the check a self-contained token could not make.
  if (!session.user.isActive) {
    await prisma.session.deleteMany({ where: { userId: session.userId } }).catch(() => {});
    return null;
  }

  await rollForward(session.id, session.lastSeenAt);

  return session;
}

/** Push the expiry out, at most once a day. */
async function rollForward(sessionId: string, lastSeenAt: Date) {
  if (Date.now() - lastSeenAt.getTime() < REFRESH_AFTER_MS) return;

  await prisma.session
    .update({
      where: { id: sessionId },
      data: { expiresAt: expiryFrom(SESSION_TTL_MS), lastSeenAt: new Date() },
    })
    // A session deleted in a parallel request is not an error worth surfacing.
    .catch(() => {});
}

/** Sign out of this browser only. Other devices keep their sessions. */
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }

  jar.delete(SESSION_COOKIE);
}

/**
 * Drop every session a user has.
 *
 * Called when a password changes and when an admin deactivates an account or
 * changes a role — anything that should not leave an older browser signed in
 * with the access it had a moment ago.
 */
export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}
