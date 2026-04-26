import { prisma } from '../src/db/prisma';
import { getPredictionBundleForUser } from '../src/services/predictions';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    logEntry: { findMany: jest.fn() }
  }
}));

describe('Prediction service', () => {
  const mockedPrisma = prisma as unknown as { logEntry: { findMany: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds personalized heuristics and forecasts from user and global workout history', async () => {
    const now = Date.now();
    const userEntries = [
      buildWorkout('user-1', 'w1', now - 2 * 24 * 60 * 60 * 1000, 7, 3, 3, 3, 5, 1, 4, 'Morning run'),
      buildMeal('user-1', 'm1', now - 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000, 9, 'Protein smoothie'),
      buildWorkout('user-1', 'w2', now - 5 * 24 * 60 * 60 * 1000, 7, 3, 3, 2, 4, 2, 4, 'Strength training'),
      buildMeal('user-1', 'm2', now - 5 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000, 6, 'Breakfast oatmeal'),
      buildWorkout('user-1', 'w3', now - 8 * 24 * 60 * 60 * 1000, 21, 2, 4, 2, 2, 4, 2, 'Late night gym'),
      buildWorkout('user-1', 'w4', now - 12 * 24 * 60 * 60 * 1000, 7, 3, 2, 3, 4, 1, 4, 'Tempo run'),
      buildWorkout('user-1', 'w5', now - 15 * 24 * 60 * 60 * 1000, 20, 2, 4, 2, 2, 4, 2, 'Evening HIIT'),
      buildWorkout('user-1', 'w6', now - 18 * 24 * 60 * 60 * 1000, 7, 3, 2, 3, 4, 2, 4, 'Morning yoga')
    ];

    const globalEntries = [
      ...userEntries,
      buildWorkout('user-2', 'g1', now - 3 * 24 * 60 * 60 * 1000, 6, 3, 2, 3, 4, 2, 4, 'Morning cycling'),
      buildMeal('user-2', 'g1m', now - 3 * 24 * 60 * 60 * 1000 + 70 * 60 * 1000, 8, 'Post workout protein shake'),
      buildWorkout('user-2', 'g2', now - 6 * 24 * 60 * 60 * 1000, 22, 2, 4, 2, 2, 4, 2, 'Late workout'),
      buildWorkout('user-3', 'g3', now - 9 * 24 * 60 * 60 * 1000, 8, 4, 2, 3, 5, 1, 4, 'Morning swim'),
      buildWorkout('user-3', 'g4', now - 13 * 24 * 60 * 60 * 1000, 19, 3, 3, 2, 3, 3, 3, 'Evening lift'),
      buildWorkout('user-3', 'g5', now - 16 * 24 * 60 * 60 * 1000, 7, 3, 2, 3, 4, 2, 4, 'Morning run')
    ];

    mockedPrisma.logEntry.findMany
      .mockResolvedValueOnce(userEntries)
      .mockResolvedValueOnce(globalEntries);

    const bundle = await getPredictionBundleForUser('user-1');

    expect(bundle.heuristics.length).toBeGreaterThan(0);
    expect(bundle.defaultScenario.predictions.expectedPostWorkoutEnergy.value).toBeGreaterThan(2.5);
    expect(bundle.defaultScenario.predictions.goodSessionLikelihood.value).toBeGreaterThan(0.4);
    expect(bundle.modelNotes.userWorkoutSamples).toBeGreaterThanOrEqual(6);
    expect(bundle.narrative.headline).toBeTruthy();
  });
});

function buildWorkout(
  userId: string,
  id: string,
  timestamp: number,
  hour: number,
  preEnergy: number,
  preStress: number,
  preValence: number,
  postEnergy: number,
  postStress: number,
  postValence: number,
  rawText: string
) {
  const occurredAt = new Date(timestamp);
  occurredAt.setHours(hour, 0, 0, 0);
  return {
    id,
    userId,
    type: 'workout',
    rawText,
    occurredAt,
    createdAt: occurredAt,
    feelings: [
      { id: `${id}-pre`, logEntryId: id, when: 'pre', valence: preValence, energy: preEnergy, stress: preStress, notes: null, createdAt: occurredAt },
      { id: `${id}-post`, logEntryId: id, when: 'post', valence: postValence, energy: postEnergy, stress: postStress, notes: null, createdAt: occurredAt },
    ],
  };
}

function buildMeal(userId: string, id: string, timestamp: number, hour: number, rawText: string) {
  const occurredAt = new Date(timestamp);
  occurredAt.setHours(hour, 0, 0, 0);
  return {
    id,
    userId,
    type: 'meal',
    rawText,
    occurredAt,
    createdAt: occurredAt,
    feelings: [],
  };
}