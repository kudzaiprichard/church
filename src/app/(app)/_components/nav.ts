import type { Role } from "@/generated/prisma/enums";

/**
 * The shape of the internal system, in one place.
 *
 * The sidebar renders from this and the breadcrumbs read labels out of it, so
 * a route can never be called one thing in the navigation and another at the
 * top of the page.
 *
 * `adminOnly` decides what a member is even shown. It is presentation only —
 * the actual gate is `requireAdmin()` inside the page and inside every action
 * it can reach. Hiding a link protects nothing on its own.
 *
 * `soon` marks the modules from the specification that are not built yet. They
 * appear, greyed and unclickable, because an empty sidebar tells a new
 * administrator nothing about where this is going — and a link that 404s tells
 * them something worse.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
  soon?: boolean;
};

export type NavSection = {
  heading: string;
  items: NavItem[];
};

export type IconName =
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

export const NAV: NavSection[] = [
  {
    heading: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    heading: "People",
    items: [
      { href: "/members", label: "Members", icon: "users", adminOnly: true },
      { href: "/groups", label: "Connect groups", icon: "groups", soon: true },
    ],
  },
  {
    heading: "Church life",
    items: [
      { href: "/messages", label: "Messages", icon: "inbox", soon: true },
      { href: "/events", label: "Events", icon: "calendar", soon: true },
      { href: "/prayer", label: "Prayer requests", icon: "prayer", soon: true },
      { href: "/sermons", label: "Sermons", icon: "sermons", soon: true },
    ],
  },
  {
    heading: "Records",
    items: [
      { href: "/attendance", label: "Attendance", icon: "attendance", soon: true },
      { href: "/giving", label: "Tithes & offerings", icon: "giving", soon: true },
      { href: "/partnerships", label: "Partnerships", icon: "partnership", soon: true },
    ],
  },
  {
    heading: "You",
    items: [
      { href: "/notifications", label: "Notifications", icon: "bell", soon: true },
      { href: "/account", label: "Account", icon: "account" },
    ],
  },
];

/** The sections a given role may see, with empty sections dropped. */
export function navFor(role: Role): NavSection[] {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  })).filter((section) => section.items.length > 0);
}

/** Every label the breadcrumbs might need, including pages with no nav entry. */
export const LABELS: Record<string, string> = {
  ...Object.fromEntries(NAV.flatMap((s) => s.items).map((item) => [item.href, item.label])),
  "/change-password": "Change password",
};
