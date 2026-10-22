import { ArrowLeftIcon, ClipboardCheckIcon, MapPinIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { getEvent } from "@/lib/data/events";
import { formatDateOnly } from "@/lib/dates";

import { PageHeader, Panel } from "../../_components/page-parts";
import { TargetBadge, timeRange } from "../event-parts";

export const metadata: Metadata = { title: "Event" };

/**
 * One event (docs/SCOPE.md §9.6). `getEvent` answers `null` for an event of a
 * group the caller is not in — the same 404 as an id that does not exist.
 */
export default async function EventPage(props: PageProps<"/events/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;

  const event = await getEvent(user, id);
  if (!event) notFound();

  return (
    <>
      <Link
        href={`/events?month=${event.date.slice(0, 7)}`}
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Events
      </Link>

      <PageHeader
        eyebrow={formatDateOnly(event.date)}
        title={event.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <TargetBadge group={event.group} />
            <span className="numeric">{timeRange(event)}</span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5" aria-hidden />
                {event.location}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {event.viewer.marks && event.viewer.attendanceOpen && (
              <Link
                href={`/events/${event.id}/attendance`}
                className="action-solid inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ClipboardCheckIcon className="size-4" aria-hidden />
                Take attendance
              </Link>
            )}
            {event.viewer.manages && (
              <Link
                href={`/events/${event.id}/edit`}
                className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <PencilIcon className="size-3.5" aria-hidden />
                Edit
              </Link>
            )}
          </>
        }
      />

      <div className="grid max-w-3xl gap-4">
        <Panel title="About">
          <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-line">
            {event.description || (
              <span className="text-muted-foreground">No description.</span>
            )}
          </p>
          <p className="text-muted-foreground mt-4 text-xs">Added by {event.createdBy}</p>
        </Panel>

        {event.attendance && (
          <Panel
            title="Attendance"
            description={
              event.viewer.attendanceOpen
                ? "Counts across everyone marked so far."
                : "Opens 24 hours before the event starts."
            }
          >
            <dl className="grid grid-cols-2 gap-4 sm:max-w-xs">
              <div>
                <dt className="text-muted-foreground text-xs font-semibold uppercase">Present</dt>
                <dd className="numeric text-foreground mt-1 text-2xl font-semibold">
                  {event.attendance.present}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-semibold uppercase">Absent</dt>
                <dd className="numeric text-foreground mt-1 text-2xl font-semibold">
                  {event.attendance.absent}
                </dd>
              </div>
            </dl>
          </Panel>
        )}
      </div>
    </>
  );
}
