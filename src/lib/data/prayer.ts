import "server-only";

import { ledGroupIds, memberGroupIds, type SessionUser } from "@/lib/auth/dal";
import { mayModerate, mayPin, mayPost, prayerGroups, prayerScope } from "@/lib/prayer/rules";
import { prisma } from "@/lib/prisma";

/**
 * Reads of prayer requests (docs/SCOPE.md §9.8). Every query starts from
 * `prayerScope`: the groups the caller belongs to or leads, or all of them for
 * an Apostle. A request from another group is absent from the lists, the
 * counts and the tabs alike.
 */

export type PrayerItem = {
  id: string;
  body: string;
  author: string;
  mine: boolean;
  group: { id: string; name: string };
  isPinned: boolean;
  isAnswered: boolean;
  createdAt: string;
  can: { pin: boolean; moderate: boolean };
};

export type PrayerBoard = {
  /** The tabs: every group for an Apostle, otherwise the caller's own. */
  groups: { id: string; name: string }[];
  /** The tab shown; `null` is the Apostles' "All". */
  selected: string | null;
  items: PrayerItem[];
  canPost: boolean;
};

/**
 * One board of requests. `groupId` comes from the URL and is honoured only
 * when it is one of the caller's groups; otherwise their first group is shown
 * (an Apostle gets "All").
 */
export async function prayerBoard(user: SessionUser, groupId?: string): Promise<PrayerBoard> {
  const [joined, led] = await Promise.all([memberGroupIds(user), ledGroupIds(user)]);
  const visible = prayerGroups(user, joined, led);

  const groups = await prisma.group.findMany({
    where: visible === "all" ? {} : { id: { in: [...visible] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selected =
    groups.find((group) => group.id === groupId)?.id ??
    (visible === "all" ? null : (groups[0]?.id ?? null));

  if (visible !== "all" && !selected) return { groups, selected: null, items: [], canPost: false };

  const rows = await prisma.prayerRequest.findMany({
    where: { AND: [prayerScope(visible), selected ? { groupId: selected } : {}] },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      body: true,
      authorId: true,
      groupId: true,
      isPinned: true,
      isAnswered: true,
      createdAt: true,
      author: { select: { firstName: true, lastName: true } },
      group: { select: { id: true, name: true } },
    },
  });

  return {
    groups,
    selected,
    canPost: selected !== null && mayPost(selected, joined),
    items: rows.map((row) => ({
      id: row.id,
      body: row.body,
      author: `${row.author.firstName} ${row.author.lastName}`,
      mine: row.authorId === user.id,
      group: row.group,
      isPinned: row.isPinned,
      isAnswered: row.isAnswered,
      createdAt: row.createdAt.toISOString(),
      can: {
        pin: mayPin(user, row.groupId, led),
        moderate: mayModerate(user, row, led),
      },
    })),
  };
}
