-- Add password and name columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Remove the temporary default now that the column exists
ALTER TABLE "User" ALTER COLUMN "password" DROP DEFAULT;

-- CreateTable: UserProfile
CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthYear" INTEGER,
    "gender" TEXT,
    "heightCm" DOUBLE PRECISION,
    "currentWeightKg" DOUBLE PRECISION,
    "activityLevel" TEXT,
    "goalType" TEXT,
    "goalWeightKg" DOUBLE PRECISION,
    "goalDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");

ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: WeightLog
CREATE TABLE IF NOT EXISTS "WeightLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WeightLog_userId_loggedAt_idx" ON "WeightLog"("userId", "loggedAt");

ALTER TABLE "WeightLog" ADD CONSTRAINT "WeightLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: FitnessPlan
CREATE TABLE IF NOT EXISTS "FitnessPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bmr" DOUBLE PRECISION NOT NULL,
    "tdee" DOUBLE PRECISION NOT NULL,
    "dailyCalories" DOUBLE PRECISION NOT NULL,
    "dailyProteinG" DOUBLE PRECISION NOT NULL,
    "dailyCarbsG" DOUBLE PRECISION NOT NULL,
    "dailyFatG" DOUBLE PRECISION NOT NULL,
    "calorieDeficit" DOUBLE PRECISION NOT NULL,
    "exercisePlan" JSONB NOT NULL,
    "goalSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitnessPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FitnessPlan_userId_key" ON "FitnessPlan"("userId");

ALTER TABLE "FitnessPlan" ADD CONSTRAINT "FitnessPlan_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: AiChatMessage
CREATE TABLE IF NOT EXISTS "AiChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiChatMessage_userId_createdAt_idx" ON "AiChatMessage"("userId", "createdAt");

ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
