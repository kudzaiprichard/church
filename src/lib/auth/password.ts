import "server-only";

import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id at the parameters OWASP currently recommends for this variant:
 * 19 MiB of memory, two passes, one lane. Memory cost is the one that matters —
 * it is what makes a GPU or ASIC attack expensive rather than merely slow.
 *
 * These are recorded in every hash Argon2 produces, so raising them later only
 * affects new passwords; existing users keep verifying against the parameters
 * they were hashed with until they next change it.
 */
const PARAMS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

// The length rules live in `password-rules.ts` so the sign-in forms can state
// them without importing this module, which is server-only and carries a
// native binding the browser cannot load. Re-exported for server callers.
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password-rules";

export function hashPassword(password: string) {
  return hash(password, PARAMS);
}

/**
 * Verify a password against a stored hash.
 *
 * Returns false rather than throwing when the stored hash is missing or
 * malformed, so a user who has been invited but has not yet chosen a password
 * simply fails to sign in instead of producing a 500.
 */
export async function verifyPassword(storedHash: string | null, password: string) {
  if (!storedHash) return false;

  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
