import {
  BookOpenIcon,
  CakeIcon,
  ClipboardCheckIcon,
  HandHeartIcon,
  HeadphonesIcon,
  IdCardIcon,
  InboxIcon,
  ListChecksIcon,
  SendIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatRate } from "@/lib/attendance/rules";
import { lastEventAttendance, ownAttendance } from "@/lib/data/attendance";
import { birthdaysThisWeek, isMyBirthday } from "@/lib/data/birthdays";
import { todaysDevotion } from "@/lib/data/devotions";
import { upcomingEvents } from "@/lib/data/events";
import {
  chemaCompliance,
  churchThisMonth,
  myChemaThisMonth,
  myGiving,
  pendingCount,
} from "@/lib/data/finance";
import { ledGroups } from "@/lib/data/groups";
import { unreadMessageCount } from "@/lib/data/messages";
import { listProjects, myPledges } from "@/lib/data/partnerships";
import { latestSermon } from "@/lib/data/sermons";
import { formatDateOnly, harareToday } from "@/lib/dates";
import { MONTHS } from "@/lib/finance/chema";
import { formatMoney } from "@/lib/finance/money";
import { progress } from "@/lib/finance/pledges";
import { prisma } from "@/lib/prisma";
import { getThemes } from "@/lib/settings";

import {
  DateChip,
  EmptyState,
  PageHeader,
  Panel,
  PanelLink,
  QuickActions,
  StatCard,
} from "../_components/page-parts";
import { ChemaGrid, Progress, TypeTotals } from "../finance/finance-parts";
import { PledgeList } from "../finance/pledges/pledge-list";

import { BirthdayBanner } from "./birthday-banner";
import { NextGathering } from "./next-gathering";

export const metadata: Metadata = { title: "Dashboard" };

/** The church's clock, so the greeting and date are Harare's, not the server's. */
const CHURCH_TIME_ZONE = "Africa/Harare";

const today = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: CHURCH_TIME_ZONE,
});

const hourNow = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: CHURCH_TIME_ZONE,
});

function greeting(now: Date) {
  const hour = Number(hourNow.format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const chemaWord = { PAID: "Paid", PENDING: "Pending review", UNPAID: "Not paid yet" } as const;

/**
 * The landing spot after sign-in (docs/SCOPE.md §9.2), as a grid of widgets
 * chosen by who is looking. Every figure comes from a scoped read: a member's
 * tiles are about them alone; a leader adds their groups; the finance
 * officers see the church's month; Apostles the roll. Nothing is computed in
 * the page.
 *
 *   tiles     four figures across the top, each a link to its page
 *   main      what this person works on: the church's giving, their groups,
 *             their own chema and pledges, then today's reading
 *   aside     what is coming (gatherings, birthdays), the theme, and the
 *             few things people open the portal to do
 */
export default async function DashboardPage() {
  const user = await requireSession();
  const office = can(user, "finance.viewAll");
  const now = new Date();

  const todayIso = harareToday();
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  const monthStart = new Date(`${todayIso.slice(0, 7)}-01T00:00:00+02:00`);

  const [
    giving,
    chema,
    attendance,
    unreadMessages,
    { current: theme },
    led,
    upcoming,
    pledges,
    churchMonth,
    pending,
    projects,
    roll,
    devotion,
    sermon,
    birthdayToday,
    birthdays,
  ] = await Promise.all([
    myGiving(user, { year }),
    myChemaThisMonth(user),
    ownAttendance(user),
    unreadMessageCount(user),
    getThemes(),
    ledGroups(user),
    upcomingEvents(user, 5),
    myPledges(user),
    churchThisMonth(user),
    pendingCount(user),
    office ? listProjects(user) : Promise.resolve([]),
    can(user, "members.viewAll")
      ? Promise.all([
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count({ where: { joinedAt: { gte: monthStart } } }),
        ])
      : null,
    todaysDevotion(),
    latestSermon(),
    isMyBirthday(user),
    birthdaysThisWeek(user),
  ]);
  const myGroups = await Promise.all(
    led.map(async (group) => ({
      ...group,
      lastEvent: await lastEventAttendance(group.id),
      chema: await chemaCompliance(user, { year, month, groupId: group.id }),
    })),
  );
  const activePledges = pledges.filter(
    (pledge) => pledge.state === "ACTIVE" || pledge.state === "OVERDUE",
  );
  const activeProjects = projects.filter((project) => project.status === "ACTIVE");
  const monthName = MONTHS[month - 1];
  const churchConfirmed = churchMonth
    ? Object.values(churchMonth.confirmed).reduce((sum, cents) => sum + cents, 0)
    : 0;

  // The church office sees the church's figures; everyone else their own.
  const tiles = office
    ? [
        roll
          ? {
              label: "Active members",
              value: roll[0],
              icon: <UsersIcon aria-hidden />,
              hint: `${roll[1]} enrolled in ${monthName}`,
              href: "/members",
            }
          : {
              label: `You have given in ${year}`,
              value: formatMoney(giving.totals.total),
              icon: <WalletIcon aria-hidden />,
              hint: `${monthName} chema: ${chemaWord[chema.status].toLowerCase()}`,
              href: "/finance",
            },
        {
          label: `Church giving, ${monthName}`,
          value: formatMoney(churchConfirmed),
          icon: <WalletIcon aria-hidden />,
          hint: "Confirmed so far this month",
          href: "/finance/church",
        },
        {
          label: "Payments to review",
          value: pending,
          icon: <ListChecksIcon aria-hidden />,
          hint: pending > 0 ? "Members waiting for confirmation" : "Nothing waiting",
          href: "/finance/review",
          tone: pending > 0 ? ("attention" as const) : ("default" as const),
        },
        {
          label: "Unread messages",
          value: unreadMessages,
          icon: <InboxIcon aria-hidden />,
          hint: unreadMessages > 0 ? "Messages and replies waiting" : "You are up to date",
          href: "/messages",
        },
      ]
    : [
        {
          label: `You have given in ${year}`,
          value: formatMoney(giving.totals.total),
          icon: <WalletIcon aria-hidden />,
          hint: "Confirmed payments this year",
          href: "/finance",
        },
        {
          label: `${monthName} chema`,
          value: chemaWord[chema.status],
          icon: <ClipboardCheckIcon aria-hidden />,
          hint: chema.status === "UNPAID" ? "Log it from My giving" : "Thank you",
          href: "/finance",
          tone: chema.status === "UNPAID" ? ("attention" as const) : ("default" as const),
        },
        {
          label: "Your attendance",
          value: formatRate(attendance.rate),
          icon: <ClipboardCheckIcon aria-hidden />,
          hint:
            attendance.rows.length === 0
              ? "Nothing marked yet"
              : `Over ${attendance.rows.length} ${attendance.rows.length === 1 ? "event" : "events"}, last 12 months`,
          href: "/attendance",
        },
        {
          label: "Unread messages",
          value: unreadMessages,
          icon: <InboxIcon aria-hidden />,
          hint: unreadMessages > 0 ? "Messages and replies waiting" : "You are up to date",
          href: "/messages",
        },
      ];

  const quickActions = [
    ...(can(user, "members.enroll")
      ? [
          {
            href: "/members/new",
            label: "Enrol a member",
            icon: <UserPlusIcon aria-hidden />,
            hint: "Baptized members only",
          },
        ]
      : []),
    ...(myGroups[0]
      ? [
          {
            href: `/messages/new?group=${myGroups[0].id}`,
            label: `Message ${myGroups[0].name}`,
            icon: <SendIcon aria-hidden />,
            hint: "Everyone in the group you lead",
          },
        ]
      : []),
    {
      href: "/finance",
      label: "Log a payment",
      icon: <WalletIcon aria-hidden />,
      hint: "Chema, tithe, welfare or a project",
    },
    {
      href: "/prayer",
      label: "Share a prayer request",
      icon: <HandHeartIcon aria-hidden />,
      hint: "With your connect group",
    },
    {
      href: "/profile",
      label: "Update your details",
      icon: <IdCardIcon aria-hidden />,
      hint: "Phone, address and birthday",
    },
  ];

  return (
    <>
      <PageHeader title={`${greeting(now)}, ${user.firstName}`} description={today.format(now)} />

      {birthdayToday && <BirthdayBanner firstName={user.firstName} year={year} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map((tile) => (
          <StatCard key={tile.label} {...tile} />
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 gap-4">
          {churchMonth && (
            <Panel
              title={`Church giving, ${monthName}`}
              description="Confirmed this month, with what is still pending."
              action={
                pending > 0 ? (
                  <PanelLink href="/finance/review">{pending} to review</PanelLink>
                ) : (
                  <PanelLink href="/finance/church">Church finance</PanelLink>
                )
              }
            >
              <TypeTotals confirmed={churchMonth.confirmed} pending={churchMonth.pending} />
              {activeProjects.length > 0 && (
                <ul className="border-border mt-4 grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2">
                  {activeProjects.map((project) => (
                    <li key={project.id} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <Link
                          href={`/partnerships/${project.id}`}
                          className="text-foreground truncate font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        <span className="numeric text-muted-foreground shrink-0 text-xs">
                          {formatMoney(project.raisedCents)} of {formatMoney(project.targetCents)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Progress
                          value={progress(project.raisedCents, project.targetCents).real}
                          label={`${project.name} progress`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {myGroups.length > 0 && (
            <Panel
              title={myGroups.length === 1 ? "The group you lead" : "The groups you lead"}
              description={`Members, ${monthName}'s chema and the last event.`}
              bodyClassName="p-0"
            >
              <ul className="divide-border divide-y">
                {myGroups.map((group) => (
                  <li
                    key={group.id}
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/groups/${group.id}`}
                        className="text-foreground text-sm font-semibold hover:underline"
                      >
                        {group.name}
                      </Link>
                      <dl className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <div>
                          <dt className="sr-only">Members</dt>
                          <dd className="numeric">
                            {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                          </dd>
                        </div>
                        {group.chema && (
                          <div>
                            <dt className="sr-only">Chema</dt>
                            <dd className="numeric">
                              Chema {group.chema.paid} of {group.chema.total} paid
                            </dd>
                          </div>
                        )}
                        {group.lastEvent && (
                          <div>
                            <dt className="sr-only">Last event</dt>
                            <dd className="numeric">
                              {group.lastEvent.present} of {group.lastEvent.members} at{" "}
                              <Link
                                href={`/events/${group.lastEvent.id}`}
                                className="hover:underline"
                              >
                                {group.lastEvent.title}
                              </Link>
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <Link
                      href={`/messages/new?group=${group.id}`}
                      className="border-border hover:bg-muted inline-flex h-8 items-center gap-1.5 justify-self-start rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    >
                      <SendIcon className="size-3.5" aria-hidden />
                      Message the group
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title={`Your chema, ${year}`}
            description={`${formatMoney(giving.totals.total)} given this year in all.`}
            action={<PanelLink href="/finance">My giving</PanelLink>}
          >
            <ChemaGrid cells={giving.grid} />
          </Panel>

          {activePledges.length > 0 && (
            <Panel
              title="Your pledges"
              action={<PanelLink href="/finance/pledges">All pledges</PanelLink>}
              bodyClassName="p-0"
            >
              <PledgeList pledges={activePledges} />
            </Panel>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Panel
              title="Today's devotion"
              action={<PanelLink href="/devotions">All devotions</PanelLink>}
            >
              {devotion ? (
                <Link href={`/devotions/${devotion.id}`} className="group block">
                  <p className="text-foreground font-semibold group-hover:underline">
                    {devotion.title}
                  </p>
                  <p className="text-accent-foreground mt-0.5 text-xs font-medium">
                    {devotion.scriptureRef} · {devotion.author}
                  </p>
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
                    {devotion.firstParagraph}
                  </p>
                </Link>
              ) : (
                <EmptyState icon={<BookOpenIcon aria-hidden />} title="No devotion today">
                  The next one appears here on the day it is published.
                </EmptyState>
              )}
            </Panel>

            <Panel
              title="Latest sermon"
              action={<PanelLink href="/sermons">All sermons</PanelLink>}
            >
              {sermon ? (
                <Link href={`/sermons/${sermon.id}`} className="group flex gap-3">
                  <span className="bg-secondary text-primary grid size-10 shrink-0 place-items-center rounded-md">
                    <HeadphonesIcon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block font-semibold group-hover:underline">
                      {sermon.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {sermon.preacher} · {formatDateOnly(sermon.preachedAt)}
                    </span>
                    <span className="text-muted-foreground mt-2 line-clamp-2 block text-sm leading-relaxed">
                      {sermon.summary}
                    </span>
                  </span>
                </Link>
              ) : (
                <EmptyState icon={<HeadphonesIcon aria-hidden />} title="No sermons yet" />
              )}
            </Panel>
          </div>
        </div>

        <aside className="grid min-w-0 gap-4">
          <Panel title="Coming up" action={<PanelLink href="/events">Calendar</PanelLink>}>
            <NextGathering />
            {upcoming.length > 0 ? (
              <ul className="mt-3 grid gap-2.5">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.id}`}
                      className="group flex items-center gap-3 rounded-md"
                    >
                      <DateChip date={event.date} highlight={event.date === todayIso} />
                      <span className="min-w-0">
                        <span className="text-foreground block truncate text-sm font-medium group-hover:underline">
                          {event.title}
                        </span>
                        <span className="text-muted-foreground numeric block truncate text-xs">
                          {event.time} · {event.group?.name ?? "All Church"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">No other events planned yet.</p>
            )}
          </Panel>

          {birthdays.length > 0 && (
            <Panel
              title="Birthdays this week"
              action={<PanelLink href="/birthdays">All</PanelLink>}
            >
              <ul className="grid gap-2.5">
                {birthdays.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={
                        person.inDays === 0
                          ? "bg-brass/25 text-foreground grid size-8 shrink-0 place-items-center rounded-full"
                          : "bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full"
                      }
                    >
                      <CakeIcon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="text-foreground block truncate font-medium">
                        {person.firstName} {person.lastName}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {person.inDays === 0
                          ? "Today"
                          : `${Number(person.monthDay.slice(3))} ${MONTHS[Number(person.monthDay.slice(0, 2)) - 1]}`}
                        {person.groups[0] && ` · ${person.groups[0]}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {theme ? (
            <section className="bg-ink relative overflow-hidden rounded-lg p-4 text-white">
              <p className="text-brass text-xs font-medium">Theme of {theme.year}</p>
              <h2 className="font-title mt-1 text-lg leading-snug font-semibold">{theme.title}</h2>
              <blockquote className="mt-2">
                <p className="font-serif text-[1.05rem] leading-snug text-white/90 italic">
                  &ldquo;{theme.verseText}&rdquo;
                </p>
                <footer className="text-brass mt-1.5 text-xs font-medium">
                  {theme.scriptureRef}
                </footer>
              </blockquote>
            </section>
          ) : (
            can(user, "settings.manage") && (
              <Panel title="Theme of the year">
                <p className="text-muted-foreground text-sm">
                  No theme has been set for {year}.{" "}
                  <Link
                    href="/settings/theme"
                    className="text-primary font-semibold hover:underline"
                  >
                    Set it
                  </Link>
                </p>
              </Panel>
            )
          )}

          <QuickActions actions={quickActions} />
        </aside>
      </div>
    </>
  );
}
