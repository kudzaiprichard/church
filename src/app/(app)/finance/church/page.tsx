import { DownloadIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { churchFinance, defaultPeriod } from "@/lib/data/finance";
import { groupOptions } from "@/lib/data/members";
import { isDateOnly } from "@/lib/dates";

import { Money } from "../../_components/money";
import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { Pagination } from "../../_components/pagination";
import { HistoryTable, TypeTotals } from "../finance-parts";

import { GroupBarChart, MonthlyLineChart } from "./charts";

export const metadata: Metadata = { title: "Church finance" };

/**
 * Church-wide giving (docs/SCOPE.md §9.9), for the Apostles and the Elder.
 *
 * One read — `churchFinance` — returns the rows for the period and group, and
 * the KPIs and chart series computed from exactly those rows, so the charts
 * and the table can never disagree. Totals are confirmed giving; pending is
 * shown apart. The export link carries the same filters.
 */
export default async function ChurchFinancePage(props: PageProps<"/finance/church">) {
  const user = await requirePermission("finance.viewAll");
  const params = await props.searchParams;
  const fallback = defaultPeriod();
  const date = (value: unknown, otherwise: string) =>
    typeof value === "string" && isDateOnly(value) ? value : otherwise;

  let from = date(params.from, fallback.from);
  let to = date(params.to, fallback.to);
  if (from > to) [from, to] = [to, from];

  const groups = await groupOptions();
  const groupId = groups.find((group) => group.id === params.group)?.id;
  const result = (await churchFinance(user, {
    from,
    to,
    groupId,
    page: Number(params.page) || 1,
  }))!;

  const query = new URLSearchParams({ from, to, ...(groupId ? { group: groupId } : {}) });
  const control =
    "border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--ring)]";

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Church finance"
        description="Confirmed giving across the church. Pending payments are shown apart until they are reviewed."
        actions={
          <Link
            href={`/finance/export?${query}`}
            prefetch={false}
            className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <DownloadIcon className="size-4" aria-hidden />
            Export CSV
          </Link>
        }
      />

      <form
        method="get"
        aria-label="Filter finance"
        className="bg-card border-border mb-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end"
      >
        <label className="text-xs font-semibold">
          From
          <input type="date" name="from" defaultValue={from} className={control} />
        </label>
        <label className="text-xs font-semibold">
          To
          <input type="date" name="to" defaultValue={to} className={control} />
        </label>
        <label className="text-xs font-semibold">
          Group
          <select name="group" defaultValue={groupId ?? ""} className={control}>
            <option value="">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="action-solid h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Filter
        </button>
      </form>

      <p className="text-muted-foreground mb-2 text-sm">
        Confirmed total <Money cents={result.totals.total} className="text-foreground font-semibold" />
        {result.totals.pendingTotal !== 0 && (
          <>
            {" · "}
            <Money cents={result.totals.pendingTotal} pending /> pending
          </>
        )}
      </p>
      <TypeTotals confirmed={result.totals.confirmed} pending={result.totals.pending} />

      {result.total === 0 ? (
        <Panel className="mt-4">
          <EmptyState
            icon={<WalletIcon className="size-5" aria-hidden />}
            title="Nothing in this period"
          >
            Try a wider period or another group.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Panel
              title="By group"
              description="Confirmed, stacked by type. A member in two groups counts in both."
            >
              <GroupBarChart data={result.byGroup} />
            </Panel>
            <Panel title="By month" description="Confirmed giving per month.">
              <MonthlyLineChart data={result.byMonth} />
            </Panel>
          </div>

          <Panel
            title={`${result.total} contributions`}
            description="Newest first. The totals and charts above cover all of them."
            className="mt-4"
            bodyClassName="p-0"
          >
            <HistoryTable rows={result.rows} showMember />
            <div className="border-border border-t">
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                pathname="/finance/church"
                params={{ from, to, group: groupId }}
              />
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
