-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('weekly_workouts', 'active_days', 'post_workout_energy', 'post_workout_stress', 'recovery_quality');

-- CreateEnum
CREATE TYPE "GoalDirection" AS ENUM ('at_least', 'at_most');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "direction" "GoalDirection" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "note" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;