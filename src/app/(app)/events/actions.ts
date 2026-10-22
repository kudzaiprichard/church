"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { allMarkable, entriesFrom, markableFilter } from "@/lib/attendance/rules";
import { recordAuditIn } from "@/lib/auth/audit";
import { ledGroupIds, requirePermission, requireSession } from "@/lib/auth/dal";
import {
  attendanceOpen,
  duplicateSchema,
  eventSchema,
  eventTimes,
  harareInstant,
  harareParts,
} from "@/lib/events/rules";
import { fieldErrorsFrom } from "@/lib/forms";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

import type { EventFormState } from "./form-state";

/**
 * The church calendar and its attendance (docs/SCOPE.md §9.6–9.7).
 *
 * Creating, editing, deleting and duplicating are the Apostles' — every one of
 * those starts with `requirePermission("events.manage")` (SCOPE §11 Q9: leaders
 * do not create events). Marking attendance is decided per event by
 * `markableFilter`, from leadership read on this request.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): EventFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

const when = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Harare",
});

/** Everyone an event is for, apart from whoever is acting: its group's members, or the church. */
async function audience(
  tx: Prisma.TransactionClient,
  groupId: string | null,
  actorId: string,
): Promise<string[]> {
  const rows = await tx.user.findMany({
    where: {
      isActive: true,
      id: { not: actorId },
      ...(groupId ? { groupMemberships: { some: { groupId } } } : {}),
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function groupExists(groupId: string | null) {
  if (!groupId) return true;
  return (await prisma.group.count({ where: { id: groupId } })) === 1;
}

function changed() {
  revalidatePath("/events", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/groups", "layout");
}

export async function createEvent(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requirePermission("events.manage");

  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;
  const times = eventTimes(input);
  if (!(await groupExists(times.groupId))) {
    return failed(formData, { target: "Choose a group from the list." });
  }

  const { id, deliver } = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        ...times,
        createdById: actor.id,
      },
      select: { id: true },
    });
    const deliver = await notify(tx, {
      userIds: await audience(tx, times.groupId, actor.id),
      type: "EVENT",
      title: `New event: ${input.title}`,
      body: [when.format(times.startsAt), input.location].filter(Boolean).join(" · "),
      linkUrl: `/events/${event.id}`,
    });
    return { id: event.id, deliver };
  });
  await deliver();

  changed();
  redirect(`/events/${id}`);
}

export async function updateEvent(
  eventId: string,
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requirePermission("events.manage");

  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;
  const times = eventTimes(input);
  if (!(await groupExists(times.groupId))) {
    return failed(formData, { target: "Choose a group from the list." });
  }

  const before = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startsAt: true, endsAt: true, location: true, groupId: true },
  });
  if (!before) return { error: "That event no longer exists." };

  // Moving an event, or sending it to different people, is news to them;
  // fixing a typo in the description is not.
  const moved =
    before.startsAt.getTime() !== times.startsAt.getTime() ||
    (before.endsAt?.getTime() ?? null) !== (times.endsAt?.getTime() ?? null) ||
    (before.location ?? null) !== (input.location ?? null) ||
    before.groupId !== times.groupId;

  const deliver = await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        ...times,
        // A new time needs a new reminder.
        ...(moved ? { reminderSentAt: null } : {}),
      },
    });
    if (!moved) return async () => {};
    return notify(tx, {
      userIds: await audience(tx, times.groupId, actor.id),
      type: "EVENT",
      title: `Event changed: ${input.title}`,
      body: [when.format(times.startsAt), input.location].filter(Boolean).join(" · "),
      linkUrl: `/events/${eventId}`,
    });
  });
  await deliver();

  changed();
  redirect(`/events/${eventId}`);
}

/**
 * Delete an event. When attendance has been taken the first submission only
 * asks again: those records go with the event, and the rates they fed change.
 */
export async function deleteEvent(
  eventId: string,
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requirePermission("events.manage");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, startsAt: true, _count: { select: { attendance: true } } },
  });
  if (!event) redirect("/events");

  if (event._count.attendance > 0 && formData.get("confirm") !== "yes") {
    return {
      needsConfirm: true,
      error: `Attendance has been taken for ${event._count.attendance} ${
        event._count.attendance === 1 ? "person" : "people"
      }. Deleting the event deletes those records too.`,
      attempt: Date.now(),
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.event.delete({ where: { id: eventId } });
    await recordAuditIn(tx, {
      action: "EVENT_DELETED",
      actor,
      detail: `${event.title} (${harareParts(event.startsAt).date})${
        event._count.attendance > 0 ? `, with ${event._count.attendance} attendance records` : ""
      }`,
    });
  });

  changed();
  redirect("/events");
}

/** Copy an event to another day, at the same Harare times. */
export async function duplicateEvent(
  eventId: string,
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requirePermission("events.manage");

  const parsed = duplicateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));

  const source = await prisma.event.findUnique({ where: { id: eventId } });
  if (!source) return { error: "That event no longer exists." };

  const startsAt = harareInstant(parsed.data.date, harareParts(source.startsAt).time);
  const endsAt = source.endsAt
    ? harareInstant(parsed.data.date, harareParts(source.endsAt).time)
    : null;

  const { id, deliver } = await prisma.$transaction(async (tx) => {
    const copy = await tx.event.create({
      data: {
        title: source.title,
        description: source.description,
        location: source.location,
        groupId: source.groupId,
        startsAt,
        endsAt,
        createdById: actor.id,
      },
      select: { id: true },
    });
    const deliver = await notify(tx, {
      userIds: await audience(tx, source.groupId, actor.id),
      type: "EVENT",
      title: `New event: ${source.title}`,
      body: [when.format(startsAt), source.location].filter(Boolean).join(" · "),
      linkUrl: `/events/${copy.id}`,
    });
    return { id: copy.id, deliver };
  });
  await deliver();

  changed();
  redirect(`/events/${id}`);
}

/**
 * Save an attendance sheet (SCOPE §9.7).
 *
 * All or nothing: every person on the sheet must be somebody this marker may
 * mark at this event. One id from outside — a tampered payload — and nothing
 * at all is written.
 */
export async function markAttendance(
  eventId: string,
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const marker = await requireSession();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, groupId: true, startsAt: true },
  });
  if (!event) return { error: "That event no longer exists." };

  const filter = markableFilter(event, marker, await ledGroupIds(marker));
  if (!filter) return { error: "You cannot take attendance for this event." };
  if (!attendanceOpen(event.startsAt)) {
    return { error: "Attendance opens 24 hours before the event starts." };
  }

  const entries = entriesFrom(formData.entries());
  if (entries.length === 0) return { error: "Mark at least one person present or absent." };

  const markable = await prisma.user.findMany({
    where: { AND: [filter, { id: { in: entries.map((entry) => entry.userId) } }] },
    select: { id: true },
  });
  if (!allMarkable(entries, new Set(markable.map((user) => user.id)))) {
    return { error: "The sheet included someone you cannot mark. Nothing was saved." };
  }

  const now = new Date();
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.attendanceRecord.upsert({
        where: { userId_eventId: { userId: entry.userId, eventId } },
        create: { userId: entry.userId, eventId, status: entry.status, markedById: marker.id },
        update: { status: entry.status, markedById: marker.id, markedAt: now },
      }),
    ),
  );

  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/attendance");
  revalidatePath("/members", "layout");
  return {
    done: `Saved ${entries.length} ${entries.length === 1 ? "person" : "people"}.`,
    attempt: Date.now(),
  };
}
