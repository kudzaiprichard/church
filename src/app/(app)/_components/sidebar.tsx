"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { KbdHint } from "./kbd-hint";
import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * The one navigation column: every page a person may open, by name, grouped
 * under its section.
 *
 * It replaces an icon rail plus a second panel, where a section was only an
 * icon until you hovered it and every page sat two clicks deep. Here a label
 * is always beside its icon. Collapsing is a choice, remembered in a cookie,
 * and the collapsed column keeps a tooltip and an accessible name on every
 * icon — an icon on its own is a guess. Between md and lg there is no room
 * for labels, so the column shows icons there whatever was chosen.
 *
 * `badges` are live counts by href (unread messages, payments waiting for
 * review), so the column says where attention is needed before anyone
 * opens a page.
 */
/** A count beside a label, or tucked into the icon's corner when there is no label. */
const BADGE_INLINE = "h-5 min-w-5 px-1.5 text-[0.7rem]";
const BADGE_CORNER = "absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[0.6rem]";

export function Sidebar({
  sections,
  pathname,
  badges,
  collapsed,
  onToggle,
  onNavigate,
  variant = "desktop",
}: {
  sections: RailSection[];
  pathname: string;
  badges: Record<string, number>;
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  /** `drawer` is the phone sheet: always labelled, no collapse control. */
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
          drawer ? "w-full" : collapsed ? "w-16" : "w-16 lg:w-60",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "flex h-14 shrink-0 items-center gap-2.5 px-4",
            "focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
          )}
        >
          <Logo size={30} className="shrink-0" />
          <span className={cn("min-w-0 leading-none", labels)}>
            <span className="font-title text-foreground block truncate text-[0.95rem] font-semibold">
              Kingdom Manifest
            </span>
            <span className="text-muted-foreground mt-1 block text-xs">Member portal</span>
          </span>
        </Link>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 px-2.5 pt-1 pb-4">
            {sections.map((section) => (
              <div key={section.id}>
                {section.items.length > 1 && (
                  <p
                    className={cn(
                      "text-muted-foreground px-2.5 pb-1 text-xs font-medium",
                      drawer ? "block" : collapsed ? "sr-only" : "sr-only lg:not-sr-only lg:block",
                    )}
                  >
                    {section.label}
                  </p>
                )}
                <ul className="space-y-px">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (pathname.startsWith(`${item.href}/`) &&
                        // A deeper sibling owns its own paths (/finance/church is not /finance).
                        !section.items.some(
                          (other) =>
                            other.href.length > item.href.length &&
                            (pathname === other.href || pathname.startsWith(`${other.href}/`)),
                        ));
                    const count = badges[item.href] ?? 0;
                    const link = (
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-8 items-center gap-3 rounded-md px-2.5 text-sm transition-colors duration-150",
                          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                          !drawer &&
                            (collapsed ? "justify-center" : "justify-center lg:justify-start"),
                          active
                            ? "bg-secondary text-secondary-foreground font-semibold"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <NavIcon
                          name={item.icon}
                          className={cn(
                            "size-[18px] shrink-0",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <span className={cn("min-w-0 flex-1 truncate", labels)}>{item.label}</span>
                        {count > 0 && (
                          <span
                            aria-label={`${count} new`}
                            className={cn(
                              "bg-primary text-primary-foreground numeric grid place-items-center rounded-full font-semibold",
                              drawer
                                ? BADGE_INLINE
                                : collapsed
                                  ? BADGE_CORNER
                                  : `${BADGE_CORNER} lg:static lg:h-5 lg:min-w-5 lg:px-1.5 lg:text-[0.7rem]`,
                            )}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </Link>
                    );

                    if (drawer) return <li key={item.href}>{link}</li>;
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          {/* Only needed while the label is hidden; below lg it always is. */}
                          <TooltipContent
                            side="right"
                            sideOffset={8}
                            className={cn("text-xs", !collapsed && "lg:hidden")}
                          >
                            {item.label}
                            {count > 0 && ` · ${count} new`}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>

        {!drawer && onToggle && (
          <div className="border-sidebar-border hidden border-t p-2.5 lg:block">
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-full cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm",
                "focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
                collapsed && "justify-center",
              )}
            >
              {collapsed ? (
                <PanelLeftOpenIcon className="size-[18px] shrink-0" aria-hidden />
              ) : (
                <PanelLeftCloseIcon className="size-[18px] shrink-0" aria-hidden />
              )}
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Collapse</span>
                  <KbdHint keys={["⌘", "/"]} always />
                </>
              )}
            </button>
          </div>
        )}
      </nav>
    </TooltipProvider>
  );
}
