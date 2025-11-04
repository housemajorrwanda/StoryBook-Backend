-- Make location required (NOT NULL)
-- First, update any existing NULL locations to a default value
UPDATE "virtual_tours" SET "location" = 'Unknown' WHERE "location" IS NULL;

-- Alter the column to be NOT NULL
ALTER TABLE "virtual_tours" ALTER COLUMN "location" SET NOT NULL;

