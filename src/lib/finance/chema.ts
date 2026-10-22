import type { ContributionStatus } from "@/generated/prisma/enums";

import type { Cents } from "./money";

/**
 * Chema, the monthly subscription (docs/SCOPE.md §9.9, glossary):
 * $5.00 in January, $1.00 in every other month, one per member per month.
 *
 * The amount is not the member's to choose — it is what the month costs — so
 * the server sets it from `expectedChema` and the form only shows it.
 */

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** 1 → 500 cents; 2–12 → 100 cents. */
export function expectedChema(month: number): Cents {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Not a month: ${month}`);
  }
  return month === 1 ? 500 : 100;
}

export type ChemaStatus = "PAID" | "PENDING" | "UNPAID";

/** One chema row as compliance needs it. */
export type ChemaRow = {
  status: ContributionStatus;
  /** True when an officer has recorded a reversing entry against it. */
  reversed: boolean;
};

/**
 * A member's standing for one month.
 *
 *   PAID     a confirmed chema that has not been reversed
 *   PENDING  one logged and awaiting review
 *   UNPAID   nothing, or only rejected or reversed ones
 *
 * Only CONFIRMED counts as paid (SCOPE §11 Q2).
 */
export function chemaStatus(rows: readonly ChemaRow[]): ChemaStatus {
  if (rows.some((row) => row.status === "CONFIRMED" && !row.reversed)) return "PAID";
  if (rows.some((row) => row.status === "PENDING")) return "PENDING";
  return "UNPAID";
}

/** Paid out of everyone expected, and the percentage, or `null` for nobody. */
export function compliance(statuses: readonly ChemaStatus[]) {
  const paid = statuses.filter((status) => status === "PAID").length;
  return {
    paid,
    total: statuses.length,
    rate: statuses.length === 0 ? null : paid / statuses.length,
  };
}

export type GridCell = { month: number; name: string; status: ChemaStatus | "FUTURE" };

/**
 * A member's year as twelve cells. Months after the current one are FUTURE
 * (grey) unless something has been logged for them already.
 */
export function chemaGrid(
  year: number,
  byMonth: ReadonlyMap<number, readonly ChemaRow[]>,
  today: { year: number; month: number },
): GridCell[] {
  return MONTHS.map((name, index) => {
    const month = index + 1;
    const rows = byMonth.get(month) ?? [];
    const future = year > today.year || (year === today.year && month > today.month);
    const status = chemaStatus(rows);
    return { month, name, status: future && status === "UNPAID" ? "FUTURE" : status };
  });
}
