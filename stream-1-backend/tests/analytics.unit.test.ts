import { prisma } from '../src/db/prisma';
import { getAnalyticsBundleForUser } from '../src/services/analytics';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    logEntry: { findMany: jest.fn() },
  },
}));

describe('Analytics service', () => {
  const mockedPrisma = prisma as unknown as { logEntry: { findMany: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correlations, predictive insights, and recurring patterns from workout history', async () => {
    const now = Date.now();
    mockedPrisma.logEntry.findMany.mockResolvedValue([
      buildWorkout('w1', now - 2 * day(), 7, 3, 2, 3, 5, 1, 4),
      buildMeal('m1', now - 2 * day() - 60 * 60 * 1000, 6, 'Breakfast oatmeal'),
      buildMeal('m2', now - 2 * day() + 90 * 60 * 1000, 9, 'Protein shake'),
      buildWorkout('w2', now - 5 * day(), 21, 2, 4, 2, 2, 4, 2),
      buildWorkout('w3', now - 8 * day(), 7, 3, 2, 3, 4, 2, 4),
      buildMeal('m3', now - 8 * day() - 90 * 60 * 1000, 6, 'Yogurt and toast'),
      buildWorkout('w4', now - 12 * day(), 20, 2, 4, 2, 2, 4, 2),
      buildWorkout('w5', now - 16 * day(), 8, 3, 2, 3, 4, 2, 4),
      buildWorkout('w6', now - 22 * day(), 7, 4, 1, 3, 5, 1, 4),
    ]);

    const bundle = await getAnalyticsBundleForUser('user-1', 30);

    expect(bundle.correlations.length).toBeGreaterThan(0);
    expect(bundle.predictiveInsights.length).toBe(3);
    expect(bundle.recurringPatterns.length).toBeGreaterThan(0);
    expect(bundle.summary.completeWorkoutSamples).toBeGreaterThanOrEqual(5);
  });
});

const day = () => 24 * 60 * 60 * 1000;

function buildWorkout(
  id: string,
  timestamp: number,
  hour: number,
  preEnergy: number,
  preStress: number,
  preValence: number,
  postEnergy: number,
  postStress: number,
  postValence: number
) {
  const occurredAt = new Date(timestamp);
  occurredAt.setHours(hour, 0, 0, 0);
  return {
    id,
    userId: 'user-1',
    type: 'workout',
    rawText: `Workout ${id}`,
    occurredAt,
    createdAt: occurredAt,
    feelings: [
      { id: `${id}-pre`, logEntryId: id, when: 'pre', valence: preValence, energy: preEnergy, stress: preStress, notes: null, createdAt: occurredAt },
      { id: `${id}-post`, logEntryId: id, when: 'post', valence: postValence, energy: postEnergy, stress: postStress, notes: null, createdAt: occurredAt },
    ],
  };
}

function buildMeal(id: string, timestamp: number, hour: number, rawText: string) {
  const occurredAt = new Date(timestamp);
  occurredAt.setHours(hour, 0, 0, 0);
  return {
    id,
    userId: 'user-1',
    type: 'meal',
    rawText,
    occurredAt,
    createdAt: occurredAt,
    feelings: [],
  };
}