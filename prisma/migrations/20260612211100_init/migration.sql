-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MISSIONARY', 'DEVOTEE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('JOIN', 'LEVEL_CHANGE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('SATSANGA', 'CLASS', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpChannel" AS ENUM ('PHONE_CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'HOME_VISIT', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DEVOTEE',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "mentorId" TEXT,
    "sadhanaLevelId" TEXT,
    "levelTaggedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SadhanaLevel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "summary" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,

    CONSTRAINT "SadhanaLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "assignedById" TEXT,
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "applicantId" TEXT NOT NULL,
    "levelId" TEXT,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'SATSANGA',
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "conductedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "devoteeId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "sikshaLevel" TEXT,
    "remarks" TEXT,
    "markedById" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "devoteeId" TEXT NOT NULL,
    "sessionId" TEXT,
    "channel" "FollowUpChannel" NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "byId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressReport" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "period" "ReportPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "mails" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "homeVisits" INTEGER NOT NULL DEFAULT 0,
    "serviceDonors" INTEGER NOT NULL DEFAULT 0,
    "moneyDonors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_mentorId_idx" ON "User"("mentorId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SadhanaLevel_slug_key" ON "SadhanaLevel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SadhanaLevel_order_key" ON "SadhanaLevel"("order");

-- CreateIndex
CREATE INDEX "LevelHistory_userId_idx" ON "LevelHistory"("userId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_applicantId_idx" ON "Application"("applicantId");

-- CreateIndex
CREATE INDEX "ClassSession_conductedById_date_idx" ON "ClassSession"("conductedById", "date");

-- CreateIndex
CREATE INDEX "Attendance_devoteeId_idx" ON "Attendance"("devoteeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_devoteeId_key" ON "Attendance"("sessionId", "devoteeId");

-- CreateIndex
CREATE INDEX "FollowUp_devoteeId_idx" ON "FollowUp"("devoteeId");

-- CreateIndex
CREATE INDEX "FollowUp_byId_occurredAt_idx" ON "FollowUp"("byId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProgressReport_authorId_periodStart_idx" ON "ProgressReport"("authorId", "periodStart");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sadhanaLevelId_fkey" FOREIGN KEY ("sadhanaLevelId") REFERENCES "SadhanaLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelHistory" ADD CONSTRAINT "LevelHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelHistory" ADD CONSTRAINT "LevelHistory_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "SadhanaLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelHistory" ADD CONSTRAINT "LevelHistory_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "SadhanaLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_devoteeId_fkey" FOREIGN KEY ("devoteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_devoteeId_fkey" FOREIGN KEY ("devoteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
