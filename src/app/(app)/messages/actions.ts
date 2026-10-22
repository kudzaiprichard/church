"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ledGroupIds, requireSession, selfScope } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { fieldErrorsFrom } from "@/lib/forms";
import {
  AUDIENCE_LABELS,
  composeSchema,
  mayRead,
  maySendTo,
  recipientFilter,
  replySchema,
  replyThread,
  type Target,
} from "@/lib/messages/rules";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

import type { MessageFormState } from "./form-state";

/**
 * Sending, replying and reading (docs/SCOPE.md §9.5).
 *
 * Every action starts from `requireSession()` and decides access from facts
 * read on this request — the sender's led groups from `Group.leaderId`, the
 * caller's recipient row — never from anything the form says about them. A
 * leader who edits the hidden group id to another group's gets refused by
 * `maySendTo`, and a member who posts another member's id as `threadUserId`
 * still writes into their own thread.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): MessageFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

const NOT_ALLOWED = "You can only send to the groups you lead and their members.";

export async function sendMessage(
  _previous: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const sender = await requireSession();

  const parsed = composeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  let target: Target;
  let targetName: string;
  if (input.audience === "GROUP") {
    const group = await prisma.group.findUnique({
      where: { id: input.groupId! },
      select: { id: true, name: true },
    });
    if (!group) return failed(formData, { groupId: "Choose a group from the list." });
    target = { audience: "GROUP", groupId: group.id };
    targetName = group.name;
  } else if (input.audience === "INDIVIDUAL") {
    const recipient = await prisma.user.findFirst({
      where: { id: input.recipientId!, isActive: true },
      select: { id: true, groupMemberships: { select: { groupId: true } } },
    });
    if (!recipient) return failed(formData, { recipientId: "Choose a person from the list." });
    target = {
      audience: "INDIVIDUAL",
      recipientId: recipient.id,
      recipientGroupIds: recipient.groupMemberships.map((membership) => membership.groupId),
    };
    targetName = AUDIENCE_LABELS.INDIVIDUAL;
  } else {
    target = { audience: "ALL" };
    targetName = AUDIENCE_LABELS.ALL;
  }

  if (!maySendTo(sender, target, await ledGroupIds(sender))) {
    return { ...failed(formData, {}), error: NOT_ALLOWED };
  }

  // Email is an Apostle's option; a ticked box from anyone else is ignored.
  const email = input.email && can(sender, "messages.sendAll");
  const senderName = `${sender.firstName} ${sender.lastName}`;

  const result = await prisma.$transaction(async (tx) => {
    // Resolved now and copied into rows, so the audience is fixed at send time.
    const recipients = await tx.user.findMany({
      where: recipientFilter(target, sender.id),
      select: { id: true },
    });
    if (recipients.length === 0) return null;

    const message = await tx.message.create({
      data: {
        senderId: sender.id,
        subject: input.subject,
        body: input.body,
        audience: target.audience,
        groupId: target.audience === "GROUP" ? target.groupId : null,
      },
      select: { id: true },
    });
    await tx.messageRecipient.createMany({
      data: recipients.map((recipient) => ({ messageId: message.id, userId: recipient.id })),
    });

    const deliver = await notify(tx, {
      userIds: recipients.map((recipient) => recipient.id),
      type: "MESSAGE",
      title: input.subject,
      body: `From ${senderName} · ${targetName}`,
      linkUrl: `/messages/${message.id}`,
      email,
    });
    return { id: message.id, deliver };
  });

  if (!result) {
    return {
      ...failed(formData, {}),
      error: "Nobody would receive this — the group has no other active members.",
    };
  }
  await result.deliver();

  revalidatePath("/messages", "layout");
  redirect(`/messages/${result.id}`);
}

/**
 * Add to a private thread.
 *
 * Which thread is decided by `replyThread`: a recipient's reply is always in
 * their own, and the sender may answer only a recipient who has replied. The
 * other party is notified.
 */
export async function reply(
  messageId: string,
  _previous: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const author = await requireSession();

  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      subject: true,
      senderId: true,
      recipients: { where: selfScope(author), select: { id: true } },
    },
  });
  if (!message) return { error: "That message no longer exists." };

  const standing = {
    isSender: message.senderId === author.id,
    isRecipient: message.recipients.length > 0,
  };
  if (!mayRead(author, standing)) return { error: "That message no longer exists." };

  const threads = await prisma.messageReply.findMany({
    where: { messageId },
    distinct: ["threadUserId"],
    select: { threadUserId: true },
  });
  const decision = replyThread(
    author,
    standing,
    parsed.data.threadUserId,
    threads.map((thread) => thread.threadUserId),
  );
  if ("error" in decision) return { ...failed(formData, {}), error: decision.error };

  const { threadUserId } = decision;
  // The other party: the sender when a recipient writes, the recipient when
  // the sender does.
  const otherParty = author.id === threadUserId ? message.senderId : threadUserId;

  const deliver = await prisma.$transaction(async (tx) => {
    await tx.messageReply.create({
      data: { messageId, threadUserId, authorId: author.id, body: parsed.data.body },
    });
    return notify(tx, {
      userIds: [otherParty],
      type: "MESSAGE_REPLY",
      title: `${author.firstName} ${author.lastName} replied: ${message.subject}`,
      body: parsed.data.body,
      linkUrl: `/messages/${messageId}`,
    });
  });
  await deliver();

  revalidatePath("/messages", "layout");
  return { done: true, attempt: Date.now() };
}

/**
 * Mark one message read for the viewer: their recipient row, replies
 * addressed to them in it, and the notifications pointing at it — so opening
 * a message clears it from the bell as well as the inbox.
 */
export async function markMessageRead(messageId: string) {
  const user = await requireSession();
  const now = new Date();

  const [recipient, replies, notifications] = await prisma.$transaction([
    prisma.messageRecipient.updateMany({
      where: { messageId, ...selfScope(user), readAt: null },
      data: { readAt: now },
    }),
    prisma.messageReply.updateMany({
      where: {
        messageId,
        readAt: null,
        authorId: { not: user.id },
        OR: [{ threadUserId: user.id }, { message: { senderId: user.id } }],
      },
      data: { readAt: now },
    }),
    prisma.notification.updateMany({
      where: { ...selfScope(user), readAt: null, linkUrl: `/messages/${messageId}` },
      data: { readAt: now },
    }),
  ]);

  if (recipient.count + replies.count + notifications.count > 0) {
    revalidatePath("/messages", "layout");
  }
}

/** Everything in the viewer's inbox and threads, read. */
export async function markAllMessagesRead() {
  const user = await requireSession();
  const now = new Date();

  await prisma.$transaction([
    prisma.messageRecipient.updateMany({
      where: { ...selfScope(user), readAt: null },
      data: { readAt: now },
    }),
    prisma.messageReply.updateMany({
      where: {
        readAt: null,
        authorId: { not: user.id },
        OR: [{ threadUserId: user.id }, { message: { senderId: user.id } }],
      },
      data: { readAt: now },
    }),
    prisma.notification.updateMany({
      where: { ...selfScope(user), readAt: null, type: { in: ["MESSAGE", "MESSAGE_REPLY"] } },
      data: { readAt: now },
    }),
  ]);

  revalidatePath("/messages", "layout");
}
