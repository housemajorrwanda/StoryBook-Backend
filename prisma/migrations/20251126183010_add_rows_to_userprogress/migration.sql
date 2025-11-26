/*
  Warnings:

  - A unique constraint covering the columns `[userId,educationId]` on the table `user_progress` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_progress" ADD COLUMN     "lastAccessedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_userId_educationId_key" ON "user_progress"("userId", "educationId");
