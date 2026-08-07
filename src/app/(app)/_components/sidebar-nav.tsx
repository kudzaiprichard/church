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
 *
 * Collapsed, it becomes an icon rail: the labels go, the section headings are
 * replaced by hairlines so the grouping survives, and every item carries a
 * `title` so hovering still tells you what it is. The icons keep their
 * position, which is what makes the collapsed and expanded states feel like
 * the same navigation rather than two different ones.
 */
export function SidebarNav({
  sections,
  collapsed = false,
  onNavigate,
}: {
  sections: NavSection[];
  collapsed?: boolean;
  /** Lets the mobile drawer close itself when a link is followed. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="System" className={cn("flex flex-col", collapsed ? "gap-3" : "gap-7")}>
      {sections.map((section, index) => (
        <div key={section.heading}>
          {collapsed ? (
            index > 0 && <div aria-hidden className="bg-sidebar-border mx-auto mb-3 h-px w-6" />
          ) : (
            <h2 className="text-sidebar-foreground/45 px-3 font-mono text-[0.6rem] tracking-[0.18em] uppercase">
              {section.heading}
            </h2>
          )}

          <ul className={cn("flex flex-col gap-0.5", !collapsed && "mt-2")}>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              const shared = cn(
                "relative flex items-center rounded-md text-sm",
                collapsed ? "h-9 w-9 mx-auto justify-center" : "gap-3 px-3 py-2",
              );

              if (item.soon) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled
                      title={`${item.label} — not built yet`}
                      className={cn(shared, "text-sidebar-foreground/35 cursor-default")}
                    >
                      <NavIcon name={item.icon} className="size-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto font-mono text-[0.55rem] tracking-[0.12em] uppercase">
                            Soon
                          </span>
                        </>
                      )}
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      shared,
                      "focus-visible:ring-sidebar-ring transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    {/* A marker on the active item, so the current page is
                        legible without relying on the fill alone — and so the
                        rail still shows where you are once the labels have gone. */}
                    <span
                      aria-hidden
                      className={cn(
                        "bg-sidebar-primary absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity",
                        collapsed ? "-left-2" : "-left-3",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <NavIcon name={item.icon} className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
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
