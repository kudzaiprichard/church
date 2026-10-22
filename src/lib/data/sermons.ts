import "server-only";

import { unstable_cache } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { SERIES_SUGGESTIONS } from "@/lib/content/rules";
import { fromDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/**
 * Reads of the sermon archive (docs/SCOPE.md §9.11). Everyone signed in sees
 * published sermons; drafts are visible only to `sermons.manage`, and to
 * nobody on the public site. The public teaser carries no media links.
 */

export const PAGE_SIZE = 24;

/** Expired by every sermon change, so the landing page shows it on the next load. */
export const SERMONS_TAG = "sermons";

export type SermonCard = {
  id: string;
  title: string;
  preacher: string;
  preachedAt: string;
  seriesName: string | null;
  scriptureRef: string | null;
  summary: string;
  audioUrl: string | null;
  videoUrl: string | null;
  notesUrl: string | null;
  tags: string[];
  isPublished: boolean;
};

const cardSelect = {
  id: true,
  title: true,
  preacher: true,
  preachedAt: true,
  seriesName: true,
  scriptureRef: true,
  summary: true,
  audioUrl: true,
  videoUrl: true,
  notesUrl: true,
  tags: true,
  isPublished: true,
} satisfies Prisma.SermonSelect;

function toCard(row: Prisma.SermonGetPayload<{ select: typeof cardSelect }>): SermonCard {
  return { ...row, preachedAt: fromDateOnly(row.preachedAt) };
}

/** Drafts for those who manage sermons; published only for everyone else. */
function visibility(user: SessionUser): Prisma.SermonWhereInput {
  return can(user, "sermons.manage") ? {} : { isPublished: true };
}

export type SermonFilters = {
  q?: string;
  series?: string;
  preacher?: string;
  tag?: string;
  page?: number;
};

/**
 * The archive, newest first. Search is case-insensitive on title, preacher
 * and scripture reference; a tag is matched exactly.
 */
export async function listSermons(user: SessionUser, filters: SermonFilters = {}) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const q = filters.q?.trim();
  const where: Prisma.SermonWhereInput = {
    AND: [
      visibility(user),
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { preacher: { contains: q, mode: "insensitive" } },
              { scriptureRef: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      filters.series ? { seriesName: filters.series } : {},
      filters.preacher ? { preacher: filters.preacher } : {},
      filters.tag ? { tags: { has: filters.tag } } : {},
    ],
  };

  const [rows, total, latest] = await Promise.all([
    prisma.sermon.findMany({
      where,
      orderBy: [{ preachedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
    prisma.sermon.count({ where }),
    prisma.sermon.findFirst({
      where: { isPublished: true },
      orderBy: [{ preachedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    }),
  ]);

  return {
    rows: rows.map(toCard),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    latestId: latest?.id ?? null,
  };
}

/** The filter choices: series (with the suggested ones), preachers and tags in use. */
export async function sermonFacets(user: SessionUser) {
  const rows = await prisma.sermon.findMany({
    where: visibility(user),
    select: { seriesName: true, preacher: true, tags: true },
  });
  const sorted = (values: Iterable<string>) =>
    [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return {
    series: sorted(rows.flatMap((row) => (row.seriesName ? [row.seriesName] : []))),
    seriesSuggestions: sorted([
      ...SERIES_SUGGESTIONS,
      ...rows.flatMap((row) => (row.seriesName ? [row.seriesName] : [])),
    ]),
    preachers: sorted(rows.map((row) => row.preacher)),
    tags: sorted(rows.flatMap((row) => row.tags)),
  };
}

/** One sermon, or `null` when it does not exist or is a draft the caller may not see. */
export async function getSermon(user: SessionUser, id: string): Promise<SermonCard | null> {
  const row = await prisma.sermon.findFirst({
    where: { AND: [visibility(user), { id }] },
    select: cardSelect,
  });
  return row ? toCard(row) : null;
}

export type SermonForEdit = SermonCard & { audioKey: string | null; notesKey: string | null };

export async function getSermonForEdit(
  user: SessionUser,
  id: string,
): Promise<SermonForEdit | null> {
  if (!can(user, "sermons.manage")) return null;
  const row = await prisma.sermon.findUnique({
    where: { id },
    select: { ...cardSelect, audioKey: true, notesKey: true },
  });
  return row ? { ...toCard(row), audioKey: row.audioKey, notesKey: row.notesKey } : null;
}

/** The most recent published sermon, for the dashboard. */
export async function latestSermon(): Promise<SermonCard | null> {
  const row = await prisma.sermon.findFirst({
    where: { isPublished: true },
    orderBy: [{ preachedAt: "desc" }, { createdAt: "desc" }],
    select: cardSelect,
  });
  return row ? toCard(row) : null;
}

export type PublicSermon = {
  title: string;
  preacher: string;
  preachedAt: string;
  scriptureRef: string | null;
  excerpt: string;
};

const readPublic = unstable_cache(
  async (): Promise<PublicSermon[]> => {
    const rows = await prisma.sermon.findMany({
      where: { isPublished: true },
      orderBy: [{ preachedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: { title: true, preacher: true, preachedAt: true, scriptureRef: true, summary: true },
    });
    return rows.map((row) => ({
      title: row.title,
      preacher: row.preacher,
      preachedAt: fromDateOnly(row.preachedAt),
      scriptureRef: row.scriptureRef,
      excerpt: row.summary.length > 220 ? `${row.summary.slice(0, 219)}…` : row.summary,
    }));
  },
  ["public-sermons"],
  { tags: [SERMONS_TAG], revalidate: 3600 },
);

/**
 * The three latest published sermons for the public landing page: words only,
 * no audio, video or handout — those are for members (SCOPE §9.11).
 * Falls back to an empty list when the database cannot be reached, so the
 * public site still renders.
 */
export async function getPublicSermons(): Promise<PublicSermon[]> {
  try {
    return await readPublic();
  } catch (error) {
    console.error("[sermons] Could not read public sermons:", error);
    return [];
  }
}
