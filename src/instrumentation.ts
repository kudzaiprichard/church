/**
 * Runs once per server instance, before the first request is served.
 *
 * Two jobs, in this order: prove the environment is usable, then make sure
 * somebody can sign in — a fresh database has no users and the system has no
 * public registration, so without the second a new install is a locked door
 * with the key inside.
 */
export async function register() {
  // `register` also runs while `next build` collects page data, where there is
  // no database to talk to and nothing to bootstrap. The Edge runtime cannot
  // reach Prisma at all, so it is skipped too.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  /**
   * Importing `lib/env` parses and validates it, so a missing or malformed
   * variable stops the server here with a readable list of what is wrong.
   *
   * This is the point of the exercise. Modules that need configuration import
   * `env` lazily, which means without this a bad `DATABASE_URL` would surface
   * on whichever request first touched the database — a 500 at midnight rather
   * than a failure to start at deploy time. Crashing is the correct outcome:
   * a process that cannot reach its database should never report itself
   * healthy to a load balancer.
   */
  const { env, emailIsConfigured } = await import("@/lib/env");

  /**
   * Not fatal, deliberately — see the note on RESEND_API_KEY in `lib/env`.
   * Loud, though, because in production this is the difference between a
   * password reset arriving and vanishing into a server log nobody reads.
   */
  if (env.NODE_ENV === "production" && !emailIsConfigured) {
    console.warn(
      "[env] RESEND_API_KEY is not set. Outbound email will be written to this " +
        "log instead of sent, so invitations and password resets will not reach " +
        "anyone. Set it before inviting members.",
    );
  }

  const { bootstrapFirstApostle } = await import("@/lib/auth/bootstrap");

  try {
    await bootstrapFirstApostle();
  } catch (error) {
    // A database that is down at boot must not stop the server from starting —
    // the public site does not need one, and an operator restarting after an
    // outage should get a running app with a loud log rather than a crash loop.
    // Note the difference from the env check above: bad configuration cannot
    // fix itself, but a database usually comes back.
    console.error("[bootstrap] Could not check for an Apostle:", error);
  }
}
