import type { NotificationType } from "@/generated/prisma/enums";

/**
 * The pure half of the notifications pipeline: turning one "tell these people"
 * into the rows that get written. Kept apart from `notifications.ts`, which
 * touches the database and the mailer, so the rules are unit tested.
 */

export type NotifyInput = {
  /** Already-resolved recipients. Duplicates are collapsed. */
  userIds: readonly string[];
  type: NotificationType;
  title: string;
  body?: string;
  /** An internal path only, such as "/messages/abc". Anything else is dropped. */
  linkUrl?: string;
  /**
   * For senders that may run twice — a scheduled reminder retried after a
   * timeout. Each recipient's row is keyed `<dedupeKey>:<userId>`, and the
   * unique index makes a second run write nothing for anyone already told.
   */
  dedupeKey?: string;
  /** Also email each recipient after the transaction commits. Best effort. */
  email?: boolean;
};

/**
 * Reduce a URL to a same-site path, or nothing.
 *
 * A single leading slash only: no scheme, and none of the protocol-relative
 * disguises (`//host`, `/\host`, `javascript:`), since a browser will happily
 * follow all of them out of the application. Applied when a notification is
 * written and again when one is drawn, because the column predates this rule.
 */
export function internalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("://")) return null;
  return value;
}

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** One row per distinct recipient, ready for `createMany`. */
export function notificationRows(input: NotifyInput) {
  const linkUrl = internalPath(input.linkUrl);
  const body = input.body?.trim() ? clip(input.body.trim(), 280) : null;

  return [...new Set(input.userIds)].map((userId) => ({
    userId,
    type: input.type,
    title: clip(input.title, 160),
    body,
    linkUrl,
    dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${userId}` : null,
  }));
}
