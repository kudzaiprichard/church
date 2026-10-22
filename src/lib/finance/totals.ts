import type { ContributionStatus, ContributionType } from "@/generated/prisma/enums";

import type { Cents } from "./money";

/**
 * Totals, from one list of rows.
 *
 * The church page draws its KPIs, its two charts and its table from the same
 * array, through these functions — which is what makes "chart totals equal
 * table totals for the same filters" true by construction rather than by
 * keeping two queries in step. Only CONFIRMED rows count; PENDING is reported
 * apart, so it can be shown in amber and never mistaken for money received.
 */

export const TYPES: readonly ContributionType[] = ["CHEMA", "WELFARE", "TITHE", "PARTNERSHIP"];

export const TYPE_LABELS: Record<ContributionType, string> = {
  CHEMA: "Chema",
  WELFARE: "Welfare",
  TITHE: "Tithe",
  PARTNERSHIP: "Partnership",
};

export type TotalsRow = {
  type: ContributionType;
  status: ContributionStatus;
  cents: Cents;
};

const zero = (): Record<ContributionType, Cents> => ({
  CHEMA: 0,
  WELFARE: 0,
  TITHE: 0,
  PARTNERSHIP: 0,
});

export function summarise(rows: readonly TotalsRow[]) {
  const confirmed = zero();
  const pending = zero();
  for (const row of rows) {
    if (row.status === "CONFIRMED") confirmed[row.type] += row.cents;
    else if (row.status === "PENDING") pending[row.type] += row.cents;
  }
  const all = (by: Record<ContributionType, Cents>) =>
    TYPES.reduce((sum, type) => sum + by[type], 0);
  return { confirmed, pending, total: all(confirmed), pendingTotal: all(pending) };
}

/** Confirmed amount per group and type, for the bar chart. A row counts once per group. */
export function byGroup(rows: readonly (TotalsRow & { groups: readonly string[] })[]) {
  const groups = new Map<string, Record<ContributionType, Cents>>();
  for (const row of rows) {
    if (row.status !== "CONFIRMED") continue;
    const names = row.groups.length > 0 ? row.groups : ["No group"];
    for (const name of names) {
      const entry = groups.get(name) ?? zero();
      entry[row.type] += row.cents;
      groups.set(name, entry);
    }
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, totals]) => ({ group, ...totals }));
}

/** Confirmed amount per calendar month (`YYYY-MM`), in order, for the line chart. */
export function byMonth(rows: readonly (TotalsRow & { paidAt: string })[]) {
  const months = new Map<string, Cents>();
  for (const row of rows) {
    if (row.status !== "CONFIRMED") continue;
    const month = row.paidAt.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + row.cents);
  }
  return [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cents]) => ({ month, cents }));
}
