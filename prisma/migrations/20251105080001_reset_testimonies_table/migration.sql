-- Reset testimonies table by dropping and recreating with correct schema
-- WARNING: This will delete ALL testimony data!

-- Delete all related data first (due to foreign keys)
DELETE FROM "testimony_images";
DELETE FROM "testimony_relatives";
DELETE FROM "testimony_media_progress";
DELETE FROM "testimony_events";
DELETE FROM "testimony_locations";
DELETE FROM "testimony_embeddings";
DELETE FROM "testimony_edges";

-- Delete all testimonies
DELETE FROM "testimonies";

-- Drop the table completely
DROP TABLE IF EXISTS "testimonies" CASCADE;

CREATE TABLE "testimonies" (
    "id" SERIAL NOT NULL,
    "submissionType" TEXT NOT NULL,
    "identityPreference" TEXT NOT NULL,
    "fullName" TEXT,
    "relationToEvent" TEXT,
    "nameOfRelative" TEXT,
    "location" TEXT,
    "dateOfEventFrom" TIMESTAMP(3),
    "dateOfEventTo" TIMESTAMP(3),
    "eventTitle" TEXT NOT NULL,
    "eventDescription" TEXT,
    "fullTestimony" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "draftCursorPosition" INTEGER,
    "draftLastSavedAt" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "nextEditableAt" TIMESTAMP(3),
    "audioUrl" TEXT,
    "audioFileName" TEXT,
    "audioDuration" INTEGER,
    "videoUrl" TEXT,
    "videoFileName" TEXT,
    "videoDuration" INTEGER,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "transcript" TEXT,
    "summary" TEXT,
    "keyPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adminFeedback" TEXT,
    "reportReason" TEXT,
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS "testimonies_userId_idx" ON "testimonies"("userId");
CREATE INDEX IF NOT EXISTS "testimonies_submissionType_idx" ON "testimonies"("submissionType");
CREATE INDEX IF NOT EXISTS "testimonies_status_idx" ON "testimonies"("status");

-- Recreate foreign key
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate foreign keys for related tables (they were dropped by CASCADE)
ALTER TABLE "testimony_images" ADD CONSTRAINT IF NOT EXISTS "testimony_images_testimonyId_fkey" 
    FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "testimony_relatives" ADD CONSTRAINT IF NOT EXISTS "testimony_relatives_testimonyId_fkey" 
    FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "testimony_media_progress" ADD CONSTRAINT IF NOT EXISTS "testimony_media_progress_testimonyId_fkey" 
    FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

