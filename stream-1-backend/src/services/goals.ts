import type { FeelingEntry, Goal, GoalDirection, GoalMetric, GoalStatus, LogEntry } from '@prisma/client';
import { prisma } from '../db/prisma';

type DatabaseEntry = LogEntry & { feelings: FeelingEntry[] };

export type GoalProgress = {
  id: string;
  title: string;
  metric: GoalMetric;
  direction: GoalDirection;
  targetValue: number;
  currentValue: number;
  progress: number;
  windowDays: number;
  note: string | null;
  status: GoalStatus;
  isMet: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateGoalInput = {
  title: string;
  metric: GoalMetric;
  direction: GoalDirection;
  targetValue: number;
  windowDays: number;
  note?: string | null;
};

export type UpdateGoalInput = Partial<CreateGoalInput> & {
  status?: GoalStatus;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const clampUnit = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(3))));

const getWindowStart = (windowDays: number) => new Date(Date.now() - windowDays * DAY_MS);

const normalizeRecoveryQuality = (energy: number, stress: number, valence: number) =>
  (energy + (6 - stress) + valence) / 15;

const computeCurrentValue = (goal: Goal, entries: DatabaseEntry[]) => {
  const windowStart = getWindowStart(goal.windowDays);
  const windowEntries = entries.filter((entry) => entry.occurredAt >= windowStart);
  const workouts = windowEntries.filter((entry) => entry.type === 'workout');

  switch (goal.metric) {
    case 'weekly_workouts':
      return workouts.length;
    case 'active_days':
      return new Set(windowEntries.map((entry) => entry.occurredAt.toISOString().split('T')[0])).size;
    case 'post_workout_energy': {
      const postFeelings = workouts.map((entry) => entry.feelings.find((feeling) => feeling.when === 'post')?.energy).filter((value): value is number => typeof value === 'number');
      return postFeelings.length ? Number((postFeelings.reduce((sum, value) => sum + value, 0) / postFeelings.length).toFixed(2)) : 0;
    }
    case 'post_workout_stress': {
      const postFeelings = workouts.map((entry) => entry.feelings.find((feeling) => feeling.when === 'post')?.stress).filter((value): value is number => typeof value === 'number');
      return postFeelings.length ? Number((postFeelings.reduce((sum, value) => sum + value, 0) / postFeelings.length).toFixed(2)) : 0;
    }
    case 'recovery_quality': {
      const sorted = [...workouts].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
      const recoveryValues: number[] = [];
      for (let index = 0; index < sorted.length - 1; index += 1) {
        const nextPre = sorted[index + 1].feelings.find((feeling) => feeling.when === 'pre');
        if (nextPre) {
          recoveryValues.push(normalizeRecoveryQuality(nextPre.energy, nextPre.stress, nextPre.valence));
        }
      }
      return recoveryValues.length ? Number((recoveryValues.reduce((sum, value) => sum + value, 0) / recoveryValues.length).toFixed(2)) : 0;
    }
    default:
      return 0;
  }
};

const toGoalProgress = (goal: Goal, entries: DatabaseEntry[]): GoalProgress => {
  const currentValue = computeCurrentValue(goal, entries);
  const isMet = goal.direction === 'at_least' ? currentValue >= goal.targetValue : currentValue <= goal.targetValue;
  const progress = goal.direction === 'at_least'
    ? clampUnit(goal.targetValue === 0 ? 1 : currentValue / goal.targetValue)
    : clampUnit(currentValue <= goal.targetValue ? 1 : goal.targetValue / Math.max(currentValue, 0.01));

  return {
    id: goal.id,
    title: goal.title,
    metric: goal.metric,
    direction: goal.direction,
    targetValue: goal.targetValue,
    currentValue,
    progress,
    windowDays: goal.windowDays,
    note: goal.note,
    status: goal.status,
    isMet,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
};

const getEntriesForGoalTracking = (userId: string, maxWindowDays: number) =>
  prisma.logEntry.findMany({
    where: {
      userId,
      occurredAt: {
        gte: getWindowStart(maxWindowDays),
      },
    },
    include: { feelings: true },
    orderBy: { occurredAt: 'asc' },
  });

export const listGoalsForUser = async (userId: string) => {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  const maxWindowDays = goals.length ? Math.max(...goals.map((goal) => goal.windowDays)) : 30;
  const entries = await getEntriesForGoalTracking(userId, maxWindowDays);
  return goals.map((goal) => toGoalProgress(goal, entries));
};

export const createGoalForUser = async (userId: string, input: CreateGoalInput) => {
  const goal = await prisma.goal.create({
    data: {
      userId,
      title: input.title,
      metric: input.metric,
      direction: input.direction,
      targetValue: input.targetValue,
      windowDays: input.windowDays,
      note: input.note ?? null,
    },
  });

  const entries = await getEntriesForGoalTracking(userId, input.windowDays);
  return toGoalProgress(goal, entries);
};

export const updateGoalForUser = async (userId: string, goalId: string, input: UpdateGoalInput) => {
  const existingGoal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existingGoal) {
    return null;
  }

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      title: input.title,
      metric: input.metric,
      direction: input.direction,
      targetValue: input.targetValue,
      windowDays: input.windowDays,
      note: input.note === undefined ? undefined : input.note ?? null,
      status: input.status,
    },
  });

  const entries = await getEntriesForGoalTracking(userId, goal.windowDays);
  return toGoalProgress(goal, entries);
};