"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import type { NavSection } from "./nav";
import { SidebarNav } from "./sidebar-nav";
import { WordMark } from "./word-mark";

/**
 * The sidebar, for screens too narrow to give it a permanent column.
 *
 * Closes itself on navigation — a drawer left open over the page you just
 * asked for is the most common way this pattern gets it wrong.
 */
export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="focus-visible:ring-ring hover:bg-muted -ml-1 inline-flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden">
        <MenuIcon className="size-5" aria-hidden />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="bg-sidebar text-sidebar-foreground w-72 gap-0 px-4 py-5"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <div className="px-3 pb-7">
          <WordMark />
        </div>

        <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
