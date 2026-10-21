"use client";

import { ChevronRightIcon, MenuIcon, SearchIcon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { KbdHint } from "./kbd-hint";
import { NotificationBell, type NotificationPreview } from "./notification-bell";
import { UserMenu } from "./user-menu";

const iconButton = cn(
  "text-muted-foreground hover:bg-muted hover:text-foreground border-border",
  "focus-visible:ring-ring grid size-9 cursor-pointer place-items-center rounded-lg border",
  "transition-colors focus-visible:ring-2 focus-visible:outline-none",
);

/**
 * The bar across the top of the page.
 *
 * It carries only what is about *this page* — where you are, and the ways out
 * of it. Everything about the *system* lives in the rail and the panel to the
 * left. Frosted, so content scrolling beneath it stays faintly visible and the
 * bar reads as a layer rather than a wall.
 */
export function Topbar({
  breadcrumb,
  user,
  signOut,
  notifications,
  unreadCount,
  onOpenPalette,
  onOpenMobileMenu,
}: {
  breadcrumb: { section: string; page: string } | undefined;
  user: SessionUser;
  signOut: () => Promise<void>;
  notifications: NotificationPreview[];
  unreadCount: number;
  onOpenPalette: () => void;
  onOpenMobileMenu: () => void;
}) {
  return (
    <header className="border-border bg-background/85 flex h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-xl sm:px-5">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open navigation"
        className={cn(iconButton, "md:hidden")}
      >
        <MenuIcon className="size-4" aria-hidden />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        {breadcrumb && (
          <ol className="flex items-center gap-1.5 text-sm">
            <li className="text-muted-foreground hidden truncate sm:block">{breadcrumb.section}</li>
            <li aria-hidden className="text-muted-foreground/50 hidden shrink-0 sm:block">
              <ChevronRightIcon className="size-3.5" />
            </li>
            <li aria-current="page" className="text-foreground truncate font-semibold">
              {breadcrumb.page}
            </li>
          </ol>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open the command palette"
          className={cn(
            "border-border bg-muted hidden h-9 w-56 cursor-pointer items-center gap-2 rounded-lg border px-2.5 lg:flex",
            "hover:border-input focus-visible:ring-ring transition-colors",
            "focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <SearchIcon className="text-muted-foreground size-3.5" aria-hidden />
          <span className="text-muted-foreground flex-1 text-left text-sm">Search pages…</span>
          <KbdHint keys={["⌘", "K"]} />
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open the command palette"
          className={cn(iconButton, "lg:hidden")}
        >
          <SearchIcon className="size-4" aria-hidden />
        </button>

        <NotificationBell items={notifications} unreadCount={unreadCount} />

        <ThemeToggle className="hidden sm:inline-flex" />

        <div aria-hidden className="bg-border mx-1 hidden h-6 w-px sm:block" />

        <UserMenu user={user} signOut={signOut} />
      </div>
    </header>
  );
}
