-- AlterTable
ALTER TABLE "testimonies" 
  ADD COLUMN IF NOT EXISTS "impressions" INTEGER NOT NULL DEFAULT 0;
