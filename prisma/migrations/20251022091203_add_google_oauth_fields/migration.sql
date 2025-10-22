/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" 
  ALTER COLUMN "password" DROP NOT NULL,
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "avatar" TEXT,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");