-- CreateTable
CREATE TABLE "virtual_tours" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "tourType" TEXT NOT NULL,
    "embedUrl" TEXT,
    "image360Url" TEXT,
    "video360Url" TEXT,
    "model3dUrl" TEXT,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_tour_hotspots" (
    "id" SERIAL NOT NULL,
    "virtualTourId" INTEGER NOT NULL,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "positionZ" DOUBLE PRECISION,
    "pitch" DOUBLE PRECISION,
    "yaw" DOUBLE PRECISION,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "actionUrl" TEXT,
    "actionAudioUrl" TEXT,
    "actionVideoUrl" TEXT,
    "actionImageUrl" TEXT,
    "actionEffect" TEXT,
    "triggerDistance" DOUBLE PRECISION DEFAULT 5.0,
    "autoTrigger" BOOLEAN NOT NULL DEFAULT false,
    "showOnHover" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "size" DOUBLE PRECISION DEFAULT 1.0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_tour_hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_tour_audio_regions" (
    "id" SERIAL NOT NULL,
    "virtualTourId" INTEGER NOT NULL,
    "regionType" TEXT NOT NULL DEFAULT 'sphere',
    "centerX" DOUBLE PRECISION NOT NULL,
    "centerY" DOUBLE PRECISION NOT NULL,
    "centerZ" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "audioUrl" TEXT NOT NULL,
    "audioFileName" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "loop" BOOLEAN NOT NULL DEFAULT true,
    "fadeInDuration" DOUBLE PRECISION DEFAULT 2.0,
    "fadeOutDuration" DOUBLE PRECISION DEFAULT 2.0,
    "spatialAudio" BOOLEAN NOT NULL DEFAULT true,
    "minDistance" DOUBLE PRECISION DEFAULT 1.0,
    "maxDistance" DOUBLE PRECISION DEFAULT 10.0,
    "autoPlay" BOOLEAN NOT NULL DEFAULT true,
    "playOnce" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_tour_audio_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_tour_effects" (
    "id" SERIAL NOT NULL,
    "virtualTourId" INTEGER NOT NULL,
    "effectType" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "positionZ" DOUBLE PRECISION,
    "pitch" DOUBLE PRECISION,
    "yaw" DOUBLE PRECISION,
    "triggerType" TEXT NOT NULL,
    "triggerDistance" DOUBLE PRECISION,
    "triggerDelay" DOUBLE PRECISION DEFAULT 0.0,
    "effectName" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION DEFAULT 1.0,
    "duration" DOUBLE PRECISION,
    "color" TEXT,
    "soundUrl" TEXT,
    "particleCount" INTEGER,
    "opacity" DOUBLE PRECISION DEFAULT 1.0,
    "size" DOUBLE PRECISION DEFAULT 1.0,
    "animationType" TEXT,
    "animationSpeed" DOUBLE PRECISION DEFAULT 1.0,
    "title" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_tour_effects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "virtual_tours_userId_idx" ON "virtual_tours"("userId");

-- CreateIndex
CREATE INDEX "virtual_tours_status_idx" ON "virtual_tours"("status");

-- CreateIndex
CREATE INDEX "virtual_tours_tourType_idx" ON "virtual_tours"("tourType");

-- CreateIndex
CREATE INDEX "virtual_tour_hotspots_virtualTourId_idx" ON "virtual_tour_hotspots"("virtualTourId");

-- CreateIndex
CREATE INDEX "virtual_tour_hotspots_type_idx" ON "virtual_tour_hotspots"("type");

-- CreateIndex
CREATE INDEX "virtual_tour_audio_regions_virtualTourId_idx" ON "virtual_tour_audio_regions"("virtualTourId");

-- CreateIndex
CREATE INDEX "virtual_tour_audio_regions_regionType_idx" ON "virtual_tour_audio_regions"("regionType");

-- CreateIndex
CREATE INDEX "virtual_tour_effects_virtualTourId_idx" ON "virtual_tour_effects"("virtualTourId");

-- CreateIndex
CREATE INDEX "virtual_tour_effects_effectType_idx" ON "virtual_tour_effects"("effectType");

-- CreateIndex
CREATE INDEX "virtual_tour_effects_triggerType_idx" ON "virtual_tour_effects"("triggerType");

-- AddForeignKey
ALTER TABLE "virtual_tours" ADD CONSTRAINT "virtual_tours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_tour_hotspots" ADD CONSTRAINT "virtual_tour_hotspots_virtualTourId_fkey" FOREIGN KEY ("virtualTourId") REFERENCES "virtual_tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_tour_audio_regions" ADD CONSTRAINT "virtual_tour_audio_regions_virtualTourId_fkey" FOREIGN KEY ("virtualTourId") REFERENCES "virtual_tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_tour_effects" ADD CONSTRAINT "virtual_tour_effects_virtualTourId_fkey" FOREIGN KEY ("virtualTourId") REFERENCES "virtual_tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

