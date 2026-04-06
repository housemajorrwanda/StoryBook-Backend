-- AlterTable
ALTER TABLE "virtual_tours" ADD COLUMN     "backgroundAudioUrl" TEXT,
ADD COLUMN     "backgroundAudioVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
