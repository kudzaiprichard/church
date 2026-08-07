"use client";

import { ChevronRightIcon, MenuIcon, SearchIcon } from "lucide-react";

import type { SessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { KbdHint } from "./kbd-hint";
import { NotificationBell, type NotificationPreview } from "./notification-bell";
import { ThemeSwitch } from "./theme-switch";
import { UserMenu } from "./user-menu";

/**
 * The slim bar across the top.
 *
 * It carries only what is about *this page* — where you are, and the ways out
 * of it. Everything about the *system* lives in the rail and the panel to the
 * left, which is what lets this stay 44px tall.
 *
 * The trail is set as an editorial breadcrumb: the section in mono caps, a
 * brass chevron, then the page itself in plain text.
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
    <header className="border-border/60 bg-background flex h-11 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open navigation"
        className={cn(
          "text-muted-foreground hover:bg-secondary hover:text-foreground",
          "focus-visible:ring-ring grid h-8 w-8 cursor-pointer place-items-center rounded-none md:hidden",
          "transition-colors focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <MenuIcon className="size-4" aria-hidden />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        {breadcrumb && (
          <ol className="flex items-center gap-1.5 text-xs">
            <li className="text-muted-foreground truncate font-mono tracking-[0.16em] uppercase">
              {breadcrumb.section}
            </li>
            <li aria-hidden className="shrink-0 text-[var(--brass)]/60">
              <ChevronRightIcon className="size-3" />
            </li>
            <li aria-current="page" className="text-foreground truncate font-medium">
              {breadcrumb.page}
            </li>
          </ol>
        )}
      </nav>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open the command palette"
          className={cn(
            "border-border/60 bg-secondary/50 hidden h-7 min-w-[180px] cursor-pointer items-center gap-2 rounded-none border px-2 sm:flex",
            "hover:bg-secondary hover:border-border focus-visible:ring-ring transition-colors",
            "focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <SearchIcon className="text-muted-foreground size-3.5" aria-hidden />
          <span className="text-muted-foreground flex-1 text-left text-xs">Search pages…</span>
          <KbdHint keys={["⌘", "K"]} />
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open the command palette"
          className={cn(
            "border-border/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
            "focus-visible:ring-ring grid h-7 w-7 cursor-pointer place-items-center rounded-none border sm:hidden",
            "transition-colors focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <SearchIcon className="size-3.5" aria-hidden />
        </button>

        <NotificationBell items={notifications} unreadCount={unreadCount} />

        <ThemeSwitch />

        <div aria-hidden className="bg-border/70 mx-0.5 hidden h-5 w-px sm:block" />

        <UserMenu user={user} signOut={signOut} />
      </div>
    </header>
  );
}
