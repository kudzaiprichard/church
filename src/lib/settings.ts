import "server-only";

import { unstable_cache } from "next/cache";

import type { Role, SocialPlatform } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { churchIdentity } from "@/lib/church";
import { prisma } from "@/lib/prisma";

/**
 * The church's editable content — details, Theme of the Year, social links and
 * the public view of the connect groups — read once and cached.
 *
 * Every getter is cached under the `church-settings` tag (SCOPE §5.5). The
 * settings actions call `updateTag("church-settings")`, which expires it
 * immediately, so the public site and the portal show a change on the very
 * next page load — that is how "updates live" is implemented without reading
 * the database on every visit to the home page.
 *
 * `unstable_cache` rather than `"use cache"`: the latter needs Cache
 * Components switched on for the whole app, which changes how every dynamic
 * page renders and is a migration of its own, not a side effect of Settings.
 *
 * Results are plain JSON (the cache serialises them), so dates are strings.
 *
 * A database outage must not take the public website down with it, so each
 * getter falls back to an empty-but-valid answer and logs. The fallback is
 * never cached — the next request tries again.
 */

export const SETTINGS_TAG = "church-settings";

/** Group names, audiences and leaders change in Phase 1 too, under their own tag. */
export const GROUPS_TAG = "groups";

const cacheOptions = { tags: [SETTINGS_TAG], revalidate: 3600 };

/** "Apostle Edna Makamba" — the office before the name, except for Members. */
function displayName(user: { firstName: string; lastName: string; role: Role } | null) {
  if (!user) return null;
  const name = `${user.firstName} ${user.lastName}`;
  return user.role === "MEMBER" ? name : `${ROLE_LABELS[user.role]} ${name}`;
}

const updaterSelect = { select: { firstName: true, lastName: true, role: true } } as const;

async function orFallback<T>(read: () => Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[settings] Could not read ${what}; showing defaults:`, error);
    return fallback;
  }
}

// ─── Church information ─────────────────────────────────────────────────────

export type ChurchInfo = {
  name: string;
  shortName: string;
  tagline: string | null;
  mission: string | null;
  vision: string | null;
  doctrine: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** Opens the address in whichever map app the visitor uses. */
  mapUrl: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

const emptyChurch: ChurchInfo = {
  ...churchIdentity,
  tagline: null,
  mission: null,
  vision: null,
  doctrine: null,
  address: null,
  phone: null,
  email: null,
  mapUrl: null,
  updatedAt: null,
  updatedBy: null,
};

const readChurch = unstable_cache(
  async (): Promise<ChurchInfo> => {
    const row = await prisma.churchSettings.findUnique({
      where: { id: "church" },
      include: { updatedBy: updaterSelect },
    });
    if (!row) return emptyChurch;

    return {
      name: row.name,
      shortName: row.shortName,
      tagline: row.tagline,
      mission: row.mission,
      vision: row.vision,
      doctrine: row.doctrine,
      address: row.address,
      phone: row.phone,
      email: row.email,
      mapUrl: row.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address)}`
        : null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: displayName(row.updatedBy),
    };
  },
  ["church-info"],
  cacheOptions,
);

export function getChurchInfo() {
  return orFallback(readChurch, emptyChurch, "church information");
}

// ─── Theme of the Year ──────────────────────────────────────────────────────

export type Theme = {
  year: number;
  title: string;
  scriptureRef: string;
  verseText: string;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type Themes = { current: Theme | null; history: Theme[] };

const readThemes = unstable_cache(
  async (): Promise<Themes> => {
    const rows = await prisma.themeOfYear.findMany({
      orderBy: { year: "desc" },
      include: { updatedBy: updaterSelect },
    });
    const themes = rows.map((row) => ({
      year: row.year,
      title: row.title,
      scriptureRef: row.scriptureRef,
      verseText: row.verseText,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: displayName(row.updatedBy),
    }));
    return { current: themes[0] ?? null, history: themes.slice(1) };
  },
  ["themes"],
  cacheOptions,
);

/** The current theme (highest year) and every earlier one, newest first. */
export function getThemes() {
  return orFallback(readThemes, { current: null, history: [] }, "the Theme of the Year");
}

// ─── Social links ───────────────────────────────────────────────────────────

export type SocialLinkDto = {
  platform: SocialPlatform;
  handle: string;
  url: string;
  isVisible: boolean;
};

/** Display order and names, fixed — the enum order is not a design decision. */
export const SOCIAL_PLATFORMS: { platform: SocialPlatform; name: string }[] = [
  { platform: "FACEBOOK", name: "Facebook" },
  { platform: "INSTAGRAM", name: "Instagram" },
  { platform: "YOUTUBE", name: "YouTube" },
  { platform: "WHATSAPP", name: "WhatsApp" },
];

const readSocials = unstable_cache(
  async (): Promise<SocialLinkDto[]> => {
    const rows = await prisma.socialLink.findMany();
    const order = SOCIAL_PLATFORMS.map((entry) => entry.platform);
    return rows
      .map(({ platform, handle, url, isVisible }) => ({ platform, handle, url, isVisible }))
      .sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
  },
  ["social-links"],
  cacheOptions,
);

/** Every configured link, hidden ones included — for the settings page. */
export function getAllSocialLinks() {
  return orFallback(readSocials, [], "social links");
}

/** The links the public site shows. */
export async function getVisibleSocialLinks() {
  return (await getAllSocialLinks()).filter((link) => link.isVisible);
}

// ─── Connect groups, as the public sees them ────────────────────────────────

export type PublicGroup = {
  slug: string;
  name: string;
  audience: string | null;
  description: string | null;
  /** The leader's name, or null for Vacant. */
  leader: string | null;
};

const readGroups = unstable_cache(
  async (): Promise<PublicGroup[]> => {
    const rows = await prisma.group.findMany({
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        audience: true,
        description: true,
        leader: { select: { firstName: true, lastName: true, role: true } },
      },
    });
    return rows.map(({ leader, ...group }) => ({ ...group, leader: displayName(leader) }));
  },
  ["public-groups"],
  { tags: [SETTINGS_TAG, GROUPS_TAG], revalidate: 3600 },
);

/**
 * Names, audiences, descriptions and leaders' names — already public on the
 * website, so safe for anonymous visitors. Never members.
 */
export function getPublicGroups() {
  return orFallback(readGroups, [], "connect groups");
}

// ─── Leadership, for the About page ─────────────────────────────────────────

export type Leader = { name: string; office: string };

const readLeadership = unstable_cache(
  async (): Promise<Leader[]> => {
    const rows = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["APOSTLE", "MATRON", "ELDER"] } },
      orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: { firstName: true, lastName: true, role: true },
    });
    return rows.map((row) => ({
      name: `${row.firstName} ${row.lastName}`,
      office: ROLE_LABELS[row.role],
    }));
  },
  ["leadership"],
  { tags: [SETTINGS_TAG, GROUPS_TAG], revalidate: 3600 },
);

/**
 * The office holders, by name and office only — the church's public
 * leadership, as printed on any church noticeboard. Members are never listed.
 */
export function getLeadership() {
  return orFallback(readLeadership, [], "leadership");
}
