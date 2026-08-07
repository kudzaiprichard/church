import "server-only";

import { headers } from "next/headers";

import type { AuditAction } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The record of privileged acts.
 *
 * An administrator can read every member's giving, promote somebody to their
 * own level and switch an account off. Those powers are necessary and they are
 * also exactly what an investigation later needs an account of — "who made this
 * person an admin, and when" has no answer without this table.
 *
 * Two decisions worth stating:
 *
 * **Emails are copied in, not just referenced.** A log whose meaning depends on
 * rows that can be deleted is not a log. Remove the account and the foreign key
 * goes null while the text stays, so the entry still reads.
 *
 * **Writes join the transaction that made the change.** Passing `tx` records
 * the act and performs it atomically: no change without its entry, no entry
 * without its change. Callers that cannot do that (a mail send, a lockout on a
 * failed sign-in) use the fire-and-forget form, which is best effort — better a
 * missing line than an action that fails because logging did.
 */
type AuditInput = {
  action: AuditAction;
  actor?: { id: string; email: string } | null;
  target?: { id: string; email: string } | null;
  detail?: string;
};

/** Where the request came from, for the entry. Best effort, never a decision. */
async function requestOrigin() {
  try {
    const head = await headers();
    return {
      ip: head.get("x-forwarded-for")?.split(",")[0]?.trim()?.slice(0, 100) ?? null,
      userAgent: head.get("user-agent")?.slice(0, 500) ?? null,
    };
  } catch {
    // Outside a request — the bootstrap runs at server start, where there are
    // no headers to read.
    return { ip: null, userAgent: null };
  }
}

async function buildData(input: AuditInput): Promise<Prisma.AuditLogCreateInput> {
  const { ip, userAgent } = await requestOrigin();

  return {
    action: input.action,
    actorEmail: input.actor?.email ?? null,
    targetEmail: input.target?.email ?? null,
    detail: input.detail ?? null,
    ip,
    userAgent,
    ...(input.actor ? { actor: { connect: { id: input.actor.id } } } : {}),
    ...(input.target ? { target: { connect: { id: input.target.id } } } : {}),
  };
}

/**
 * Record inside an existing transaction, so the entry and the change stand or
 * fall together. This is the form to reach for whenever the act is a write.
 */
export async function recordAuditIn(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({ data: await buildData(input) });
}

/**
 * Record on its own.
 *
 * For acts with nothing to be atomic with — an email going out, an account
 * tripping its lockout. A failure here is logged and swallowed: the audit trail
 * must never be the reason a security control does not fire.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({ data: await buildData(input) });
  } catch (error) {
    console.error("[audit] Could not write an audit entry:", input.action, error);
  }
}
