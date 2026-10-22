-- Phase 2: events, attendance and prayer (docs/IMPLEMENTATION_PLAN.md, Phase 2).
--
-- Destructive for the draft modules, hand-edited so no row is lost silently:
--   * Event: the draft `scope` + `EventAudience` table become one nullable
--     `groupId`. A GROUP event takes its first audience group; GENERAL events
--     stay all-church. Then the draft table and enum go.
--   * AttendanceRecord: rows with no event (the draft "service name" records)
--     cannot be attached to anything and are deleted; EXCUSED becomes ABSENT;
--     `recordedAt` is renamed to `markedAt` so its timestamps survive; the
--     marker is backfilled to the member themselves; duplicates per
--     (user, event) are collapsed to the newest before the unique index.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'EVENT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PRAYER_REQUEST_REMOVED';

-- ─── Event ──────────────────────────────────────────────────────────────────

ALTER TABLE "Event" ADD COLUMN "groupId" TEXT,
ADD COLUMN "reminderSentAt" TIMESTAMP(3);

UPDATE "Event" e
SET "groupId" = (
  SELECT a."groupId" FROM "EventAudience" a WHERE a."eventId" = e."id" ORDER BY a."id" LIMIT 1
)
WHERE e."scope" = 'GROUP';

ALTER TABLE "EventAudience" DROP CONSTRAINT "EventAudience_eventId_fkey";
ALTER TABLE "EventAudience" DROP CONSTRAINT "EventAudience_groupId_fkey";
DROP TABLE "EventAudience";

ALTER TABLE "Event" DROP COLUMN "scope";
DROP TYPE "EventScope";

CREATE INDEX "Event_groupId_startsAt_idx" ON "Event"("groupId", "startsAt");

ALTER TABLE "Event" ADD CONSTRAINT "Event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── AttendanceRecord ───────────────────────────────────────────────────────

ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_eventId_fkey";
DROP INDEX "AttendanceRecord_userId_recordedAt_idx";

DELETE FROM "AttendanceRecord" WHERE "eventId" IS NULL;

-- PRESENT / ABSENT only; EXCUSED counts as absent.
CREATE TYPE "AttendanceStatus_new" AS ENUM ('PRESENT', 'ABSENT');
ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" TYPE "AttendanceStatus_new"
  USING (CASE WHEN "status"::text = 'EXCUSED' THEN 'ABSENT' ELSE "status"::text END)::"AttendanceStatus_new";
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "AttendanceStatus_old";

ALTER TABLE "AttendanceRecord" RENAME COLUMN "recordedAt" TO "markedAt";
ALTER TABLE "AttendanceRecord" DROP COLUMN "serviceName";
ALTER TABLE "AttendanceRecord" ALTER COLUMN "eventId" SET NOT NULL;

ALTER TABLE "AttendanceRecord" ADD COLUMN "markedById" TEXT;
UPDATE "AttendanceRecord" SET "markedById" = "userId" WHERE "markedById" IS NULL;
ALTER TABLE "AttendanceRecord" ALTER COLUMN "markedById" SET NOT NULL;

DELETE FROM "AttendanceRecord" r
USING "AttendanceRecord" newer
WHERE r."userId" = newer."userId"
  AND r."eventId" = newer."eventId"
  AND (r."markedAt", r."id") < (newer."markedAt", newer."id");

CREATE UNIQUE INDEX "AttendanceRecord_userId_eventId_key" ON "AttendanceRecord"("userId", "eventId");

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── PrayerRequest ──────────────────────────────────────────────────────────

DROP INDEX "PrayerRequest_groupId_isPinned_idx";
CREATE INDEX "PrayerRequest_groupId_isPinned_createdAt_idx" ON "PrayerRequest"("groupId", "isPinned", "createdAt");
