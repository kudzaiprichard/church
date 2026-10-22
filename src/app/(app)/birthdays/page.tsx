import { CakeIcon, MegaphoneIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { birthdayCalendar, type BirthdayEntry } from "@/lib/data/birthdays";
import { groupOptions } from "@/lib/data/members";
import { MONTHS } from "@/lib/finance/chema";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";
import { PersonAvatar } from "../_components/person-avatar";

export const metadata: Metadata = { title: "Birthdays" };

const dayMonth = (monthDay: string) =>
  `${Number(monthDay.slice(3))} ${MONTHS[Number(monthDay.slice(0, 2)) - 1]}`;

/**
 * The church's birthday calendar (docs/SCOPE.md §9.15): today, this week,
 * this month, and everyone by month. Day and month only — the year and the
 * age appear only on the person's own entry and for the Apostles. Apostles
 * can announce today's birthdays to the church from here.
 */
export default async function BirthdaysPage(props: PageProps<"/birthdays">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : undefined;
  const groups = await groupOptions();
  const groupId = groups.find((group) => group.id === params.group)?.id;

  const calendar = await birthdayCalendar(user, { q, groupId });
  const control = "border-input bg-background h-10 w-full rounded-lg border px-3 text-sm";

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Birthdays"
        description="Celebrate one another. Only the day and month are shown — never the year."
      />

      <form
        method="get"
        role="search"
        className="mb-4 grid max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_auto]"
      >
        <label className="relative block">
          <span className="sr-only">Search by name</span>
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className={`${control} pl-9`}
          />
        </label>
        <label>
          <span className="sr-only">Group</span>
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
          className="action-solid h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold"
        >
          Show
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Today"
          action={
            can(user, "birthdays.announce") &&
            calendar.todays.length > 0 && (
              <Link
                href="/messages/new?template=birthdays"
                className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              >
                <MegaphoneIcon className="size-3.5" aria-hidden />
                Send birthday announcement
              </Link>
            )
          }
          bodyClassName="p-0"
        >
          <People people={calendar.todays} viewerId={user.id} empty="No birthdays today." />
        </Panel>
        <Panel title="This week" bodyClassName="p-0">
          <People people={calendar.week} viewerId={user.id} empty="None this week." />
        </Panel>
        <Panel title="This month" bodyClassName="p-0">
          <People people={calendar.month} viewerId={user.id} empty="None this month." />
        </Panel>
      </div>

      <h2 className="text-foreground mt-8 mb-3 text-sm font-bold">Everyone by month</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {calendar.byMonth.map((entry) => (
          <Panel key={entry.month} title={MONTHS[entry.month - 1]} bodyClassName="p-0">
            <People people={entry.people} viewerId={user.id} empty="—" />
          </Panel>
        ))}
      </div>
    </>
  );
}

function People({
  people,
  viewerId,
  empty,
}: {
  people: BirthdayEntry[];
  viewerId: string;
  empty: string;
}) {
  if (people.length === 0) {
    return empty === "—" ? (
      <p className="text-muted-foreground px-5 py-3 text-xs">—</p>
    ) : (
      <EmptyState icon={<CakeIcon className="size-5" aria-hidden />} title={empty} />
    );
  }

  return (
    <ul className="divide-border divide-y">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 px-5 py-2.5">
          <PersonAvatar person={person} className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">
              {person.firstName} {person.lastName}
              {person.id === viewerId && <span className="text-muted-foreground"> (you)</span>}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {dayMonth(person.monthDay)}
              {person.age !== null && ` · turns ${person.age}`}
              {person.groups.length > 0 && ` · ${person.groups.join(", ")}`}
            </p>
          </div>
          {person.inDays === 0 ? (
            <span className="bg-success/15 text-success rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold">
              Today
            </span>
          ) : (
            <span className="bg-secondary text-primary numeric rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap">
              in {person.inDays} {person.inDays === 1 ? "day" : "days"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
