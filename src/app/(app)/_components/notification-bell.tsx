"use client";

import { BellIcon, CheckCheckIcon, InboxIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { markAllNotificationsRead, openNotification } from "../notifications/actions";

export type NotificationPreview = {
  id: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  createdAt: string;
  read: boolean;
};

const when = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Harare",
});

/** How often an open tab asks the server for anything new. */
const REFRESH_MS = 60_000;

/**
 * The bell (docs/SCOPE.md §9.13).
 *
 * The rows are read on the server by the layout and handed down, already
 * scoped to the signed-in person — there is no client-side query here that
 * could be pointed at somebody else's notifications. Staying current is a
 * `router.refresh()` once a minute while the tab is visible, which re-reads
 * them the same way rather than through a second, separately guarded API.
 *
 * Opening one is a form posting to `openNotification`, which marks it read and
 * redirects to where it points; "Mark all read" clears the lot.
 */
export function NotificationBell({
  items,
  unreadCount,
}: {
  items: NotificationPreview[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const display = unreadCount > 99 ? "99+" : unreadCount;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className={cn(
          "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus-visible:ring-ring relative grid size-9 cursor-pointer place-items-center rounded-lg border",
          "transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <BellIcon className="size-4" strokeWidth={1.75} aria-hidden />
        {unreadCount > 0 && (
          <span className="bg-brass ring-background absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] leading-none font-bold text-[oklch(0.255_0.093_277.5)] ring-2">
            {display}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl p-0"
      >
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-primary inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <CheckCheckIcon className="size-3.5" aria-hidden />
                Mark all read
              </button>
            </form>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center px-4 py-10">
            <span className="bg-secondary text-primary mb-3 grid size-11 place-items-center rounded-xl">
              <InboxIcon className="size-5" aria-hidden />
            </span>
            <p className="text-foreground text-sm font-semibold">Nothing yet</p>
            <p className="mt-1 text-xs opacity-70">
              Messages, replies and group activity will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-border/50 divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <form action={openNotification.bind(null, item.id)} onSubmit={() => setOpen(false)}>
                    <button
                      type="submit"
                      className={cn(
                        "hover:bg-muted block w-full cursor-pointer px-4 py-3 text-left transition-colors focus-visible:bg-muted focus-visible:outline-none",
                        !item.read && "bg-secondary/50",
                      )}
                    >
                      <span className="flex items-baseline gap-2 text-sm leading-snug">
                        {!item.read && (
                          <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                        )}
                        <span className={cn("min-w-0 flex-1", !item.read && "font-medium")}>
                          {!item.read && <span className="sr-only">Unread: </span>}
                          {item.title}
                        </span>
                      </span>
                      {item.body && (
                        <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs">
                          {item.body}
                        </span>
                      )}
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {when.format(new Date(item.createdAt))}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <div className="border-border border-t px-4 py-2.5 text-center">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-primary rounded-sm text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
