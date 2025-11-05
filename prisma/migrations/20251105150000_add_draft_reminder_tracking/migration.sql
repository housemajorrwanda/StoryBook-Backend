-- Add field to track when last reminder email was sent for drafts
ALTER TABLE "testimonies" 
ADD COLUMN IF NOT EXISTS "lastReminderSentAt" TIMESTAMP(3);

