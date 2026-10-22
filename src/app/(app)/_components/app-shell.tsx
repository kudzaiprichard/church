"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { SessionUser } from "@/lib/auth/dal";

import { CommandPalette } from "./command-palette";
import { PANEL_COOKIE, LABELS, sectionFor, type CreateAction, type RailSection } from "./nav";
import type { NotificationPreview } from "./notification-bell";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * The internal shell: the sidebar on the left, and the page under a top bar.
 *
 * It is the only client component in the layout — `children` is still passed
 * down from the Server Component layout, so every page inside stays
 * server-rendered. Wrapping is not the same as taking over.
 *
 * The sidebar's collapsed state is kept in a cookie rather than in
 * `localStorage` so the server already knows which width to render.
 * `localStorage` can only be read after hydration, which means either a flash
 * of the wrong width or a hydration mismatch; a cookie has neither problem.
 *
 * `app-ui` sets the portal's own type (see globals.css).
 */
export function AppShell({
  user,
  rail,
  badges,
  createActions,
  signOut,
  notifications,
  unreadCount,
  defaultPanelCollapsed,
  children,
}: {
  user: SessionUser;
  rail: RailSection[];
  badges: Record<string, number>;
  createActions: CreateAction[];
  signOut: () => Promise<void>;
  notifications: NotificationPreview[];
  unreadCount: number;
  defaultPanelCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultPanelCollapsed);

  const section = useMemo(() => sectionFor(pathname, rail), [pathname, rail]);

  // A detail page (/groups/<id>) has no label of its own; it is named after
  // the page it belongs to, so the bar never shows an empty title.
  const breadcrumb = section
    ? {
        section: section.label,
        page:
          LABELS[pathname] ??
          section.items
            .filter((item) => pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0]?.label ??
          "",
      }
    : undefined;

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      // A year, path-wide, and readable by the server on the next request.
      document.cookie = `${PANEL_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };

  /**
   * ⌘K opens the palette · ⌘/ collapses the sidebar.
   *
   * Registered in the capture phase, and stopping immediate propagation, so we
   * beat any in-page listener claiming the same combination — and so the
   * browser's own Ctrl+K (focus the address bar) never fires. The one thing
   * this cannot override is an extension binding the shortcut at the browser
   * level, which runs outside the page entirely.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === "k") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setPaletteOpen((open) => !open);
      } else if (key === "/" || key === "\\") {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleSidebar();
      }
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
    // Bound once. Both handlers reach state through the updater form, so
    // neither closes over a stale value and there is nothing to re-bind for.
  }, []);

  return (
    <div className="app-ui bg-canvas relative h-svh w-full overflow-hidden">
      {/* First stop for the keyboard: past the sidebar and the top bar. */}
      <a
        href="#content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md text-sm font-semibold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Skip to content
      </a>
      <div className="flex h-full">
        {/* Below md the drawer takes over. */}
        <div className="hidden h-full md:block">
          <Sidebar
            sections={rail}
            pathname={pathname}
            badges={badges}
            collapsed={collapsed}
            onToggle={toggleSidebar}
          />
        </div>

        {/* `min-w-0` lets the column shrink below its content's intrinsic
            width instead of pushing the shell sideways. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            breadcrumb={breadcrumb}
            user={user}
            signOut={signOut}
            notifications={notifications}
            unreadCount={unreadCount}
            createActions={createActions}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenMobileMenu={() => setDrawerOpen(true)}
          />

          <main id="content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 outline-none">
            <ScrollArea className="h-full w-full">
              <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                {children}
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>

      {/* Phones: the same sidebar, labelled, in a sheet that closes on navigation. */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="app-ui bg-sidebar w-[17rem] gap-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            sections={rail}
            pathname={pathname}
            badges={badges}
            collapsed={false}
            onNavigate={() => setDrawerOpen(false)}
            variant="drawer"
          />
        </SheetContent>
      </Sheet>

      <CommandPalette rail={rail} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
