-- Add missing columns to testimonies table
-- First, drop the old dateOfEvent column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'testimonies' AND column_name = 'dateOfEvent'
  ) THEN
    ALTER TABLE "testimonies" DROP COLUMN "dateOfEvent";
  END IF;
END $$;

-- Add date range columns
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "dateOfEventFrom" TIMESTAMP(3);
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "dateOfEventTo" TIMESTAMP(3);

-- Add draft support columns
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "draftCursorPosition" INTEGER;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "draftLastSavedAt" TIMESTAMP(3);

-- Add edit cadence control columns
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3);
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "lastPublishedAt" TIMESTAMP(3);
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "nextEditableAt" TIMESTAMP(3);

-- Add AI text artifact columns
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "transcript" TEXT;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "keyPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add admin action columns
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "adminFeedback" TEXT;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "reportReason" TEXT;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "reviewedBy" INTEGER;
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- Make userId nullable (if it's not already)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'testimonies' AND column_name = 'userId' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "testimonies" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END $$;

