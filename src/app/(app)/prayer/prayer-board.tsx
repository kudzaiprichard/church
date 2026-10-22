import { HandHeartIcon, PinIcon } from "lucide-react";

import type { PrayerItem } from "@/lib/data/prayer";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { EmptyState } from "../_components/page-parts";

import { markAnswered, removeRequest, togglePin } from "./actions";

/**
 * A list of requests, pinned first. The buttons shown follow `item.can`, and
 * each action checks the same rule again on the server.
 */
export function PrayerList({ items, showGroup }: { items: PrayerItem[]; showGroup?: boolean }) {
  if (items.length === 0) {
    return (
      <EmptyState icon={<HandHeartIcon className="size-5" aria-hidden />} title="No requests yet">
        When someone asks the group to pray, it appears here.
      </EmptyState>
    );
  }

  const now = new Date();

  return (
    <ul className="divide-border divide-y">
      {items.map((item) => (
        <li key={item.id} className={cn("px-5 py-4", item.isPinned && "bg-brass/10")}>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {item.isPinned && (
              <span className="text-accent-foreground inline-flex items-center gap-1 font-semibold">
                <PinIcon className="size-3" aria-hidden />
                Pinned
              </span>
            )}
            <span className="text-foreground font-semibold">{item.mine ? "You" : item.author}</span>
            {showGroup && <span>· {item.group.name}</span>}
            <time dateTime={item.createdAt}>· {relativeTime(item.createdAt, now)}</time>
            {item.isAnswered && (
              <span className="bg-success/15 text-success rounded-md px-1.5 py-0.5 font-semibold">
                Answered
              </span>
            )}
          </p>
          <p className="text-foreground mt-1.5 text-sm leading-relaxed break-words whitespace-pre-line">
            {item.body}
          </p>
          {(item.can.pin || item.can.moderate) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.can.pin && (
                <ItemAction action={togglePin.bind(null, item.id)}>
                  {item.isPinned ? "Unpin" : "Pin"}
                </ItemAction>
              )}
              {item.can.moderate && (
                <ItemAction action={markAnswered.bind(null, item.id)}>
                  {item.isAnswered ? "Not answered yet" : "Mark answered"}
                </ItemAction>
              )}
              {item.can.moderate && (
                <ItemAction action={removeRequest.bind(null, item.id)} destructive>
                  Remove
                </ItemAction>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ItemAction({
  action,
  children,
  destructive,
}: {
  action: () => Promise<void>;
  children: string;
  destructive?: boolean;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={cn(
          "h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
          destructive
            ? "border-destructive/25 text-destructive hover:bg-destructive/10"
            : "border-border text-foreground/80 hover:bg-muted hover:text-foreground",
        )}
      >
        {children}
      </button>
    </form>
  );
}
