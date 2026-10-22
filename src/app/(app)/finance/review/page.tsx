import { ClipboardCheckIcon } from "lucide-react";
import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { memberOptions, paymentOptions, reviewQueue } from "@/lib/data/finance";
import { formatDateOnly, harareToday } from "@/lib/dates";
import { TYPE_LABELS } from "@/lib/finance/totals";
import { paginate, parsePaging } from "@/lib/paging";

import { Money } from "../../_components/money";
import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { confirmContribution } from "../actions";
import { rowDetail } from "../finance-parts";
import { PaymentForm } from "../payment-form";
import { Pagination } from "../../_components/pagination";

import { BulkConfirm, RejectForm } from "./review-forms";

export const metadata: Metadata = { title: "Payment review" };

const BULK = "bulk-confirm";

/**
 * Payments waiting for an officer (docs/SCOPE.md §9.9), oldest first:
 * confirm one, confirm a selection, or reject with a reason. Below it, an
 * officer records cash handed in for a member — confirmed at once and audited.
 * An officer's own logged payments are left for another officer to review.
 */
export default async function ReviewPage(props: PageProps<"/finance/review">) {
  const user = await requirePermission("finance.confirm");
  const [queue, members, { projects }] = await Promise.all([
    reviewQueue(user),
    memberOptions(user),
    paymentOptions(user),
  ]);
  const queued = paginate(queue ?? [], parsePaging(await props.searchParams, 20));
  const rows = queued.rows;

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Payment review"
        description="Members' logged payments count once they are confirmed here. Confirmed payments are never edited — correct one with a reversal from the member's Giving tab."
      />

      <Panel
        title={`${queued.total} waiting`}
        action={rows.length > 1 && <BulkConfirm formId={BULK} count={rows.length} />}
        bodyClassName="p-0"
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
            title="All caught up"
          >
            Nothing is waiting for review.
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs">
                    <th scope="col" className="w-10 px-5 py-2">
                      <span className="sr-only">Select</span>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      Member
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      Payment
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Amount
                    </th>
                    <th scope="col" className="px-5 py-2 text-right font-semibold">
                      Review
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows.map((row) => {
                    const own = row.member.id === user.id;
                    return (
                      <tr key={row.id}>
                        <td className="px-5 py-3 align-top">
                          {!own && (
                            <input
                              type="checkbox"
                              name="ids"
                              value={row.id}
                              form={BULK}
                              aria-label={`Select ${row.member.name}'s payment`}
                              className="accent-primary size-4"
                            />
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="text-foreground font-medium">{row.member.name}</span>
                          <span className="text-muted-foreground block text-xs">
                            {row.groups.join(", ") || "No group"}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="text-foreground">{TYPE_LABELS[row.type]}</span>
                          {rowDetail(row) && (
                            <span className="text-muted-foreground block text-xs">
                              {rowDetail(row)}
                            </span>
                          )}
                          <span className="text-muted-foreground block text-xs">
                            Paid {formatDateOnly(row.paidAt)}
                          </span>
                          {row.note && (
                            <span className="text-muted-foreground block text-xs italic">
                              {row.note}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <Money cents={row.cents} />
                        </td>
                        <td className="px-5 py-3 text-right align-top">
                          {own ? (
                            <span className="text-muted-foreground text-xs">
                              Your own — another officer reviews it
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-start justify-end gap-1.5">
                              <form action={confirmContribution.bind(null, row.id)}>
                                <button
                                  type="submit"
                                  className="action-solid h-7 cursor-pointer rounded-md px-2.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                                >
                                  Confirm
                                </button>
                              </form>
                              <RejectForm id={row.id} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={queued.page}
              pageCount={queued.pageCount}
              total={queued.total}
              size={queued.size}
              pathname="/finance/review"
              params={{}}
            />
          </>
        )}
      </Panel>

      <Panel
        title="Record a payment for a member"
        description="For cash or transfers handed in to the office. It is confirmed at once, recorded in the audit log and the member is told."
        className="mt-4 max-w-3xl"
      >
        <PaymentForm options={{ projects, pledges: [] }} today={harareToday()} members={members} />
      </Panel>
    </>
  );
}
