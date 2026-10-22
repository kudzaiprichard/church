import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CandidateStatus } from "@/generated/prisma/enums";
import { type SessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { classStatus, type ClassStatus } from "@/lib/baptism/rules";
import { fromDateOnly, harareToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/**
 * Baptism administration (docs/SCOPE.md §9.16) — the Matron's and the
 * Apostles' (`baptism.manage`). Every function returns `null` (or an empty
 * list) to anyone else; members see their own record on /profile instead.
 */

const manages = (user: SessionUser) => can(user, "baptism.manage");

export type RecordRow = {
  id: string;
  member: { id: string; name: string };
  baptismDate: string;
  location: string;
  conductedBy: string;
  classCompletedOn: string | null;
  certificateNumber: string | null;
  certificateIssuedAt: string | null;
  certificateIssuedBy: string | null;
  notes: string | null;
};

const recordSelect = {
  id: true,
  baptismDate: true,
  location: true,
  conductedBy: true,
  classCompletedOn: true,
  certificateNumber: true,
  certificateIssuedAt: true,
  certificateIssuedBy: true,
  notes: true,
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.BaptismalRecordSelect;

function toRow(row: Prisma.BaptismalRecordGetPayload<{ select: typeof recordSelect }>): RecordRow {
  return {
    id: row.id,
    member: { id: row.user.id, name: `${row.user.firstName} ${row.user.lastName}` },
    baptismDate: fromDateOnly(row.baptismDate),
    location: row.location,
    conductedBy: row.conductedBy,
    classCompletedOn: row.classCompletedOn ? fromDateOnly(row.classCompletedOn) : null,
    certificateNumber: row.certificateNumber,
    certificateIssuedAt: row.certificateIssuedAt?.toISOString() ?? null,
    certificateIssuedBy: row.certificateIssuedBy,
    notes: row.notes,
  };
}

/** The records, newest baptism first, filtered by certificate status and year. */
export async function listRecords(
  user: SessionUser,
  filters: { certificate?: "pending" | "issued"; year?: number } = {},
): Promise<RecordRow[] | null> {
  if (!manages(user)) return null;
  const rows = await prisma.baptismalRecord.findMany({
    where: {
      ...(filters.certificate === "pending" ? { certificateNumber: null } : {}),
      ...(filters.certificate === "issued" ? { certificateNumber: { not: null } } : {}),
      ...(filters.year
        ? {
            baptismDate: {
              gte: new Date(`${filters.year}-01-01T00:00:00Z`),
              lt: new Date(`${filters.year + 1}-01-01T00:00:00Z`),
            },
          }
        : {}),
    },
    orderBy: { baptismDate: "desc" },
    select: recordSelect,
  });
  return rows.map(toRow);
}

export async function getRecord(user: SessionUser, id: string): Promise<RecordRow | null> {
  if (!manages(user)) return null;
  const row = await prisma.baptismalRecord.findUnique({ where: { id }, select: recordSelect });
  return row ? toRow(row) : null;
}

export type CandidateRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CandidateStatus;
  member: { id: string } | null;
  classes: { id: string; name: string; completedOn: string | null }[];
};

const candidateSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  notes: true,
  status: true,
  userId: true,
  enrollments: {
    orderBy: { class: { startDate: "desc" } },
    select: { completedOn: true, class: { select: { id: true, name: true } } },
  },
} satisfies Prisma.BaptismCandidateSelect;

function toCandidate(
  row: Prisma.BaptismCandidateGetPayload<{ select: typeof candidateSelect }>,
): CandidateRow {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    status: row.status,
    member: row.userId ? { id: row.userId } : null,
    classes: row.enrollments.map((entry) => ({
      id: entry.class.id,
      name: entry.class.name,
      completedOn: entry.completedOn ? fromDateOnly(entry.completedOn) : null,
    })),
  };
}

export async function listCandidates(
  user: SessionUser,
  filters: { status?: CandidateStatus } = {},
): Promise<CandidateRow[] | null> {
  if (!manages(user)) return null;
  const rows = await prisma.baptismCandidate.findMany({
    where: filters.status ? { status: filters.status } : {},
    orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: candidateSelect,
  });
  return rows.map(toCandidate);
}

/**
 * A candidate not yet enrolled, to pre-fill the enrolment form — with the
 * latest class completion date as the class-completed field.
 */
export async function candidateForEnrolment(user: SessionUser, id: string) {
  if (!can(user, "members.enroll") || !manages(user)) return null;
  const row = await prisma.baptismCandidate.findFirst({
    where: { id, userId: null },
    select: candidateSelect,
  });
  if (!row) return null;
  const candidate = toCandidate(row);
  return {
    ...candidate,
    classCompletedOn:
      candidate.classes.map((entry) => entry.completedOn).find((date) => date !== null) ?? null,
  };
}

export type ClassRow = {
  id: string;
  name: string;
  instructor: string;
  startDate: string;
  endDate: string;
  completedAt: string | null;
  status: ClassStatus;
  enrolled: number;
  completed: number;
};

export async function listClasses(user: SessionUser): Promise<ClassRow[] | null> {
  if (!manages(user)) return null;
  const today = harareToday();
  const rows = await prisma.baptismalClass.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      instructor: true,
      startDate: true,
      endDate: true,
      completedAt: true,
      enrollments: { select: { completedOn: true } },
    },
  });
  return rows.map((row) => {
    const dates = {
      startDate: fromDateOnly(row.startDate),
      endDate: fromDateOnly(row.endDate),
      completedAt: row.completedAt?.toISOString() ?? null,
    };
    return {
      id: row.id,
      name: row.name,
      instructor: row.instructor,
      ...dates,
      status: classStatus(dates, today),
      enrolled: row.enrollments.length,
      completed: row.enrollments.filter((entry) => entry.completedOn).length,
    };
  });
}

export type Enrollee = {
  enrollmentId: string;
  candidate: { id: string; name: string; status: CandidateStatus };
  completedOn: string | null;
  /** Once baptized and enrolled: their record's date and certificate. */
  baptism: { recordId: string; date: string; certificateNumber: string | null } | null;
};

/** One class with its enrollees and the candidates who could still join it. */
export async function getClass(user: SessionUser, id: string) {
  if (!manages(user)) return null;
  const row = await prisma.baptismalClass.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      instructor: true,
      startDate: true,
      endDate: true,
      completedAt: true,
      enrollments: {
        orderBy: { candidate: { lastName: "asc" } },
        select: {
          id: true,
          completedOn: true,
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              user: {
                select: {
                  baptismalRecord: {
                    select: { id: true, baptismDate: true, certificateNumber: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  const enrolledIds = row.enrollments.map((entry) => entry.candidate.id);
  const available = await prisma.baptismCandidate.findMany({
    where: { status: "IN_CLASS", id: { notIn: enrolledIds } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const dates = {
    startDate: fromDateOnly(row.startDate),
    endDate: fromDateOnly(row.endDate),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
  return {
    id: row.id,
    name: row.name,
    instructor: row.instructor,
    ...dates,
    status: classStatus(dates, harareToday()),
    enrollees: row.enrollments.map((entry): Enrollee => {
      const record = entry.candidate.user?.baptismalRecord;
      return {
        enrollmentId: entry.id,
        candidate: {
          id: entry.candidate.id,
          name: `${entry.candidate.firstName} ${entry.candidate.lastName}`,
          status: entry.candidate.status,
        },
        completedOn: entry.completedOn ? fromDateOnly(entry.completedOn) : null,
        baptism: record
          ? {
              recordId: record.id,
              date: fromDateOnly(record.baptismDate),
              certificateNumber: record.certificateNumber,
            }
          : null,
      };
    }),
    available: available.map((candidate) => ({
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
    })),
  };
}
