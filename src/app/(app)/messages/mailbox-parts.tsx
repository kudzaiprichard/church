import { PenLineIcon } from "lucide-react";
import Link from "next/link";

import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

/** Inbox · Sent, for the people who can send. */
export function MailboxTabs({ active, canSend }: { active: "inbox" | "sent"; canSend: boolean }) {
  if (!canSend) return null;

  const tabs = [
    { id: "inbox", label: "Inbox", href: "/messages" },
    { id: "sent", label: "Sent", href: "/messages/sent" },
  ] as const;

  return (
    <nav aria-label="Mailbox" className="border-border mb-4 flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
            tab.id === active
              ? "border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function ComposeLink() {
  return (
    <Link
      href="/messages/new"
      className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <PenLineIcon className="size-4" aria-hidden />
      New message
    </Link>
  );
}

/** The sender's office, when they hold one — a message from an Apostle reads differently. */
export function OfficeBadge({ role }: { role: Role }) {
  if (role === "MEMBER") return null;
  return (
    <span className="bg-secondary text-primary rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold">
      {ROLE_LABELS[role]}
    </span>
  );
}
