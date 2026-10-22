import "server-only";

import { unstable_cache } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { devotionStatus, paragraphs, publishedBy, type DevotionStatus } from "@/lib/content/rules";
import { fromDateOnly, harareToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/**
 * Reads of the daily devotions (docs/SCOPE.md §9.14).
 *
 * Readers see what is published on or before Harare's today — `publishedBy`
 * is on every reader query, so a devotion scheduled for tomorrow is absent
 * from the feed, its own URL, the dashboard and the public teaser alike.
 * Apostles (`devotions.manage`) also see drafts and scheduled ones.
 */

export const DEVOTIONS_TAG = "devotions";

export type DevotionCard = {
  id: string;
  title: string;
  author: string;
  scriptureRef: string;
  scriptureQuote: string;
  firstParagraph: string;
  publishOn: string | null;
  status: DevotionStatus;
};

const cardSelect = {
  id: true,
  title: true,
  scriptureRef: true,
  scriptureQuote: true,
  body: true,
  publishOn: true,
  author: { select: { firstName: true, lastName: true } },
} satisfies Prisma.DevotionSelect;

function toCard(
  row: Prisma.DevotionGetPayload<{ select: typeof cardSelect }>,
  today: string,
): DevotionCard {
  const publishOn = row.publishOn ? fromDateOnly(row.publishOn) : null;
  return {
    id: row.id,
    title: row.title,
    author: `${row.author.firstName} ${row.author.lastName}`,
    scriptureRef: row.scriptureRef,
    scriptureQuote: row.scriptureQuote,
    firstParagraph: paragraphs(row.body)[0] ?? "",
    publishOn,
    status: devotionStatus(publishOn, today),
  };
}

export type DevotionTab = "published" | "scheduled" | "drafts";

/**
 * The feed. Readers always get published; an Apostle may ask for the
 * scheduled or draft tab instead. Searchable on title and scripture.
 */
export async function listDevotions(
  user: SessionUser,
  filters: { q?: string; tab?: DevotionTab } = {},
) {
  const today = harareToday();
  const manages = can(user, "devotions.manage");
  const tab = manages ? (filters.tab ?? "published") : "published";
  const q = filters.q?.trim();

  const where: Prisma.DevotionWhereInput = {
    AND: [
      tab === "published"
        ? publishedBy(today)
        : tab === "scheduled"
          ? { publishOn: { gt: new Date(`${today}T00:00:00.000Z`) } }
          : { publishOn: null },
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { scriptureRef: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const rows = await prisma.devotion.findMany({
    where,
    orderBy:
      tab === "scheduled" ? { publishOn: "asc" } : [{ publishOn: "desc" }, { createdAt: "desc" }],
    take: 60,
    select: cardSelect,
  });
  return { tab, manages, today, rows: rows.map((row) => toCard(row, today)) };
}

export type DevotionDetail = DevotionCard & {
  paragraphs: string[];
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
};

/** One devotion — `null` for a reader when it is a draft or not yet due. */
export async function getDevotion(user: SessionUser, id: string): Promise<DevotionDetail | null> {
  const today = harareToday();
  const manages = can(user, "devotions.manage");
  const row = await prisma.devotion.findFirst({
    where: { AND: [manages ? {} : publishedBy(today), { id }] },
    select: cardSelect,
  });
  if (!row) return null;

  const card = toCard(row, today);
  const [previous, next] =
    card.status === "PUBLISHED"
      ? await Promise.all([
          prisma.devotion.findFirst({
            where: { AND: [publishedBy(today), { publishOn: { lt: row.publishOn! } }] },
            orderBy: { publishOn: "desc" },
            select: { id: true, title: true },
          }),
          prisma.devotion.findFirst({
            where: { AND: [publishedBy(today), { publishOn: { gt: row.publishOn! } }] },
            orderBy: { publishOn: "asc" },
            select: { id: true, title: true },
          }),
        ])
      : [null, null];

  return { ...card, paragraphs: paragraphs(row.body), previous, next };
}

export type DevotionForEdit = {
  id: string;
  title: string;
  authorId: string;
  scriptureRef: string;
  scriptureQuote: string;
  body: string;
  publishOn: string | null;
};

export async function getDevotionForEdit(
  user: SessionUser,
  id: string,
): Promise<DevotionForEdit | null> {
  if (!can(user, "devotions.manage")) return null;
  const row = await prisma.devotion.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    authorId: row.authorId,
    scriptureRef: row.scriptureRef,
    scriptureQuote: row.scriptureQuote,
    body: row.body,
    publishOn: row.publishOn ? fromDateOnly(row.publishOn) : null,
  };
}

/** The Apostles, as the author choices. */
export async function authorOptions() {
  const rows = await prisma.user.findMany({
    where: { role: "APOSTLE", isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });
  return rows.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}` }));
}

/** Today's devotion — the latest published — for the dashboard. */
export async function todaysDevotion(): Promise<DevotionCard | null> {
  const today = harareToday();
  const row = await prisma.devotion.findFirst({
    where: publishedBy(today),
    orderBy: [{ publishOn: "desc" }, { createdAt: "desc" }],
    select: cardSelect,
  });
  return row ? toCard(row, today) : null;
}

export type PublicDevotion = {
  title: string;
  scriptureRef: string;
  scriptureQuote: string;
  firstParagraph: string;
  publishOn: string;
};

/**
 * Cached per Harare day: the day is part of the cache key, so tomorrow's
 * devotion cannot be served from today's entry, and today's entry is never
 * served tomorrow.
 */
const readPublic = unstable_cache(
  async (today: string): Promise<PublicDevotion | null> => {
    const row = await prisma.devotion.findFirst({
      where: publishedBy(today),
      orderBy: [{ publishOn: "desc" }, { createdAt: "desc" }],
      select: {
        title: true,
        scriptureRef: true,
        scriptureQuote: true,
        body: true,
        publishOn: true,
      },
    });
    if (!row) return null;
    return {
      title: row.title,
      scriptureRef: row.scriptureRef,
      scriptureQuote: row.scriptureQuote,
      firstParagraph: paragraphs(row.body)[0] ?? "",
      publishOn: fromDateOnly(row.publishOn!),
    };
  },
  ["public-devotion"],
  { tags: [DEVOTIONS_TAG], revalidate: 3600 },
);

/** The public teaser: today's devotion's title, scripture and opening only. */
export async function getPublicDevotion(): Promise<PublicDevotion | null> {
  try {
    return await readPublic(harareToday());
  } catch (error) {
    console.error("[devotions] Could not read the public devotion:", error);
    return null;
  }
}
