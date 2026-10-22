import { UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { chemaCompliance } from "@/lib/data/finance";
import { groupOptions } from "@/lib/data/members";
import { formatDateOnly, harareToday } from "@/lib/dates";
import { MONTHS } from "@/lib/finance/chema";
import { paginate, parsePaging } from "@/lib/paging";

import { Money } from "../../_components/money";
import { EmptyState, FactList, PageGrid, PageHeader, Panel } from "../../_components/page-parts";
import { ChemaBadge } from "../finance-parts";
import { Pagination } from "../../_components/pagination";

export const metadata: Metadata = { title: "Chema compliance" };

/**
 * Who has paid a month's chema (docs/SCOPE.md §9.9).
 *
 * Finance officers see the church, or one group; a leader sees the groups
 * they lead and nothing else financial — `chemaCompliance` returns only the
 * month's expected chema, a status and a date, never other giving. Anyone
 * else is sent to their dashboard.
 */
export default async function ChemaPage(props: PageProps<"/finance/chema">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const today = harareToday();
  const thisYear = Number(today.slice(0, 4));

  const year = Number(params.year) || thisYear;
  const monthParam = Number(params.month);
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : Number(today.slice(5, 7));
  const groupParam = typeof params.group === "string" ? params.group : undefined;

  const result = await chemaCompliance(user, {
    year: Math.min(Math.max(year, thisYear - 5), thisYear + 1),
    month,
    groupId: groupParam,
  });
  if (!result) redirect("/dashboard");

  const allGroups = await groupOptions();
  const groups = result.officer
    ? allGroups
    : allGroups.filter((group) => result.ledGroupIds.includes(group.id));
  const control =
    "border-input bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm text-foreground outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]";

  const listed = paginate(result.rows, parsePaging(params, 25));
  const counts = { PAID: 0, PENDING: 0, UNPAID: 0 };
  for (const row of result.rows) counts[row.status] += 1;

  return (
    <>
      <PageHeader
        title="Chema compliance"
        description={
          result.officer
            ? "Who has paid the month's chema. Only confirmed payments count as paid."
            : "Who in your groups has paid the month's chema. You see paid or unpaid — no other giving."
        }
      />

      <PageGrid
        aside={
          <>
            <Panel title={`${MONTHS[month - 1]} ${year}`}>
              <p className="font-title numeric text-foreground text-4xl leading-none font-semibold">
                {result.rate === null ? "—" : `${Math.round(result.rate * 100)}%`}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {result.paid} of {result.total} paid
              </p>
              {result.total > 0 && (
                <div
                  className="bg-muted mt-3 flex h-2 overflow-hidden rounded-full"
                  role="img"
                  aria-label={`${counts.PAID} paid, ${counts.PENDING} pending, ${counts.UNPAID} unpaid`}
                >
                  <span
                    className="bg-success h-full"
                    style={{ width: `${(counts.PAID / result.total) * 100}%` }}
                  />
                  <span
                    className="bg-brass h-full"
                    style={{ width: `${(counts.PENDING / result.total) * 100}%` }}
                  />
                </div>
              )}
              <div className="mt-4">
                <FactList
                  facts={[
                    { label: "Paid", value: counts.PAID },
                    { label: "Pending review", value: counts.PENDING },
                    { label: "Not paid", value: counts.UNPAID },
                  ]}
                />
              </div>
            </Panel>
            <Panel title="How it is counted">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Chema is $5 in January and $1 in other months. A payment counts once a finance
                officer confirms it; until then it shows as pending.
              </p>
            </Panel>
          </>
        }
      >
        <Panel bodyClassName="p-0">
          <form
            method="get"
            aria-label="Choose a month"
            className="border-border grid gap-2 border-b p-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end"
          >
            <label className="text-muted-foreground text-xs font-medium">
              Month
              <select name="month" defaultValue={month} className={control}>
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground text-xs font-medium">
              Year
              <select name="year" defaultValue={year} className={control}>
                {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground text-xs font-medium">
              Group
              <select name="group" defaultValue={groupParam ?? ""} className={control}>
                <option value="">{result.officer ? "Everyone" : "All my groups"}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="action-solid h-9 cursor-pointer rounded-md px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Show
            </button>
          </form>
          {result.rows.length === 0 ? (
            <EmptyState
              icon={<UsersRoundIcon className="size-5" aria-hidden />}
              title="Nobody to show"
            >
              No active members match.
            </EmptyState>
          ) : (
            <>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs">
                    <th scope="col" className="px-5 py-2 text-left font-semibold">
                      Member
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Expected
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-2 text-left font-semibold">
                      Paid on
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {listed.rows.map((row) => (
                    <tr key={row.member.id}>
                      <td className="px-5 py-2.5">
                        <span className="text-foreground font-medium">{row.member.name}</span>
                        <span className="text-muted-foreground block text-xs">
                          {row.groups.join(", ") || "No group"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Money cents={row.expectedCents} />
                      </td>
                      <td className="px-3 py-2.5">
                        <ChemaBadge status={row.status} />
                      </td>
                      <td className="text-muted-foreground px-5 py-2.5">
                        {row.paidAt ? formatDateOnly(row.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={listed.page}
              pageCount={listed.pageCount}
              total={listed.total}
              size={listed.size}
              pathname="/finance/chema"
              params={{ month: String(month), year: String(year), group: groupParam }}
            />
            </>
          )}
        </Panel>
      </PageGrid>
    </>
  );
}
