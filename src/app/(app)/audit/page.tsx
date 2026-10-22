import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";

import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/dal";
import { isDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { parsePaging } from "@/lib/paging";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";
import { Pagination } from "../_components/pagination";

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
  EVENT_DELETED: { label: "Event deleted", weight: "normal" },
  PRAYER_REQUEST_REMOVED: { label: "Prayer request removed", weight: "normal" },
  CONTRIBUTION_CONFIRMED: { label: "Payment confirmed", weight: "high" },
  CONTRIBUTION_REJECTED: { label: "Payment rejected", weight: "high" },
  CONTRIBUTION_RECORDED_FOR_MEMBER: { label: "Payment recorded for a member", weight: "high" },
  FINANCE_EXPORTED: { label: "Finance exported", weight: "high" },
  PROJECT_CREATED: { label: "Partnership project created", weight: "normal" },
  PROJECT_UPDATED: { label: "Partnership project edited", weight: "normal" },
  PROJECT_COMPLETED: { label: "Partnership project completed", weight: "normal" },
  PLEDGE_CANCELLED: { label: "Pledge cancelled by an officer", weight: "normal" },
  SERMON_DELETED: { label: "Sermon deleted", weight: "normal" },
  DEVOTION_DELETED: { label: "Devotion deleted", weight: "normal" },
  BAPTISM_RECORD_UPDATED: { label: "Baptismal record edited", weight: "normal" },
  CERTIFICATE_ISSUED: { label: "Baptism certificate issued", weight: "high" },
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
 *
 * Filters — action, actor (by email) and a Harare date range — live in the URL,
 * and the list pages through in fifties (docs/SCOPE.md §9.23).
 */

export default async function AuditPage(props: PageProps<"/audit">) {
  await requirePermission("audit.view");
  const params = await props.searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.length > 0 ? value.slice(0, 100) : undefined;
  };
  const ACTIONS = Object.keys(DESCRIPTIONS) as AuditAction[];
  const action = ACTIONS.find((value) => value === one("action"));
  const actor = one("actor");
  const from = isDateOnly(one("from") ?? "") ? one("from") : undefined;
  const to = isDateOnly(one("to") ?? "") ? one("to") : undefined;
  const { page, size } = parsePaging(params, 25);

  // Dates are Harare days: from midnight at the start of `from` (UTC+2) to
  // midnight at the end of `to`.
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(actor ? { actorEmail: { contains: actor, mode: "insensitive" } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00+02:00`) } : {}),
            ...(to
              ? { lt: new Date(new Date(`${to}T00:00:00+02:00`).getTime() + 86_400_000) }
              : {}),
          },
        }
      : {}),
  };
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.auditLog.count({ where }),
  ]);
  const filtered = Boolean(action || actor || from || to);
  const control = "border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm";

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Audit log"
        description="Every privileged act on the system: who did it, to whom, and when. Nothing here can be edited or removed from inside the application."
      />

      <form
        method="get"
        aria-label="Filter the audit log"
        className="bg-card border-border mb-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end"
      >
        <label className="text-xs font-semibold">
          Action
          <select name="action" defaultValue={action ?? ""} className={control}>
            <option value="">Every action</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {DESCRIPTIONS[value].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Done by
          <input
            type="search"
            name="actor"
            defaultValue={actor}
            placeholder="Email"
            className={control}
          />
        </label>
        <label className="text-xs font-semibold">
          From
          <input type="date" name="from" defaultValue={from} className={control} />
        </label>
        <label className="text-xs font-semibold">
          To
          <input type="date" name="to" defaultValue={to} className={control} />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="action-solid h-10 flex-1 cursor-pointer rounded-lg px-4 text-sm font-semibold"
          >
            Filter
          </button>
          {filtered && (
            <a
              href="/audit"
              className="border-border hover:bg-muted inline-flex h-10 items-center rounded-lg border px-3 text-sm"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      <Panel
        title={`${total} ${total === 1 ? "entry" : "entries"}`}
        description="Newest first."
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
        <Pagination
            page={page}
            pageCount={Math.max(1, Math.ceil(total / size))}
            size={size}
            total={total}
            pathname="/audit"
            params={{ action, actor, from, to }}
          />
      </Panel>
    </>
  );
}
