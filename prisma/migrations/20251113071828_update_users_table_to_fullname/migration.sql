/*
  Warnings:

  - You are about to drop the column `firstName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."users_username_key";

-- AlterTable
ALTER TABLE "testimonies" ALTER COLUMN "keyPhrases" DROP DEFAULT;

-- AlterTable
-- Add new columns first
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "fullName" TEXT,
ADD COLUMN IF NOT EXISTS "residentPlace" TEXT,
ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

-- Then, combine firstName and lastName into fullName if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'firstName') THEN
        -- Combine firstName and lastName into fullName
        UPDATE "users" 
        SET "fullName" = TRIM(
            COALESCE("firstName", '') || 
            CASE WHEN "firstName" IS NOT NULL AND "lastName" IS NOT NULL THEN ' ' ELSE '' END || 
            COALESCE("lastName", '')
        )
        WHERE "fullName" IS NULL OR "fullName" = '';
    END IF;
END $$;

-- Drop old columns if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'firstName') THEN
        ALTER TABLE "users" DROP COLUMN "firstName";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastName') THEN
        ALTER TABLE "users" DROP COLUMN "lastName";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE "users" DROP COLUMN "username";
    END IF;
END $$;

-- CreateTable
CREATE TABLE "testimony_media_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimony_media_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_locations" (
    "id" SERIAL NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "notes" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimony_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "aliases" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_events" (
    "id" SERIAL NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "notes" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimony_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_embeddings" (
    "id" SERIAL NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimony_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_edges" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimony_edges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimony_media_progress_userId_idx" ON "testimony_media_progress"("userId");

-- CreateIndex
CREATE INDEX "testimony_media_progress_testimonyId_idx" ON "testimony_media_progress"("testimonyId");

-- CreateIndex
CREATE UNIQUE INDEX "testimony_media_progress_userId_testimonyId_key" ON "testimony_media_progress"("userId", "testimonyId");

-- CreateIndex
CREATE INDEX "locations_normalizedName_idx" ON "locations"("normalizedName");

-- CreateIndex
CREATE INDEX "testimony_locations_testimonyId_idx" ON "testimony_locations"("testimonyId");

-- CreateIndex
CREATE INDEX "testimony_locations_locationId_idx" ON "testimony_locations"("locationId");

-- CreateIndex
CREATE INDEX "events_title_idx" ON "events"("title");

-- CreateIndex
CREATE INDEX "testimony_events_testimonyId_idx" ON "testimony_events"("testimonyId");

-- CreateIndex
CREATE INDEX "testimony_events_eventId_idx" ON "testimony_events"("eventId");

-- CreateIndex
CREATE INDEX "testimony_embeddings_testimonyId_idx" ON "testimony_embeddings"("testimonyId");

-- CreateIndex
CREATE INDEX "testimony_embeddings_model_idx" ON "testimony_embeddings"("model");

-- CreateIndex
CREATE INDEX "testimony_embeddings_section_idx" ON "testimony_embeddings"("section");

-- CreateIndex
CREATE INDEX "testimony_edges_fromId_idx" ON "testimony_edges"("fromId");

-- CreateIndex
CREATE INDEX "testimony_edges_toId_idx" ON "testimony_edges"("toId");

-- CreateIndex
CREATE INDEX "testimony_edges_type_idx" ON "testimony_edges"("type");

-- AddForeignKey
ALTER TABLE "testimony_media_progress" ADD CONSTRAINT "testimony_media_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_media_progress" ADD CONSTRAINT "testimony_media_progress_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_locations" ADD CONSTRAINT "testimony_locations_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_locations" ADD CONSTRAINT "testimony_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_events" ADD CONSTRAINT "testimony_events_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_events" ADD CONSTRAINT "testimony_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_embeddings" ADD CONSTRAINT "testimony_embeddings_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_edges" ADD CONSTRAINT "testimony_edges_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_edges" ADD CONSTRAINT "testimony_edges_toId_fkey" FOREIGN KEY ("toId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
