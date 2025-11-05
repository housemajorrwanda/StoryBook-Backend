
CREATE TABLE IF NOT EXISTS "relative_types" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "synonyms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "relative_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "relative_types_slug_key" UNIQUE ("slug")
);

-- 2. Create testimony_relatives table
CREATE TABLE IF NOT EXISTS "testimony_relatives" (
    "id" SERIAL NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "relativeTypeId" INTEGER NOT NULL,
    "personName" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "testimony_relatives_pkey" PRIMARY KEY ("id")
);

-- 3. Create indexes for testimony_relatives
CREATE INDEX IF NOT EXISTS "testimony_relatives_testimonyId_idx" ON "testimony_relatives"("testimonyId");
CREATE INDEX IF NOT EXISTS "testimony_relatives_relativeTypeId_idx" ON "testimony_relatives"("relativeTypeId");

-- 4. Create foreign keys
DO $$ 
BEGIN
    -- Foreign key: testimony_relatives -> testimonies
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'testimony_relatives_testimonyId_fkey'
    ) THEN
        ALTER TABLE "testimony_relatives" 
        ADD CONSTRAINT "testimony_relatives_testimonyId_fkey" 
        FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign key: testimony_relatives -> relative_types
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'testimony_relatives_relativeTypeId_fkey'
    ) THEN
        ALTER TABLE "testimony_relatives" 
        ADD CONSTRAINT "testimony_relatives_relativeTypeId_fkey" 
        FOREIGN KEY ("relativeTypeId") REFERENCES "relative_types"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('testimony_relatives', 'relative_types')
ORDER BY table_name;

-- 6. Check if testimony_images exists (create if missing)
CREATE TABLE IF NOT EXISTS "testimony_images" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageFileName" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "testimonyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "testimony_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "testimony_images_testimonyId_idx" ON "testimony_images"("testimonyId");

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'testimony_images_testimonyId_fkey'
    ) THEN
        ALTER TABLE "testimony_images" 
        ADD CONSTRAINT "testimony_images_testimonyId_fkey" 
        FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Check if testimony_media_progress exists (create if missing)
CREATE TABLE IF NOT EXISTS "testimony_media_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "testimony_media_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "testimony_media_progress_userId_testimonyId_key" UNIQUE ("userId", "testimonyId")
);

CREATE INDEX IF NOT EXISTS "testimony_media_progress_userId_idx" ON "testimony_media_progress"("userId");
CREATE INDEX IF NOT EXISTS "testimony_media_progress_testimonyId_idx" ON "testimony_media_progress"("testimonyId");

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'testimony_media_progress_userId_fkey'
    ) THEN
        ALTER TABLE "testimony_media_progress" 
        ADD CONSTRAINT "testimony_media_progress_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'testimony_media_progress_testimonyId_fkey'
    ) THEN
        ALTER TABLE "testimony_media_progress" 
        ADD CONSTRAINT "testimony_media_progress_testimonyId_fkey" 
        FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

