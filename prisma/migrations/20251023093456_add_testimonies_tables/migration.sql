-- CreateTable
CREATE TABLE "testimonies" (
    "id" SERIAL NOT NULL,
    "submissionType" TEXT NOT NULL,
    "identityPreference" TEXT NOT NULL,
    "fullName" TEXT,
    "relationToEvent" TEXT,
    "nameOfRelative" TEXT,
    "location" TEXT,
    "dateOfEvent" TIMESTAMP(3),
    "eventTitle" TEXT NOT NULL,
    "eventDescription" TEXT,
    "fullTestimony" TEXT,
    "audioUrl" TEXT,
    "audioFileName" TEXT,
    "audioDuration" INTEGER,
    "videoUrl" TEXT,
    "videoFileName" TEXT,
    "videoDuration" INTEGER,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_images" (
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

-- CreateIndex
CREATE INDEX "testimonies_userId_idx" ON "testimonies"("userId");

-- CreateIndex
CREATE INDEX "testimonies_submissionType_idx" ON "testimonies"("submissionType");

-- CreateIndex
CREATE INDEX "testimonies_status_idx" ON "testimonies"("status");

-- CreateIndex
CREATE INDEX "testimony_images_testimonyId_idx" ON "testimony_images"("testimonyId");

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_images" ADD CONSTRAINT "testimony_images_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
