import { WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { ContributionType } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/dal";
import { myGiving, paymentOptions } from "@/lib/data/finance";
import { harareToday } from "@/lib/dates";
import { TYPE_LABELS, TYPES } from "@/lib/finance/totals";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";

import { ChemaGrid, HistoryTable, TypeTotals } from "./finance-parts";
import { LogPaymentDialog } from "./payment-form";

export const metadata: Metadata = { title: "My giving" };

/**
 * A member's own giving (docs/SCOPE.md §9.9): log a payment, this year's
 * totals by type, the twelve-month chema grid and the history. `myGiving`
 * reads the caller's own rows only — an Apostle's "My giving" is theirs.
 * Totals count confirmed payments; pending ones are shown apart in amber.
 */
export default async function MyGivingPage(props: PageProps<"/finance">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const year = Number(params.year) || undefined;
  const type = TYPES.find((value) => value === params.type) as ContributionType | undefined;

  const [giving, options] = await Promise.all([
    myGiving(user, { year, type }),
    paymentOptions(user),
  ]);
  const today = harareToday();

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
      active
        ? "border-primary bg-secondary text-primary"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  const href = (next: { year?: number; type?: string }) => {
    const query = new URLSearchParams();
    const y = next.year ?? giving.year;
    if (y !== Number(today.slice(0, 4))) query.set("year", String(y));
    if (next.type) query.set("type", next.type);
    const search = query.toString();
    return search ? `/finance?${search}` : "/finance";
  };

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="My giving"
        description="Your own payments. Only you and the church's finance officers see them."
        actions={<LogPaymentDialog options={options} today={today} />}
      />

      <h2 className="text-foreground mb-3 text-sm font-bold">{giving.year} so far</h2>
      <TypeTotals confirmed={giving.totals.confirmed} pending={giving.totals.pending} />

      <Panel
        title={`Chema ${giving.year}`}
        description="$5 in January, $1 in other months."
        className="mt-4"
      >
        <ChemaGrid cells={giving.grid} />
      </Panel>

      <Panel
        title="History"
        className="mt-4"
        bodyClassName="p-0"
        action={
          giving.years.length > 1 && (
            <nav aria-label="Year" className="flex gap-1">
              {giving.years.map((option) => (
                <Link
                  key={option}
                  href={href({ year: option, type })}
                  className={chip(option === giving.year)}
                >
                  {option}
                </Link>
              ))}
            </nav>
          )
        }
      >
        <nav
          aria-label="Filter by type"
          className="border-border flex gap-1.5 overflow-x-auto border-b px-5 py-3"
        >
          <Link href={href({})} className={chip(!type)}>
            All
          </Link>
          {TYPES.map((value) => (
            <Link key={value} href={href({ type: value })} className={chip(type === value)}>
              {TYPE_LABELS[value]}
            </Link>
          ))}
        </nav>
        {giving.history.length === 0 ? (
          <EmptyState icon={<WalletIcon className="size-5" aria-hidden />} title="Nothing logged">
            Log a payment and it appears here, pending until it is confirmed.
          </EmptyState>
        ) : (
          <HistoryTable rows={giving.history} />
        )}
      </Panel>
    </>
  );
}
