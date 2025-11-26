-- CreateTable
CREATE TABLE "educational_content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "duration" INTEGER,
    "category" TEXT,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_simulations" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scenario" TEXT,
    "simulationType" TEXT NOT NULL,
    "backgroundImage" TEXT,
    "educationId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "testimonyId" INTEGER,
    "educationId" INTEGER,
    "simulationId" INTEGER,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "educational_content_userId_idx" ON "educational_content"("userId");

-- CreateIndex
CREATE INDEX "educational_content_type_idx" ON "educational_content"("type");

-- CreateIndex
CREATE INDEX "educational_content_category_idx" ON "educational_content"("category");

-- CreateIndex
CREATE INDEX "educational_content_status_idx" ON "educational_content"("status");

-- CreateIndex
CREATE INDEX "scenario_simulations_educationId_idx" ON "scenario_simulations"("educationId");

-- CreateIndex
CREATE INDEX "user_progress_userId_idx" ON "user_progress"("userId");

-- CreateIndex
CREATE INDEX "user_progress_contentType_idx" ON "user_progress"("contentType");

-- CreateIndex
CREATE INDEX "user_progress_isCompleted_idx" ON "user_progress"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_userId_testimonyId_educationId_simulationId_key" ON "user_progress"("userId", "testimonyId", "educationId", "simulationId");

-- AddForeignKey
ALTER TABLE "educational_content" ADD CONSTRAINT "educational_content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_simulations" ADD CONSTRAINT "scenario_simulations_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "educational_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "educational_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "scenario_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
