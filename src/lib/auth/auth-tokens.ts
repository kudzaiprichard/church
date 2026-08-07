import "server-only";

import type { AuthTokenPurpose } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

import { INVITE_TTL_MS, PASSWORD_RESET_TTL_MS, expiryFrom, generateToken, hashToken } from "./tokens";

/**
 * Issuing and redeeming the single-use links that arrive by email.
 *
 * Invitations and resets are the same mechanism with different wording and
 * different lifetimes, so they share one table and one pair of functions.
 */

const TTL: Record<AuthTokenPurpose, number> = {
  INVITE: INVITE_TTL_MS,
  PASSWORD_RESET: PASSWORD_RESET_TTL_MS,
};

const PATH: Record<AuthTokenPurpose, string> = {
  INVITE: "/accept-invite",
  PASSWORD_RESET: "/reset-password",
};

/**
 * Mint a link for someone.
 *
 * Any unused token of the same purpose is dropped first, so asking for a
 * second reset silently retires the first — two live links to the same account
 * is one more than anybody needs, and the older one is usually the one sitting
 * in a mailbox somebody else can read.
 *
 * The plaintext is returned to the caller and never stored.
 */
export async function issueAuthToken(userId: string, purpose: AuthTokenPurpose) {
  await prisma.authToken.deleteMany({ where: { userId, purpose, usedAt: null } });

  const token = generateToken();

  await prisma.authToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      purpose,
      expiresAt: expiryFrom(TTL[purpose]),
    },
  });

  return {
    token,
    url: `${env.APP_URL}${PATH[purpose]}/${token}`,
  };
}

export type RedeemedToken =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Check a token without spending it.
 *
 * Used when the page first loads, so somebody arriving on a dead link is told
 * why before they fill in a form rather than after.
 */
export async function inspectAuthToken(
  token: string,
  purpose: AuthTokenPurpose,
): Promise<RedeemedToken> {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });

  if (!row || row.purpose !== purpose) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, userId: row.userId, tokenId: row.id };
}

/**
 * Spend a token.
 *
 * The update is conditional on `usedAt` still being null, so two requests
 * racing with the same link cannot both succeed — the loser sees zero rows
 * changed and is told the link is spent.
 */
export async function consumeAuthToken(
  token: string,
  purpose: AuthTokenPurpose,
): Promise<RedeemedToken> {
  const checked = await inspectAuthToken(token, purpose);
  if (!checked.ok) return checked;

  const { count } = await prisma.authToken.updateMany({
    where: { id: checked.tokenId, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (count === 0) return { ok: false, reason: "used" };

  return checked;
}
