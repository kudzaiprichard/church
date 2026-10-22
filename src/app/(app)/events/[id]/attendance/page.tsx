import { ArrowLeftIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { attendanceSheet } from "@/lib/data/attendance";
import { formatDateOnly } from "@/lib/dates";

import { EmptyState, PageHeader, Panel } from "../../../_components/page-parts";

import { AttendanceSheet } from "./attendance-sheet";

export const metadata: Metadata = { title: "Take attendance" };

/**
 * The attendance sheet (docs/SCOPE.md §9.7). It lists only the people the
 * caller may mark at this event — a group's members for its leader, each
 * leader's own groups at an all-church service — and `markAttendance` checks
 * the whole payload against the same rule before writing anything.
 */
export default async function AttendancePage(props: PageProps<"/events/[id]/attendance">) {
  const user = await requireSession();
  const { id } = await props.params;

  const sheet = await attendanceSheet(user, id);
  if (!sheet) notFound();

  return (
    <>
      <Link
        href={`/events/${sheet.event.id}`}
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        {sheet.event.title}
      </Link>

      <PageHeader
        eyebrow={`${formatDateOnly(sheet.event.date)} · ${sheet.event.time}`}
        title="Take attendance"
        description={
          sheet.event.group
            ? `${sheet.event.group} members.`
            : user.role === "APOSTLE"
              ? "An all-church event: everyone on the roll."
              : "An all-church event: the members of the groups you lead. Other leaders mark theirs."
        }
      />

      <Panel className="max-w-3xl">
        {!sheet.open ? (
          <p className="text-muted-foreground text-sm">
            Attendance opens 24 hours before the event starts.
          </p>
        ) : sheet.people.length === 0 ? (
          <EmptyState
            icon={<UsersRoundIcon className="size-5" aria-hidden />}
            title="Nobody to mark"
          >
            There are no active members to mark for this event.
          </EmptyState>
        ) : (
          <AttendanceSheet eventId={sheet.event.id} people={sheet.people} />
        )}
      </Panel>
    </>
  );
}
