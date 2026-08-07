"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { SIDEBAR_COOKIE, type NavSection } from "./nav";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { WordMark } from "./word-mark";

/**
 * The internal shell, and the only client component in the layout.
 *
 * It exists because the sidebar collapses, and that is state — but `children`
 * is still passed down from the Server Component layout, so the pages inside
 * stay server-rendered. Wrapping is not the same as taking over.
 *
 * The collapsed state is kept in a cookie rather than in `localStorage` so the
 * server already knows which width to render. `localStorage` can only be read
 * after hydration, which means either a flash of the wrong width or a
 * hydration mismatch; a cookie has neither problem and costs nothing.
 */
export function AppShell({
  user,
  sections,
  signOut,
  defaultCollapsed,
  children,
}: {
  user: SessionUser;
  sections: NavSection[];
  signOut: () => Promise<void>;
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    // A year, path-wide, and readable by the server on the next request.
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div className="min-h-svh">
      {/* Fixed and full height, with its own scroll region so a long list never
          drags the page with it. Width is the only thing that animates. */}
      <aside
        id="app-sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border",
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col lg:border-r",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        <div className={cn("flex h-full flex-col py-5", collapsed ? "px-3" : "px-4")}>
          <div className={cn("pb-8", collapsed ? "flex justify-center" : "px-3")}>
            <WordMark collapsed={collapsed} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav sections={sections} collapsed={collapsed} />
          </div>

          {!collapsed && (
            <p className="text-sidebar-foreground/35 mt-6 px-3 font-mono text-[0.55rem] tracking-[0.14em] uppercase">
              {user.role === "ADMIN" ? "Full access" : "Your records only"}
            </p>
          )}
        </div>
      </aside>

      {/* Padded to clear the sidebar, and animated in step with it. */}
      <div
        className={cn(
          "flex min-h-svh flex-col",
          "transition-[padding] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <MobileNav sections={sections} />

            {/* The collapse control lives up here rather than at the foot of
                the sidebar: it stays in the same place whichever state the
                sidebar is in, it is the first thing in the tab order, and it
                is not marooned in a corner of a full-height column. */}
            <button
              type="button"
              onClick={toggle}
              aria-expanded={!collapsed}
              aria-controls="app-sidebar"
              aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
              title={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "focus-visible:ring-ring -ml-1 hidden size-9 items-center justify-center rounded-md",
                "transition-colors focus-visible:ring-2 focus-visible:outline-none lg:inline-flex",
              )}
            >
              {collapsed ? (
                <PanelLeftOpenIcon className="size-4.5" aria-hidden />
              ) : (
                <PanelLeftCloseIcon className="size-4.5" aria-hidden />
              )}
            </button>

            <Breadcrumbs />

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserMenu user={user} signOut={signOut} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
