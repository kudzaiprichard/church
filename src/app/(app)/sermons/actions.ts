"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditIn } from "@/lib/auth/audit";
import { requirePermission, requireSession, selfScope } from "@/lib/auth/dal";
import { noteSchema, preacherName, sermonSchema } from "@/lib/content/rules";
import { getSermon, SERMONS_TAG } from "@/lib/data/sermons";
import { toDateOnly } from "@/lib/dates";
import { fieldErrorsFrom } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { acceptUpload, remove, type Accepted } from "@/lib/storage";
import { isKeyIn, type Folder } from "@/lib/storage-rules";

import type { SermonFormState } from "./form-state";

/**
 * Sermons and personal notes (docs/SCOPE.md §9.11–9.12).
 *
 * Sermon actions are the Apostles' — `sermons.manage` is checked first in each.
 * Files arrive in storage before the form is posted (see `FileUpload`); the
 * form carries only their keys, and `acceptUpload` checks what is really
 * there before a sermon points at it. Deleting a sermon deletes its files.
 *
 * Notes are everyone's, and only ever their own: every read and write here is
 * pinned to the caller with `selfScope`, and nothing about a note's content is
 * logged.
 */

function textValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function failed(formData: FormData, fieldErrors: Record<string, string>): SermonFormState {
  return { fieldErrors, values: textValues(formData), attempt: Date.now() };
}

function changed(id?: string) {
  updateTag(SERMONS_TAG);
  revalidatePath("/sermons", "layout");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/sermons/${id}`);
}

/**
 * A newly uploaded file named in the form, checked: its key must belong to
 * the folder and what arrived must pass the folder's rules. `null` when the
 * form carries none.
 */
async function newFile(
  formData: FormData,
  field: string,
  folder: Folder,
): Promise<Accepted | null> {
  const key = formData.get(field);
  if (!key) return null;
  if (!isKeyIn(folder, key)) return { error: "That upload is not valid." };
  return acceptUpload(folder, key);
}

export async function createSermon(
  _previous: SermonFormState,
  formData: FormData,
): Promise<SermonFormState> {
  const actor = await requirePermission("sermons.manage");

  const parsed = sermonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  const audio = await newFile(formData, "audioKey", "sermons/audio");
  if (audio && "error" in audio) return failed(formData, { audioKey: audio.error });
  const notes = await newFile(formData, "notesKey", "sermons/notes");
  if (notes && "error" in notes) return failed(formData, { notesKey: notes.error });

  const sermon = await prisma.sermon.create({
    data: {
      title: input.title,
      preacher: preacherName(input),
      preachedAt: toDateOnly(input.preachedAt),
      seriesName: input.seriesName ?? null,
      scriptureRef: input.scriptureRef ?? null,
      summary: input.summary,
      videoUrl: input.videoUrl ?? null,
      tags: input.tags,
      isPublished: input.isPublished,
      audioUrl: audio?.url ?? null,
      audioKey: audio?.key ?? null,
      notesUrl: notes?.url ?? null,
      notesKey: notes?.key ?? null,
      uploadedById: actor.id,
    },
    select: { id: true },
  });

  changed();
  redirect(`/sermons/${sermon.id}`);
}

export async function updateSermon(
  sermonId: string,
  _previous: SermonFormState,
  formData: FormData,
): Promise<SermonFormState> {
  await requirePermission("sermons.manage");

  const parsed = sermonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(formData, fieldErrorsFrom(parsed.error.issues));
  const input = parsed.data;

  const existing = await prisma.sermon.findUnique({
    where: { id: sermonId },
    select: { audioKey: true, notesKey: true },
  });
  if (!existing) return { error: "That sermon no longer exists." };

  const audio = await newFile(formData, "audioKey", "sermons/audio");
  if (audio && "error" in audio) return failed(formData, { audioKey: audio.error });
  const notes = await newFile(formData, "notesKey", "sermons/notes");
  if (notes && "error" in notes) return failed(formData, { notesKey: notes.error });

  // A replaced or removed file goes; an untouched one stays.
  const dropAudio = Boolean(audio) || formData.get("audioKeyRemove") === "1";
  const dropNotes = Boolean(notes) || formData.get("notesKeyRemove") === "1";

  await prisma.sermon.update({
    where: { id: sermonId },
    data: {
      title: input.title,
      preacher: preacherName(input),
      preachedAt: toDateOnly(input.preachedAt),
      seriesName: input.seriesName ?? null,
      scriptureRef: input.scriptureRef ?? null,
      summary: input.summary,
      videoUrl: input.videoUrl ?? null,
      tags: input.tags,
      isPublished: input.isPublished,
      ...(dropAudio ? { audioUrl: audio?.url ?? null, audioKey: audio?.key ?? null } : {}),
      ...(dropNotes ? { notesUrl: notes?.url ?? null, notesKey: notes?.key ?? null } : {}),
    },
  });

  if (dropAudio) await remove(existing.audioKey);
  if (dropNotes) await remove(existing.notesKey);

  changed(sermonId);
  redirect(`/sermons/${sermonId}`);
}

/**
 * Delete a sermon, its members' notes on it, and its files in storage. The
 * audit entry records the sermon, never anything about the notes.
 */
export async function deleteSermon(sermonId: string) {
  const actor = await requirePermission("sermons.manage");

  const sermon = await prisma.sermon.findUnique({
    where: { id: sermonId },
    select: { title: true, preachedAt: true, audioKey: true, notesKey: true },
  });
  if (!sermon) redirect("/sermons");

  await prisma.$transaction(async (tx) => {
    await tx.sermon.delete({ where: { id: sermonId } });
    await recordAuditIn(tx, {
      action: "SERMON_DELETED",
      actor,
      detail: `${sermon.title} (${sermon.preachedAt.toISOString().slice(0, 10)})`,
    });
  });

  // After the commit: a file that cannot be removed must not keep the record.
  await remove(sermon.audioKey);
  await remove(sermon.notesKey);

  changed();
  redirect("/sermons");
}

export type NoteResult = { savedAt?: string; error?: string };

/**
 * Save the caller's own note on a sermon they can see. Upserted on
 * (caller, sermon) — the id written is always the caller's.
 */
export async function saveNote(sermonId: string, body: string): Promise<NoteResult> {
  const user = await requireSession();

  const parsed = noteSchema.safeParse({ body });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await getSermon(user, sermonId))) return { error: "That sermon is not available." };

  const { userId } = selfScope(user);
  const note = parsed.data.body.trim()
    ? await prisma.sermonNote.upsert({
        where: { userId_sermonId: { userId, sermonId } },
        create: { userId, sermonId, body: parsed.data.body },
        update: { body: parsed.data.body },
        select: { updatedAt: true },
      })
    : null;
  // An emptied note is a deleted one.
  if (!note) await prisma.sermonNote.deleteMany({ where: { ...selfScope(user), sermonId } });

  revalidatePath("/notes");
  return { savedAt: (note?.updatedAt ?? new Date()).toISOString() };
}

export async function deleteNote(sermonId: string) {
  const user = await requireSession();
  await prisma.sermonNote.deleteMany({ where: { ...selfScope(user), sermonId } });
  revalidatePath("/notes");
  revalidatePath(`/sermons/${sermonId}`);
}
