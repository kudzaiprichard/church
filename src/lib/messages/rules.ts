import { z } from "zod";

import type { MessageAudience, Role } from "@/generated/prisma/enums";
import { can } from "@/lib/auth/permissions";

/**
 * Who may send what to whom, and who may read which reply (docs/SCOPE.md §9.5).
 *
 * Pure functions over facts the caller has already looked up — the sender's
 * led groups, the recipient's groups, whether a recipient row exists — so the
 * rules are unit tested without a database, and the Server Actions cannot ask
 * a different question than the tests do.
 */

type Person = { id: string; role: Role };

/** What one message target needs to be checked. */
export type Target =
  | { audience: "ALL" }
  | { audience: "GROUP"; groupId: string }
  | { audience: "INDIVIDUAL"; recipientId: string; recipientGroupIds: readonly string[] };

/**
 * May this person send to this target?
 *
 *   ALL         holders of `messages.sendAll` (the Apostles)
 *   GROUP       an Apostle, or the leader of that very group
 *   INDIVIDUAL  an Apostle, or the leader of a group the recipient is in
 *
 * Members lead nothing and hold no permission, so they start nothing; they
 * reply. `ledGroupIds` must be read from the database on this request — never
 * from the form — which is what makes a tampered hidden `groupId` fail.
 */
export function maySendTo(sender: Person, target: Target, ledGroupIds: readonly string[]) {
  if (target.audience === "ALL") return can(sender, "messages.sendAll");

  if (sender.role === "APOSTLE") return true;

  if (target.audience === "GROUP") return ledGroupIds.includes(target.groupId);

  if (target.recipientId === sender.id) return false;
  return target.recipientGroupIds.some((groupId) => ledGroupIds.includes(groupId));
}

/** True when the person may compose at all — the gate on `/messages/new`. */
export function mayCompose(person: Person, ledGroupIds: readonly string[]) {
  return can(person, "messages.sendAll") || ledGroupIds.length > 0;
}

/**
 * The people a target reaches, as a `User` filter, applied at the moment of
 * sending. Only active accounts, and never the sender. Group membership is read
 * now and copied into recipient rows, so somebody who joins the group tomorrow
 * does not receive today's message.
 */
export function recipientFilter(target: Target, senderId: string) {
  const base = { isActive: true, id: { not: senderId } };
  if (target.audience === "ALL") return base;
  if (target.audience === "GROUP") {
    return { ...base, groupMemberships: { some: { groupId: target.groupId } } };
  }
  return { isActive: true, id: { equals: target.recipientId, not: senderId } };
}

/** How the viewer stands to one message. */
export type Standing = {
  isSender: boolean;
  /** A recipient row exists for the viewer — fixed when the message was sent. */
  isRecipient: boolean;
};

/**
 * May the viewer open this message?
 *
 * The sender, its recipients and the Apostles. Being in the group *now* is not
 * enough: what counts is the recipient row written at send time.
 */
export function mayRead(viewer: Person, standing: Standing) {
  return standing.isSender || standing.isRecipient || viewer.role === "APOSTLE";
}

/**
 * Which reply threads the viewer may see, out of those that exist.
 *
 * Each thread is a private conversation between the sender and one recipient.
 * The sender and Apostles see them all; a recipient sees only their own — so
 * two members replying to the same group message never see each other.
 */
export function visibleThreads(
  viewer: Person,
  standing: Standing,
  threadUserIds: readonly string[],
): string[] {
  if (standing.isSender || viewer.role === "APOSTLE") return [...threadUserIds];
  if (standing.isRecipient) return threadUserIds.filter((id) => id === viewer.id);
  return [];
}

/**
 * The thread a reply goes into, or why it may not be written.
 *
 *   a recipient    always their own thread, whatever the form says
 *   the sender     the thread they name, which must belong to a recipient
 *                  who has already replied — the sender answers, they do not
 *                  open private threads with the whole group
 *   anyone else    nothing — an Apostle who did not send it may read, not reply
 */
export function replyThread(
  viewer: Person,
  standing: Standing,
  requested: string | undefined,
  existingThreads: readonly string[],
): { threadUserId: string } | { error: string } {
  if (standing.isRecipient && !standing.isSender) return { threadUserId: viewer.id };

  if (standing.isSender) {
    if (requested && existingThreads.includes(requested)) return { threadUserId: requested };
    return { error: "Choose a reply to answer." };
  }

  return { error: "Only the sender and the people it was sent to can reply." };
}

// ─── Form input ─────────────────────────────────────────────────────────────

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const composeSchema = z
  .object({
    audience: z.enum(["ALL", "GROUP", "INDIVIDUAL"], { error: "Choose who it is for." }),
    groupId: z.preprocess(blankToUndefined, z.string().max(40).optional()),
    recipientId: z.preprocess(blankToUndefined, z.string().max(40).optional()),
    subject: z
      .string()
      .trim()
      .min(1, "Give it a subject.")
      .max(150, "Keep the subject under 150 characters."),
    body: z
      .string()
      .trim()
      .min(1, "Write the message.")
      .max(10_000, "Keep it under 10,000 characters."),
    email: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  })
  .superRefine((value, context) => {
    if (value.audience === "GROUP" && !value.groupId) {
      context.addIssue({ code: "custom", path: ["groupId"], message: "Choose a group." });
    }
    if (value.audience === "INDIVIDUAL" && !value.recipientId) {
      context.addIssue({ code: "custom", path: ["recipientId"], message: "Choose a person." });
    }
  });

export type ComposeInput = z.infer<typeof composeSchema>;

export const replySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a reply.")
    .max(5_000, "Keep the reply under 5,000 characters."),
  threadUserId: z.preprocess(blankToUndefined, z.string().max(40).optional()),
});

/** Labels for the three targets, as the inbox shows them. */
export const AUDIENCE_LABELS: Record<MessageAudience, string> = {
  ALL: "All Church",
  GROUP: "Group",
  INDIVIDUAL: "Personal",
};
