import { ArrowLeftIcon, MessagesSquareIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { getMessage, type ThreadView } from "@/lib/data/messages";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { EmptyState, Panel } from "../../_components/page-parts";
import { OfficeBadge } from "../mailbox-parts";

import { MarkRead, ReplyForm } from "./thread-parts";

export const metadata: Metadata = { title: "Message" };

const stamp = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Harare",
});

/**
 * One message and the reply threads the viewer may see (docs/SCOPE.md §9.5).
 *
 * `getMessage` answers `null` to anyone who is not its sender, a recipient or
 * an Apostle — including somebody who joined the group after it was sent — so
 * they get a 404. Inside, a recipient sees only their own thread; the sender
 * sees one per person who replied.
 */
export default async function MessagePage(props: PageProps<"/messages/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;

  const message = await getMessage(user, id);
  if (!message) notFound();

  const { isSender, isRecipient } = message.standing;
  const now = new Date();
  const ownThread = message.threads.find((thread) => thread.with.id === user.id);

  return (
    <>
      {(isSender || isRecipient) && <MarkRead messageId={message.id} />}

      <Link
        href={isSender && !isRecipient ? "/messages/sent" : "/messages"}
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        {isSender && !isRecipient ? "Sent" : "Inbox"}
      </Link>

      <article className="bg-card border-border max-w-3xl overflow-hidden rounded-lg border">
        <header className="border-border border-b px-5 py-4">
          <p className="text-accent-foreground inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
            <span aria-hidden className="bg-brass size-1.5 rounded-full" />
            {message.target}
          </p>
          <h1 className="text-navy mt-2 text-xl leading-tight font-bold text-balance sm:text-2xl">
            {message.subject}
          </h1>
          <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-foreground font-medium">
              {isSender ? "You" : message.sender.name}
            </span>
            <OfficeBadge role={message.sender.role} />
            <span>·</span>
            <time dateTime={message.sentAt}>{stamp.format(new Date(message.sentAt))}</time>
            {message.reach && (
              <>
                <span>·</span>
                <span className="numeric">
                  {message.reach.read} of {message.reach.recipients} read
                </span>
              </>
            )}
          </p>
        </header>
        <div className="text-foreground px-5 py-5 text-sm leading-relaxed break-words whitespace-pre-line">
          {message.body}
        </div>
      </article>

      <section aria-labelledby="replies" className="mt-6 max-w-3xl">
        <h2 id="replies" className="text-foreground mb-3 text-sm font-bold">
          {isSender ? "Replies" : isRecipient ? "Your conversation" : "Replies"}
        </h2>

        {isRecipient && !isSender && (
          <Panel bodyClassName="p-0">
            {ownThread && <Thread thread={ownThread} now={now} />}
            <div className={cn("p-5", ownThread && "border-border border-t")}>
              <ReplyForm messageId={message.id} to={message.sender.name} />
            </div>
          </Panel>
        )}

        {(isSender || !isRecipient) &&
          (message.threads.length === 0 ? (
            <div className="bg-card border-border rounded-lg border">
              <EmptyState
                icon={<MessagesSquareIcon className="size-5" aria-hidden />}
                title="No replies yet"
              >
                {isSender
                  ? "Each person who replies gets their own private thread with you here."
                  : "Nobody has replied."}
              </EmptyState>
            </div>
          ) : (
            <div className="grid gap-4">
              {message.threads.map((thread) => (
                <Panel
                  key={thread.with.id}
                  title={`With ${thread.with.name}`}
                  bodyClassName="p-0"
                >
                  <Thread thread={thread} now={now} />
                  {thread.canReply && (
                    <div className="border-border border-t p-5">
                      <ReplyForm
                        messageId={message.id}
                        threadUserId={thread.with.id}
                        to={thread.with.name}
                      />
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ))}
      </section>
    </>
  );
}

function Thread({ thread, now }: { thread: ThreadView; now: Date }) {
  return (
    <ol className="grid gap-3 p-5">
      {thread.replies.map((entry) => (
        <li
          key={entry.id}
          className={cn(
            "max-w-[85%] rounded-lg px-4 py-3",
            entry.mine ? "bg-secondary/70 justify-self-end" : "bg-muted justify-self-start",
          )}
        >
          <p className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="text-foreground font-semibold">
              {entry.mine ? "You" : entry.author.name}
            </span>
            <time dateTime={entry.createdAt}>{relativeTime(entry.createdAt, now)}</time>
          </p>
          <p className="text-foreground mt-1 text-sm leading-relaxed break-words whitespace-pre-line">
            {entry.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
