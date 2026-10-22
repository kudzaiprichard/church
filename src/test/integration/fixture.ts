import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * The cast every scope test reads (docs/SCOPE.md §4.3, §10).
 *
 *   apostle   APOSTLE, in no group
 *   matron    MATRON, in no group
 *   elder     ELDER, leads Youth Alive and is in it
 *   leader    MEMBER, leads Kingdom Total Women and is in it
 *   memberK   MEMBER in Kingdom Total Women
 *   memberY   MEMBER in Youth Alive
 *
 * Each group has its own message, event, prayer request and giving, so every
 * test can ask "does somebody outside see it?" with a known right answer.
 * Content is labelled so a test can find it: "KTW …" belongs to Kingdom Total
 * Women, "YOUTH …" to Youth Alive, "ALL …" to the whole church.
 */

export const EMAILS = {
  apostle: "apostle@it.test",
  matron: "matron@it.test",
  elder: "elder@it.test",
  leader: "leader@it.test",
  memberK: "member-k@it.test",
  memberY: "member-y@it.test",
} as const;

export type CastName = keyof typeof EMAILS;

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

function harareToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Harare",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function seedFixture(url: string) {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const today = harareToday();
  const tomorrow = new Date(day(today).getTime() + 86_400_000).toISOString().slice(0, 10);

  const person = (
    key: CastName,
    firstName: string,
    role: "APOSTLE" | "MATRON" | "ELDER" | "MEMBER",
    dob?: string,
  ) =>
    prisma.user.create({
      data: {
        email: EMAILS[key],
        firstName,
        lastName: "Test",
        role,
        phone: "+263 77 000 0000",
        dateOfBirth: dob ? day(dob) : null,
      },
    });

  const apostle = await person("apostle", "Apostle", "APOSTLE");
  await person("matron", "Matron", "MATRON");
  const elder = await person("elder", "Elder", "ELDER");
  const leader = await person("leader", "Leader", "MEMBER");
  const memberK = await person("memberK", "MemberK", "MEMBER", "1990-11-03");
  const memberY = await person("memberY", "MemberY", "MEMBER", "1995-03-14");

  const ktw = await prisma.group.create({
    data: { slug: "ktw", name: "Kingdom Total Women", leaderId: leader.id },
  });
  const youth = await prisma.group.create({
    data: { slug: "youth", name: "Youth Alive", leaderId: elder.id },
  });
  await prisma.groupMembership.createMany({
    data: [
      { userId: leader.id, groupId: ktw.id },
      { userId: memberK.id, groupId: ktw.id },
      { userId: elder.id, groupId: youth.id },
      { userId: memberY.id, groupId: youth.id },
    ],
  });

  // Messages: one to each group, and a private reply in KTW's.
  const ktwMessage = await prisma.message.create({
    data: {
      senderId: leader.id,
      subject: "KTW message",
      body: "For KTW",
      audience: "GROUP",
      groupId: ktw.id,
      recipients: { create: [{ userId: memberK.id }] },
    },
  });
  await prisma.messageReply.create({
    data: {
      messageId: ktwMessage.id,
      threadUserId: memberK.id,
      authorId: memberK.id,
      body: "KTW reply",
    },
  });
  await prisma.message.create({
    data: {
      senderId: elder.id,
      subject: "YOUTH message",
      body: "For Youth",
      audience: "GROUP",
      groupId: youth.id,
      recipients: { create: [{ userId: memberY.id }] },
    },
  });

  // Events: all-church, and one past event per group with attendance.
  const yesterday = new Date(Date.now() - 86_400_000);
  await prisma.event.create({
    data: { title: "ALL service", startsAt: yesterday, createdById: apostle.id },
  });
  const ktwEvent = await prisma.event.create({
    data: {
      title: "KTW meeting",
      startsAt: yesterday,
      groupId: ktw.id,
      createdById: apostle.id,
    },
  });
  const youthEvent = await prisma.event.create({
    data: {
      title: "YOUTH meeting",
      startsAt: yesterday,
      groupId: youth.id,
      createdById: apostle.id,
    },
  });
  await prisma.attendanceRecord.createMany({
    data: [
      { userId: memberK.id, eventId: ktwEvent.id, status: "PRESENT", markedById: leader.id },
      { userId: memberY.id, eventId: youthEvent.id, status: "ABSENT", markedById: elder.id },
    ],
  });

  // Prayer.
  await prisma.prayerRequest.createMany({
    data: [
      { authorId: memberK.id, groupId: ktw.id, body: "KTW prayer" },
      { authorId: memberY.id, groupId: youth.id, body: "YOUTH prayer" },
    ],
  });

  // Giving: a confirmed tithe for memberK, a pending chema for memberY, and a
  // confirmed partnership gift toward memberK's pledge.
  const project = await prisma.partnershipProject.create({
    data: { name: "IT Project", targetAmount: "1000.00", startDate: day("2026-01-01") },
  });
  const pledge = await prisma.pledge.create({
    data: {
      userId: memberK.id,
      projectId: project.id,
      description: "KTW pledge",
      totalAmount: "100.00",
      dueDate: day("2099-01-01"),
    },
  });
  const year = Number(today.slice(0, 4));
  await prisma.contribution.createMany({
    data: [
      {
        userId: memberK.id,
        type: "TITHE",
        amount: "20.00",
        paidAt: day(today),
        status: "CONFIRMED",
        recordedById: memberK.id,
        reviewedById: apostle.id,
      },
      {
        userId: memberK.id,
        type: "PARTNERSHIP",
        amount: "40.00",
        paidAt: day(today),
        projectId: project.id,
        pledgeId: pledge.id,
        status: "CONFIRMED",
        recordedById: memberK.id,
        reviewedById: apostle.id,
      },
      {
        userId: memberY.id,
        type: "CHEMA",
        amount: "5.00",
        paidAt: day(today),
        chemaYear: year,
        chemaMonth: 1,
        status: "PENDING",
        recordedById: memberY.id,
      },
    ],
  });

  // Sermons, a private note, and devotions in each state.
  const sermon = await prisma.sermon.create({
    data: {
      title: "PUBLISHED sermon",
      preacher: "Apostle Takura James Makamba",
      preachedAt: day(today),
      summary: "Summary",
      uploadedById: apostle.id,
    },
  });
  await prisma.sermon.create({
    data: {
      title: "DRAFT sermon",
      preacher: "Apostle Edna Makamba",
      preachedAt: day(today),
      summary: "Summary",
      isPublished: false,
      uploadedById: apostle.id,
    },
  });
  await prisma.sermonNote.create({
    data: { userId: memberK.id, sermonId: sermon.id, body: "PRIVATE note of memberK" },
  });
  const devotion = { authorId: apostle.id, scriptureQuote: "q", body: "b" };
  await prisma.devotion.createMany({
    data: [
      { ...devotion, title: "TODAY devotion", scriptureRef: "Ps 1", publishOn: day(today) },
      { ...devotion, title: "TOMORROW devotion", scriptureRef: "Ps 2", publishOn: day(tomorrow) },
      { ...devotion, title: "DRAFT devotion", scriptureRef: "Ps 3" },
    ],
  });

  // Baptism, and one notification each.
  await prisma.baptismalRecord.create({
    data: {
      userId: memberK.id,
      baptismDate: day("2020-05-01"),
      location: "River",
      conductedBy: "Apostle",
    },
  });
  await prisma.baptismCandidate.create({ data: { firstName: "Candidate", lastName: "Test" } });
  await prisma.notification.createMany({
    data: [
      { userId: memberK.id, type: "MESSAGE", title: "KTW notification" },
      { userId: memberY.id, type: "MESSAGE", title: "YOUTH notification" },
    ],
  });

  await prisma.$disconnect();
}
