/**
 * Import the church's existing member list: `npm run members:import -- <file.csv> [flags]`.
 *
 *   (no flags)        dry run — read and check every row, write a report, change nothing
 *   --commit --as <apostle email>
 *                     enrol every valid row, as that Apostle, in one transaction:
 *                     the account, the baptismal record, the connect groups and a
 *                     MEMBER_ENROLLED audit entry each. Invalid rows are skipped and
 *                     listed; nothing is half-imported.
 *   --invite          with --commit: also issue invitations and send them, 20 at a
 *                     time with a pause between batches, so the mail provider is not
 *                     flooded. Without mail configured the links go to the log.
 *
 * The columns are in TEMPLATE_HEADER (src/lib/members/import.ts); write a blank
 * template with `npm run members:import -- --template members.csv`. Dates may be
 * 2015-03-14 or 14/03/2015. Groups are names, separated by ";".
 *
 * The report is written beside the file as <file>.report.csv: every line, ready
 * or not, and why. It holds names and emails — keep it with the spreadsheet.
 *
 * Run through the npm script: it uses the react-server condition so the app's
 * server-only modules (invitations, email) load outside Next.
 */
import "dotenv/config";

import { readFileSync, writeFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { toCsv } from "../src/lib/csv";
import { toDateOnly } from "../src/lib/dates";
import { parseCsv, planImport, TEMPLATE_HEADER } from "../src/lib/members/import";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

async function main() {
  const template = option("--template");
  if (template) {
    writeFileSync(template, `${TEMPLATE_HEADER}\r\n`);
    console.info(`[import] Wrote a blank template to ${template}`);
    return;
  }

  const file = args.find((arg) => !arg.startsWith("--") && arg !== option("--as"));
  if (!file) throw new Error("Name the CSV file: npm run members:import -- members.csv");
  const commit = flag("--commit");
  const invite = flag("--invite");
  if (invite && !commit) throw new Error("--invite needs --commit.");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const [groups, users] = await Promise.all([
      prisma.group.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({ select: { email: true } }),
    ]);
    const plan = planImport(
      parseCsv(readFileSync(file, "utf8")),
      new Map(groups.map((group) => [group.name.toLowerCase(), group.id])),
      new Set(users.map((user) => user.email.toLowerCase())),
    );

    const report = `${file}.report.csv`;
    writeFileSync(
      report,
      "﻿" +
        toCsv([
          ["line", "email", "status", "problems"],
          ...plan.ready.map((entry) => [entry.line, entry.input.email, "ready", ""]),
          ...plan.problems.map((problem) => [
            problem.line,
            problem.email ?? "",
            "skipped",
            problem.errors.join("; "),
          ]),
        ]),
    );

    console.info(
      `[import] ${plan.ready.length} ready, ${plan.problems.length} with problems. Report: ${report}`,
    );
    if (plan.unknownColumns.length > 0) {
      console.warn(`[import] Ignored columns: ${plan.unknownColumns.join(", ")}`);
    }
    if (!commit) {
      console.info(
        "[import] Dry run — nothing was changed. Add --commit --as <apostle email> to enrol.",
      );
      return;
    }

    const actorEmail = option("--as")?.toLowerCase();
    const actor = actorEmail
      ? await prisma.user.findFirst({
          where: { email: actorEmail, role: "APOSTLE", isActive: true },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : null;
    if (!actor) throw new Error("--commit needs --as <the email of an active Apostle>.");
    if (plan.ready.length === 0) return;

    const created = await prisma.$transaction(
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
              groupMemberships: { create: input.groupIds.map((groupId) => ({ groupId })) },
            },
            select: { id: true, email: true, firstName: true },
          });
          await tx.auditLog.create({
            data: {
              action: "MEMBER_ENROLLED",
              actorId: actor.id,
              actorEmail: actor.email,
              targetId: user.id,
              targetEmail: user.email,
              detail: `imported from ${file.split(/[\\/]/).pop()}`,
            },
          });
          people.push(user);
        }
        return people;
      },
      { timeout: 120_000 },
    );
    console.info(`[import] Enrolled ${created.length}.`);

    if (!invite) {
      console.info(
        "[import] No invitations sent. Send them from the members page, or re-run with --invite.",
      );
      return;
    }

    const { issueAuthToken } = await import("../src/lib/auth/auth-tokens");
    const { inviteEmail } = await import("../src/lib/auth/emails");
    const { sendEmail } = await import("../src/lib/email");
    const invitedBy = `${actor.firstName} ${actor.lastName}`;

    for (let start = 0; start < created.length; start += 20) {
      for (const user of created.slice(start, start + 20)) {
        const { url } = await issueAuthToken(user.id, "INVITE");
        const mail = inviteEmail({ firstName: user.firstName, url, invitedBy });
        await sendEmail({ to: user.email, ...mail }).catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(
            `[import] Could not email ${user.email} (${reason}). Use "Resend invitation" on the members page once mail works.`,
          );
        });
      }
      console.info(`[import] Invited ${Math.min(start + 20, created.length)} of ${created.length}.`);
      if (start + 20 < created.length) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[import] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
