"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { CommandPalette } from "./command-palette";
import { ContextPanel } from "./context-panel";
import { IconRail } from "./icon-rail";
import { MobileDrawer } from "./mobile-drawer";
import { PANEL_COOKIE, LABELS, sectionFor, type RailSection } from "./nav";
import type { NotificationPreview } from "./notification-bell";
import { Topbar } from "./topbar";

/**
 * The internal shell: three zones across, in the order you narrow through them.
 *
 *   the rail    which part of the system you are in
 *   the panel   which page inside that part
 *   the main    the page
 *
 * It is the only client component in the layout — `children` is still passed
 * down from the Server Component layout, so every page inside stays
 * server-rendered. Wrapping is not the same as taking over.
 *
 * The panel's collapsed state is kept in a cookie rather than in
 * `localStorage` so the server already knows which width to render.
 * `localStorage` can only be read after hydration, which means either a flash
 * of the wrong width or a hydration mismatch; a cookie has neither problem.
 */
export function AppShell({
  user,
  rail,
  signOut,
  notifications,
  unreadCount,
  defaultPanelCollapsed,
  children,
}: {
  user: SessionUser;
  rail: RailSection[];
  signOut: () => Promise<void>;
  notifications: NotificationPreview[];
  unreadCount: number;
  defaultPanelCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(defaultPanelCollapsed);

  const section = useMemo(() => sectionFor(pathname, rail), [pathname, rail]);

  const breadcrumb = section
    ? { section: section.label, page: LABELS[pathname] ?? "" }
    : undefined;

  const togglePanel = () => {
    setPanelCollapsed((collapsed) => {
      const next = !collapsed;
      // A year, path-wide, and readable by the server on the next request.
      document.cookie = `${PANEL_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };

  /**
   * ⌘K opens the palette · ⌘/ toggles the panel.
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
        togglePanel();
      }
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
    // Bound once. Both handlers reach state through the updater form, so
    // neither closes over a stale value and there is nothing to re-bind for.
  }, []);

  return (
    <div className="bg-background relative h-svh w-full overflow-hidden">
      <div className="flex h-full">
        {/* Zone 1 — the rail. Hidden below md, where the drawer takes over. */}
        <div className="hidden h-full md:block">
          <IconRail
            sections={rail}
            activeId={section?.id}
            panelCollapsed={panelCollapsed}
            onTogglePanel={togglePanel}
          />
        </div>

        {/* Zone 2 — the panel. Folds away below lg so a small laptop gives the
            whole remaining width to the page. While collapsed it is hidden
            from assistive tech and takes no clicks. */}
        <div
          aria-hidden={panelCollapsed}
          className={cn(
            "hidden h-full flex-col overflow-hidden lg:flex",
            "transition-[width] duration-200 ease-out motion-reduce:transition-none",
            panelCollapsed ? "pointer-events-none w-0" : "w-[13.5rem]",
          )}
        >
          <ContextPanel
            section={section}
            onOpenPalette={() => setPaletteOpen(true)}
            onCollapse={togglePanel}
          />
        </div>

        {/* Zone 3 — the page. `min-w-0` lets the column shrink below its
            content's intrinsic width instead of pushing the shell sideways. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            breadcrumb={breadcrumb}
            user={user}
            signOut={signOut}
            notifications={notifications}
            unreadCount={unreadCount}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenMobileMenu={() => setDrawerOpen(true)}
          />

          <main className="min-h-0 min-w-0 flex-1">
            <ScrollArea className="h-full w-full">
              <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">{children}</div>
            </ScrollArea>
          </main>
        </div>
      </div>

      <MobileDrawer
        rail={rail}
        activeId={section?.id}
        pathname={pathname}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <CommandPalette rail={rail} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
