import { can, type Permission } from "@/lib/auth/permissions";

/**
 * The shape of the internal system, in one place (docs/SCOPE.md §8).
 *
 * Two levels: the sidebar lists the *sections*, each with its name, and a
 * row of tabs under the top bar lists the current section's *pages*. The
 * breadcrumb and the command palette both read from here too, so a page can
 * never be called one thing in the sidebar and another at the top of the
 * screen.
 *
 * `access` decides what a person is even shown. It is presentation only — the
 * actual gate is `requirePermission()` / `requireGroupLeader()` inside the page
 * and inside every action it can reach. Hiding a link protects nothing on its
 * own.
 *
 * `soon` marks the modules from the specification that are not built yet. They
 * appear, greyed and unclickable, because an empty panel tells a new leader
 * nothing about where this is going — and a link that 404s tells them
 * something worse. Each phase flips its own items live.
 */
export type IconName =
  | "overview"
  | "people"
  | "life"
  | "records"
  | "you"
  | "admin"
  | "dashboard"
  | "users"
  | "groups"
  | "birthday"
  | "baptism"
  | "inbox"
  | "calendar"
  | "prayer"
  | "sermons"
  | "devotion"
  | "attendance"
  | "giving"
  | "finance"
  | "chema"
  | "review"
  | "partnership"
  | "profile"
  | "notes"
  | "bell"
  | "account"
  | "settings"
  | "audit";

/**
 * Who may see an entry. Absent means everyone signed in.
 *
 * Visible when the person holds *any* of `permissions`, or — with `leaders` —
 * leads at least one group. Leadership is passed in from the database on every
 * request rather than read from the session, so a newly assigned leader sees
 * their tools on the next page load.
 */
export type NavAccess = {
  permissions?: readonly Permission[];
  leaders?: boolean;
};

export type PanelItem = {
  href: string;
  label: string;
  icon: IconName;
  access?: NavAccess;
  soon?: boolean;
};

export type RailSection = {
  id: string;
  label: string;
  icon: IconName;
  /** Where the rail icon itself goes — always the section's first real page. */
  href: string;
  items: PanelItem[];
};

export const RAIL: RailSection[] = [
  {
    id: "overview",
    label: "Home",
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
      {
        href: "/members",
        label: "Members",
        icon: "users",
        access: { permissions: ["members.viewAll", "members.enroll"], leaders: true },
      },
      { href: "/groups", label: "Connect groups", icon: "groups" },
      { href: "/birthdays", label: "Birthdays", icon: "birthday" },
      {
        href: "/baptism",
        label: "Baptism records",
        icon: "baptism",
        access: { permissions: ["baptism.manage"] },
      },
    ],
  },
  {
    id: "life",
    label: "Church life",
    icon: "life",
    href: "/messages",
    items: [
      { href: "/messages", label: "Messages", icon: "inbox" },
      { href: "/events", label: "Events", icon: "calendar" },
      { href: "/attendance", label: "Attendance", icon: "attendance" },
      { href: "/prayer", label: "Prayer requests", icon: "prayer" },
      { href: "/sermons", label: "Sermons", icon: "sermons" },
      { href: "/devotions", label: "Devotions", icon: "devotion" },
    ],
  },
  {
    id: "records",
    label: "Giving",
    icon: "records",
    href: "/finance",
    items: [
      { href: "/finance", label: "My giving", icon: "giving" },
      {
        href: "/finance/church",
        label: "Church finance",
        icon: "finance",
        access: { permissions: ["finance.viewAll"] },
      },
      {
        href: "/finance/chema",
        label: "Chema compliance",
        icon: "chema",
        access: { permissions: ["finance.viewAll"], leaders: true },
      },
      {
        href: "/finance/review",
        label: "Payment review",
        icon: "review",
        access: { permissions: ["finance.confirm"] },
      },
      { href: "/partnerships", label: "Partnerships", icon: "partnership" },
    ],
  },
  {
    id: "you",
    label: "You",
    icon: "you",
    href: "/profile",
    items: [
      { href: "/profile", label: "Profile", icon: "profile" },
      { href: "/notes", label: "My sermon notes", icon: "notes" },
      { href: "/notifications", label: "Notifications", icon: "bell" },
      { href: "/account", label: "Account", icon: "account" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: "admin",
    href: "/settings",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: "settings",
        access: { permissions: ["settings.manage"] },
      },
      {
        href: "/audit",
        label: "Audit log",
        icon: "audit",
        access: { permissions: ["audit.view"] },
      },
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

type NavUser = Parameters<typeof can>[0];

/** True when the entry's `access` admits this person. */
export function canSee(user: NavUser, access: NavAccess | undefined, leadsAGroup: boolean) {
  if (!access) return true;
  if (access.leaders && leadsAGroup) return true;
  return (access.permissions ?? []).some((permission) => can(user, permission));
}

/**
 * The rail a given person may see, with sections that emptied out removed.
 *
 * `ledGroupIds` comes from the Data Access Layer on every request; only
 * whether it is empty matters here.
 */
export function railFor(user: NavUser, ledGroupIds: readonly string[] = []): RailSection[] {
  const leadsAGroup = ledGroupIds.length > 0;

  return RAIL.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSee(user, item.access, leadsAGroup)),
  }))
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      // A section's rail icon must land somewhere the person can actually go,
      // so it follows its first visible page rather than a fixed href.
      ...section,
      href: section.items.find((item) => !item.soon)?.href ?? section.items[0].href,
    }));
}

/** The section a path belongs to, for the rail highlight and the breadcrumb. */
export function sectionFor(pathname: string, rail: RailSection[]) {
  // Longest match first, so `/finance/church` is not claimed by `/finance`.
  const items = rail
    .flatMap((section) => section.items.map((item) => ({ section, href: item.href })))
    .sort((a, b) => b.href.length - a.href.length);

  return items.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.section;
}

/**
 * The things a person can start from anywhere: the top bar's "New" menu.
 *
 * Same rule as the pages: `access` only decides what is offered; each page
 * checks again. `compose` items follow the message rule instead (Apostles,
 * and leaders for their groups), which is decided in the layout.
 */
export type CreateAction = {
  href: string;
  label: string;
  icon: IconName;
  access?: NavAccess;
  compose?: boolean;
};

export const CREATE_ACTIONS: CreateAction[] = [
  { href: "/messages/new", label: "Message", icon: "inbox", compose: true },
  {
    href: "/events/new",
    label: "Event",
    icon: "calendar",
    access: { permissions: ["events.manage"] },
  },
  {
    href: "/members/new",
    label: "Enrol a member",
    icon: "users",
    access: { permissions: ["members.enroll"] },
  },
  {
    href: "/sermons/new",
    label: "Sermon",
    icon: "sermons",
    access: { permissions: ["sermons.manage"] },
  },
  {
    href: "/devotions/new",
    label: "Devotion",
    icon: "devotion",
    access: { permissions: ["devotions.manage"] },
  },
  {
    href: "/groups/new",
    label: "Connect group",
    icon: "groups",
    access: { permissions: ["groups.manage"] },
  },
  { href: "/finance", label: "Log a payment", icon: "giving" },
  { href: "/prayer", label: "Prayer request", icon: "prayer" },
];

export function createActionsFor(
  user: NavUser,
  ledGroupIds: readonly string[],
  canCompose: boolean,
): CreateAction[] {
  return CREATE_ACTIONS.filter((action) =>
    action.compose ? canCompose : canSee(user, action.access, ledGroupIds.length > 0),
  );
}

/** Every page label, including ones with no panel entry of their own. */
export const LABELS: Record<string, string> = {
  ...Object.fromEntries(RAIL.flatMap((s) => s.items).map((item) => [item.href, item.label])),
  "/members/new": "Enrol a member",
  "/members/import": "Import members",
  "/groups/new": "New group",
  "/messages/new": "New message",
  "/messages/sent": "Sent",
  "/events/new": "New event",
  "/finance/pledges": "Pledges",
  "/sermons/new": "Add sermon",
  "/devotions/new": "New devotion",
  "/baptism/candidates": "Candidates",
  "/baptism/classes": "Classes",
  "/settings/theme": "Theme of the Year",
  "/settings/social": "Social media",
  "/change-password": "Change password",
};
