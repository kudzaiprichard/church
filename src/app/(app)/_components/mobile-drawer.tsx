"use client";

import Link from "next/link";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { RailSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * Rail and panel together, for screens too narrow to hold both columns.
 *
 * Below md the three-zone layout collapses to this: every section listed with
 * its pages beneath it, so nothing that exists on a desktop is unreachable on
 * a phone. Closes itself on navigation — a drawer left open over the page you
 * just asked for is the most common way this pattern gets it wrong.
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
      <SheetContent side="left" className="w-[17rem] gap-0 rounded-none p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <ScrollArea className="h-full">
          <div className="space-y-5 px-3 py-5">
            {rail.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 px-2 pb-2">
                  <NavIcon
                    name={section.icon}
                    className={cn(
                      "size-4 shrink-0",
                      section.id === activeId ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.18em] uppercase">
                    {section.label}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-[var(--brass)]/25" />
                </div>

                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);

                    if (item.soon) {
                      return (
                        <li key={item.href}>
                          <span className="text-muted-foreground/45 flex items-center gap-2 rounded-none px-2 py-2 text-sm">
                            <span className="flex-1 truncate">{item.label}</span>
                            <span className="font-mono text-[0.55rem] tracking-[0.12em] uppercase">
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
                            "relative flex items-center rounded-none px-2 py-2 text-sm transition-colors duration-150",
                            "before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[2px] before:-translate-y-1/2 before:transition-opacity",
                            active
                              ? "bg-primary/10 text-primary before:bg-[var(--brass)] font-medium before:opacity-100"
                              : "text-foreground/80 hover:bg-secondary hover:text-foreground before:opacity-0",
                          )}
                        >
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
      </SheetContent>
    </Sheet>
  );
}
