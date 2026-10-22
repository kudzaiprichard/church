import { ClipboardCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { AttendanceStatus } from "@/generated/prisma/enums";
import { formatRate } from "@/lib/attendance/rules";
import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import {
  churchAttendance,
  groupMatrix,
  ownAttendance,
  type ChurchEventRow,
  type GroupMatrix,
  type HistoryRow,
} from "@/lib/data/attendance";
import { groupOptions } from "@/lib/data/members";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel, StatCard } from "../_components/page-parts";
import { dayLabel } from "../events/event-parts";

export const metadata: Metadata = { title: "Attendance" };

/**
 * Attendance, as far as the caller may see it (docs/SCOPE.md §9.7):
 * everyone their own history and rate; a leader each group they lead as a
 * members × events grid; an Apostle the church by event, filterable by group.
 * The rate is over the last twelve months and is "—" with nothing marked.
 */
export default async function AttendanceOverviewPage(props: PageProps<"/attendance">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const groupParam = typeof params.group === "string" ? params.group : undefined;

  const apostle = can(user, "attendance.viewAll");
  const [own, led, groups] = await Promise.all([
    ownAttendance(user),
    ledGroupIds(user),
    apostle ? groupOptions() : Promise.resolve([]),
  ]);

  const filterGroup = groups.find((group) => group.id === groupParam)?.id;
  const [church, matrices] = await Promise.all([
    apostle ? churchAttendance(user, { groupId: filterGroup }) : null,
    Promise.all(led.map((groupId) => groupMatrix(user, groupId))),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Attendance"
        description="Rates are present over marked, across the last twelve months."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Your attendance rate"
          value={formatRate(own.rate)}
          icon={<ClipboardCheckIcon className="size-4" aria-hidden />}
          hint={own.rows.length === 0 ? "Nothing marked yet." : `${own.rows.length} events marked.`}
        />
      </div>

      {apostle && church && (
        <ChurchPanel rows={church} groups={groups} groupId={filterGroup} />
      )}

      {matrices.map(
        (matrix) => matrix && <MatrixPanel key={matrix.group.id} matrix={matrix} />,
      )}

      <OwnHistory rows={own.rows} />
    </>
  );
}

function OwnHistory({ rows }: { rows: HistoryRow[] }) {
  return (
    <Panel title="Your history" className="mt-4 max-w-3xl" bodyClassName="p-0">
      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
          title="Nothing yet"
        >
          When your group leader takes attendance, it appears here.
        </EmptyState>
      ) : (
        <ul className="divide-border divide-y">
          {rows.map((row) => (
            <li key={row.eventId} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link
                  href={`/events/${row.eventId}`}
                  className="text-foreground text-sm font-semibold hover:underline"
                >
                  {row.title}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {formatDateOnly(row.date)} · {row.group ?? "All Church"}
                </p>
              </div>
              <StatusPill status={row.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function StatusPill({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold",
        status === "PRESENT" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {status === "PRESENT" ? "Present" : "Absent"}
    </span>
  );
}

function MatrixPanel({ matrix }: { matrix: GroupMatrix }) {
  return (
    <Panel
      title={matrix.group.name}
      description="Your group against its recent events and the all-church ones. P present, A absent."
      className="mt-4"
      bodyClassName="p-0"
    >
      {matrix.members.length === 0 || matrix.events.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
          title="Nothing to show"
        >
          {matrix.members.length === 0
            ? "The group has no active members."
            : "No events in the last twelve months yet."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-border border-b">
                <th scope="col" className="px-5 py-2 text-left text-xs font-semibold">
                  Member
                </th>
                {matrix.events.map((event) => {
                  const day = dayLabel(event.date);
                  return (
                    <th
                      key={event.id}
                      scope="col"
                      className="px-2 py-2 text-center text-xs font-medium"
                    >
                      <Link
                        href={`/events/${event.id}`}
                        title={event.title}
                        className="hover:underline"
                      >
                        <span className="text-muted-foreground block text-[0.65rem]">{day.weekday}</span>
                        <span className="numeric">{day.dayMonth}</span>
                      </Link>
                    </th>
                  );
                })}
                <th scope="col" className="px-5 py-2 text-right text-xs font-semibold">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {matrix.members.map((member) => (
                <tr key={member.id}>
                  <th scope="row" className="px-5 py-2 text-left font-medium">
                    <Link href={`/members/${member.id}?tab=attendance`} className="hover:underline">
                      {member.name}
                    </Link>
                  </th>
                  {matrix.events.map((event) => {
                    const mark = member.marks[event.id];
                    return (
                      <td key={event.id} className="px-2 py-2 text-center">
                        <span
                          className={cn(
                            "numeric text-xs font-bold",
                            mark === "PRESENT" && "text-success",
                            mark === "ABSENT" && "text-destructive",
                            !mark && "text-muted-foreground",
                          )}
                        >
                          {mark === "PRESENT" ? "P" : mark === "ABSENT" ? "A" : "·"}
                          <span className="sr-only">
                            {mark === "PRESENT"
                              ? " present"
                              : mark === "ABSENT"
                                ? " absent"
                                : " not marked"}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                  <td className="numeric px-5 py-2 text-right font-semibold">
                    {formatRate(member.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function ChurchPanel({
  rows,
  groups,
  groupId,
}: {
  rows: ChurchEventRow[];
  groups: { id: string; name: string }[];
  groupId?: string;
}) {
  return (
    <Panel
      title="The church"
      description={
        groupId
          ? "Counting only this group's members, at its events and the all-church ones."
          : "Every event in the last twelve months."
      }
      action={
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="group" className="sr-only">
            Group
          </label>
          <select
            id="group"
            name="group"
            defaultValue={groupId ?? ""}
            className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          >
            <option value="">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border-border hover:bg-muted h-8 cursor-pointer rounded-md border px-2.5 text-xs font-semibold"
          >
            Filter
          </button>
        </form>
      }
      className="mt-4"
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheckIcon className="size-5" aria-hidden />}
          title="No events yet"
        >
          Past events appear here with their attendance.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs">
                <th scope="col" className="px-5 py-2 text-left font-semibold">
                  Event
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Present
                </th>
                <th scope="col" className="px-5 py-2 text-right font-semibold">
                  Absent
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/events/${row.id}`}
                      className="text-foreground font-medium hover:underline"
                    >
                      {row.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {formatDateOnly(row.date)} · {row.group ?? "All Church"}
                    </span>
                  </td>
                  <td className="numeric px-3 py-2.5 text-right font-semibold">{row.present}</td>
                  <td className="numeric text-muted-foreground px-5 py-2.5 text-right">{row.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
