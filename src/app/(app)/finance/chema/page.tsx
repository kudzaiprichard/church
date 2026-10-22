import { UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { chemaCompliance } from "@/lib/data/finance";
import { groupOptions } from "@/lib/data/members";
import { formatDateOnly, harareToday } from "@/lib/dates";
import { MONTHS } from "@/lib/finance/chema";

import { Money } from "../../_components/money";
import { EmptyState, PageHeader, Panel, StatCard } from "../../_components/page-parts";
import { ChemaBadge } from "../finance-parts";

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
  const control = "border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm";

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Chema compliance"
        description={
          result.officer
            ? "Who has paid the month's chema. Only confirmed payments count as paid."
            : "Who in your groups has paid the month's chema. You see paid or unpaid — no other giving."
        }
      />

      <form
        method="get"
        aria-label="Choose a month"
        className="bg-card border-border mb-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end"
      >
        <label className="text-xs font-semibold">
          Month
          <select name="month" defaultValue={month} className={control}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Year
          <select name="year" defaultValue={year} className={control}>
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
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
          className="action-solid h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Show
        </button>
      </form>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={`${MONTHS[month - 1]} ${year}`}
          value={result.rate === null ? "—" : `${Math.round(result.rate * 100)}%`}
          icon={<UsersRoundIcon className="size-4" aria-hidden />}
          hint={`${result.paid} of ${result.total} paid`}
        />
      </div>

      <Panel bodyClassName="p-0">
        {result.rows.length === 0 ? (
          <EmptyState
            icon={<UsersRoundIcon className="size-5" aria-hidden />}
            title="Nobody to show"
          >
            No active members match.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
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
                {result.rows.map((row) => (
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
        )}
      </Panel>
    </>
  );
}
