import type { ReactNode } from "react";

import type { ContributionStatus, ProjectStatus } from "@/generated/prisma/enums";
import type { ContributionRow } from "@/lib/data/finance";
import { formatDateOnly } from "@/lib/dates";
import { MONTHS, type ChemaStatus, type GridCell } from "@/lib/finance/chema";
import type { Cents } from "@/lib/finance/money";
import type { PledgeState } from "@/lib/finance/pledges";
import { TYPE_LABELS, TYPES } from "@/lib/finance/totals";
import { cn } from "@/lib/utils";

import { Money } from "../_components/money";

/**
 * The finance pages' shared pieces: status badges in one palette — green
 * confirmed or paid, amber pending, red rejected, unpaid or overdue, grey for
 * what has not happened yet — the chema grid, and the history table.
 */

const TONES = {
  green: "bg-success/15 text-success",
  amber: "bg-brass/25 text-accent-foreground",
  red: "bg-destructive/10 text-destructive",
  grey: "bg-muted text-muted-foreground",
  blue: "bg-secondary text-primary",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: string }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ContributionStatus }) {
  if (status === "CONFIRMED") return <Badge tone="green">Confirmed</Badge>;
  if (status === "PENDING") return <Badge tone="amber">Pending</Badge>;
  return <Badge tone="red">Rejected</Badge>;
}

export function ChemaBadge({ status }: { status: ChemaStatus | "FUTURE" }) {
  if (status === "PAID") return <Badge tone="green">Paid</Badge>;
  if (status === "PENDING") return <Badge tone="amber">Pending</Badge>;
  if (status === "UNPAID") return <Badge tone="red">Unpaid</Badge>;
  return <Badge tone="grey">Not due</Badge>;
}

export function PledgeBadge({ state }: { state: PledgeState }) {
  if (state === "FULFILLED") return <Badge tone="green">Fulfilled</Badge>;
  if (state === "OVERDUE") return <Badge tone="red">Overdue</Badge>;
  if (state === "CANCELLED") return <Badge tone="grey">Cancelled</Badge>;
  return <Badge tone="blue">Active</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "ACTIVE") return <Badge tone="green">Active</Badge>;
  if (status === "COMPLETED") return <Badge tone="blue">Completed</Badge>;
  return <Badge tone="grey">Cancelled</Badge>;
}

/** A progress bar capped at full, with the real percentage beside it. */
export function Progress({ value, label }: { value: number; label: string }) {
  const shown = Math.min(1, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shown * 100)}
        className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
      >
        <div className="bg-indicator h-full rounded-full" style={{ width: `${shown * 100}%` }} />
      </div>
      <span className="numeric text-muted-foreground w-12 text-right text-xs">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

/**
 * The year's chema as a strip of twelve months. The state is carried by a
 * coloured bar under each month and spelled out beside it, so an unpaid year
 * reads as a list to catch up on rather than a wall of alarms.
 */
export function ChemaGrid({ cells }: { cells: GridCell[] }) {
  const bar = {
    PAID: "bg-success",
    PENDING: "bg-brass",
    UNPAID: "bg-destructive/70",
    FUTURE: "bg-muted",
  } as const;
  const word = { PAID: "Paid", PENDING: "Pending", UNPAID: "Unpaid", FUTURE: "Not due" } as const;

  return (
    <ol className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 xl:grid-cols-12">
      {cells.map((cell) => (
        <li key={cell.month} className="min-w-0">
          <p className="text-foreground text-xs font-semibold">{cell.name.slice(0, 3)}</p>
          <span aria-hidden className={cn("mt-1.5 block h-1.5 rounded-full", bar[cell.status])} />
          <p
            className={cn(
              "mt-1 text-[0.7rem]",
              cell.status === "UNPAID" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {word[cell.status]}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** This year's confirmed total per type, with what is pending in amber. */
export function TypeTotals({
  confirmed,
  pending,
}: {
  confirmed: Record<(typeof TYPES)[number], Cents>;
  pending: Record<(typeof TYPES)[number], Cents>;
}) {
  return (
    <dl className="divide-border grid grid-cols-2 gap-y-4 lg:grid-cols-4 lg:divide-x">
      {TYPES.map((type) => (
        <div key={type} className="min-w-0 lg:px-4 lg:first:pl-0 lg:last:pr-0">
          <dt className="text-muted-foreground text-xs font-medium">{TYPE_LABELS[type]}</dt>
          <dd className="font-title mt-1 text-xl font-semibold">
            <Money cents={confirmed[type]} />
          </dd>
          {pending[type] !== 0 && (
            <dd className="mt-1 text-xs">
              <Money cents={pending[type]} pending />{" "}
              <span className="text-muted-foreground">pending</span>
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

/** What a row was for: the chema month, the project, or nothing more. */
export function rowDetail(row: ContributionRow) {
  if (row.chema) return `${MONTHS[row.chema.month - 1]} ${row.chema.year}`;
  if (row.project) return row.project.name;
  return null;
}

/** A contribution history, newest first. `showMember` adds the member column. */
export function HistoryTable({
  rows,
  showMember,
  actions,
}: {
  rows: ContributionRow[];
  showMember?: boolean;
  actions?: (row: ContributionRow) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b text-xs">
            <th scope="col" className="px-5 py-2 text-left font-semibold">
              Date
            </th>
            {showMember && (
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Member
              </th>
            )}
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              Type
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Amount
            </th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              Status
            </th>
            {actions && (
              <th scope="col" className="sr-only">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {rows.map((row) => (
            <tr key={row.id} className={cn(row.status === "REJECTED" && "opacity-70")}>
              <td className="px-5 py-2.5 whitespace-nowrap">{formatDateOnly(row.paidAt)}</td>
              {showMember && (
                <td className="px-3 py-2.5">
                  <span className="text-foreground font-medium">{row.member.name}</span>
                  {row.groups.length > 0 && (
                    <span className="text-muted-foreground block text-xs">
                      {row.groups.join(", ")}
                    </span>
                  )}
                </td>
              )}
              <td className="px-3 py-2.5">
                <span className="text-foreground">{TYPE_LABELS[row.type]}</span>
                {rowDetail(row) && (
                  <span className="text-muted-foreground block text-xs">{rowDetail(row)}</span>
                )}
                {row.note && (
                  <span className="text-muted-foreground block text-xs italic">{row.note}</span>
                )}
                {row.isReversal && (
                  <span className="text-destructive block text-xs">Reversing entry</span>
                )}
                {row.reversed && <span className="text-destructive block text-xs">Reversed</span>}
              </td>
              <td className="px-3 py-2.5 text-right">
                <Money cents={row.cents} pending={row.status === "PENDING"} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={row.status} />
                {row.rejectReason && (
                  <span className="text-muted-foreground block text-xs">{row.rejectReason}</span>
                )}
                {row.recordedByOfficer && (
                  <span className="text-muted-foreground block text-xs">
                    Recorded by {row.recordedBy}
                  </span>
                )}
              </td>
              {actions && <td className="px-5 py-2.5 text-right">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
