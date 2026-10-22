import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { eventList, eventsInMonth, type EventRow } from "@/lib/data/events";
import { formatDateOnly, harareToday, isDateOnly } from "@/lib/dates";
import { monthGrid, parseMonth, shiftMonth } from "@/lib/events/rules";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";

import { EventListItem } from "./event-parts";

export const metadata: Metadata = { title: "Events" };

const monthName = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The church calendar (docs/SCOPE.md §9.6): a month grid or an upcoming/past
 * list, chosen by `?view=`. Both read through `lib/data/events.ts`, which
 * applies `groupContentScope` — so the dots, the lists and the day view show
 * only all-church events and the caller's own groups'.
 */
export default async function EventsPage(props: PageProps<"/events">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const view = params.view === "list" ? "list" : "calendar";
  const month = parseMonth(params.month);
  const today = harareToday();
  const day = typeof params.day === "string" && isDateOnly(params.day) ? params.day : null;

  const manages = can(user, "events.manage");

  const tab = (id: "calendar" | "list", label: string) => (
    <Link
      href={id === "calendar" ? `/events?month=${month}` : "/events?view=list"}
      aria-current={view === id ? "page" : undefined}
      className={cn(
        "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
        view === id
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Events"
        description="All-church gatherings and the events of your groups, in Harare time."
        actions={
          manages && (
            <Link
              href="/events/new"
              className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <PlusIcon className="size-4" aria-hidden />
              New event
            </Link>
          )
        }
      />

      <nav aria-label="Events view" className="border-border mb-4 flex gap-1 border-b">
        {tab("calendar", "Calendar")}
        {tab("list", "List")}
      </nav>

      {view === "calendar" ? (
        <CalendarView
          events={await eventsInMonth(user, month)}
          month={month}
          today={today}
          day={day}
        />
      ) : (
        <ListView {...await eventList(user)} manages={manages} />
      )}
    </>
  );
}

function ListView({
  upcoming,
  past,
  manages,
}: {
  upcoming: EventRow[];
  past: EventRow[];
  manages: boolean;
}) {
  return (
    <div className="grid max-w-4xl gap-4">
      <Panel title="Upcoming" bodyClassName="p-0">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDaysIcon className="size-5" aria-hidden />}
            title="Nothing planned"
          >
            {manages ? "Create the next event." : "New events will appear here."}
          </EmptyState>
        ) : (
          <ul className="divide-border divide-y">
            {upcoming.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </ul>
        )}
      </Panel>
      {past.length > 0 && (
        <Panel title="Past" description="The most recent thirty." bodyClassName="p-0">
          <ul className="divide-border divide-y">
            {past.map((event) => (
              <EventListItem key={event.id} event={event} muted />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function CalendarView({
  events,
  month,
  today,
  day,
}: {
  events: EventRow[];
  month: string;
  today: string;
  day: string | null;
}) {
  const byDay = new Map<string, EventRow[]>();
  for (const event of events) byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]);

  const shown = day && day.startsWith(month) ? day : null;
  const dayEvents = shown ? (byDay.get(shown) ?? []) : events;

  const step = cn(
    "border-border hover:bg-muted inline-grid size-8 place-items-center rounded-md border transition-colors",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <section
        aria-labelledby="month"
        className="bg-card border-border rounded-lg border p-4 sm:p-5"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 id="month" className="text-foreground text-base font-bold">
            {monthName.format(new Date(`${month}-01T00:00:00.000Z`))}
          </h2>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/events?month=${shiftMonth(month, -1)}`}
              className={step}
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Link>
            <Link
              href="/events"
              className="border-border hover:bg-muted inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Today
            </Link>
            <Link
              href={`/events?month=${shiftMonth(month, 1)}`}
              className={step}
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
        </header>

        <table className="w-full table-fixed border-collapse text-center">
          <thead>
            <tr>
              {WEEKDAYS.map((name) => (
                <th
                  key={name}
                  scope="col"
                  className="text-muted-foreground pb-2 text-[0.65rem] font-semibold uppercase"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(month).map((week) => (
              <tr key={week[0].day}>
                {week.map((cell) => {
                  const count = byDay.get(cell.day)?.length ?? 0;
                  const label = count
                    ? `${formatDateOnly(cell.day)}, ${count} event${count === 1 ? "" : "s"}`
                    : formatDateOnly(cell.day);
                  return (
                    <td key={cell.day} className="p-0.5">
                      <Link
                        href={`/events?month=${month}&day=${cell.day}`}
                        aria-label={label}
                        aria-current={cell.day === shown ? "date" : undefined}
                        className={cn(
                          "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                          cell.inMonth
                            ? "text-foreground hover:bg-muted"
                            : "text-muted-foreground/50",
                          cell.day === today && "ring-primary/60 font-bold ring-1",
                          cell.day === shown && "bg-secondary text-primary",
                        )}
                      >
                        <span className="numeric">{Number(cell.day.slice(8))}</span>
                        {count > 0 && (
                          <span
                            aria-hidden
                            className="bg-brass absolute bottom-1.5 size-1.5 rounded-full"
                          />
                        )}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Panel
        title={shown ? formatDateOnly(shown) : "This month"}
        action={
          shown && (
            <Link
              href={`/events?month=${month}`}
              className="text-primary text-xs font-semibold hover:underline"
            >
              Whole month
            </Link>
          )
        }
        bodyClassName="p-0"
      >
        {dayEvents.length === 0 ? (
          <EmptyState icon={<CalendarDaysIcon className="size-5" aria-hidden />} title="No events">
            {shown ? "Nothing on this day." : "Nothing this month."}
          </EmptyState>
        ) : (
          <ul className="divide-border divide-y">
            {dayEvents.map((event) => (
              <EventListItem key={event.id} event={event} muted={event.date < today} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
