import "server-only";

/**
 * A fixed-window counter, held in memory.
 *
 * This exists to answer a specific hole: the per-account lockout on `User`
 * stops somebody guessing one person's password, but it does nothing against
 * the more common attack — one likely password tried against a hundred
 * different addresses. No single account ever reaches its limit, so nothing
 * trips. Counting by client address catches that.
 *
 * Honest about what it is: process memory. It resets when the server restarts,
 * and two instances behind a load balancer each keep their own tally, so the
 * effective limit is the configured one multiplied by the number of instances.
 * For a self-hosted church system on one box that is the right trade — it adds
 * no infrastructure and no dependency. If this is ever run more than once over,
 * move the counter to Postgres or Redis; the call sites will not change.
 *
 * It is a second line, not the first. Argon2 already makes each attempt cost
 * about a tenth of a second, and the account lockout still applies.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Entries are only cleaned when the map is touched, so an idle process does
 * not hold a timer open. The sweep is cheap and bounded — it only runs when
 * the map has grown past a size a real church would never reach honestly.
 */
const SWEEP_THRESHOLD = 5_000;

function sweep(now: number) {
  if (windows.size < SWEEP_THRESHOLD) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets. Zero when allowed. */
  retryAfter: number;
};

/**
 * Count one attempt against `key`.
 *
 * Returns whether it may proceed, and if not, how long until it may.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

/** Forget a key — called after a successful sign-in, so one good login clears the tally. */
export function clearRateLimit(key: string) {
  windows.delete(key);
}

/** Twenty sign-in attempts from one address in fifteen minutes. */
export const SIGN_IN_LIMIT = { limit: 20, windowMs: 15 * 60 * 1000 } as const;

/** Five reset requests from one address in an hour. */
export const RESET_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 } as const;
