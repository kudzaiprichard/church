-- Phase 3: finance (docs/IMPLEMENTATION_PLAN.md, Phase 3).
--
-- Destructive for the draft modules, hand-edited:
--   * Contribution keeps its rows: OFFERING becomes WELFARE, `givenAt`
--     becomes the Harare calendar day `paidAt`, and each draft row is treated
--     as confirmed and recorded by its member.
--   * The draft Partnership / PartnershipPayment tables are dropped; they are
--     replaced by projects and pledges and held no production data
--     (SCOPE §6).
--   * Raw SQL Prisma cannot express: one chema per member per month, and the
--     CHECK constraints tying the chema and project columns to the type.

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CONTRIBUTION_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTRIBUTION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTRIBUTION_RECORDED_FOR_MEMBER';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'PLEDGE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_EXPORTED';

-- AlterEnum: OFFERING was renamed Welfare by the church (SCOPE §9.9).
CREATE TYPE "ContributionType_new" AS ENUM ('CHEMA', 'WELFARE', 'TITHE', 'PARTNERSHIP');
ALTER TABLE "Contribution" ALTER COLUMN "type" TYPE "ContributionType_new"
  USING (CASE WHEN "type"::text = 'OFFERING' THEN 'WELFARE' ELSE "type"::text END)::"ContributionType_new";
ALTER TYPE "ContributionType" RENAME TO "ContributionType_old";
ALTER TYPE "ContributionType_new" RENAME TO "ContributionType";
DROP TYPE "ContributionType_old";

-- DropForeignKey
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_userId_fkey";

-- DropForeignKey
ALTER TABLE "Partnership" DROP CONSTRAINT "Partnership_userId_fkey";

-- DropForeignKey
ALTER TABLE "PartnershipPayment" DROP CONSTRAINT "PartnershipPayment_partnershipId_fkey";

-- DropIndex
DROP INDEX "Contribution_type_idx";

-- DropIndex
DROP INDEX "Contribution_userId_givenAt_idx";

-- AlterTable (hand-edited): draft rows keep their date and count as
-- recorded by the member and already confirmed.
ALTER TABLE "Contribution"
ADD COLUMN "chemaMonth" INTEGER,
ADD COLUMN "chemaYear" INTEGER,
ADD COLUMN "paidAt" DATE,
ADD COLUMN "pledgeId" TEXT,
ADD COLUMN "projectId" TEXT,
ADD COLUMN "recordedById" TEXT,
ADD COLUMN "rejectReason" TEXT,
ADD COLUMN "reversalOfId" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Contribution"
SET "paidAt" = ("givenAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Harare')::date,
    "recordedById" = "userId",
    "status" = 'CONFIRMED';

ALTER TABLE "Contribution" ALTER COLUMN "paidAt" SET NOT NULL;
ALTER TABLE "Contribution" ALTER COLUMN "recordedById" SET NOT NULL;
ALTER TABLE "Contribution" DROP COLUMN "givenAt";

-- DropTable
DROP TABLE "Partnership";

-- DropTable
DROP TABLE "PartnershipPayment";

-- DropEnum
DROP TYPE "PartnershipStatus";

-- CreateTable
CREATE TABLE "PartnershipProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pledge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "PledgeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipProject_name_key" ON "PartnershipProject"("name");

-- CreateIndex
CREATE INDEX "Pledge_userId_status_idx" ON "Pledge"("userId", "status");

-- CreateIndex
CREATE INDEX "Pledge_dueDate_status_idx" ON "Pledge"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_reversalOfId_key" ON "Contribution"("reversalOfId");

-- CreateIndex
CREATE INDEX "Contribution_userId_paidAt_idx" ON "Contribution"("userId", "paidAt");

-- CreateIndex
CREATE INDEX "Contribution_type_status_paidAt_idx" ON "Contribution"("type", "status", "paidAt");

-- CreateIndex
CREATE INDEX "Contribution_chemaYear_chemaMonth_idx" ON "Contribution"("chemaYear", "chemaMonth");

-- CreateIndex
CREATE INDEX "Contribution_projectId_idx" ON "Contribution"("projectId");

-- CreateIndex
CREATE INDEX "Contribution_pledgeId_idx" ON "Contribution"("pledgeId");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PartnershipProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "Pledge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "Contribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipProject" ADD CONSTRAINT "PartnershipProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PartnershipProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One chema per member per month. Rejected rows do not count, so a member
-- can log again after a rejection; reversing entries (negative amounts) do
-- not count either, so an officer can reverse a confirmed chema.
CREATE UNIQUE INDEX "contribution_one_chema_per_month"
ON "Contribution"("userId", "chemaYear", "chemaMonth")
WHERE "type" = 'CHEMA' AND "status" <> 'REJECTED' AND "reversalOfId" IS NULL;

-- A chema names the month it pays for; nothing else does.
ALTER TABLE "Contribution" ADD CONSTRAINT "contribution_chema_month" CHECK (
  ("type" = 'CHEMA' AND "chemaYear" IS NOT NULL AND "chemaMonth" BETWEEN 1 AND 12)
  OR ("type" <> 'CHEMA' AND "chemaYear" IS NULL AND "chemaMonth" IS NULL)
);

-- Partnership giving goes to a project.
ALTER TABLE "Contribution" ADD CONSTRAINT "contribution_partnership_project" CHECK (
  "type" <> 'PARTNERSHIP' OR "projectId" IS NOT NULL
);

-- Only a reversing entry may be negative, and none may be zero.
ALTER TABLE "Contribution" ADD CONSTRAINT "contribution_amount_sign" CHECK (
  ("reversalOfId" IS NULL AND "amount" > 0) OR ("reversalOfId" IS NOT NULL AND "amount" < 0)
);
