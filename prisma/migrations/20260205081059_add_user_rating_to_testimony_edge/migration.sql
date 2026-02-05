/*
  Warnings:

  - Added the required column `updatedAt` to the `testimony_edges` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "testimony_edges" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userRating" INTEGER;

-- CreateIndex
CREATE INDEX "testimony_edges_userRating_idx" ON "testimony_edges"("userRating");
