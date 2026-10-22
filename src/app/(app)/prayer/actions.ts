"use server";

import { revalidatePath } from "next/cache";

import { recordAuditIn } from "@/lib/auth/audit";
import { ledGroupIds, memberGroupIds, requireSession } from "@/lib/auth/dal";
import { fieldErrorsFrom } from "@/lib/forms";
import { notify } from "@/lib/notifications";
import { mayModerate, mayPin, mayPost, prayerSchema } from "@/lib/prayer/rules";
import { prisma } from "@/lib/prisma";

import type { PrayerFormState } from "./form-state";

/**
 * Prayer requests (docs/SCOPE.md §9.8). Each action re-reads the caller's
 * groups and the request's group from the database, so posting into another
 * group, or pinning in one you do not lead, is refused whatever the form says.
 */

function changed(groupId: string) {
  revalidatePath("/prayer");
  revalidatePath(`/groups/${groupId}`);
}

export async function postRequest(
  _previous: PrayerFormState,
  formData: FormData,
): Promise<PrayerFormState> {
  const author = await requireSession();

  const parsed = prayerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
      body: String(formData.get("body") ?? ""),
      attempt: Date.now(),
    };
  }
  const { groupId, body } = parsed.data;

  if (!mayPost(groupId, await memberGroupIds(author))) {
    return { error: "You can only post in the groups you belong to.", body, attempt: Date.now() };
  }

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { name: true, leaderId: true },
  });

  const deliver = await prisma.$transaction(async (tx) => {
    await tx.prayerRequest.create({ data: { authorId: author.id, groupId, body } });

    // The leader is told, not the whole group — every request becoming a
    // notification for every member would bury the ones that matter.
    if (!group.leaderId || group.leaderId === author.id) return async () => {};
    return notify(tx, {
      userIds: [group.leaderId],
      type: "PRAYER_REQUEST",
      title: `New prayer request in ${group.name}`,
      body: `From ${author.firstName} ${author.lastName}`,
      linkUrl: `/prayer?group=${groupId}`,
    });
  });
  await deliver();

  changed(groupId);
  return { done: true, attempt: Date.now() };
}

async function load(id: string) {
  return prisma.prayerRequest.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      groupId: true,
      isPinned: true,
      isAnswered: true,
      group: { select: { name: true } },
      author: { select: { id: true, email: true } },
    },
  });
}

export async function togglePin(id: string) {
  const user = await requireSession();
  const request = await load(id);
  if (!request || !mayPin(user, request.groupId, await ledGroupIds(user))) return;

  const pinning = !request.isPinned;
  const deliver = await prisma.$transaction(async (tx) => {
    await tx.prayerRequest.update({ where: { id }, data: { isPinned: pinning } });
    if (!pinning) return async () => {};

    const members = await tx.groupMembership.findMany({
      where: { groupId: request.groupId, userId: { not: user.id }, user: { isActive: true } },
      select: { userId: true },
    });
    return notify(tx, {
      userIds: members.map((member) => member.userId),
      type: "GROUP_ACTIVITY",
      title: `A prayer request was pinned in ${request.group.name}`,
      linkUrl: `/prayer?group=${request.groupId}`,
    });
  });
  await deliver();

  changed(request.groupId);
}

export async function markAnswered(id: string) {
  const user = await requireSession();
  const request = await load(id);
  if (!request || !mayModerate(user, request, await ledGroupIds(user))) return;

  await prisma.prayerRequest.update({
    where: { id },
    data: { isAnswered: !request.isAnswered },
  });

  changed(request.groupId);
}

/** Remove a request. Recorded in the audit log when it is not the author's own. */
export async function removeRequest(id: string) {
  const user = await requireSession();
  const request = await load(id);
  if (!request || !mayModerate(user, request, await ledGroupIds(user))) return;

  await prisma.$transaction(async (tx) => {
    await tx.prayerRequest.delete({ where: { id } });
    if (request.authorId !== user.id) {
      await recordAuditIn(tx, {
        action: "PRAYER_REQUEST_REMOVED",
        actor: user,
        target: request.author,
        detail: `from ${request.group.name}`,
      });
    }
  });

  changed(request.groupId);
}
