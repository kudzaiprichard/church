"use client";

import { ChevronRightIcon, MenuIcon, SearchIcon } from "lucide-react";

import type { SessionUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { CreateMenu } from "./create-menu";
import { KbdHint } from "./kbd-hint";
import type { CreateAction } from "./nav";
import { NotificationBell, type NotificationPreview } from "./notification-bell";
import { UserMenu } from "./user-menu";

const iconButton = cn(
  "text-muted-foreground hover:bg-muted hover:text-foreground",
  "focus-visible:ring-ring grid size-9 cursor-pointer place-items-center rounded-md",
  "transition-colors focus-visible:ring-2 focus-visible:outline-none",
);

/**
 * The bar across the top: where you are on the left; on the right, the four
 * things wanted from anywhere — find a page, start something, see what is
 * new, and your account (theme included). Flat, on the page's own surface,
 * with a hairline beneath.
 */
export function Topbar({
  breadcrumb,
  user,
  signOut,
  notifications,
  unreadCount,
  createActions,
  onOpenPalette,
  onOpenMobileMenu,
}: {
  breadcrumb: { section: string; page: string } | undefined;
  user: SessionUser;
  signOut: () => Promise<void>;
  notifications: NotificationPreview[];
  unreadCount: number;
  createActions: CreateAction[];
  onOpenPalette: () => void;
  onOpenMobileMenu: () => void;
}) {
  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-5">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open navigation"
        className={cn(iconButton, "md:hidden")}
      >
        <MenuIcon className="size-5" aria-hidden />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        {breadcrumb && (
          <ol className="flex items-center gap-1.5 text-sm">
            <li className="text-muted-foreground hidden truncate sm:block">{breadcrumb.section}</li>
            <li aria-hidden className="text-muted-foreground hidden shrink-0 sm:block">
              <ChevronRightIcon className="size-3.5" />
            </li>
            <li aria-current="page" className="text-foreground truncate font-semibold">
              {breadcrumb.page}
            </li>
          </ol>
        )}
      </nav>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Search pages and actions"
        className={cn(
          "border-input bg-background text-muted-foreground hidden h-9 w-72 cursor-pointer items-center gap-2 rounded-md border px-3 lg:flex",
          "hover:border-foreground/40 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="flex-1 text-left text-sm">Search or jump to…</span>
        <KbdHint keys={["⌘", "K"]} />
      </button>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Search pages and actions"
        className={cn(iconButton, "lg:hidden")}
      >
        <SearchIcon className="size-[18px]" aria-hidden />
      </button>

      <CreateMenu actions={createActions} />

      <NotificationBell items={notifications} unreadCount={unreadCount} />

      <UserMenu user={user} signOut={signOut} />
    </header>
  );
}
