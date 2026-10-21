import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

import { PageHeader, Panel } from "../_components/page-parts";

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
      <PageHeader
        eyebrow="People"
        title="Members"
        description={
          <>
            Everyone on the roll. There is no public sign-up — people join by being invited from
            here.
            {pending > 0 &&
              ` ${pending} ${pending === 1 ? "invitation has" : "invitations have"} not been accepted yet.`}
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          title={`${rows.length} ${rows.length === 1 ? "person" : "people"}`}
          description="Active members first, then by surname."
          bodyClassName="p-0"
        >
          <ul className="divide-border divide-y">
            {rows.map((member) => (
              <MemberRow key={member.id} member={member} isSelf={member.id === admin.id} />
            ))}
          </ul>
        </Panel>

        <Panel
          title="Invite somebody"
          description="They will get an email with a link to choose their own password. No password is ever sent to them."
          className="lg:sticky lg:top-0"
        >
          <InviteForm />
        </Panel>
      </div>
    </>
  );
}
