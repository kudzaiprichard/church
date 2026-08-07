"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import type { NavSection } from "./nav";
import { NavIcon } from "./nav-icon";

/**
 * The navigation list itself, shared by the fixed desktop sidebar and the
 * mobile drawer so there is only one of it to keep right.
 *
 * A client component because the active item comes from the current path.
 */
export function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  /** Lets the mobile drawer close itself when a link is followed. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="System" className="flex flex-col gap-7">
      {sections.map((section) => (
        <div key={section.heading}>
          <h2 className="text-sidebar-foreground/45 px-3 font-mono text-[0.6rem] tracking-[0.18em] uppercase">
            {section.heading}
          </h2>

          <ul className="mt-2 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              if (item.soon) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled
                      title="Not built yet"
                      className="text-sidebar-foreground/35 flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm"
                    >
                      <NavIcon name={item.icon} className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto font-mono text-[0.55rem] tracking-[0.12em] uppercase">
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
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-sidebar-ring relative flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                      "transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    {/* A brass marker on the active item, so the current page is
                        legible without relying on the fill alone. */}
                    <span
                      aria-hidden
                      className={cn(
                        "bg-sidebar-primary absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <NavIcon name={item.icon} className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
