import { ArrowLeftIcon, ClipboardCheckIcon, MapPinIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { getEvent, upcomingEvents } from "@/lib/data/events";
import { formatDateOnly } from "@/lib/dates";

import { DateChip, PageGrid, PageHeader, Panel, PanelLink } from "../../_components/page-parts";
import { TargetBadge, timeRange } from "../event-parts";

export const metadata: Metadata = { title: "Event" };

/**
 * One event (docs/SCOPE.md §9.6). `getEvent` answers `null` for an event of a
 * group the caller is not in — the same 404 as an id that does not exist.
 */
export default async function EventPage(props: PageProps<"/events/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;

  const [event, upcoming] = await Promise.all([getEvent(user, id), upcomingEvents(user, 5)]);
  if (!event) notFound();
  const others = upcoming.filter((other) => other.id !== event.id).slice(0, 4);
  const marked = event.attendance ? event.attendance.present + event.attendance.absent : 0;

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
        title={event.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{formatDateOnly(event.date)}</span>
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
                className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ClipboardCheckIcon className="size-4" aria-hidden />
                Take attendance
              </Link>
            )}
            {event.viewer.manages && (
              <Link
                href={`/events/${event.id}/edit`}
                className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <PencilIcon className="size-3.5" aria-hidden />
                Edit
              </Link>
            )}
          </>
        }
      />

      <PageGrid
        aside={
          <>
            {event.attendance && (
              <Panel
                title="Attendance"
                description={
                  event.viewer.attendanceOpen
                    ? "Everyone marked so far."
                    : "Opens 24 hours before the event starts."
                }
              >
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-muted-foreground text-xs">Present</p>
                    <p className="font-title numeric text-foreground text-3xl font-semibold">
                      {event.attendance.present}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Absent</p>
                    <p className="font-title numeric text-foreground text-3xl font-semibold">
                      {event.attendance.absent}
                    </p>
                  </div>
                </div>
                {marked > 0 && (
                  <div
                    className="bg-muted mt-3 flex h-2 overflow-hidden rounded-full"
                    role="img"
                    aria-label={`${event.attendance.present} of ${marked} present`}
                  >
                    <span
                      className="bg-success h-full"
                      style={{ width: `${(event.attendance.present / marked) * 100}%` }}
                    />
                  </div>
                )}
              </Panel>
            )}

            <Panel title="Also coming up" action={<PanelLink href="/events">Calendar</PanelLink>}>
              {others.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing else planned yet.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {others.map((other) => (
                    <li key={other.id}>
                      <Link href={`/events/${other.id}`} className="group flex items-center gap-3">
                        <DateChip date={other.date} />
                        <span className="min-w-0">
                          <span className="text-foreground block truncate text-sm font-medium group-hover:underline">
                            {other.title}
                          </span>
                          <span className="text-muted-foreground numeric block truncate text-xs">
                            {other.time} · {other.group?.name ?? "All Church"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        }
      >
        <Panel title="Details">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">When</dt>
              <dd className="text-foreground mt-0.5 font-medium">
                {formatDateOnly(event.date)}, <span className="numeric">{timeRange(event)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Where</dt>
              <dd className="text-foreground mt-0.5 font-medium">{event.location || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">For</dt>
              <dd className="mt-0.5">
                <TargetBadge group={event.group} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Added by</dt>
              <dd className="text-foreground mt-0.5 font-medium">{event.createdBy}</dd>
            </div>
          </dl>
          <div className="border-border mt-4 border-t pt-4">
            <h2 className="text-muted-foreground text-xs font-medium">About</h2>
            <p className="text-foreground mt-1 text-sm leading-relaxed break-words whitespace-pre-line">
              {event.description || <span className="text-muted-foreground">No description.</span>}
            </p>
          </div>
        </Panel>
      </PageGrid>
    </>
  );
}
