-- Phase 4: sermons, notes and devotions (docs/IMPLEMENTATION_PLAN.md, Phase 4).
--
-- Hand-edited so draft sermons are reshaped rather than lost:
--   speaker → preacher ("Guest speaker" when blank), description → summary,
--   mediaUrl → audioUrl or videoUrl by its media type, preachedAt → its Harare
--   calendar day (or the day the row was created). The draft thumbnail goes.
--   A draft audio URL has no storage key, so deleting that sermon later leaves
--   the old file where it is — the only case where that happens.
-- SermonNote is unchanged. Devotion is new.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SERMON_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'DEVOTION_DELETED';

-- ─── Sermon ─────────────────────────────────────────────────────────────────

ALTER TABLE "Sermon"
ADD COLUMN "audioKey" TEXT,
ADD COLUMN "audioUrl" TEXT,
ADD COLUMN "notesKey" TEXT,
ADD COLUMN "notesUrl" TEXT,
ADD COLUMN "preacher" TEXT,
ADD COLUMN "scriptureRef" TEXT,
ADD COLUMN "seriesName" TEXT,
ADD COLUMN "summary" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "preachedOn" DATE;

UPDATE "Sermon" SET
  "preacher" = COALESCE(NULLIF(TRIM("speaker"), ''), 'Guest speaker'),
  "summary" = COALESCE("description", ''),
  "audioUrl" = CASE WHEN "mediaType" = 'AUDIO' THEN "mediaUrl" END,
  "videoUrl" = CASE WHEN "mediaType" = 'VIDEO' THEN "mediaUrl" END,
  "preachedOn" = (COALESCE("preachedAt", "createdAt") AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Harare')::date;

ALTER TABLE "Sermon"
DROP COLUMN "description",
DROP COLUMN "mediaType",
DROP COLUMN "mediaUrl",
DROP COLUMN "speaker",
DROP COLUMN "thumbnailUrl",
DROP COLUMN "preachedAt";

ALTER TABLE "Sermon" RENAME COLUMN "preachedOn" TO "preachedAt";
ALTER TABLE "Sermon" ALTER COLUMN "preachedAt" SET NOT NULL;
ALTER TABLE "Sermon" ALTER COLUMN "preacher" SET NOT NULL;
ALTER TABLE "Sermon" ALTER COLUMN "summary" SET NOT NULL;
ALTER TABLE "Sermon" ALTER COLUMN "isPublished" SET DEFAULT true;

-- The (isPublished, preachedAt) index went with the old column.
CREATE INDEX "Sermon_isPublished_preachedAt_idx" ON "Sermon"("isPublished", "preachedAt");
CREATE INDEX "Sermon_seriesName_idx" ON "Sermon"("seriesName");

-- DropEnum
DROP TYPE "SermonMediaType";

-- ─── Devotion ───────────────────────────────────────────────────────────────

CREATE TABLE "Devotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "scriptureRef" TEXT NOT NULL,
    "scriptureQuote" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Devotion_publishOn_idx" ON "Devotion"("publishOn");

ALTER TABLE "Devotion" ADD CONSTRAINT "Devotion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
