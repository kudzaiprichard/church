"use client";

import { BellIcon, InboxIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
});

/**
 * The bell, reading the real `Notification` table.
 *
 * The rows are fetched on the server by the layout and handed down, already
 * scoped to the signed-in person — there is no client-side query here that
 * could be pointed at somebody else's inbox.
 *
 * The module that *writes* notifications is not built yet, so in practice this
 * shows its empty state. That is the honest thing for it to do: the count is
 * real, and it will start moving the moment there is anything to count.
 */
export function NotificationBell({
  items,
  unreadCount,
}: {
  items: NotificationPreview[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const display = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className={cn(
          "border-border/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
          "focus-visible:ring-ring relative grid h-7 w-7 cursor-pointer place-items-center rounded-none border",
          "transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <BellIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[0.6rem] leading-none font-semibold">
            {display}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[22rem] overflow-hidden rounded-none p-0"
      >
        <div className="border-border/60 flex items-center justify-between border-b px-3 py-2.5">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.14em] uppercase">
              {unreadCount} unread
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center px-4 py-10">
            <InboxIcon className="mb-3 size-8 opacity-40" aria-hidden />
            <p className="text-sm font-medium">Nothing yet</p>
            <p className="mt-1 text-xs opacity-70">
              Messages, events and group activity will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-border/50 divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.linkUrl ?? "/notifications"}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "hover:bg-secondary/60 block px-3 py-2.5 transition-colors",
                      !item.read && "bg-primary/[0.04]",
                    )}
                  >
                    <p className="flex items-baseline gap-2 text-sm leading-snug">
                      {!item.read && (
                        <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                      )}
                      <span className={cn("min-w-0 flex-1", !item.read && "font-medium")}>
                        {item.title}
                      </span>
                    </p>
                    {item.body && (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.body}</p>
                    )}
                    <p className="text-muted-foreground/70 mt-1 font-mono text-[0.6rem] tracking-wide">
                      {when.format(new Date(item.createdAt))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
