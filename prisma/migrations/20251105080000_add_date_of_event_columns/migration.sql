-- Add dateOfEventFrom and dateOfEventTo columns
-- First, drop the old dateOfEvent column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'testimonies' AND column_name = 'dateOfEvent'
  ) THEN
    ALTER TABLE "testimonies" DROP COLUMN "dateOfEvent";
  END IF;
END $$;

-- Add the new date range columns
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "dateOfEventFrom" TIMESTAMP(3);
ALTER TABLE "testimonies" ADD COLUMN IF NOT EXISTS "dateOfEventTo" TIMESTAMP(3);

