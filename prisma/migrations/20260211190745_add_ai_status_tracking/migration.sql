-- AlterTable
ALTER TABLE "testimonies" ADD COLUMN     "embeddingError" TEXT,
ADD COLUMN     "embeddingStatus" TEXT,
ADD COLUMN     "mediaContentHash" TEXT,
ADD COLUMN     "transcriptionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transcriptionCompletedAt" TIMESTAMP(3),
ADD COLUMN     "transcriptionError" TEXT,
ADD COLUMN     "transcriptionStartedAt" TIMESTAMP(3),
ADD COLUMN     "transcriptionStatus" TEXT;
