import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import { selfScope, type SessionUser } from "@/lib/auth/dal";
import { internalPath } from "@/lib/notification-rows";
import { prisma } from "@/lib/prisma";

/**
 * Reads of a person's notifications — `selfScope` for everyone, Apostles
 * included, since a notification is addressed to one person (SCOPE §9.13).
 *
 * `linkUrl` ends up in an anchor's href, one of the few places a string
 * becomes executable, so it is filtered to a same-site path on the way out as
 * well as on the way in.
 */

export const PAGE_SIZE = 50;

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  createdAt: string;
  read: boolean;
};

const itemSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  linkUrl: true,
  createdAt: true,
  readAt: true,
} as const;

function toItem(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  createdAt: Date;
  readAt: Date | null;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkUrl: internalPath(row.linkUrl),
    createdAt: row.createdAt.toISOString(),
    read: row.readAt !== null,
  };
}

/** The newest few and the unread count, for the bell. */
export async function bellPreview(user: SessionUser) {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: selfScope(user),
      orderBy: { createdAt: "desc" },
      take: 8,
      select: itemSelect,
    }),
    prisma.notification.count({ where: { ...selfScope(user), readAt: null } }),
  ]);
  return { items: rows.map(toItem), unreadCount };
}

/** The full list, optionally of one type, paginated. */
export async function listNotifications(
  user: SessionUser,
  filters: { type?: NotificationType; page?: number } = {},
) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const where = { ...selfScope(user), ...(filters.type ? { type: filters.type } : {}) };

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: itemSelect,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);

  return {
    rows: rows.map(toItem),
    total,
    unread,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
