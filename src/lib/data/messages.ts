import "server-only";

import type { MessageAudience, Role } from "@/generated/prisma/enums";
import { ledGroupIds, selfScope, type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { mayRead, replyThread, visibleThreads, type Standing } from "@/lib/messages/rules";
import { prisma } from "@/lib/prisma";

import type { PersonOption } from "./groups";

/**
 * Reads of the inbox, with the access rule written once (docs/SCOPE.md §9.5).
 *
 * A person's inbox is their own `MessageRecipient` rows — `selfScope`, for
 * everyone, Apostles included: an Apostle can open any message, but their
 * inbox holds only what was sent to them. Whether a message may be opened, and
 * which reply threads are visible inside it, is decided by the pure rules in
 * `lib/messages/rules.ts`, which the tests exercise.
 */

export const PAGE_SIZE = 50;

export type Party = { id: string; name: string; role: Role };

const party = (user: { id: string; firstName: string; lastName: string; role: Role }): Party => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  role: user.role,
});

const partySelect = { id: true, firstName: true, lastName: true, role: true } as const;

/** "All Church", the group's name, or "Personal". */
function targetLabel(audience: MessageAudience, group: { name: string } | null) {
  if (audience === "ALL") return "All Church";
  if (audience === "GROUP") return group?.name ?? "A former group";
  return "Personal";
}

export type InboxRow = {
  id: string;
  subject: string;
  sender: Party;
  target: string;
  sentAt: string;
  /** The message itself has not been opened. */
  unread: boolean;
  /** Replies from the sender in the viewer's own thread, not yet read. */
  unreadReplies: number;
};

function page(value: number | undefined) {
  return Math.max(1, Math.floor(value ?? 1));
}

/** The signed-in person's inbox, newest first. */
export async function listInbox(user: SessionUser, options: { page?: number } = {}) {
  const current = page(options.page);
  const where = selfScope(user);

  const [rows, total] = await Promise.all([
    prisma.messageRecipient.findMany({
      where,
      orderBy: { message: { sentAt: "desc" } },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        readAt: true,
        message: {
          select: {
            id: true,
            subject: true,
            audience: true,
            sentAt: true,
            group: { select: { name: true } },
            sender: { select: partySelect },
            _count: {
              select: {
                replies: { where: { threadUserId: user.id, authorId: { not: user.id }, readAt: null } },
              },
            },
          },
        },
      },
    }),
    prisma.messageRecipient.count({ where }),
  ]);

  return {
    rows: rows.map(
      ({ readAt, message }): InboxRow => ({
        id: message.id,
        subject: message.subject,
        sender: party(message.sender),
        target: targetLabel(message.audience, message.group),
        sentAt: message.sentAt.toISOString(),
        unread: readAt === null,
        unreadReplies: message._count.replies,
      }),
    ),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export type SentRow = {
  id: string;
  subject: string;
  target: string;
  sentAt: string;
  recipientCount: number;
  readCount: number;
  /** Replies from recipients, across every thread, not yet read. */
  unreadReplies: number;
};

/** What the signed-in person has sent, newest first. */
export async function listSent(user: SessionUser, options: { page?: number } = {}) {
  const current = page(options.page);
  const where = selfScope(user, "senderId");

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        subject: true,
        audience: true,
        sentAt: true,
        group: { select: { name: true } },
        _count: {
          select: {
            recipients: true,
            replies: { where: { authorId: { not: user.id }, readAt: null } },
          },
        },
      },
    }),
    prisma.message.count({ where }),
  ]);

  const read = await prisma.messageRecipient.groupBy({
    by: ["messageId"],
    where: { messageId: { in: rows.map((row) => row.id) }, readAt: { not: null } },
    _count: { _all: true },
  });
  const readCounts = new Map(read.map((entry) => [entry.messageId, entry._count._all]));

  return {
    rows: rows.map(
      (row): SentRow => ({
        id: row.id,
        subject: row.subject,
        target: targetLabel(row.audience, row.group),
        sentAt: row.sentAt.toISOString(),
        recipientCount: row._count.recipients,
        readCount: readCounts.get(row.id) ?? 0,
        unreadReplies: row._count.replies,
      }),
    ),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export type ReplyView = { id: string; author: Party; body: string; createdAt: string; mine: boolean };

export type ThreadView = {
  /** The recipient this conversation is with. */
  with: Party;
  replies: ReplyView[];
  /** The viewer may add to it. */
  canReply: boolean;
};

export type MessageView = {
  id: string;
  subject: string;
  body: string;
  sender: Party;
  target: string;
  audience: MessageAudience;
  sentAt: string;
  standing: Standing;
  /** For the sender: "23 of 41 read". */
  reach: { recipients: number; read: number } | null;
  threads: ThreadView[];
  /** A recipient who has not replied yet may start their thread. */
  canStartThread: boolean;
};

/**
 * One message with the threads the viewer may see, or `null` when it is not
 * theirs to open — the same answer as an id that does not exist.
 */
export async function getMessage(user: SessionUser, id: string): Promise<MessageView | null> {
  const message = await prisma.message.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      body: true,
      audience: true,
      sentAt: true,
      senderId: true,
      sender: { select: partySelect },
      group: { select: { name: true } },
      recipients: { where: selfScope(user), select: { id: true } },
    },
  });
  if (!message) return null;

  const standing: Standing = {
    isSender: message.senderId === user.id,
    isRecipient: message.recipients.length > 0,
  };
  if (!mayRead(user, standing)) return null;

  const threadOwners = await prisma.messageReply.findMany({
    where: { messageId: id },
    distinct: ["threadUserId"],
    select: { threadUserId: true },
  });
  const existing = threadOwners.map((row) => row.threadUserId);
  const visible = visibleThreads(user, standing, existing);

  const replies = visible.length
    ? await prisma.messageReply.findMany({
        where: { messageId: id, threadUserId: { in: visible } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          threadUserId: true,
          author: { select: partySelect },
          thread: { select: partySelect },
        },
      })
    : [];

  const threads = new Map<string, ThreadView>();
  for (const reply of replies) {
    const thread =
      threads.get(reply.threadUserId) ??
      ({
        with: party(reply.thread),
        replies: [],
        canReply: "threadUserId" in replyThread(user, standing, reply.threadUserId, existing),
      } satisfies ThreadView);
    thread.replies.push({
      id: reply.id,
      author: party(reply.author),
      body: reply.body,
      createdAt: reply.createdAt.toISOString(),
      mine: reply.author.id === user.id,
    });
    threads.set(reply.threadUserId, thread);
  }

  const reach = standing.isSender
    ? await Promise.all([
        prisma.messageRecipient.count({ where: { messageId: id } }),
        prisma.messageRecipient.count({ where: { messageId: id, readAt: { not: null } } }),
      ]).then(([recipients, read]) => ({ recipients, read }))
    : null;

  return {
    id: message.id,
    subject: message.subject,
    body: message.body,
    sender: party(message.sender),
    target: targetLabel(message.audience, message.group),
    audience: message.audience,
    sentAt: message.sentAt.toISOString(),
    standing,
    reach,
    threads: [...threads.values()],
    canStartThread: standing.isRecipient && !standing.isSender && !existing.includes(user.id),
  };
}

/**
 * Everything waiting for the viewer: unopened messages, and replies addressed
 * to them — in their own threads, or on messages they sent.
 */
export async function unreadMessageCount(user: SessionUser) {
  const [messages, replies] = await Promise.all([
    prisma.messageRecipient.count({ where: { ...selfScope(user), readAt: null } }),
    prisma.messageReply.count({
      where: {
        readAt: null,
        authorId: { not: user.id },
        OR: [{ threadUserId: user.id }, { message: { senderId: user.id } }],
      },
    }),
  ]);
  return messages + replies;
}

export type AnnouncementRow = {
  id: string;
  subject: string;
  sender: Party;
  sentAt: string;
  excerpt: string;
};

/**
 * Messages sent to one group, for its Announcements tab.
 *
 * The group's leader and the Apostles see all of them. A member sees only the
 * ones that reached them — joining a group later does not open its history,
 * because recipients are fixed when a message is sent.
 */
export async function groupAnnouncements(
  user: SessionUser,
  groupId: string,
  leads: boolean,
): Promise<AnnouncementRow[]> {
  const rows = await prisma.message.findMany({
    where: {
      groupId,
      audience: "GROUP",
      ...(leads ? {} : { recipients: { some: selfScope(user) } }),
    },
    orderBy: { sentAt: "desc" },
    take: 30,
    select: {
      id: true,
      subject: true,
      body: true,
      sentAt: true,
      sender: { select: partySelect },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    sender: party(row.sender),
    sentAt: row.sentAt.toISOString(),
    excerpt: row.body.length > 180 ? `${row.body.slice(0, 179)}…` : row.body,
  }));
}

export type ComposeOptions = {
  all: boolean;
  groups: { id: string; name: string }[];
  people: PersonOption[];
  /** Apostles may also send by email. */
  email: boolean;
};

/**
 * The targets the composer may offer: every group and person for an Apostle,
 * the led groups and their members for a leader, nothing for anyone else.
 * Presentation only — `sendMessage` checks the chosen target again.
 */
export async function composeOptions(user: SessionUser): Promise<ComposeOptions> {
  const apostle = user.role === "APOSTLE";
  const led = apostle ? [] : await ledGroupIds(user);

  const [groups, people] = await Promise.all([
    prisma.group.findMany({
      where: apostle ? {} : { id: { in: led } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    apostle || led.length > 0
      ? prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: user.id },
            ...(apostle ? {} : { groupMemberships: { some: { groupId: { in: led } } } }),
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            groupMemberships: { select: { group: { select: { name: true } } } },
          },
        })
      : [],
  ]);

  return {
    all: can(user, "messages.sendAll"),
    groups,
    people: people.map((person) => ({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      detail: person.groupMemberships.map(({ group }) => group.name).join(", "),
    })),
    email: can(user, "messages.sendAll"),
  };
}
