import "server-only";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

import { recordAuditIn } from "./audit";
import { hashPassword } from "./password";

/**
 * Create the first administrator.
 *
 * A fresh install has an empty users table and no way to sign in, and the spec
 * has no public registration — members are added by admins. Something has to
 * break that circle, so on server start, and only when the table contains no
 * administrator at all, one is created from the environment.
 *
 * Four things keep this safe to run on every boot:
 *
 *   it is a no-op the moment any admin exists, so it cannot resurrect an
 *   account that was deliberately removed or quietly re-grant a role;
 *
 *   it never touches an existing row — if the email is already taken by a
 *   member, it says so and stops rather than promoting them;
 *
 *   the unique constraint on email settles the race when several server
 *   instances boot at once: one wins, the rest catch the collision and move on;
 *
 *   the account is created with `mustChangePassword`, so the value sitting in
 *   the environment stops being a working credential the first time anyone
 *   signs in with it.
 */
export async function bootstrapFirstAdmin() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (existingAdmin) return { created: false, reason: "an administrator already exists" } as const;

  const email = env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[bootstrap] No administrator exists and BOOTSTRAP_ADMIN_EMAIL / " +
        "BOOTSTRAP_ADMIN_PASSWORD are not set — nobody can sign in. " +
        "Set both and restart. See .env.example.",
    );
    return { created: false, reason: "no bootstrap credentials" } as const;
  }

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) {
    console.warn(
      `[bootstrap] ${email} already exists as a non-admin. Refusing to change ` +
        "an existing account's role. Use a different address, or promote them " +
        "from the admin area once an administrator exists.",
    );
    return { created: false, reason: "email already in use" } as const;
  }

  const [firstName, ...rest] = (env.BOOTSTRAP_ADMIN_NAME ?? "Church Office").trim().split(/\s+/);

  try {
    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName: rest.join(" ") || "Admin",
          role: "ADMIN",
          mustChangePassword: true,
          passwordChangedAt: new Date(),
        },
      });

      // No actor: nobody was signed in, the server did this at boot. Recorded
      // all the same — an administrator appearing from nowhere is precisely
      // the event an auditor would want to find an explanation for.
      await recordAuditIn(tx, {
        action: "ADMIN_BOOTSTRAPPED",
        target: created,
        detail: "created from the environment because no administrator existed",
      });
    });
  } catch {
    // Almost certainly the unique index firing because another instance won
    // the race. Either way an admin now exists, which is the point.
    return { created: false, reason: "another instance created it first" } as const;
  }

  console.info(
    `[bootstrap] Created the first administrator: ${email}. ` +
      "You will be asked to change this password at first sign-in. " +
      "Remove BOOTSTRAP_ADMIN_* from the environment afterwards.",
  );

  return { created: true } as const;
}
