import "server-only";

import { pledgeReminder, reminderWindow, tomorrowInHarare } from "@/lib/cron-rules";
import { todaysCelebrants } from "@/lib/data/birthdays";
import { fromDateOnly, harareToday, toDateOnly } from "@/lib/dates";
import { formatMoney, toCents } from "@/lib/finance/money";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

/**
 * The scheduled jobs (docs/SCOPE.md §9.21). Each is safe to run twice: every
 * notification carries a `dedupeKey`, so a retried or doubled run writes
 * nothing for anyone already told, and event reminders also stamp
 * `reminderSentAt`. Each returns a one-line summary for the log.
 */

const DAY_MS = 86_400_000;

async function activeIds() {
  const rows = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  return rows.map((row) => row.id);
}

/** How many rows a notify() call actually added, for the summary. */
async function counted(write: () => Promise<unknown>) {
  const before = await prisma.notification.count();
  await write();
  return (await prisma.notification.count()) - before;
}

export async function runDaily(now: Date = new Date()) {
  const today = harareToday(now);
  const summary: Record<string, number> = {};

  // Birthdays: the celebrant is told, once per birthday.
  const celebrants = await todaysCelebrants();
  summary.birthdays = await counted(() =>
    prisma.$transaction((tx) =>
      notify(tx, {
        userIds: celebrants.map((person) => person.id),
        type: "BIRTHDAY",
        title: "Happy birthday from your church family!",
        body: "We thank God for you today.",
        linkUrl: "/birthdays",
        dedupeKey: `birthday:${today}`,
      }),
    ),
  );

  // Today's devotion, to everyone, the morning it is published.
  const devotions = await prisma.devotion.findMany({
    where: { publishOn: toDateOnly(today) },
    select: { id: true, title: true, scriptureRef: true },
  });
  const everyone = devotions.length > 0 ? await activeIds() : [];
  summary.devotions = 0;
  for (const devotion of devotions) {
    summary.devotions += await counted(() =>
      prisma.$transaction((tx) =>
        notify(tx, {
          userIds: everyone,
          type: "DEVOTION",
          title: `Today's devotion: ${devotion.title}`,
          body: devotion.scriptureRef,
          linkUrl: `/devotions/${devotion.id}`,
          dedupeKey: `devotion:${devotion.id}`,
        }),
      ),
    );
  }

  // Pledges: a week before, a day before, and the day they fall overdue —
  // only while they are still open and short of their total.
  const pledges = await prisma.pledge.findMany({
    where: {
      status: "ACTIVE",
      dueDate: {
        in: [7, 1, -1].map((days) => new Date(toDateOnly(today).getTime() + days * DAY_MS)),
      },
    },
    select: { id: true, userId: true, description: true, totalAmount: true, dueDate: true },
  });
  summary.pledges = 0;
  for (const pledge of pledges) {
    const kind = pledgeReminder(fromDateOnly(pledge.dueDate), today);
    if (!kind) continue;
    const paid = await prisma.contribution.aggregate({
      where: { pledgeId: pledge.id, status: "CONFIRMED" },
      _sum: { amount: true },
    });
    const left = toCents(pledge.totalAmount) - (paid._sum.amount ? toCents(paid._sum.amount) : 0);
    if (left <= 0) continue;

    summary.pledges += await counted(() =>
      prisma.$transaction((tx) =>
        notify(tx, {
          userIds: [pledge.userId],
          type: "PLEDGE_REMINDER",
          title:
            kind === "OVERDUE"
              ? `Your pledge is overdue: ${pledge.description}`
              : `Your pledge is due ${kind === "WEEK" ? "in a week" : "tomorrow"}: ${
                  pledge.description
                }`,
          body: `${formatMoney(left)} still to give.`,
          linkUrl: "/finance/pledges",
          dedupeKey: `pledge:${pledge.id}:${kind}`,
        }),
      ),
    );
  }

  // Housekeeping: read notifications after 180 days, sessions past expiry,
  // and sign-in links a month after they stopped working.
  const cutoff = new Date(now.getTime() - 180 * DAY_MS);
  const [notifications, sessions, tokens] = await prisma.$transaction([
    prisma.notification.deleteMany({ where: { readAt: { not: null, lt: cutoff } } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.authToken.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 30 * DAY_MS) } },
    }),
  ]);
  summary.purgedNotifications = notifications.count;
  summary.purgedSessions = sessions.count;
  summary.purgedTokens = tokens.count;

  // Tomorrow's events. On a plan that runs cron only daily this is the event
  // reminder; with the hourly job scheduled too, whichever reaches an event
  // first claims it and the other skips it.
  summary.eventReminders = (await remindAbout(tomorrowInHarare(today), now)).notifications;

  return summary;
}

/**
 * Event reminders for events starting 23 to 25 hours from now, each sent once.
 * For an hourly schedule, which needs a paid Vercel plan.
 */
export async function runReminders(now: Date = new Date()) {
  return remindAbout(reminderWindow(now), now);
}

async function remindAbout({ from, to }: { from: Date; to: Date }, now: Date) {
  const events = await prisma.event.findMany({
    where: { startsAt: { gte: from, lt: to }, reminderSentAt: null },
    select: { id: true, title: true, location: true, groupId: true, startsAt: true },
  });

  const when = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Harare",
  });

  let sent = 0;
  for (const event of events) {
    const audience = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(event.groupId ? { groupMemberships: { some: { groupId: event.groupId } } } : {}),
      },
      select: { id: true },
    });
    sent += await counted(() =>
      prisma.$transaction(async (tx) => {
        // Claim the event first: a run that overlaps this one finds it taken.
        const claimed = await tx.event.updateMany({
          where: { id: event.id, reminderSentAt: null },
          data: { reminderSentAt: now },
        });
        if (claimed.count === 0) return;
        await notify(tx, {
          userIds: audience.map((user) => user.id),
          type: "EVENT_REMINDER",
          title: `Tomorrow: ${event.title}`,
          body: [when.format(event.startsAt), event.location].filter(Boolean).join(" · "),
          linkUrl: `/events/${event.id}`,
          dedupeKey: `event-reminder:${event.id}`,
        });
      }),
    );
  }

  return { events: events.length, notifications: sent };
}
