import type { Metadata } from "next";

import type { AuditAction } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Audit log" };

const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Plain English for each recorded act, and how seriously to take it. */
const DESCRIPTIONS: Record<AuditAction, { label: string; weight: "high" | "normal" }> = {
  ADMIN_BOOTSTRAPPED: { label: "First administrator created", weight: "high" },
  ROLE_CHANGED: { label: "Role changed", weight: "high" },
  USER_DEACTIVATED: { label: "Account deactivated", weight: "high" },
  ACCOUNT_LOCKED: { label: "Account locked after failed sign-ins", weight: "high" },
  USER_REACTIVATED: { label: "Account reactivated", weight: "normal" },
  USER_INVITED: { label: "Member invited", weight: "normal" },
  INVITE_RESENT: { label: "Invitation resent", weight: "normal" },
  PASSWORD_RESET_SENT: { label: "Password reset sent", weight: "normal" },
};

/**
 * The record of privileged acts, newest first.
 *
 * Admin-only, and guarded by `requireAdmin()` before a row is read — a member
 * who guesses this URL is sent to their own dashboard.
 *
 * There is no delete and no edit here, deliberately: an audit log an
 * administrator can tidy up is not evidence of anything. The only way to remove
 * a line is at the database.
 */
export default async function AuditPage() {
  await requireAdmin();

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <h1 className="text-3xl leading-tight">Audit log</h1>
      <p className="text-muted-foreground mt-3 max-w-xl text-pretty">
        Every privileged act on the system: who did it, to whom, and when. Nothing here can be
        edited or removed from inside the application.
      </p>

      {entries.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-sm">Nothing recorded yet.</p>
      ) : (
        <ol className="mt-9">
          {entries.map((entry) => {
            const described = DESCRIPTIONS[entry.action];
            return (
              <li key={entry.id} className="border-border/60 border-t py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={
                      described.weight === "high"
                        ? "text-foreground text-sm font-medium"
                        : "text-foreground/80 text-sm"
                    }
                  >
                    {described.label}
                  </span>
                  {entry.detail && (
                    <span className="text-muted-foreground text-xs">{entry.detail}</span>
                  )}
                  <time
                    dateTime={entry.createdAt.toISOString()}
                    className="text-muted-foreground/70 ml-auto font-mono text-[0.65rem] tracking-wide"
                  >
                    {stamp.format(entry.createdAt)}
                  </time>
                </div>

                <p className="text-muted-foreground mt-1.5 text-xs">
                  {/* The emails are the copies stored on the row, so a deleted
                      account does not turn its history into a set of blanks. */}
                  <span className="font-medium">{entry.actorEmail ?? "the system"}</span>
                  {entry.targetEmail && (
                    <>
                      {" → "}
                      <span>{entry.targetEmail}</span>
                    </>
                  )}
                  {entry.ip && <span className="text-muted-foreground/60"> · {entry.ip}</span>}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
