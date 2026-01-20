-- CreateEnum
CREATE TYPE "AISuggestionType" AS ENUM ('BIOGRAPHY', 'CORRECTION', 'EXTRACTION', 'DEDUPLICATION');

-- CreateEnum
CREATE TYPE "AISuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AISuggestion" (
    "id" TEXT NOT NULL,
    "type" "AISuggestionType" NOT NULL,
    "status" "AISuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "personId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "AISuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AISuggestion_personId_status_idx" ON "AISuggestion"("personId", "status");

-- CreateIndex
CREATE INDEX "AISuggestion_userId_status_idx" ON "AISuggestion"("userId", "status");

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
