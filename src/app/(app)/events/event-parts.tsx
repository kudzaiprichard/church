import { MapPinIcon } from "lucide-react";
import Link from "next/link";

import type { EventRow } from "@/lib/data/events";
import { cn } from "@/lib/utils";

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Sun" and "25 Oct" for a Harare calendar day. */
export function dayLabel(date: string) {
  const at = new Date(`${date}T00:00:00.000Z`);
  return { weekday: weekday.format(at), dayMonth: dayMonth.format(at) };
}

/** "09:00–11:30" or "09:00". */
export function timeRange(event: Pick<EventRow, "time" | "endTime">) {
  return event.endTime ? `${event.time}–${event.endTime}` : event.time;
}

/** All Church, or the group's name. */
export function TargetBadge({ group }: { group: EventRow["group"] }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold",
        group ? "bg-secondary text-primary" : "bg-brass/20 text-accent-foreground",
      )}
    >
      {group ? group.name : "All Church"}
    </span>
  );
}

/** One event as a row in a list: its day, title, time, place and audience. */
export function EventListItem({ event, muted }: { event: EventRow; muted?: boolean }) {
  const day = dayLabel(event.date);
  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className={cn(
          "hover:bg-muted/60 grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-4 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
          muted && "opacity-70",
        )}
      >
        <span className="bg-secondary text-primary flex flex-col items-center rounded-lg py-1.5 text-center leading-tight">
          <span className="text-[0.65rem] font-semibold uppercase">{day.weekday}</span>
          <span className="numeric text-xs font-bold">{day.dayMonth}</span>
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-foreground text-sm font-semibold">{event.title}</span>
            <TargetBadge group={event.group} />
          </span>
          <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
            <span className="numeric">{timeRange(event)}</span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3" aria-hidden />
                {event.location}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
