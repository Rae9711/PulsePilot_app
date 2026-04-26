-- CreateEnum
CREATE TYPE "LogEntryType" AS ENUM ('workout', 'meal');

-- CreateEnum
CREATE TYPE "FeelingWhen" AS ENUM ('pre', 'post');

-- CreateEnum
CREATE TYPE "ActivityIntensity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "BaselineScope" AS ENUM ('workout', 'meal', 'mood');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LogEntryType" NOT NULL,
    "rawText" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeelingEntry" (
    "id" TEXT NOT NULL,
    "logEntryId" TEXT NOT NULL,
    "when" "FeelingWhen" NOT NULL,
    "valence" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeelingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedEntry" (
    "id" TEXT NOT NULL,
    "logEntryId" TEXT NOT NULL,
    "activityType" TEXT,
    "durationMin" INTEGER,
    "intensity" "ActivityIntensity",
    "mealType" "MealType",
    "foodTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaselineMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "BaselineScope" NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaselineMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "supportingStats" JSONB NOT NULL,
    "ruleName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LogEntry_userId_occurredAt_idx" ON "LogEntry"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "FeelingEntry_logEntryId_idx" ON "FeelingEntry"("logEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedEntry_logEntryId_key" ON "ParsedEntry"("logEntryId");

-- CreateIndex
CREATE INDEX "BaselineMetric_userId_scope_windowDays_idx" ON "BaselineMetric"("userId", "scope", "windowDays");

-- CreateIndex
CREATE INDEX "Insight_userId_isActive_idx" ON "Insight"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_userId_type_ruleName_key" ON "Insight"("userId", "type", "ruleName");

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeelingEntry" ADD CONSTRAINT "FeelingEntry_logEntryId_fkey" FOREIGN KEY ("logEntryId") REFERENCES "LogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedEntry" ADD CONSTRAINT "ParsedEntry_logEntryId_fkey" FOREIGN KEY ("logEntryId") REFERENCES "LogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaselineMetric" ADD CONSTRAINT "BaselineMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
