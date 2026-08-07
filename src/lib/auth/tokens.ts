import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque secrets that travel in a cookie or an email link.
 *
 * Two rules hold everywhere they are used:
 *
 *   the value is generated from the OS random source, never from anything
 *   guessable like a cuid, a timestamp or a counter;
 *
 *   only its SHA-256 is written to the database, so a copy of the `Session` or
 *   `AuthToken` table is a list of useless digests rather than a set of live
 *   credentials. The plaintext exists exactly once, in the response that
 *   creates it.
 *
 * SHA-256 rather than Argon2 here on purpose. These are 256-bit random values,
 * not passwords — there is no dictionary to attack and nothing to slow an
 * attacker down for, so the expensive hash would buy nothing and would have to
 * run on every single request that carries a cookie.
 */
const TOKEN_BYTES = 32;

export function generateToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Compare two digests without leaking, through timing, how much of the value
 * matched. Lookups are by indexed hash so this is belt and braces, but it
 * costs nothing.
 */
export function tokensMatch(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** An invitation gives someone a week to choose their first password. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A reset gives one hour. Short, because unlike an invitation it is triggered
 * by anyone who knows an email address, so the window in which a stolen inbox
 * is useful should be small.
 */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function expiryFrom(ttlMs: number, now = new Date()) {
  return new Date(now.getTime() + ttlMs);
}
