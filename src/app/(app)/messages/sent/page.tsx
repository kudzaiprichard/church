import { SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ledGroupIds, requireSession } from "@/lib/auth/dal";
import { listSent } from "@/lib/data/messages";
import { relativeTime } from "@/lib/dates";
import { mayCompose } from "@/lib/messages/rules";

import { EmptyState, PageHeader, Panel } from "../../_components/page-parts";
import { Pagination } from "../../_components/pagination";
import { ComposeLink, MailboxTabs } from "../mailbox-parts";

export const metadata: Metadata = { title: "Sent" };

/**
 * What the signed-in person has sent, with how many have read each and which
 * have replies waiting (docs/SCOPE.md §9.5). For leaders and Apostles — the
 * people who can send.
 */
export default async function SentPage(props: PageProps<"/messages/sent">) {
  const user = await requireSession();
  if (!mayCompose(user, await ledGroupIds(user))) redirect("/messages");

  const { page } = await props.searchParams;
  const sent = await listSent(user, { page: Number(page) || 1 });
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Messages"
        description="What you have sent. Each reply is a private thread between you and the person who wrote it."
        actions={<ComposeLink />}
      />

      <MailboxTabs active="sent" canSend />

      <Panel title={`${sent.total} sent`} bodyClassName="p-0">
        {sent.rows.length === 0 ? (
          <EmptyState icon={<SendIcon className="size-5" aria-hidden />} title="Nothing sent yet">
            Messages you send to your group or its members will appear here.
          </EmptyState>
        ) : (
          <>
            <ul className="divide-border divide-y">
              {sent.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/messages/${row.id}`}
                    className="hover:bg-muted/60 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span className="min-w-0">
                      <span className="text-foreground block truncate text-sm font-medium">
                        {row.subject}
                      </span>
                      <span className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-xs">
                        <span>To {row.target}</span>
                        <span className="numeric">
                          · {row.readCount} of {row.recipientCount} read
                        </span>
                        {row.unreadReplies > 0 && (
                          <span className="text-primary font-semibold">
                            · {row.unreadReplies} new {row.unreadReplies === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </span>
                    </span>
                    <time
                      dateTime={row.sentAt}
                      className="text-muted-foreground text-xs whitespace-nowrap"
                    >
                      {relativeTime(row.sentAt, now)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-border border-t">
              <Pagination
                page={sent.page}
                pageCount={sent.pageCount}
                total={sent.total}
                pathname="/messages/sent"
                params={{}}
              />
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
