-- Phase 1: groups and communication (docs/IMPLEMENTATION_PLAN.md, Phase 1).
--
-- Additive, with one hand edit: `MessageReply.threadUserId` is NOT NULL, so
-- any reply written before threads existed is backfilled to its own author
-- before the constraint goes on. That puts each old reply in the thread of the
-- person who wrote it, which is the only owner it could have had.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_LEADER_CHANGED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'DEVOTION';
ALTER TYPE "NotificationType" ADD VALUE 'BIRTHDAY';
ALTER TYPE "NotificationType" ADD VALUE 'PLEDGE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRIBUTION_REVIEWED';

-- DropIndex
DROP INDEX "Message_senderId_idx";

-- DropIndex
DROP INDEX "MessageReply_messageId_idx";

-- DropIndex
DROP INDEX "Notification_userId_readAt_idx";

-- AlterTable: reply threads (hand-edited backfill, see above)
ALTER TABLE "MessageReply" ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "threadUserId" TEXT;

UPDATE "MessageReply" SET "threadUserId" = "authorId" WHERE "threadUserId" IS NULL;

ALTER TABLE "MessageReply" ALTER COLUMN "threadUserId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

-- CreateIndex
CREATE INDEX "Message_senderId_sentAt_idx" ON "Message"("senderId", "sentAt");

-- CreateIndex
CREATE INDEX "MessageReply_messageId_threadUserId_createdAt_idx" ON "MessageReply"("messageId", "threadUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "MessageReply" ADD CONSTRAINT "MessageReply_threadUserId_fkey" FOREIGN KEY ("threadUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
