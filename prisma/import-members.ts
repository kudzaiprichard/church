/**
 * Import the church's existing member list: `npm run members:import -- <file.csv> [flags]`.
 *
 *   (no flags)        dry run — read and check every row, write a report, change nothing
 *   --commit --as <apostle email>
 *                     enrol every valid row, as that Apostle, in one transaction:
 *                     the account, the baptismal record, the connect groups and a
 *                     MEMBER_ENROLLED audit entry each. Invalid rows are skipped and
 *                     listed; nothing is half-imported.
 *   --invite          then email an invitation to every imported member not yet invited, paced
 *                     to the mail provider's rate limit. Without mail configured the
 *                     links go to the log. On its own (no file) it only invites.
 *
 * The columns are in TEMPLATE_HEADER (src/lib/members/import.ts); write a blank
 * template with `npm run members:import -- --template members.csv`. Dates may be
 * 2015-03-14 or 14/03/2015. Groups are names, separated by ";".
 *
 * The report is written beside the file as <file>.report.csv: every line, ready
 * or not, and why. It holds names and emails — keep it with the spreadsheet.
 *
 * The portal does the same at /members/import, through the same code
 * (src/lib/members/import-run.ts). Run this through the npm script: it uses the
 * react-server condition so those server-only modules load outside Next.
 */
import "dotenv/config";

import { readFileSync, statSync, writeFileSync } from "node:fs";

import { toCsv } from "../src/lib/csv";
import { TEMPLATE_HEADER } from "../src/lib/members/import";
import {
  IMPORT_MAX_BYTES,
  checkImport,
  enrolImported,
  inviteNotYetInvited,
} from "../src/lib/members/import-run";
import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

async function actorFrom(email: string | undefined) {
  const actor = email
    ? await prisma.user.findFirst({
        where: { email: email.toLowerCase(), role: "APOSTLE", isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : null;
  if (!actor) throw new Error("Name an active Apostle with --as <email>.");
  return actor;
}

async function main() {
  const template = option("--template");
  if (template) {
    writeFileSync(template, `${TEMPLATE_HEADER}\r\n`);
    console.info(`[import] Wrote a blank template to ${template}`);
    return;
  }

  const file = args.find((arg) => !arg.startsWith("--") && arg !== option("--as"));
  const commit = flag("--commit");
  const invite = flag("--invite");
  if (!file && !invite) throw new Error("Name the CSV file: npm run members:import -- members.csv");

  if (file) {
    if (statSync(file).size > IMPORT_MAX_BYTES) throw new Error("The file is over 1 MB.");
    const plan = await checkImport(readFileSync(file, "utf8"));

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
    const actor = await actorFrom(option("--as"));
    if (plan.ready.length > 0) {
      const created = await enrolImported(plan, actor, file.split(/[\\/]/).pop()!);
      console.info(`[import] Enrolled ${created.length}.`);
    }
  }

  if (!invite) {
    console.info("[import] No invitations sent. Re-run with --invite, or invite from the portal.");
    return;
  }
  const actor = await actorFrom(option("--as"));
  for (;;) {
    const { sent, failure, remaining } = await inviteNotYetInvited(actor, {
      limit: 50,
      spacingMs: 600,
    });
    console.info(`[import] Invited ${sent}; ${remaining} not yet invited.`);
    if (failure) {
      console.error(
        `[import] Stopped: ${failure}. Fix the mail settings and re-run with --invite.`,
      );
      return;
    }
    if (remaining === 0 || sent === 0) return;
  }
}

main()
  .catch((error) => {
    console.error("[import] Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
