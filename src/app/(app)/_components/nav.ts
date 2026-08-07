import type { Role } from "@/generated/prisma/enums";

/**
 * The shape of the internal system, in one place.
 *
 * Two levels, because the shell has two zones. The icon rail shows *sections*;
 * choosing one opens a context panel listing that section's *pages*. The
 * breadcrumb and the command palette both read from here too, so a page can
 * never be called one thing in the rail and another at the top of the screen.
 *
 * `adminOnly` decides what a member is even shown. It is presentation only —
 * the actual gate is `requireAdmin()` inside the page and inside every action
 * it can reach. Hiding a link protects nothing on its own.
 *
 * `soon` marks the modules from the specification that are not built yet. They
 * appear, greyed and unclickable, because an empty panel tells a new
 * administrator nothing about where this is going — and a link that 404s tells
 * them something worse.
 */
export type IconName =
  | "overview"
  | "people"
  | "life"
  | "records"
  | "you"
  | "dashboard"
  | "users"
  | "groups"
  | "inbox"
  | "calendar"
  | "prayer"
  | "attendance"
  | "giving"
  | "partnership"
  | "sermons"
  | "bell"
  | "account";

export type PanelItem = {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
  soon?: boolean;
};

export type RailSection = {
  id: string;
  label: string;
  icon: IconName;
  /** Where the rail icon itself goes — always the section's first real page. */
  href: string;
  adminOnly?: boolean;
  items: PanelItem[];
};

export const RAIL: RailSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "overview",
    href: "/dashboard",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    id: "people",
    label: "People",
    icon: "people",
    href: "/members",
    items: [
      { href: "/members", label: "Members", icon: "users", adminOnly: true },
      { href: "/groups", label: "Connect groups", icon: "groups", soon: true },
    ],
  },
  {
    id: "life",
    label: "Church life",
    icon: "life",
    href: "/messages",
    items: [
      { href: "/messages", label: "Messages", icon: "inbox", soon: true },
      { href: "/events", label: "Events", icon: "calendar", soon: true },
      { href: "/prayer", label: "Prayer requests", icon: "prayer", soon: true },
      { href: "/sermons", label: "Sermons", icon: "sermons", soon: true },
    ],
  },
  {
    id: "records",
    label: "Records",
    icon: "records",
    href: "/attendance",
    items: [
      { href: "/attendance", label: "Attendance", icon: "attendance", soon: true },
      { href: "/giving", label: "Tithes & offerings", icon: "giving", soon: true },
      { href: "/partnerships", label: "Partnerships", icon: "partnership", soon: true },
    ],
  },
  {
    id: "you",
    label: "You",
    icon: "you",
    href: "/account",
    items: [
      { href: "/notifications", label: "Notifications", icon: "bell", soon: true },
      { href: "/account", label: "Your account", icon: "account" },
    ],
  },
];

/** Where the sidebar's collapsed state is remembered.
 *
 * It lives in this plain module rather than beside the shell that uses it,
 * because every export of a `"use client"` module becomes a *client reference*
 * when a Server Component imports it — the layout would have received a proxy
 * object instead of the string, looked up a cookie by that, found nothing, and
 * silently rendered expanded every time.
 */
export const PANEL_COOKIE = "panel_collapsed";

/** The rail a given role may see, with sections that emptied out removed. */
export function railFor(role: Role): RailSection[] {
  return RAIL.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  }))
    .filter((section) => section.items.length > 0)
    .filter((section) => !section.adminOnly || role === "ADMIN")
    .map((section) => ({
      // A section's rail icon must land somewhere the person can actually go,
      // so it follows its first visible page rather than a fixed href.
      ...section,
      href: section.items.find((item) => !item.soon)?.href ?? section.items[0].href,
    }));
}

/** The section a path belongs to, for the rail highlight and the breadcrumb. */
export function sectionFor(pathname: string, rail: RailSection[]) {
  return rail.find((section) =>
    section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}

/** Every page label, including ones with no panel entry of their own. */
export const LABELS: Record<string, string> = {
  ...Object.fromEntries(RAIL.flatMap((s) => s.items).map((item) => [item.href, item.label])),
  "/change-password": "Change password",
};
