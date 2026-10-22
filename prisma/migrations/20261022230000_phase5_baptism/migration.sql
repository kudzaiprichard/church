-- Phase 5: baptism records, classes and candidates (docs/IMPLEMENTATION_PLAN.md, Phase 5).
-- Additive: certificate columns on BaptismalRecord, three new tables and two
-- audit actions. No existing row changes.

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('IN_CLASS', 'BAPTIZED', 'WITHDRAWN');

-- AlterEnum


ALTER TYPE "AuditAction" ADD VALUE 'BAPTISM_RECORD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CERTIFICATE_ISSUED';

-- AlterTable
ALTER TABLE "BaptismalRecord" ADD COLUMN     "certificateIssuedAt" TIMESTAMP(3),
ADD COLUMN     "certificateIssuedBy" TEXT,
ADD COLUMN     "certificateNumber" TEXT;

-- CreateTable
CREATE TABLE "BaptismCandidate" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'IN_CLASS',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaptismCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaptismalClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaptismalClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaptismalClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "completedOn" DATE,

    CONSTRAINT "BaptismalClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaptismCandidate_userId_key" ON "BaptismCandidate"("userId");

-- CreateIndex
CREATE INDEX "BaptismCandidate_status_idx" ON "BaptismCandidate"("status");

-- CreateIndex
CREATE INDEX "BaptismalClass_startDate_idx" ON "BaptismalClass"("startDate");

-- CreateIndex
CREATE INDEX "BaptismalClassEnrollment_candidateId_idx" ON "BaptismalClassEnrollment"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "BaptismalClassEnrollment_classId_candidateId_key" ON "BaptismalClassEnrollment"("classId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "BaptismalRecord_certificateNumber_key" ON "BaptismalRecord"("certificateNumber");

-- AddForeignKey
ALTER TABLE "BaptismCandidate" ADD CONSTRAINT "BaptismCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaptismalClassEnrollment" ADD CONSTRAINT "BaptismalClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "BaptismalClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaptismalClassEnrollment" ADD CONSTRAINT "BaptismalClassEnrollment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "BaptismCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

