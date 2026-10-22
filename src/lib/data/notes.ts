import "server-only";

import { selfScope, type SessionUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

/**
 * Personal sermon notes (docs/SCOPE.md §9.12) — private to their author, from
 * everyone, Apostles included.
 *
 * Every query here starts from `selfScope(user)`, never `ownerScope`: the
 * latter hands an Apostle every row, which is right for giving and wrong here.
 * There is deliberately no function that takes another person's id, and no
 * screen anywhere that lists notes but one's own. `notes.test.ts` calls every
 * export as an Apostle and checks each query is pinned to that Apostle.
 */

export type OwnNote = { body: string; updatedAt: string };

/** The caller's note on one sermon, or `null` when they have not written one. */
export async function getOwnNote(user: SessionUser, sermonId: string): Promise<OwnNote | null> {
  const note = await prisma.sermonNote.findFirst({
    where: { ...selfScope(user), sermonId },
    select: { body: true, updatedAt: true },
  });
  return note ? { body: note.body, updatedAt: note.updatedAt.toISOString() } : null;
}

export type NoteSummary = {
  sermonId: string;
  title: string;
  preacher: string;
  updatedAt: string;
  excerpt: string;
};

/** The caller's notes, most recently edited first — the `/notes` index. */
export async function listOwnNotes(user: SessionUser): Promise<NoteSummary[]> {
  const rows = await prisma.sermonNote.findMany({
    where: selfScope(user),
    orderBy: { updatedAt: "desc" },
    select: {
      body: true,
      updatedAt: true,
      sermon: { select: { id: true, title: true, preacher: true } },
    },
  });
  return rows.map((row) => ({
    sermonId: row.sermon.id,
    title: row.sermon.title,
    preacher: row.sermon.preacher,
    updatedAt: row.updatedAt.toISOString(),
    excerpt: row.body.length > 200 ? `${row.body.slice(0, 199)}…` : row.body,
  }));
}

/** How many notes the caller has written, for the dashboard. */
export async function countOwnNotes(user: SessionUser) {
  return prisma.sermonNote.count({ where: selfScope(user) });
}
