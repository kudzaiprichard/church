import type { PledgeStatus } from "@/generated/prisma/enums";

import type { Cents } from "./money";

/**
 * A pledge's standing (docs/SCOPE.md §9.10). Paid is computed from confirmed
 * contributions linked to it — never stored — and Overdue is derived: active,
 * past its due date, and not yet fully paid.
 */

export type PledgeState = PledgeStatus | "OVERDUE";

export function pledgeState(
  pledge: { status: PledgeStatus; totalCents: Cents; paidCents: Cents; dueDate: string },
  today: string,
): PledgeState {
  if (pledge.status !== "ACTIVE") return pledge.status;
  if (pledge.paidCents >= pledge.totalCents) return "FULFILLED";
  return pledge.dueDate < today ? "OVERDUE" : "ACTIVE";
}

/** Paid over total, for a progress bar: the real figure, and one capped at 100 %. */
export function progress(paid: Cents, target: Cents) {
  const real = target <= 0 ? 0 : paid / target;
  return { real, shown: Math.min(1, Math.max(0, real)) };
}
