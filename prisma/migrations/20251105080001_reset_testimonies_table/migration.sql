-- Reset testimonies table by dropping and recreating with correct schema
-- WARNING: This will delete ALL testimony data!

-- Delete all related data first (due to foreign keys) - only if tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_images') THEN
        DELETE FROM "testimony_images";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_relatives') THEN
        DELETE FROM "testimony_relatives";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_media_progress') THEN
        DELETE FROM "testimony_media_progress";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_events') THEN
        DELETE FROM "testimony_events";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_locations') THEN
        DELETE FROM "testimony_locations";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_embeddings') THEN
        DELETE FROM "testimony_embeddings";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_edges') THEN
        DELETE FROM "testimony_edges";
    END IF;
    
    -- Delete all testimonies if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimonies') THEN
        DELETE FROM "testimonies";
    END IF;
END $$;

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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'testimonies_userId_fkey'
    ) THEN
        ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create testimony_relatives table if it doesn't exist
CREATE TABLE IF NOT EXISTS "testimony_relatives" (
    "id" SERIAL NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "relativeTypeId" INTEGER NOT NULL,
    "personName" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimony_relatives_pkey" PRIMARY KEY ("id")
);

-- Create relative_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS "relative_types" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "synonyms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relative_types_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on relative_types.slug if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'relative_types_slug_key'
    ) THEN
        ALTER TABLE "relative_types" ADD CONSTRAINT "relative_types_slug_key" UNIQUE ("slug");
    END IF;
END $$;

-- Create indexes for testimony_relatives if they don't exist
CREATE INDEX IF NOT EXISTS "testimony_relatives_testimonyId_idx" ON "testimony_relatives"("testimonyId");
CREATE INDEX IF NOT EXISTS "testimony_relatives_relativeTypeId_idx" ON "testimony_relatives"("relativeTypeId");

-- Recreate foreign keys for related tables (they were dropped by CASCADE)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_images') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'testimony_images_testimonyId_fkey'
        ) THEN
            ALTER TABLE "testimony_images" ADD CONSTRAINT "testimony_images_testimonyId_fkey" 
                FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_relatives') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'testimony_relatives_testimonyId_fkey'
        ) THEN
            ALTER TABLE "testimony_relatives" ADD CONSTRAINT "testimony_relatives_testimonyId_fkey" 
                FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'testimony_relatives_relativeTypeId_fkey'
        ) THEN
            ALTER TABLE "testimony_relatives" ADD CONSTRAINT "testimony_relatives_relativeTypeId_fkey" 
                FOREIGN KEY ("relativeTypeId") REFERENCES "relative_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'testimony_media_progress') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'testimony_media_progress_testimonyId_fkey'
        ) THEN
            ALTER TABLE "testimony_media_progress" ADD CONSTRAINT "testimony_media_progress_testimonyId_fkey" 
                FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
