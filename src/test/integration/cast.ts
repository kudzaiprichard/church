import type { SessionUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

import { EMAILS, type CastName } from "./fixture";

/** The fixture's people as the sessions the data functions take. */
export async function loadCast(): Promise<Record<CastName, SessionUser>> {
  const rows = await prisma.user.findMany({ where: { email: { in: Object.values(EMAILS) } } });
  const byEmail = new Map(rows.map((row) => [row.email, row]));
  return Object.fromEntries(
    (Object.keys(EMAILS) as CastName[]).map((name) => {
      const row = byEmail.get(EMAILS[name])!;
      return [
        name,
        {
          id: row.id,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          avatarUrl: row.avatarUrl,
          mustChangePassword: false,
        },
      ];
    }),
  ) as Record<CastName, SessionUser>;
}

export const OFFICES: CastName[] = ["apostle", "matron", "elder", "leader", "memberK", "memberY"];

/** Text of every item, for "contains KTW" style assertions. */
export const titles = (rows: unknown) => JSON.stringify(rows);

/**
 * The same without ids, for "never contains this number" assertions: a random
 * cuid can contain any run of digits, which once made such a test fail in CI.
 */
export const valuesOf = (rows: unknown) =>
  JSON.stringify(rows, (key, value) => (key === "id" ? undefined : value));
