import {
  ArrowUpRightIcon,
  ClipboardCheckIcon,
  InboxIcon,
  IdCardIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { NextGatheringLine } from "@/components/landing/next-gathering-line";
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
import { lastUpdatedLine } from "@/lib/last-updated";
import { prisma } from "@/lib/prisma";
import { getThemes } from "@/lib/settings";

import { PageHeader, Panel, StatCard } from "../_components/page-parts";
import { Progress, TypeTotals } from "../finance/finance-parts";
import { PledgeList } from "../finance/pledges/pledge-list";

import { BirthdayBanner } from "./birthday-banner";

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

/**
 * The landing spot after sign-in (docs/SCOPE.md §9.2). Every figure comes
 * from a scoped read: a member's cards are about them alone; a leader adds
 * their groups; the finance officers add the church's month; Apostles add the
 * roll. Nothing here is computed in the page.
 *
 * Everything else on the page is the church's own content (the theme, the
 * next gathering), so nothing here is a placeholder figure.
 */
export default async function DashboardPage() {
  const user = await requireSession();
  const seesChurchGiving = can(user, "finance.viewAll");
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
    upcomingEvents(user, 3),
    myPledges(user),
    churchThisMonth(user),
    pendingCount(user),
    seesChurchGiving ? listProjects(user) : Promise.resolve([]),
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

  const figures = [
    {
      label: `You have given in ${year}`,
      value: formatMoney(giving.totals.total),
      icon: <WalletIcon className="size-4" aria-hidden />,
      hint: `${MONTHS[chema.month - 1]} chema: ${
        chema.status === "PAID" ? "paid" : chema.status === "PENDING" ? "pending" : "not paid yet"
      }`,
    },
    {
      label: "Your attendance",
      value: formatRate(attendance.rate),
      icon: <ClipboardCheckIcon className="size-4" aria-hidden />,
      hint:
        attendance.rows.length === 0
          ? "Nothing marked yet."
          : `Present over marked, last twelve months (${attendance.rows.length} events).`,
    },
    {
      label: "Unread messages",
      value: unreadMessages,
      icon: <InboxIcon className="size-4" aria-hidden />,
      hint: unreadMessages > 0 ? "Messages and replies waiting in your inbox." : undefined,
    },
  ];

  const quickLinks = [
    ...(can(user, "members.enroll")
      ? [
          {
            href: "/members/new",
            label: "Enrol a member",
            detail: "Baptized members only",
            Icon: UsersIcon,
          },
        ]
      : []),
    ...(can(user, "audit.view")
      ? [
          {
            href: "/audit",
            label: "Audit log",
            detail: "Every privileged act",
            Icon: ScrollTextIcon,
          },
        ]
      : []),
    {
      href: "/profile",
      label: "Your profile",
      detail: "Contact details and birthday",
      Icon: IdCardIcon,
    },
    {
      href: "/account",
      label: "Your account",
      detail: "Details and signed-in devices",
      Icon: UserIcon,
    },
    {
      href: "/change-password",
      label: "Change password",
      detail: "Signs out other devices",
      Icon: KeyRoundIcon,
    },
  ];


  return (
    <>
      <PageHeader
        eyebrow={today.format(now)}
        title={`${greeting(now)}, ${user.firstName}.`}
        description={
          seesChurchGiving
            ? "Your office lets you see church-wide giving, so the contribution figure covers the whole congregation."
            : "These are your own records. Nobody else's data is visible here, and yours is visible only to you and the church office."
        }
      />

      {birthdayToday && <BirthdayBanner firstName={user.firstName} year={year} />}

      <div className="grid gap-4 sm:grid-cols-3">
        {figures.map((figure) => (
          <StatCard key={figure.label} {...figure} />
        ))}
      </div>

      {myGroups.length > 0 && (
        <Panel
          title={myGroups.length === 1 ? "My group" : "My groups"}
          description="The groups you lead: members, this month's chema and the last event."
          className="mt-4"
          bodyClassName="p-0"
        >
          <ul className="divide-border divide-y">
            {myGroups.map((group) => (
              <li
                key={group.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/groups/${group.id}`}
                    className="text-foreground rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    {group.name}
                  </Link>
                  <p className="text-muted-foreground numeric mt-0.5 text-xs">
                    {group.memberCount} active {group.memberCount === 1 ? "member" : "members"}
                    {group.chema && (
                      <>
                        {" · "}chema {group.chema.paid} of {group.chema.total} paid
                      </>
                    )}
                    {group.lastEvent && (
                      <>
                        {" · "}
                        {group.lastEvent.present} of {group.lastEvent.members} at{" "}
                        <Link href={`/events/${group.lastEvent.id}`} className="hover:underline">
                          {group.lastEvent.title}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <Link
                  href={`/messages/new?group=${group.id}`}
                  className="border-border hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  <SendIcon className="size-3.5" aria-hidden />
                  Message the group
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {churchMonth && (
        <Panel
          title={`Church giving, ${MONTHS[month - 1]}`}
          description="Confirmed this month; pending in amber."
          action={
            pending > 0 && (
              <Link
                href="/finance/review"
                className="text-primary text-xs font-semibold hover:underline"
              >
                {pending} waiting for review
              </Link>
            )
          }
          className="mt-4"
        >
          <TypeTotals confirmed={churchMonth.confirmed} pending={churchMonth.pending} />
          {roll && (
            <p className="text-muted-foreground mt-4 text-sm">
              <span className="numeric text-foreground font-semibold">{roll[0]}</span> active members
              {" · "}
              <span className="numeric text-foreground font-semibold">{roll[1]}</span> enrolled this
              month
            </p>
          )}
          {projects.some((project) => project.status === "ACTIVE") && (
            <ul className="border-border mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
              {projects
                .filter((project) => project.status === "ACTIVE")
                .map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/partnerships/${project.id}`}
                      className="text-foreground text-sm font-semibold hover:underline"
                    >
                      {project.name}
                    </Link>
                    <Progress
                      value={progress(project.raisedCents, project.targetCents).real}
                      label={`${project.name} progress`}
                    />
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      )}

      {birthdays.length > 0 && (
        <Panel
          title="Birthdays this week"
          action={
            <Link href="/birthdays" className="text-primary text-xs font-semibold hover:underline">
              All birthdays
            </Link>
          }
          className="mt-4"
        >
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {birthdays.map((person) => (
              <li key={person.id}>
                <span className="text-foreground font-medium">
                  {person.firstName} {person.lastName}
                </span>
                <span className="text-muted-foreground">
                  {" · "}
                  {person.inDays === 0
                    ? "today"
                    : `${Number(person.monthDay.slice(3))} ${
                        MONTHS[Number(person.monthDay.slice(0, 2)) - 1]
                      }`}
                  {person.groups[0] && ` · ${person.groups[0]}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {activePledges.length > 0 && (
        <Panel
          title="Your pledges"
          action={
            <Link
              href="/finance/pledges"
              className="text-primary text-xs font-semibold hover:underline"
            >
              All pledges
            </Link>
          }
          className="mt-4"
          bodyClassName="p-0"
        >
          <PledgeList pledges={activePledges} />
        </Panel>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* The theme of the year, on the blue the public site opens with. */}
        {theme ? (
          <article className="bg-hero relative overflow-hidden rounded-xl p-6 text-white lg:col-span-2">
            <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
            <Logo
              size={190}
              className="pointer-events-none absolute -right-10 -bottom-12 opacity-[0.08]"
            />
            <div className="relative max-w-xl">
              <p className="text-brass inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
                <span aria-hidden className="bg-brass size-1.5 rounded-full" />
                Theme of the year · {theme.year}
              </p>
              <h2 className="mt-3 text-xl font-bold md:text-2xl">{theme.title}</h2>
              <blockquote className="mt-4">
                <p className="font-serif text-lg leading-snug font-medium text-white/90 italic">
                  &ldquo;{theme.verseText}&rdquo;
                </p>
              </blockquote>
              <p className="text-brass mt-2 text-xs font-semibold tracking-[0.14em] uppercase">
                {theme.scriptureRef}
              </p>
              <p className="mt-4 text-xs text-white/50">
                {lastUpdatedLine(theme.updatedBy, theme.updatedAt)}
              </p>
            </div>
          </article>
        ) : (
          <Panel title="Theme of the year" className="lg:col-span-2">
            <p className="text-muted-foreground text-sm">
              No theme has been set yet.
              {can(user, "settings.manage") && (
                <>
                  {" "}
                  <Link
                    href="/settings/theme"
                    className="text-primary font-semibold hover:underline"
                  >
                    Set this year&apos;s theme
                  </Link>
                </>
              )}
            </p>
          </Panel>
        )}

        <Panel title="Coming up" description="In church time, Harare.">
          <NextGatheringLine />
          {upcoming.length > 0 && (
            <ul className="border-border mt-4 grid gap-2 border-t pt-4">
              {upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-foreground text-sm font-semibold hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-muted-foreground numeric text-xs">
                    {formatDateOnly(event.date)} · {event.time} · {event.group?.name ?? "All Church"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/events"
            className="text-primary mt-4 mr-4 inline-flex items-center gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            All events
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
          <Link
            href="/#visit"
            className="text-primary mt-4 inline-flex items-center gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            All service times
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      </div>

      {(devotion || sermon) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {devotion && (
            <Panel title="Today's devotion" description={devotion.author}>
              <p className="text-foreground text-base font-bold">{devotion.title}</p>
              <p className="text-accent-foreground mt-1 text-xs font-semibold tracking-wide uppercase">
                {devotion.scriptureRef}
              </p>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                {devotion.firstParagraph}
              </p>
              <Link
                href={`/devotions/${devotion.id}`}
                className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                Read more
                <ArrowUpRightIcon className="size-3.5" aria-hidden />
              </Link>
            </Panel>
          )}
          {sermon && (
            <Panel title="Latest sermon" description={formatDateOnly(sermon.preachedAt)}>
              <p className="text-foreground text-base font-bold">{sermon.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {sermon.preacher}
                {sermon.scriptureRef && (
                  <span className="text-accent-foreground ml-2 text-xs font-semibold uppercase">
                    {sermon.scriptureRef}
                  </span>
                )}
              </p>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                {sermon.summary}
              </p>
              <Link
                href={`/sermons/${sermon.id}`}
                className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                {sermon.audioUrl ? "Listen" : "Open"}
                <ArrowUpRightIcon className="size-3.5" aria-hidden />
              </Link>
            </Panel>
          )}
        </div>
      )}

      <div className="mt-4 max-w-3xl">
        <Panel title="Quick links" bodyClassName="p-2">
          <ul className="grid gap-0.5">
            {quickLinks.map(({ href, label, detail, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  <span className="bg-secondary text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block text-sm font-semibold">{label}</span>
                    <span className="text-muted-foreground block truncate text-xs">{detail}</span>
                  </span>
                  <ArrowUpRightIcon
                    className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

      </div>
    </>
  );
}
