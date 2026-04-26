import { prisma } from '../src/db/prisma';
import { createGoalForUser, listGoalsForUser, updateGoalForUser } from '../src/services/goals';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    goal: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    logEntry: {
      findMany: jest.fn(),
    },
  },
}));

describe('Goal service', () => {
  const mockedPrisma = prisma as unknown as {
    goal: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    logEntry: { findMany: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and evaluates a weekly workout goal', async () => {
    mockedPrisma.goal.create.mockResolvedValue(buildGoal({ metric: 'weekly_workouts', direction: 'at_least', targetValue: 4, windowDays: 7 }));
    mockedPrisma.logEntry.findMany.mockResolvedValue([
      buildWorkout('w1', Date.now() - 1 * day(), 4, 2),
      buildWorkout('w2', Date.now() - 2 * day(), 4, 2),
      buildWorkout('w3', Date.now() - 3 * day(), 4, 2),
    ]);

    const goal = await createGoalForUser('user-1', {
      title: 'Train 4 times',
      metric: 'weekly_workouts',
      direction: 'at_least',
      targetValue: 4,
      windowDays: 7,
    });

    expect(goal.currentValue).toBe(3);
    expect(goal.isMet).toBe(false);
    expect(goal.progress).toBeCloseTo(0.75, 2);
  });

  it('lists and updates a stress ceiling goal', async () => {
    mockedPrisma.goal.findMany.mockResolvedValue([buildGoal({ metric: 'post_workout_stress', direction: 'at_most', targetValue: 2.5, windowDays: 30 })]);
    mockedPrisma.logEntry.findMany.mockResolvedValue([
      buildWorkout('w1', Date.now() - 1 * day(), 4, 2),
      buildWorkout('w2', Date.now() - 2 * day(), 3, 2),
    ]);

    const goals = await listGoalsForUser('user-1');
    expect(goals[0].isMet).toBe(true);

    mockedPrisma.goal.findFirst.mockResolvedValue(buildGoal({ metric: 'post_workout_stress', direction: 'at_most', targetValue: 2.5, windowDays: 30 }));
    mockedPrisma.goal.update.mockResolvedValue(buildGoal({ metric: 'post_workout_stress', direction: 'at_most', targetValue: 2, windowDays: 30, status: 'completed' }));

    const updated = await updateGoalForUser('user-1', 'goal-1', { targetValue: 2, status: 'completed' });
    expect(updated?.status).toBe('completed');
    expect(updated?.targetValue).toBe(2);
  });
});

const day = () => 24 * 60 * 60 * 1000;

function buildGoal(overrides: Partial<{ metric: any; direction: any; targetValue: number; windowDays: number; status: any }> = {}) {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Keep stress low',
    metric: overrides.metric ?? 'weekly_workouts',
    direction: overrides.direction ?? 'at_least',
    targetValue: overrides.targetValue ?? 4,
    windowDays: overrides.windowDays ?? 7,
    note: null,
    status: overrides.status ?? 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildWorkout(id: string, timestamp: number, postEnergy: number, postStress: number) {
  const occurredAt = new Date(timestamp);
  return {
    id,
    userId: 'user-1',
    type: 'workout',
    rawText: `Workout ${id}`,
    occurredAt,
    createdAt: occurredAt,
    feelings: [
      { id: `${id}-pre`, logEntryId: id, when: 'pre', valence: 3, energy: 3, stress: 3, notes: null, createdAt: occurredAt },
      { id: `${id}-post`, logEntryId: id, when: 'post', valence: 4, energy: postEnergy, stress: postStress, notes: null, createdAt: occurredAt },
    ],
  };
}