import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { recordAudit, recordAuditIn } from "@/lib/auth/audit";
import { issueAuthToken } from "@/lib/auth/auth-tokens";
import { inviteEmail } from "@/lib/auth/emails";
import { toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

import { parseCsv, planImport, type ImportPlan } from "./import";

/**
 * Running an import of the member list — the half of it that touches the
 * database and the mail, shared by the portal's import page and the
 * `members:import` command so the two cannot drift apart. The rules for what
 * a row must hold are in ./import.ts.
 */

type Actor = { id: string; email: string; firstName: string; lastName: string };

/** What every imported member's enrolment entry says, and how they are told apart. */
const IMPORTED = "imported from ";

/** The largest file either entry point accepts: about 5,000 members. */
export const IMPORT_MAX_BYTES = 1_000_000;

/** Check a CSV against the groups and the roll as they are now. Writes nothing. */
export async function checkImport(text: string): Promise<ImportPlan> {
  const [groups, users] = await Promise.all([
    prisma.group.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { email: true } }),
  ]);
  return planImport(
    parseCsv(text),
    new Map(groups.map((group) => [group.name.toLowerCase(), group.id])),
    new Set(users.map((user) => user.email.toLowerCase())),
  );
}

/**
 * Enrol every ready row in one transaction: the account, the baptismal
 * record, the connect groups and a MEMBER_ENROLLED entry each. All or none —
 * if any row fails (an address enrolled by hand since the check), nothing is
 * written and the caller checks again. Accounts have no password and no
 * invitation yet; `inviteNotYetInvited` sends those.
 */
export async function enrolImported(plan: ImportPlan, actor: Actor, source: string) {
  return prisma.$transaction(
    async (tx) => {
      const people = [];
      for (const { input } of plan.ready) {
        const user = await tx.user.create({
          data: {
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
            address: input.address ?? null,
            dateOfBirth: input.dateOfBirth ? toDateOnly(input.dateOfBirth) : null,
            gender: input.gender ?? null,
            role: "MEMBER",
            baptismalRecord: {
              create: {
                baptismDate: toDateOnly(input.baptismDate!),
                location: input.baptismLocation!,
                conductedBy: input.conductedBy!,
                classCompletedOn: input.classCompletedOn
                  ? toDateOnly(input.classCompletedOn)
                  : null,
                notes: input.baptismNotes ?? null,
              },
            },
            groupMemberships: {
              create: input.groupIds.map((groupId) => ({ groupId })),
            },
          },
          select: { id: true, email: true },
        });
        await recordAuditIn(tx, {
          action: "MEMBER_ENROLLED",
          actor,
          target: user,
          detail: `${IMPORTED}${source}`,
        });
        people.push(user);
      }
      return people;
    },
    { timeout: 120_000 },
  );
}

/**
 * Imported members who have never been sent an invitation and have not
 * signed in. Judged by the audit log, which is never purged, as well as by
 * tokens, which are a month after expiry: someone invited and silent for
 * weeks is a case for "Resend invitation", not for this, and anyone enrolled
 * by hand was invited when they were enrolled.
 */
const NOT_YET_INVITED = {
  isActive: true,
  passwordHash: null,
  authTokens: { none: { purpose: "INVITE" } },
  AND: [
    { auditSubjects: { some: { action: "MEMBER_ENROLLED", detail: { startsWith: IMPORTED } } } },
    { auditSubjects: { none: { action: { in: ["USER_INVITED", "INVITE_RESENT"] } } } },
  ],
} satisfies Prisma.UserWhereInput;

export async function countNotYetInvited() {
  return prisma.user.count({ where: NOT_YET_INVITED });
}

/**
 * Invite up to `limit` imported members who have never had an invitation,
 * oldest enrolment first, one email at a time with `spacingMs` between them — the
 * mail provider's rate limit, not a courtesy. Stops at the first failed send
 * rather than failing the same way hundreds of times; whoever was not reached
 * is still "not yet invited", so running it again picks up where it stopped.
 */
export async function inviteNotYetInvited(
  invitedBy: Actor,
  { limit, spacingMs }: { limit: number; spacingMs: number },
) {
  const people = await prisma.user.findMany({
    where: NOT_YET_INVITED,
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, email: true, firstName: true },
  });
  const { sendEmail } = await import("@/lib/email");
  const from = `${invitedBy.firstName} ${invitedBy.lastName}`;

  let sent = 0;
  let failure: string | null = null;
  for (const person of people) {
    if (sent > 0) await new Promise((resolve) => setTimeout(resolve, spacingMs));
    const { url } = await issueAuthToken(person.id, "INVITE");
    const mail = inviteEmail({
      firstName: person.firstName,
      url,
      invitedBy: from,
    });
    try {
      await sendEmail({ to: person.email, ...mail });
    } catch (error) {
      // The token stays unsent; drop it so this person still counts as not yet invited.
      await prisma.authToken.deleteMany({
        where: { userId: person.id, purpose: "INVITE" },
      });
      failure = error instanceof Error ? error.message : String(error);
      break;
    }
    await recordAudit({
      action: "USER_INVITED",
      actor: invitedBy,
      target: person,
    });
    sent += 1;
  }

  return { sent, failure, remaining: await countNotYetInvited() };
}
