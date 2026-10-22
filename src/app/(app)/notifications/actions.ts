"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession, selfScope } from "@/lib/auth/dal";
import { internalPath } from "@/lib/notification-rows";
import { prisma } from "@/lib/prisma";

/**
 * Reading notifications (docs/SCOPE.md §9.13). Every write is pinned to the
 * caller's own rows by `selfScope`, so an id belonging to somebody else
 * matches nothing and changes nothing.
 *
 * `revalidatePath("/", "layout")` because the bell lives in the shared layout
 * and must drop its count on whichever page the person is on.
 */

/** Mark one read and go where it points — the bell's and the list's click. */
export async function openNotification(id: string) {
  const user = await requireSession();

  const notification = await prisma.notification.findFirst({
    where: { id, ...selfScope(user) },
    select: { linkUrl: true, readAt: true },
  });
  if (!notification) redirect("/notifications");

  if (!notification.readAt) {
    await prisma.notification.updateMany({
      where: { id, ...selfScope(user), readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  }

  redirect(internalPath(notification.linkUrl) ?? "/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireSession();

  await prisma.notification.updateMany({
    where: { ...selfScope(user), readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
}
