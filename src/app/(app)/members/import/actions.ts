"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import type { ImportPlan, ImportProblem } from "@/lib/members/import";
import {
  IMPORT_MAX_BYTES,
  checkImport,
  countNotYetInvited,
  enrolImported,
  inviteNotYetInvited,
} from "@/lib/members/import-run";
import { prisma } from "@/lib/prisma";
import { GROUPS_TAG } from "@/lib/settings";

/**
 * Importing the member list from the portal (docs/IMPLEMENTATION_PLAN.md,
 * Phase 6) — for whoever may enrol, since an import is enrolment in bulk and
 * holds every row to the same rules. The browser reads the file and sends its
 * text; nothing is stored between the check and the import, so the import
 * checks again against the roll as it is by then.
 */

export type ImportCheck = {
  fileName: string;
  ready: { line: number; name: string; email: string; groups: string[] }[];
  problems: ImportProblem[];
  unknownColumns: string[];
};

export type ImportResult =
  { error: string; check?: ImportCheck } | { enrolled: number; notYetInvited: number };

export type InviteResult = { sent: number; remaining: number; error?: string };

/** Up to 120 invitations a run, ~600 ms apart: inside Resend's rate and the request's time. */
const INVITES_PER_RUN = 120;

/** Only a short base name reaches the audit log. */
function cleanName(fileName: string) {
  return (
    (fileName.split(/[\\/]/).pop() ?? "").replace(/[^\w .()-]/g, "").slice(0, 80) || "upload.csv"
  );
}

async function describe(plan: ImportPlan, fileName: string): Promise<ImportCheck> {
  const groups = await prisma.group.findMany({
    select: { id: true, name: true },
  });
  const nameOf = new Map(groups.map((group) => [group.id, group.name]));
  return {
    fileName,
    ready: plan.ready.map(({ line, input }) => ({
      line,
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      groups: input.groupIds.map((id) => nameOf.get(id) ?? ""),
    })),
    problems: plan.problems,
    unknownColumns: plan.unknownColumns,
  };
}

function tooLarge(text: string) {
  return new TextEncoder().encode(text).length > IMPORT_MAX_BYTES;
}

/** Read and check every row. Changes nothing. */
export async function checkMemberImport(
  fileName: string,
  text: string,
): Promise<{ error: string } | { check: ImportCheck }> {
  await requirePermission("members.enroll");
  if (tooLarge(text)) return { error: "That file is over 1 MB. Split it and import the parts." };
  const plan = await checkImport(text);
  if (plan.ready.length + plan.problems.length === 0) {
    return {
      error: "No member rows found. Is the first row the column headings?",
    };
  }
  return { check: await describe(plan, cleanName(fileName)) };
}

/**
 * Enrol the rows that are ready — exactly those the person confirmed. If the
 * roll changed since they checked (someone enrolled by hand meanwhile), the
 * fresh check comes back instead, to be confirmed again.
 */
export async function commitMemberImport(
  fileName: string,
  text: string,
  confirmedReady: number,
): Promise<ImportResult> {
  const actor = await requirePermission("members.enroll");
  if (tooLarge(text)) return { error: "That file is over 1 MB." };
  const name = cleanName(fileName);

  const plan = await checkImport(text);
  if (plan.ready.length !== confirmedReady) {
    return {
      error:
        "The roll has changed since this file was checked. Review the new check and import again.",
      check: await describe(plan, name),
    };
  }
  if (plan.ready.length === 0) return { error: "No rows are ready to import." };

  try {
    await enrolImported(plan, actor, name);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        error:
          "Somebody in the file was enrolled while it was importing. Nothing was saved — check it again.",
        check: await describe(await checkImport(text), name),
      };
    }
    throw error;
  }

  updateTag(GROUPS_TAG);
  revalidatePath("/members", "layout");
  return {
    enrolled: plan.ready.length,
    notYetInvited: await countNotYetInvited(),
  };
}

/** Email the next batch of members who have never had an invitation. */
export async function sendPendingInvitations(): Promise<InviteResult> {
  const actor = await requirePermission("members.enroll");
  const { sent, failure, remaining } = await inviteNotYetInvited(actor, {
    limit: INVITES_PER_RUN,
    spacingMs: 600,
  });
  revalidatePath("/members");
  return {
    sent,
    remaining,
    ...(failure && { error: `The mail service refused a message: ${failure}` }),
  };
}
