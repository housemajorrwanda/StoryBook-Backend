-- AlterTable
ALTER TABLE "testimonies" 
  ADD COLUMN "adminFeedback" TEXT,
  ADD COLUMN "reportReason" TEXT,
  ADD COLUMN "reviewedBy" INTEGER,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
