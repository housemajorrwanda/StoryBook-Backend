-- Add fullName column to users table
ALTER TABLE "users" ADD COLUMN "fullName" TEXT;

-- Remove firstName and lastName columns if they exist
ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";

-- Add residentPlace column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "residentPlace" TEXT;

-- Add Google OAuth columns if they don't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'local';

-- Add password reset columns if they don't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_resetToken_key" ON "users"("resetToken");

-- Make password nullable for Google OAuth users
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
