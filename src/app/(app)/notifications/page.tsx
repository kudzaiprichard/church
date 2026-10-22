import { BellIcon, CheckCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { NotificationType } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/dal";
import { listNotifications } from "@/lib/data/notifications";
import { relativeTime } from "@/lib/dates";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notification-rows";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";
import { Pagination } from "../_components/pagination";

import { markAllNotificationsRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

const TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];

/**
 * Every notification addressed to the signed-in person (docs/SCOPE.md §9.13),
 * filterable by kind through `?type=` so a filtered view is its own address.
 */
export default async function NotificationsPage(props: PageProps<"/notifications">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const type = TYPES.find((value) => value === params.type);

  const result = await listNotifications(user, { type, page: Number(params.page) || 1 });
  const now = new Date();

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
      active
        ? "border-primary bg-secondary text-primary"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="Notifications"
        description="Messages, replies and group activity addressed to you. Only you see these."
      />

      <nav aria-label="Filter by kind" className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <Link href="/notifications" aria-current={!type ? "page" : undefined} className={chip(!type)}>
          All
        </Link>
        {TYPES.map((value) => (
          <Link
            key={value}
            href={`/notifications?type=${value}`}
            aria-current={type === value ? "page" : undefined}
            className={chip(type === value)}
          >
            {NOTIFICATION_TYPE_LABELS[value]}
          </Link>
        ))}
      </nav>

      <Panel
        title={`${result.total} ${result.total === 1 ? "notification" : "notifications"}`}
        description={result.unread > 0 ? `${result.unread} unread` : undefined}
        action={
          result.unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-primary inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <CheckCheckIcon className="size-3.5" aria-hidden />
                Mark all read
              </button>
            </form>
          )
        }
        bodyClassName="p-0"
      >
        {result.rows.length === 0 ? (
          <EmptyState icon={<BellIcon className="size-5" aria-hidden />} title="Nothing here">
            {type ? "None of this kind yet." : "When something needs you, it will appear here."}
          </EmptyState>
        ) : (
          <>
            <ul className="divide-border divide-y">
              {result.rows.map((item) => (
                <li key={item.id}>
                  <form action={openNotification.bind(null, item.id)}>
                    <button
                      type="submit"
                      className={cn(
                        "hover:bg-muted/60 grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-5 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
                        !item.read && "bg-secondary/40",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 rounded-full",
                          item.read ? "bg-transparent" : "bg-primary",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="text-muted-foreground block text-xs">
                          {NOTIFICATION_TYPE_LABELS[item.type]}
                        </span>
                        <span
                          className={cn(
                            "text-foreground mt-0.5 block text-sm",
                            item.read ? "font-medium" : "font-bold",
                          )}
                        >
                          {!item.read && <span className="sr-only">Unread: </span>}
                          {item.title}
                        </span>
                        {item.body && (
                          <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-sm">
                            {item.body}
                          </span>
                        )}
                      </span>
                      <time
                        dateTime={item.createdAt}
                        className="text-muted-foreground text-xs whitespace-nowrap"
                      >
                        {relativeTime(item.createdAt, now)}
                      </time>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <div className="border-border border-t">
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                pathname="/notifications"
                params={{ type }}
              />
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
