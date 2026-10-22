import { WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { ContributionType } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/dal";
import { myGiving, paymentOptions } from "@/lib/data/finance";
import { myPledges } from "@/lib/data/partnerships";
import { formatDateOnly, harareToday } from "@/lib/dates";
import { formatMoney } from "@/lib/finance/money";
import { progress } from "@/lib/finance/pledges";
import { TYPE_LABELS, TYPES } from "@/lib/finance/totals";
import { cn } from "@/lib/utils";
import { paginate, parsePaging } from "@/lib/paging";

import { EmptyState, PageGrid, PageHeader, Panel, PanelLink } from "../_components/page-parts";
import { Pagination } from "../_components/pagination";

import { ChemaGrid, HistoryTable, PledgeBadge, Progress, TypeTotals } from "./finance-parts";
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

  const [giving, options, pledges] = await Promise.all([
    myGiving(user, { year, type }),
    paymentOptions(user),
    myPledges(user),
  ]);
  const openPledges = pledges.filter(
    (pledge) => pledge.state === "ACTIVE" || pledge.state === "OVERDUE",
  );
  const today = harareToday();
  const history = paginate(giving.history, parsePaging(params, 10));

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
        title="My giving"
        description="Your own payments. Only you and the church's finance officers see them."
        actions={
          <>
            <Link
              href="/finance/pledges"
              className="border-border bg-card hover:bg-muted inline-flex h-9 items-center rounded-md border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Pledges
            </Link>
            <LogPaymentDialog options={options} today={today} />
          </>
        }
      />

      <PageGrid
        aside={
          <>
            <Panel title="Your pledges" action={<PanelLink href="/finance/pledges">All</PanelLink>}>
              {openPledges.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No open pledges.{" "}
                  <Link
                    href="/finance/pledges"
                    className="text-primary font-semibold hover:underline"
                  >
                    Make one
                  </Link>
                </p>
              ) : (
                <ul className="grid gap-4">
                  {openPledges.map((pledge) => (
                    <li key={pledge.id} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-foreground truncate text-sm font-medium">
                          {pledge.description}
                        </p>
                        <PledgeBadge state={pledge.state} />
                      </div>
                      <p className="text-muted-foreground numeric mt-0.5 text-xs">
                        {formatMoney(pledge.paidCents)} of {formatMoney(pledge.totalCents)} · due{" "}
                        {formatDateOnly(pledge.dueDate)}
                      </p>
                      <div className="mt-1.5">
                        <Progress
                          value={progress(pledge.paidCents, pledge.totalCents).real}
                          label={`${pledge.description} progress`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="How giving works">
              <ul className="text-muted-foreground grid gap-2 text-sm leading-relaxed">
                <li>Chema is $5 in January and $1 in every other month.</li>
                <li>A payment you log stays pending until a finance officer confirms it.</li>
                <li>
                  Give to a church project from{" "}
                  <Link href="/partnerships" className="text-primary font-medium hover:underline">
                    Partnerships
                  </Link>
                  , or pledge a total by a date.
                </li>
              </ul>
            </Panel>
          </>
        }
      >
        <Panel title={`${giving.year} so far`}>
          <TypeTotals confirmed={giving.totals.confirmed} pending={giving.totals.pending} />
        </Panel>

        <Panel title={`Chema ${giving.year}`} description="$5 in January, $1 in other months.">
          <ChemaGrid cells={giving.grid} />
        </Panel>

        <Panel
          title="History"
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
            className="border-border flex gap-1.5 scrollbar-none overflow-x-auto overflow-y-hidden border-b px-4 py-2.5"
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
            <>
              <HistoryTable rows={history.rows} />
              <Pagination
                page={history.page}
                pageCount={history.pageCount}
                total={history.total}
                size={history.size}
                pathname="/finance"
                params={{ year: typeof params.year === "string" ? params.year : undefined, type }}
              />
            </>
          )}
        </Panel>
      </PageGrid>
    </>
  );
}
