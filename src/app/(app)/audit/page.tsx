import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";

import type { AuditAction } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";

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
  MEMBER_ENROLLED: { label: "Member enrolled", weight: "normal" },
  MEMBER_UPDATED: { label: "Member record edited", weight: "normal" },
  THEME_UPDATED: { label: "Theme of the Year changed", weight: "normal" },
  SETTINGS_UPDATED: { label: "Church settings changed", weight: "normal" },
  GROUP_LEADER_CHANGED: { label: "Group leader changed", weight: "high" },
  GROUP_CREATED: { label: "Group created", weight: "normal" },
  GROUP_UPDATED: { label: "Group edited", weight: "normal" },
  GROUP_DELETED: { label: "Group deleted", weight: "normal" },
};

/**
 * The record of privileged acts, newest first.
 *
 * Guarded by `requirePermission("audit.view")` before a row is read — anyone
 * else who guesses this URL is sent to their own dashboard.
 *
 * There is no delete and no edit here, deliberately: an audit log an
 * administrator can tidy up is not evidence of anything. The only way to remove
 * a line is at the database.
 */
export default async function AuditPage() {
  await requirePermission("audit.view");

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Audit log"
        description="Every privileged act on the system: who did it, to whom, and when. Nothing here can be edited or removed from inside the application."
      />

      <Panel
        title={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
        description="Newest first, up to the latest 200."
        bodyClassName="p-0"
      >
        {entries.length === 0 ? (
          <EmptyState icon={<ScrollTextIcon className="size-5" aria-hidden />} title="Nothing recorded yet">
            Invitations, role changes and password resets will be listed here as they happen.
          </EmptyState>
        ) : (
          <ol className="divide-border divide-y">
            {entries.map((entry) => {
              const described = DESCRIPTIONS[entry.action];
              const high = described.weight === "high";
              return (
                <li key={entry.id} className="flex gap-3 px-5 py-3.5">
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${high ? "bg-brass" : "bg-border"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span
                        className={
                          high ? "text-foreground text-sm font-semibold" : "text-foreground/85 text-sm"
                        }
                      >
                        {described.label}
                      </span>
                      {entry.detail && (
                        <span className="text-muted-foreground text-xs">{entry.detail}</span>
                      )}
                      <time
                        dateTime={entry.createdAt.toISOString()}
                        className="numeric text-muted-foreground ml-auto text-xs"
                      >
                        {stamp.format(entry.createdAt)}
                      </time>
                    </div>

                    <p className="text-muted-foreground mt-1 text-xs">
                      {/* The emails are the copies stored on the row, so a deleted
                          account does not turn its history into a set of blanks. */}
                      <span className="text-foreground/80 font-medium">
                        {entry.actorEmail ?? "the system"}
                      </span>
                      {entry.targetEmail && (
                        <>
                          {" → "}
                          <span>{entry.targetEmail}</span>
                        </>
                      )}
                      {entry.ip && <span className="opacity-70"> · {entry.ip}</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </>
  );
}
