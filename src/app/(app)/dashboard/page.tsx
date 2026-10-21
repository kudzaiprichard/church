import {
  ArrowUpRightIcon,
  ClipboardCheckIcon,
  InboxIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { NextGatheringLine } from "@/components/landing/next-gathering-line";
import { ownerScope, requireSession } from "@/lib/auth/dal";
import { themeOfYear } from "@/lib/church";
import { prisma } from "@/lib/prisma";

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
 * System Rule: the same query serves both tiers, and `ownerScope` is what
 * decides whether it counts the whole church or one person.
 *
 * Everything else on the page is either the church's own content (the theme,
 * the next gathering) or read from the navigation itself (what is coming), so
 * nothing here is a placeholder figure.
 */
export default async function DashboardPage() {
  const user = await requireSession();
  const isAdmin = user.role === "ADMIN";
  const now = new Date();

  const [contributions, attendance, unreadMessages] = await Promise.all([
    prisma.contribution.count({ where: ownerScope(user) }),
    prisma.attendanceRecord.count({ where: ownerScope(user) }),
    prisma.messageRecipient.count({ where: { ...ownerScope(user), readAt: null } }),
  ]);

  const figures = [
    {
      label: isAdmin ? "Contributions recorded" : "Your contributions",
      value: contributions,
      icon: <WalletIcon className="size-4" aria-hidden />,
    },
    {
      label: isAdmin ? "Attendance records" : "Services attended",
      value: attendance,
      icon: <ClipboardCheckIcon className="size-4" aria-hidden />,
    },
    {
      label: "Unread messages",
      value: unreadMessages,
      icon: <InboxIcon className="size-4" aria-hidden />,
    },
  ];

  const quickLinks = [
    ...(isAdmin
      ? [
          { href: "/members", label: "Members", detail: "Invite and manage the roll", Icon: UsersIcon },
          { href: "/audit", label: "Audit log", detail: "Every privileged act", Icon: ScrollTextIcon },
        ]
      : []),
    { href: "/account", label: "Your account", detail: "Details and signed-in devices", Icon: UserIcon },
    { href: "/change-password", label: "Change password", detail: "Signs out other devices", Icon: KeyRoundIcon },
  ];

  const comingSoon = railFor(user.role)
    .flatMap((section) => section.items)
    .filter((item) => item.soon);

  return (
    <>
      <PageHeader
        eyebrow={today.format(now)}
        title={`${greeting(now)}, ${user.firstName}.`}
        description={
          isAdmin
            ? "You are signed in as an administrator, so these figures cover the whole congregation."
            : "These are your own records. Nobody else's data is visible here, and yours is visible only to you and the church office."
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {figures.map((figure) => (
          <StatCard key={figure.label} {...figure} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* The theme of the year, on the blue the public site opens with. */}
        <article className="bg-hero relative overflow-hidden rounded-xl p-6 text-white lg:col-span-2">
          <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />
          <Logo
            size={190}
            className="pointer-events-none absolute -right-10 -bottom-12 opacity-[0.08]"
          />
          <div className="relative max-w-xl">
            <p className="text-brass inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
              <span aria-hidden className="bg-brass size-1.5 rounded-full" />
              Theme of the year · {themeOfYear.year}
            </p>
            <h2 className="mt-3 text-xl font-bold md:text-2xl">{themeOfYear.title}</h2>
            <blockquote className="mt-4">
              <p className="font-serif text-lg leading-snug font-medium text-white/90 italic">
                &ldquo;{themeOfYear.verseText}&rdquo;
              </p>
            </blockquote>
            <p className="text-brass mt-2 text-xs font-semibold tracking-[0.14em] uppercase">
              {themeOfYear.scripture}
            </p>
          </div>
        </article>

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
