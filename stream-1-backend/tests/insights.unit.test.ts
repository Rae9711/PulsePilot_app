import { listInsightsForUser, upsertInsightFromRule, evaluateInsightsForUser } from '../src/services/insights';
import { prisma } from '../src/db/prisma';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    insight: { findMany: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
    baselineMetric: { findMany: jest.fn() },
    logEntry: { findMany: jest.fn() }
  }
}));

describe('Insights service', () => {
  const mockedPrisma = prisma as unknown as any;

  beforeEach(() => jest.clearAllMocks());

  it('lists insights for user', async () => {
    const row = { id: 'i1', userId: 'user-1', type: 't', summary: 's', supportingStats: {}, ruleName: 'r', createdAt: new Date(), isActive: true };
    mockedPrisma.insight.findMany.mockResolvedValue([row]);

    const listed = await listInsightsForUser('user-1', 5);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(row.id);
  });

  it('upserts insight from rule', async () => {
    const upserted = { id: 'i2', userId: 'user-1', type: 't', summary: 'x', supportingStats: {}, ruleName: 'r', createdAt: new Date(), isActive: true };
    mockedPrisma.insight.upsert.mockResolvedValue(upserted);

    const result = await upsertInsightFromRule({ userId: 'user-1', type: 't', summary: 'x', supportingStats: {}, ruleName: 'r' });
    expect(result).toHaveProperty('id', 'i2');
  });

  it('evaluateInsightsForUser triggers upsert when rule met', async () => {
    const metrics = [
      { windowDays: 30, value: 4.2, dataPoints: 8, userId: 'user-1', scope: 'workout', metric: 'post_energy' },
      { windowDays: 90, value: 3.8, dataPoints: 12, userId: 'user-1', scope: 'workout', metric: 'post_energy' },
      { windowDays: 30, value: 1.9, dataPoints: 8, userId: 'user-1', scope: 'workout', metric: 'post_stress' }
    ];
    const entries = [
      {
        id: 'entry-1',
        userId: 'user-1',
        type: 'workout',
        rawText: 'Morning run',
        occurredAt: new Date(),
        createdAt: new Date(),
        feelings: [
          { when: 'pre', valence: 3, energy: 3, stress: 3 },
          { when: 'post', valence: 4, energy: 5, stress: 1 }
        ]
      },
      {
        id: 'entry-2',
        userId: 'user-1',
        type: 'workout',
        rawText: 'Early lift',
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        feelings: [
          { when: 'pre', valence: 3, energy: 3, stress: 2 },
          { when: 'post', valence: 4, energy: 4, stress: 1 }
        ]
      },
      {
        id: 'entry-3',
        userId: 'user-1',
        type: 'meal',
        rawText: 'Breakfast smoothie',
        occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(),
        feelings: [
          { when: 'pre', valence: 3, energy: 3, stress: 2 },
          { when: 'post', valence: 3, energy: 4, stress: 2 }
        ]
      }
    ];

    mockedPrisma.baselineMetric.findMany.mockResolvedValue(metrics);
    mockedPrisma.logEntry.findMany.mockResolvedValue(entries);
    mockedPrisma.insight.upsert.mockResolvedValue({ id: 'i3', userId: 'user-1', type: 'energy', summary: 's', supportingStats: {}, ruleName: 'r', createdAt: new Date(), isActive: true });

    await evaluateInsightsForUser('user-1');
    expect(mockedPrisma.insight.upsert).toHaveBeenCalled();
  });
});
