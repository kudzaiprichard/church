"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * The current section's pages, as navigation tabs under the top bar — the
 * second level of the navigation (the sidebar holds the first).
 *
 * Each tab has its page's icon and name, the same pair the phone drawer
 * shows, so a page is recognisable wherever it is offered. The current one is
 * marked by a solid gold line along the bar's bottom edge and its text in the
 * foreground colour: gold rather than the blue of buttons and links, so the
 * "you are here" mark never reads as something to press. The longest matching
 * href wins, so /finance/church is not claimed by /finance. A section with one
 * page (Home) shows no bar at all.
 */
export function SectionTabs({
  section,
  pathname,
  badges,
}: {
  section: RailSection | undefined;
  pathname: string;
  badges: Record<string, number>;
}) {
  if (!section || section.items.length < 2) return null;

  const current = [...section.items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;

  return (
    <nav
      aria-label={`${section.label} pages`}
      className="border-border bg-background flex h-12 shrink-0 items-stretch gap-1 scrollbar-none overflow-x-auto overflow-y-hidden border-b px-3 sm:px-5"
    >
      {section.items.map((item) => {
        const active = item.href === current;
        const count = badges[item.href] ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative inline-flex shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors",
              "focus-visible:ring-ring rounded-t-md focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
              active
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <NavIcon
              name={item.icon}
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {item.label}
            {count > 0 && (
              <span
                aria-label={`${count} new`}
                className="badge-count numeric grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-semibold"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
            {/* The "you are here" line, sitting on the bar's own bottom border. */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 -bottom-px h-[3px] rounded-t-full transition-colors",
                active ? "bg-indicator" : "group-hover:bg-border bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
