import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

import { InviteForm } from "./invite-form";
import { MemberRow } from "./member-row";

export const metadata: Metadata = { title: "Members" };

/**
 * The member directory — admin only, per the spec ("Member directory, visible
 * only to admins").
 *
 * The guard is `requireAdmin`, not a check on the rendered output: a member who
 * guesses this URL is sent to their own dashboard before a single row is read
 * out of the database.
 */
export default async function MembersPage() {
  const admin = await requireAdmin();

  /**
   * Two queries rather than one, on purpose.
   *
   * The page needs to know whether each person has ever set a password. The
   * obvious way is to select `passwordHash` and test it for null — but that
   * pulls every hash on the roll into application memory to answer a yes/no
   * question, where it can then be logged, serialised into an error report, or
   * spread into a client prop by a later edit. The second query asks the
   * database the yes/no question directly and never leaves with the hashes.
   */
  const [members, unactivated] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        joinedAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.user.findMany({ where: { passwordHash: null }, select: { id: true } }),
  ]);

  const awaiting = new Set(unactivated.map((row) => row.id));
  const rows = members.map((member) => ({ ...member, activated: !awaiting.has(member.id) }));

  const pending = rows.filter((member) => !member.activated).length;

  return (
    <>
      <h1 className="text-3xl leading-tight">Members</h1>
      <p className="text-muted-foreground mt-3 max-w-xl text-pretty">
        Everyone on the roll. There is no public sign-up — people join by being invited from here.
        {pending > 0 && ` ${pending} ${pending === 1 ? "invitation has" : "invitations have"} not been accepted yet.`}
      </p>

      <div className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h2 className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            {rows.length} {rows.length === 1 ? "person" : "people"}
          </h2>

          <ul className="mt-5">
            {rows.map((member) => (
              <MemberRow key={member.id} member={member} isSelf={member.id === admin.id} />
            ))}
          </ul>
        </div>

        <div className="lg:border-foreground/12 lg:border-l lg:pl-10">
          <h2 className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Invite somebody
          </h2>
          <p className="text-muted-foreground mt-3 mb-7 text-sm text-pretty">
            They will get an email with a link to choose their own password. No password is ever
            sent to them.
          </p>

          <InviteForm />
        </div>
      </div>
    </>
  );
}
