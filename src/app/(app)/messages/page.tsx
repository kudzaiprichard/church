import { CheckCheckIcon, InboxIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { listInbox } from "@/lib/data/messages";
import { relativeTime } from "@/lib/dates";
import { mayCompose } from "@/lib/messages/rules";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";
import { Pagination } from "../_components/pagination";

import { markAllMessagesRead } from "./actions";
import { ComposeLink, MailboxTabs, OfficeBadge } from "./mailbox-parts";

export const metadata: Metadata = { title: "Messages" };

/**
 * The inbox (docs/SCOPE.md §9.5): what was sent to the signed-in person,
 * newest first. `listInbox` reads their own recipient rows only — an Apostle's
 * inbox is theirs too, not the church's.
 */
export default async function InboxPage(props: PageProps<"/messages">) {
  const user = await requireSession();
  const { page } = await props.searchParams;

  const [inbox, led] = await Promise.all([
    listInbox(user, { page: Number(page) || 1 }),
    ledGroupIds(user),
  ]);
  const canSend = mayCompose(user, led);
  const unread = inbox.rows.filter((row) => row.unread || row.unreadReplies > 0).length;
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Messages"
        description={
          canSend
            ? "What has been sent to you. Replies are private between you and the sender."
            : "Announcements and messages from the church and your group leaders. Reply privately to whoever sent one."
        }
        actions={canSend && <ComposeLink />}
      />

      <MailboxTabs active="inbox" canSend={canSend} />

      <Panel
        title={`${inbox.total} ${inbox.total === 1 ? "message" : "messages"}`}
        action={
          unread > 0 && (
            <form action={markAllMessagesRead}>
              <button
                type="submit"
                className="text-primary inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <CheckCheckIcon className="size-3.5" aria-hidden />
                Mark all read
              </button>
            </form>
          )
        }
        bodyClassName="p-0"
      >
        {inbox.rows.length === 0 ? (
          <EmptyState icon={<InboxIcon className="size-5" aria-hidden />} title="Your inbox is empty">
            Messages from the church and your group leaders will appear here.
          </EmptyState>
        ) : (
          <>
            <ul className="divide-border divide-y">
              {inbox.rows.map((row) => {
                const fresh = row.unread || row.unreadReplies > 0;
                return (
                  <li key={row.id}>
                    <Link
                      href={`/messages/${row.id}`}
                      className={cn(
                        "hover:bg-muted/60 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
                        fresh && "bg-secondary/40",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("mt-1.5 size-2 rounded-full", fresh ? "bg-primary" : "bg-transparent")}
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-foreground text-sm">{row.sender.name}</span>
                          <OfficeBadge role={row.sender.role} />
                          <span className="text-muted-foreground text-xs">· {row.target}</span>
                        </span>
                        <span
                          className={cn(
                            "text-foreground mt-0.5 block truncate text-sm",
                            fresh ? "font-bold" : "font-medium",
                          )}
                        >
                          {fresh && <span className="sr-only">Unread: </span>}
                          {row.subject}
                        </span>
                        {row.unreadReplies > 0 && (
                          <span className="text-primary mt-0.5 block text-xs font-semibold">
                            {row.unreadReplies} new {row.unreadReplies === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </span>
                      <time
                        dateTime={row.sentAt}
                        className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
                      >
                        {relativeTime(row.sentAt, now)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-border border-t">
              <Pagination
                page={inbox.page}
                pageCount={inbox.pageCount}
                total={inbox.total}
                pathname="/messages"
                params={{}}
              />
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
