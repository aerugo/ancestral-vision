-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('TOUR', 'ADD_SELF', 'ADD_PARENTS', 'ADD_GRANDPARENTS', 'AHA_MOMENT');

-- CreateEnum
CREATE TYPE "NameOrder" AS ENUM ('WESTERN', 'EASTERN', 'PATRONYMIC', 'PATRONYMIC_SUFFIX', 'MATRONYMIC');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ParentType" AS ENUM ('BIOLOGICAL', 'ADOPTIVE', 'FOSTER', 'STEP', 'GUARDIAN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('PRIVATE', 'CONNECTIONS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'DOCUMENT', 'AUDIO');

-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('NONE', 'PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('DOCUMENT', 'BOOK', 'WEBSITE', 'INTERVIEW', 'PHOTOGRAPH', 'NEWSPAPER', 'CENSUS', 'FAMILY_BIBLE', 'ORAL_HISTORY', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ConnectionPermission" AS ENUM ('FAMILY', 'RESEARCHER');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('AUTOMATIC', 'MANUAL', 'PROPAGATED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'PENDING', 'ACCEPTED', 'REJECTED', 'BROKEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "deletionScheduledFor" TIMESTAMP(3),
    "preferences" JSONB NOT NULL DEFAULT '{"theme":"dark","defaultPrivacy":"private","defaultView":"3d","speculationEnabled":true,"emailNotifications":true,"emailDigestFrequency":"daily","notifyConnectionRequests":true,"notifyMatchSuggestions":true,"notifySharedContentUpdates":true,"notifyBillingAlerts":true}',
    "subscription" JSONB NOT NULL DEFAULT '{"plan":"free","status":"active"}',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageTracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "aiOperationsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiOperationsLimit" INTEGER NOT NULL DEFAULT 15,
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "storageLimitBytes" BIGINT NOT NULL DEFAULT 262144000,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStep" "OnboardingStep" NOT NULL DEFAULT 'TOUR',
    "completedSteps" "OnboardingStep"[],
    "savedData" JSONB,
    "hasCompletedTour" BOOLEAN NOT NULL DEFAULT false,
    "tourSkipped" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constellation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "centeredPersonId" TEXT,
    "personCount" INTEGER NOT NULL DEFAULT 0,
    "generationSpan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "surname" TEXT,
    "maidenName" TEXT,
    "patronymic" TEXT,
    "matronymic" TEXT,
    "nickname" TEXT,
    "suffix" TEXT,
    "nameOrder" "NameOrder" NOT NULL DEFAULT 'WESTERN',
    "displayName" TEXT NOT NULL,
    "gender" "Gender",
    "birthDate" JSONB,
    "deathDate" JSONB,
    "birthPlace" JSONB,
    "deathPlace" JSONB,
    "biography" TEXT,
    "speculative" BOOLEAN NOT NULL DEFAULT false,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentChildRelationship" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "relationshipType" "ParentType" NOT NULL DEFAULT 'BIOLOGICAL',
    "isPreferred" BOOLEAN NOT NULL DEFAULT true,
    "startDate" JSONB,
    "endDate" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ParentChildRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpouseRelationship" (
    "id" TEXT NOT NULL,
    "person1Id" TEXT NOT NULL,
    "person2Id" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "marriageDate" JSONB,
    "marriagePlace" JSONB,
    "divorceDate" JSONB,
    "description" TEXT,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SpouseRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "date" JSONB,
    "location" JSONB,
    "primaryPersonId" TEXT NOT NULL,
    "privacy" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "referencedPersonIds" TEXT[],
    "privacy" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersions" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "thumbnails" JSONB,
    "title" TEXT,
    "description" TEXT,
    "dateTaken" JSONB,
    "duration" INTEGER,
    "transcription" TEXT,
    "transcriptionJson" TEXT,
    "transcriptionStatus" "TranscriptionStatus" NOT NULL DEFAULT 'NONE',
    "speakerLabels" JSONB,
    "exifData" JSONB,
    "hash" TEXT,
    "privacy" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPerson" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "MediaPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "publicationDate" JSONB,
    "url" TEXT,
    "citation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "constellationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "permissionLevel" "ConnectionPermission" NOT NULL DEFAULT 'RESEARCHER',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "person1Id" TEXT NOT NULL,
    "constellation1Id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "person2Id" TEXT NOT NULL,
    "constellation2Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "confidenceBreakdown" JSONB,
    "matchedBy" "MatchMethod" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "user1Status" TEXT NOT NULL DEFAULT 'pending',
    "user2Status" TEXT NOT NULL DEFAULT 'pending',
    "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user1RespondedAt" TIMESTAMP(3),
    "user2RespondedAt" TIMESTAMP(3),
    "brokenAt" TIMESTAMP(3),
    "brokenBy" TEXT,
    "cooldownUntil" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UsageTracking_userId_key" ON "UsageTracking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Constellation_ownerId_key" ON "Constellation"("ownerId");

-- CreateIndex
CREATE INDEX "Person_constellationId_idx" ON "Person"("constellationId");

-- CreateIndex
CREATE INDEX "Person_constellationId_deletedAt_idx" ON "Person"("constellationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ParentChildRelationship_childId_idx" ON "ParentChildRelationship"("childId");

-- CreateIndex
CREATE INDEX "ParentChildRelationship_childId_isPreferred_idx" ON "ParentChildRelationship"("childId", "isPreferred");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChildRelationship_parentId_childId_key" ON "ParentChildRelationship"("parentId", "childId");

-- CreateIndex
CREATE INDEX "SpouseRelationship_person1Id_idx" ON "SpouseRelationship"("person1Id");

-- CreateIndex
CREATE INDEX "SpouseRelationship_person2Id_idx" ON "SpouseRelationship"("person2Id");

-- CreateIndex
CREATE UNIQUE INDEX "SpouseRelationship_person1Id_person2Id_key" ON "SpouseRelationship"("person1Id", "person2Id");

-- CreateIndex
CREATE INDEX "Event_primaryPersonId_idx" ON "Event"("primaryPersonId");

-- CreateIndex
CREATE INDEX "Event_constellationId_idx" ON "Event"("constellationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_personId_key" ON "EventParticipant"("eventId", "personId");

-- CreateIndex
CREATE INDEX "Note_personId_idx" ON "Note"("personId");

-- CreateIndex
CREATE INDEX "Media_constellationId_idx" ON "Media"("constellationId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPerson_mediaId_personId_key" ON "MediaPerson"("mediaId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_constellationId_isActive_idx" ON "ShareLink"("constellationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_user1Id_user2Id_key" ON "Connection"("user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "Match_user1Id_user2Id_idx" ON "Match"("user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- AddForeignKey
ALTER TABLE "UsageTracking" ADD CONSTRAINT "UsageTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constellation" ADD CONSTRAINT "Constellation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChildRelationship_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChildRelationship_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChildRelationship_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpouseRelationship" ADD CONSTRAINT "SpouseRelationship_person1Id_fkey" FOREIGN KEY ("person1Id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpouseRelationship" ADD CONSTRAINT "SpouseRelationship_person2Id_fkey" FOREIGN KEY ("person2Id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpouseRelationship" ADD CONSTRAINT "SpouseRelationship_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_primaryPersonId_fkey" FOREIGN KEY ("primaryPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPerson" ADD CONSTRAINT "MediaPerson_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPerson" ADD CONSTRAINT "MediaPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "Constellation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
