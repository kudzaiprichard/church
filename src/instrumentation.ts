/**
 * Runs once per server instance, before the first request is served.
 *
 * The only thing it does is make sure somebody can sign in: a fresh database
 * has no users and the system has no public registration, so without this a
 * new install is a locked door with the key inside.
 */
export async function register() {
  // `register` also runs while `next build` collects page data, where there is
  // no database to talk to and nothing to bootstrap. The Edge runtime cannot
  // reach Prisma at all, so it is skipped too.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { bootstrapFirstAdmin } = await import("@/lib/auth/bootstrap");

  try {
    await bootstrapFirstAdmin();
  } catch (error) {
    // A database that is down at boot must not stop the server from starting —
    // the public site does not need one, and an operator restarting after an
    // outage should get a running app with a loud log rather than a crash loop.
    console.error("[bootstrap] Could not check for an administrator:", error);
  }
}
