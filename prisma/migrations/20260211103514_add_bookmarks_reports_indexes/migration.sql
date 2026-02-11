-- CreateTable
CREATE TABLE "user_bookmarks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_reports" (
    "id" SERIAL NOT NULL,
    "testimonyId" INTEGER NOT NULL,
    "reportedBy" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimony_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_bookmarks_userId_idx" ON "user_bookmarks"("userId");

-- CreateIndex
CREATE INDEX "user_bookmarks_testimonyId_idx" ON "user_bookmarks"("testimonyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_bookmarks_userId_testimonyId_key" ON "user_bookmarks"("userId", "testimonyId");

-- CreateIndex
CREATE INDEX "testimony_reports_testimonyId_idx" ON "testimony_reports"("testimonyId");

-- CreateIndex
CREATE INDEX "testimony_reports_reportedBy_idx" ON "testimony_reports"("reportedBy");

-- CreateIndex
CREATE INDEX "testimony_reports_status_idx" ON "testimony_reports"("status");

-- CreateIndex
CREATE INDEX "testimonies_status_isPublished_idx" ON "testimonies"("status", "isPublished");

-- CreateIndex
CREATE INDEX "testimonies_userId_status_idx" ON "testimonies"("userId", "status");

-- CreateIndex
CREATE INDEX "testimonies_createdAt_status_idx" ON "testimonies"("createdAt" DESC, "status");

-- CreateIndex
CREATE INDEX "testimony_edges_fromId_score_idx" ON "testimony_edges"("fromId", "score" DESC);

-- CreateIndex
CREATE INDEX "testimony_edges_toId_score_idx" ON "testimony_edges"("toId", "score" DESC);

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_reports" ADD CONSTRAINT "testimony_reports_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_reports" ADD CONSTRAINT "testimony_reports_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
