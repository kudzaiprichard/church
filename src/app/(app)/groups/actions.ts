"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/dal";
import { fieldErrorsFrom } from "@/lib/forms";
import { groupSchema, idListSchema, slugify } from "@/lib/groups/schema";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { GROUPS_TAG } from "@/lib/settings";

import type { GroupFormState } from "./form-state";

/**
 * Administration of the connect groups (docs/SCOPE.md §9.4).
 *
 * Apostles only — `groups.manage` is the first line of every action, because
 * each is a POST endpoint anybody with a session can call. Leaders run their
 * group; they do not change who is in it.
 *
 * Group names and leaders are on the public website, so every change expires
 * the `groups` cache along with the portal's pages.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): GroupFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

function changed(groupId?: string) {
  updateTag(GROUPS_TAG);
  revalidatePath("/groups", "layout");
  revalidatePath("/members", "layout");
  if (groupId) revalidatePath(`/groups/${groupId}`);
}

const NAME_TAKEN = "A group with that name already exists.";

export async function createGroup(
  _previous: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const actor = await requirePermission("groups.manage");

  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: input.name,
          slug: slugify(input.name),
          audience: input.audience ?? null,
          description: input.description ?? null,
        },
        select: { id: true },
      });
      await recordAuditIn(tx, { action: "GROUP_CREATED", actor, detail: input.name });
      return group.id;
    });
  } catch (error) {
    // The unique indexes on name and slug settle a duplicate, raced or not.
    if ((error as { code?: string }).code === "P2002") return failed(formData, { name: NAME_TAKEN });
    throw error;
  }

  changed();
  redirect(`/groups/${id}`);
}

export async function updateGroup(
  groupId: string,
  _previous: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const actor = await requirePermission("groups.manage");

  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  const existing = await prisma.group.findUnique({ where: { id: groupId } });
  if (!existing) return { error: "That group no longer exists." };

  const data = {
    name: input.name,
    slug: slugify(input.name),
    audience: input.audience ?? null,
    description: input.description ?? null,
  };
  const fields = (["name", "audience", "description"] as const).filter(
    (key) => existing[key] !== data[key],
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.group.update({ where: { id: groupId }, data });
      await recordAuditIn(tx, {
        action: "GROUP_UPDATED",
        actor,
        detail: `${input.name}: ${fields.length > 0 ? `changed ${fields.join(", ")}` : "no changes"}`,
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return failed(formData, { name: NAME_TAKEN });
    throw error;
  }

  changed(groupId);
  return { done: "Saved.", attempt: Date.now() };
}

/**
 * Delete a group — only an empty one.
 *
 * Refused while it has members or events: removing a group should be a
 * deliberate last step after its people have been moved, not a way to lose
 * track of them. Messages sent to it are kept, addressed to no group.
 */
export async function deleteGroup(groupId: string): Promise<GroupFormState> {
  const actor = await requirePermission("groups.manage");

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, _count: { select: { members: true, events: true } } },
  });
  if (!group) redirect("/groups");

  if (group._count.members > 0) {
    return { error: "Remove its members first — a group with people in it cannot be deleted." };
  }
  if (group._count.events > 0) {
    return { error: "It still has events. Move or delete them first." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.group.delete({ where: { id: groupId } });
    await recordAuditIn(tx, { action: "GROUP_DELETED", actor, detail: group.name });
  });

  changed();
  redirect("/groups");
}

/**
 * Appoint a leader, or leave the group Vacant.
 *
 * The new leader becomes a member if they were not one. Nothing about
 * leadership is cached on a session, so both the old and the new leader's
 * powers change on their next request — no sign-out needed (SCOPE §9.4).
 */
export async function setLeader(
  groupId: string,
  _previous: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const actor = await requirePermission("groups.manage");

  const raw = formData.get("leaderId");
  const leaderId = typeof raw === "string" && raw.length > 0 ? raw : null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, leaderId: true, leader: { select: { email: true } } },
  });
  if (!group) return { error: "That group no longer exists." };
  if (group.leaderId === leaderId) return { done: "No change.", attempt: Date.now() };

  const leader = leaderId
    ? await prisma.user.findFirst({
        where: { id: leaderId, isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : null;
  if (leaderId && !leader) return failed(formData, { leaderId: "Choose an active member." });

  const deliver = await prisma.$transaction(async (tx) => {
    await tx.group.update({ where: { id: groupId }, data: { leaderId } });

    if (leader) {
      await tx.groupMembership.upsert({
        where: { userId_groupId: { userId: leader.id, groupId } },
        create: { userId: leader.id, groupId },
        update: {},
      });
    }

    await recordAuditIn(tx, {
      action: "GROUP_LEADER_CHANGED",
      actor,
      target: leader,
      detail: `${group.name}: ${group.leader?.email ?? "Vacant"} → ${leader?.email ?? "Vacant"}`,
    });

    if (!leader) return async () => {};
    return notify(tx, {
      userIds: [leader.id],
      type: "GROUP_ACTIVITY",
      title: `You now lead ${group.name}`,
      body: "You can message the group and see its members' contact details.",
      linkUrl: `/groups/${groupId}`,
    });
  });
  await deliver();

  changed(groupId);
  return {
    done: leader ? `${leader.firstName} ${leader.lastName} now leads ${group.name}.` : "The group is now Vacant.",
    attempt: Date.now(),
  };
}

export async function addMembers(
  groupId: string,
  _previous: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const actor = await requirePermission("groups.manage");

  const parsed = idListSchema.safeParse(formData.getAll("userIds"));
  if (!parsed.success || parsed.data.length === 0) {
    return { fieldErrors: { userIds: "Choose at least one person." }, attempt: Date.now() };
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  if (!group) return { error: "That group no longer exists." };

  // Only real, active people who are not already in it — a tampered form
  // cannot invent an id or re-add somebody to trigger a second notification.
  const people = await prisma.user.findMany({
    where: {
      id: { in: parsed.data },
      isActive: true,
      groupMemberships: { none: { groupId } },
    },
    select: { id: true, email: true },
  });
  if (people.length === 0) return { done: "They are already in the group.", attempt: Date.now() };

  const deliver = await prisma.$transaction(async (tx) => {
    await tx.groupMembership.createMany({
      data: people.map((person) => ({ userId: person.id, groupId })),
      skipDuplicates: true,
    });
    await recordAuditIn(tx, {
      action: "GROUP_UPDATED",
      actor,
      target: people.length === 1 ? people[0] : null,
      detail: `${group.name}: added ${people.length} member${people.length === 1 ? "" : "s"}`,
    });
    return notify(tx, {
      userIds: people.map((person) => person.id),
      type: "GROUP_ACTIVITY",
      title: `You were added to ${group.name}`,
      linkUrl: `/groups/${groupId}`,
    });
  });
  await deliver();

  changed(groupId);
  return {
    done: `Added ${people.length} ${people.length === 1 ? "person" : "people"}.`,
    attempt: Date.now(),
  };
}

/**
 * Take somebody out of a group. Not its leader — appoint someone else (or
 * leave it Vacant) first, so a group is never led by a non-member.
 */
export async function removeMember(groupId: string, userId: string) {
  const actor = await requirePermission("groups.manage");

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: {
      id: true,
      group: { select: { name: true, leaderId: true } },
      user: { select: { id: true, email: true } },
    },
  });
  if (!membership || membership.group.leaderId === userId) return;

  await prisma.$transaction(async (tx) => {
    await tx.groupMembership.delete({ where: { id: membership.id } });
    await recordAuditIn(tx, {
      action: "GROUP_UPDATED",
      actor,
      target: membership.user,
      detail: `${membership.group.name}: removed a member`,
    });
  });

  changed(groupId);
}
