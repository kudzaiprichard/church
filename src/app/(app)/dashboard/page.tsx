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
import { ownerScope, requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { ledGroups } from "@/lib/data/groups";
import { unreadMessageCount } from "@/lib/data/messages";
import { lastUpdatedLine } from "@/lib/last-updated";
import { prisma } from "@/lib/prisma";
import { getThemes } from "@/lib/settings";

import { railFor } from "../_components/nav";
import { NavIcon } from "../_components/nav-icon";
import { PageHeader, Panel, StatCard } from "../_components/page-parts";

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
 * The landing spot after sign-in, and the first worked example of the Key
 * System Rule: the same query serves every office, and `ownerScope` — given
 * the permission that widens it — decides whether it counts the whole church
 * or one person.
 *
 * Everything else on the page is either the church's own content (the theme,
 * the next gathering) or read from the navigation itself (what is coming), so
 * nothing here is a placeholder figure.
 */
export default async function DashboardPage() {
  const user = await requireSession();
  const seesChurchGiving = can(user, "finance.viewAll");
  const seesChurchAttendance = can(user, "attendance.viewAll");
  const now = new Date();

  const [contributions, attendance, unreadMessages, { current: theme }, myGroups] =
    await Promise.all([
      prisma.contribution.count({ where: ownerScope(user, "finance.viewAll") }),
      prisma.attendanceRecord.count({ where: ownerScope(user, "attendance.viewAll") }),
      unreadMessageCount(user),
      getThemes(),
      ledGroups(user),
    ]);

  const figures = [
    {
      label: seesChurchGiving ? "Contributions recorded" : "Your contributions",
      value: contributions,
      icon: <WalletIcon className="size-4" aria-hidden />,
    },
    {
      label: seesChurchAttendance ? "Attendance records" : "Services attended",
      value: attendance,
      icon: <ClipboardCheckIcon className="size-4" aria-hidden />,
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

  const comingSoon = railFor(
    user,
    myGroups.map((group) => group.id),
  )
    .flatMap((section) => section.items)
    .filter((item) => item.soon);

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

      <div className="grid gap-4 sm:grid-cols-3">
        {figures.map((figure) => (
          <StatCard key={figure.label} {...figure} />
        ))}
      </div>

      {myGroups.length > 0 && (
        <Panel
          title={myGroups.length === 1 ? "My group" : "My groups"}
          description="The groups you lead. Attendance and chema figures join as those modules arrive."
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

        <Panel title="This week" description="In church time, Harare.">
          <NextGatheringLine />
          <Link
            href="/#visit"
            className="text-primary mt-4 inline-flex items-center gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            All service times
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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

        <Panel
          title="Coming to the portal"
          description="These modules are planned and will appear in the sidebar as they are built."
          bodyClassName="p-3"
        >
          <ul className="grid gap-1 sm:grid-cols-2">
            {comingSoon.map((item) => (
              <li
                key={item.href}
                className="text-muted-foreground flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm"
              >
                <NavIcon name={item.icon} className="size-4 shrink-0 opacity-70" />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="bg-muted rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
                  Soon
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
