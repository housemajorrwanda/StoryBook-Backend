-- CreateTable
CREATE TABLE "family_trees" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" SERIAL NOT NULL,
    "familyTreeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "birthDate" TEXT,
    "deathDate" TEXT,
    "bio" TEXT,
    "gender" TEXT,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "testimonyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_relations" (
    "id" SERIAL NOT NULL,
    "familyTreeId" INTEGER NOT NULL,
    "fromMemberId" INTEGER NOT NULL,
    "toMemberId" INTEGER NOT NULL,
    "relationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "family_trees_userId_idx" ON "family_trees"("userId");

-- CreateIndex
CREATE INDEX "family_trees_isPublic_idx" ON "family_trees"("isPublic");

-- CreateIndex
CREATE INDEX "family_members_familyTreeId_idx" ON "family_members"("familyTreeId");

-- CreateIndex
CREATE INDEX "family_members_testimonyId_idx" ON "family_members"("testimonyId");

-- CreateIndex
CREATE INDEX "family_relations_familyTreeId_idx" ON "family_relations"("familyTreeId");

-- CreateIndex
CREATE INDEX "family_relations_fromMemberId_idx" ON "family_relations"("fromMemberId");

-- CreateIndex
CREATE INDEX "family_relations_toMemberId_idx" ON "family_relations"("toMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "family_relations_fromMemberId_toMemberId_relationType_key" ON "family_relations"("fromMemberId", "toMemberId", "relationType");

-- AddForeignKey
ALTER TABLE "family_trees" ADD CONSTRAINT "family_trees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_familyTreeId_fkey" FOREIGN KEY ("familyTreeId") REFERENCES "family_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relations" ADD CONSTRAINT "family_relations_familyTreeId_fkey" FOREIGN KEY ("familyTreeId") REFERENCES "family_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relations" ADD CONSTRAINT "family_relations_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relations" ADD CONSTRAINT "family_relations_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
