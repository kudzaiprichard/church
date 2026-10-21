"use client";

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * Rail and panel together, for screens too narrow to hold both columns.
 *
 * Below md the three-zone layout collapses to this: the crest on the royal
 * band the rail would have shown, then every section with its pages beneath
 * it, so nothing that exists on a desktop is unreachable on a phone. The theme
 * switch lives here too, since the top bar has no room for it at this width.
 * Closes itself on navigation — a drawer left open over the page you just
 * asked for is the most common way this pattern gets it wrong.
 */
export function MobileDrawer({
  rail,
  activeId,
  pathname,
  open,
  onOpenChange,
}: {
  rail: RailSection[];
  activeId: string | undefined;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="bg-card w-[18rem] gap-0 p-0">
        <div className="bg-rail flex items-center gap-3 px-5 py-4">
          <Logo size={34} />
          <div className="leading-none">
            <SheetTitle className="font-display text-sm font-bold tracking-[0.06em] text-white">
              Kingdom Manifest
            </SheetTitle>
            <p className="text-brass mt-1.5 text-[0.6rem] font-medium tracking-[0.14em] uppercase">
              Member portal
            </p>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-3 py-5">
            {rail.map((section) => (
              <div key={section.id}>
                <p
                  className={cn(
                    "px-2.5 pb-1.5 text-[0.65rem] font-semibold tracking-[0.16em] uppercase",
                    section.id === activeId ? "text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  {section.label}
                </p>

                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);

                    if (item.soon) {
                      return (
                        <li key={item.href}>
                          <span className="text-muted-foreground/60 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm">
                            <NavIcon name={item.icon} className="size-4 shrink-0 opacity-60" />
                            <span className="flex-1 truncate">{item.label}</span>
                            <span className="bg-muted rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
                              Soon
                            </span>
                          </span>
                        </li>
                      );
                    }

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => onOpenChange(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
                            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                            active
                              ? "bg-secondary text-primary font-semibold"
                              : "text-foreground/75 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <NavIcon name={item.icon} className="size-4 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-border flex items-center justify-between border-t px-5 py-3">
          <span className="text-muted-foreground text-sm">Theme</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
