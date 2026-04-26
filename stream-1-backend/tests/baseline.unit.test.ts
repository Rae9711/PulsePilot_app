import { recomputeBaselinesForUser, getTrendSnapshot } from '../src/services/baseline';
import { prisma } from '../src/db/prisma';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    feelingEntry: { findMany: jest.fn() },
    baselineMetric: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
    logEntry: { findMany: jest.fn() }
  }
}));

jest.mock('../src/services/insights', () => ({
  evaluateInsightsForUser: jest.fn()
}));

describe('Baseline service', () => {
  const mockedPrisma = prisma as unknown as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recomputes baselines and calls upsert and evaluateInsightsForUser', async () => {
    mockedPrisma.feelingEntry.findMany.mockResolvedValue([{ energy: 4, valence: 4, stress: 2 }]);
    mockedPrisma.baselineMetric.upsert.mockResolvedValue({});

    await recomputeBaselinesForUser('user-1');

    expect(mockedPrisma.feelingEntry.findMany).toHaveBeenCalled();
    expect(mockedPrisma.baselineMetric.upsert).toHaveBeenCalled();
  });

  it('getTrendSnapshot returns baselines and recent entries', async () => {
    const baseline = { id: 'b1', userId: 'user-1', scope: 'workout', metric: 'post_energy', value: 3.5, dataPoints: 2, windowDays: 7, updatedAt: new Date() };
    const entry = { id: 'e1', userId: 'user-1', type: 'workout', occurredAt: new Date(), createdAt: new Date(), feelings: [{ id: 'f1', when: 'post', energy: 4, valence: 4, stress: 2, createdAt: new Date() }] };

    mockedPrisma.baselineMetric.findMany.mockResolvedValue([baseline]);
    mockedPrisma.logEntry.findMany.mockResolvedValue([entry]);

    const snapshot = await getTrendSnapshot('user-1', 7);

    expect(snapshot.baselines).toBeDefined();
    expect(snapshot.recent).toBeDefined();
    expect(snapshot.baselines[0].metric).toBe(baseline.metric);
  });
});
