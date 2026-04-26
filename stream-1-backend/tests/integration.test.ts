import request from 'supertest';
import app from '../src/index';

// Mock Prisma and services so integration tests run without a live database.
jest.mock('../src/db/prisma', () => ({
  prisma: {
    logEntry: {
      create: jest.fn().mockImplementation((args) => ({
        id: 'entry-1',
        userId: args.data.userId,
        type: args.data.type,
        rawText: args.data.rawText,
        occurredAt: args.data.occurredAt,
        createdAt: new Date()
      })),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'entry-1',
          userId: '00000000-0000-0000-0000-000000000001',
          type: 'workout',
          rawText: 'Strength',
          occurredAt: new Date(),
          createdAt: new Date(),
          feelings: [
            { id: 'f1', when: 'post', valence: 4, energy: 4, stress: 2, notes: null, createdAt: new Date() }
          ]
        }
      ])
    },
    logEntry_findUnique: jest.fn()
  }
}));

jest.mock('../src/services/baseline', () => ({
  getTrendSnapshot: jest.fn().mockResolvedValue({
    baselines: [],
    recent: []
  }),
  queueBaselineRecomputeForUser: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/services/insights', () => ({
  listInsightsForUser: jest.fn().mockResolvedValue([])
}));

describe('API integration (mocked)', () => {
  it('creates an entry via POST /entries', async () => {
    const payload = { type: 'workout', raw_text: 'Test session', occurred_at: new Date().toISOString() };
    const res = await request(app).post('/entries').send(payload).set('x-user-id', '00000000-0000-0000-0000-000000000001');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.type).toBe('workout');
  });

  it('lists entries via GET /entries', async () => {
    const res = await request(app).get('/entries').set('x-user-id', '00000000-0000-0000-0000-000000000001');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('fetches trends via GET /trends', async () => {
    const res = await request(app).get('/trends').set('x-user-id', '00000000-0000-0000-0000-000000000001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('baselines');
    expect(res.body).toHaveProperty('recent');
  });

  it('lists insights via GET /insights', async () => {
    const res = await request(app).get('/insights').set('x-user-id', '00000000-0000-0000-0000-000000000001');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
