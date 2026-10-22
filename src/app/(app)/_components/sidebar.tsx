"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";

import { KbdHint } from "./kbd-hint";
import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";
import { PersonAvatar } from "./person-avatar";

/** Sections about the person and the system, set apart from the church's own work. */
const SECONDARY = ["you", "admin"];

/**
 * The navigation column.
 *
 * On a desktop it lists the six *sections* by name — Home, People, Church
 * life, Giving, You, Admin — and the current section's pages are tabs under
 * the top bar (SectionTabs). Six named entries rather than twenty-odd, so the
 * column stays quiet; and nothing is an icon you have to hover to decode.
 * Collapsing to icons is a choice, remembered in a cookie, and every icon
 * keeps a tooltip and an accessible name. Between md and lg there is no room
 * for labels, so the column shows icons there whatever was chosen.
 *
 * Three parts, top to bottom: the church's name; the sections, the four
 * everyday ones first and You and Admin set apart beneath a rule; and a footer
 * with the signed-in person and the collapse control.
 *
 * In the phone drawer, where a second row of tabs costs a tap, it lists every
 * page under its section instead.
 *
 * `badges` are live counts by page href (unread messages, payments waiting
 * for review); a section shows the sum of its pages'.
 */
export function Sidebar({
  user,
  sections,
  activeId,
  pathname,
  badges,
  collapsed,
  onToggle,
  onNavigate,
  variant = "desktop",
}: {
  user: { firstName: string; lastName: string; avatarUrl: string | null; role: Role };
  sections: RailSection[];
  activeId: string | undefined;
  pathname: string;
  badges: Record<string, number>;
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  /** `drawer` is the phone sheet: every page, always labelled, no collapse control. */
  variant?: "desktop" | "drawer";
}) {
  const drawer = variant === "drawer";
  // Labels show in the drawer always, and on the desktop column from lg up
  // unless the person collapsed it.
  const labels = drawer ? "inline" : collapsed ? "hidden" : "hidden lg:inline";

  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label="Main"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full shrink-0 flex-col",
          !drawer && "border-sidebar-border border-r",
          drawer ? "w-full" : collapsed ? "w-[4.5rem]" : "w-[4.5rem] lg:w-60",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        )}
      >
        <div className="border-sidebar-border shrink-0 border-b px-3 py-3">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md p-1.5",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              !drawer && (collapsed ? "justify-center" : "justify-center lg:justify-start"),
            )}
          >
            <Logo size={34} className="shrink-0" />
            <span className={cn("min-w-0 leading-tight", labels)}>
              <span className="font-title text-foreground block truncate text-[0.95rem] font-semibold">
                Kingdom Manifest
              </span>
              <span className="text-muted-foreground block truncate text-xs">Member portal</span>
            </span>
          </Link>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {drawer ? (
            <div className="space-y-4 px-2.5 pt-1 pb-4">
              {sections.map((section) => (
                <div key={section.id}>
                  {section.items.length > 1 && (
                    <p className="text-muted-foreground px-2.5 pb-1 text-xs font-medium">
                      {section.label}
                    </p>
                  )}
                  <ul className="space-y-px">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Entry
                          href={item.href}
                          icon={item.icon}
                          label={item.label}
                          count={badges[item.href] ?? 0}
                          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                          labels="inline"
                          onNavigate={onNavigate}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3">
              {[
                sections.filter((section) => !SECONDARY.includes(section.id)),
                sections.filter((section) => SECONDARY.includes(section.id)),
              ]
                .filter((group) => group.length > 0)
                .map((group, index) => (
                  <ul
                    key={index}
                    className={cn(
                      "space-y-1",
                      index > 0 && "border-sidebar-border mt-3 border-t pt-3",
                    )}
                  >
                    {group.map((section) => {
                      const count = section.items.reduce(
                        (sum, item) => sum + (badges[item.href] ?? 0),
                        0,
                      );
                      return (
                        <li key={section.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Entry
                                href={section.href}
                                icon={section.icon}
                                label={section.label}
                                count={count}
                                active={section.id === activeId}
                                labels={labels}
                                iconOnly={collapsed ? "always" : "below-lg"}
                              />
                            </TooltipTrigger>
                            {/* Only needed while the label is hidden; below lg it always is. */}
                            <TooltipContent
                              side="right"
                              sideOffset={8}
                              className={cn("text-xs", !collapsed && "lg:hidden")}
                            >
                              {section.label}
                              {count > 0 && ` · ${count} new`}
                            </TooltipContent>
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ul>
                ))}
            </div>
          )}
        </ScrollArea>

        <div
          className={cn(
            "border-sidebar-border flex shrink-0 items-center gap-2 border-t p-3",
            !drawer && collapsed && "flex-col",
            !drawer && !collapsed && "max-lg:flex-col",
          )}
        >
          <Link
            href="/profile"
            onClick={onNavigate}
            aria-label={`Your profile: ${user.firstName} ${user.lastName}, ${ROLE_LABELS[user.role]}`}
            className={cn(
              "hover:bg-muted flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              !drawer &&
                (collapsed ? "flex-none justify-center" : "max-lg:flex-none max-lg:justify-center"),
            )}
          >
            <PersonAvatar person={user} className="size-8" />
            <span className={cn("min-w-0 leading-tight", labels)}>
              <span className="text-foreground block truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </Link>
          {!drawer && onToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggle}
                  aria-pressed={collapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className={cn(
                    "text-muted-foreground hover:bg-muted hover:text-foreground hidden size-9 shrink-0 cursor-pointer place-items-center rounded-md lg:grid",
                    "focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  )}
                >
                  {collapsed ? (
                    <PanelLeftOpenIcon className="size-[18px]" aria-hidden />
                  ) : (
                    <PanelLeftCloseIcon className="size-[18px]" aria-hidden />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={8}
                className="flex items-center gap-2 text-xs"
              >
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                <KbdHint keys={["⌘", "/"]} always />
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}

/** A count beside a label, or tucked into the icon's corner when there is no label. */
const BADGE_INLINE = "h-5 min-w-5 px-1.5 text-[0.7rem]";
const BADGE_CORNER = "absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[0.6rem]";

/** One row: an icon, its label and any count. Forwards props so a tooltip can wrap it. */
function Entry({
  href,
  icon,
  label,
  count,
  active,
  labels,
  iconOnly,
  onNavigate,
  ...rest
}: {
  href: string;
  icon: Parameters<typeof NavIcon>[0]["name"];
  label: ReactNode;
  count: number;
  active: boolean;
  labels: string;
  /** When the label is hidden: always (collapsed), or only below lg. Absent: never. */
  iconOnly?: "always" | "below-lg";
  onNavigate?: () => void;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      {...rest}
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        iconOnly === "always" && "justify-center",
        iconOnly === "below-lg" && "justify-center lg:justify-start",
        // The current section: a neutral fill and a gold marker at its edge,
        // rather than a block of blue beside a page already full of it.
        active
          ? "bg-muted text-foreground before:bg-indicator font-semibold before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      <NavIcon
        name={icon}
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className={cn("min-w-0 flex-1 truncate", labels)}>{label}</span>
      {count > 0 && (
        <span
          aria-label={`${count} new`}
          className={cn(
            "badge-count numeric grid place-items-center rounded-full font-semibold",
            iconOnly === "always"
              ? BADGE_CORNER
              : iconOnly === "below-lg"
                ? `${BADGE_CORNER} lg:static lg:h-5 lg:min-w-5 lg:px-1.5 lg:text-[0.7rem]`
                : BADGE_INLINE,
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
