jest.mock('../src/db/prisma', () => ({
  prisma: {
    logEntry: {
      create: jest.fn().mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'workout',
        rawText: 'Test session',
        occurredAt: new Date(),
        createdAt: new Date()
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'workout',
        rawText: 'Test session',
        occurredAt: new Date(),
        createdAt: new Date(),
        feelings: []
      }),
      findMany: jest.fn().mockResolvedValue([])
    },
    feelingEntry: {
      create: jest.fn().mockResolvedValue({
        id: 'feeling-1',
        logEntryId: '00000000-0000-0000-0000-000000000001',
        when: 'post',
        valence: 4,
        energy: 4,
        stress: 2,
        notes: null,
        createdAt: new Date()
      })
    }
  }
}));

jest.mock('../src/services/baseline', () => ({
  queueBaselineRecomputeForUser: jest.fn().mockResolvedValue(undefined),
  getTrendSnapshot: jest.fn().mockResolvedValue({ baselines: [], recent: [] })
}));

import request from 'supertest';
import app from '../src/index';


describe('Entries & Feelings API', () => {
  it('creates an entry (POST /entries)', async () => {
    const res = await request(app)
      .post('/entries')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .send({ type: 'workout', raw_text: 'Test session', occurred_at: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('adds a feeling to an entry (POST /entries/:entryId/feelings)', async () => {
    const res = await request(app)
      .post('/entries/00000000-0000-0000-0000-000000000001/feelings')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .send({ when: 'post', valence: 4, energy: 4, stress: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('fetches single entry with feelings (GET /entries/:id)', async () => {
    const res = await request(app).get('/entries/00000000-0000-0000-0000-000000000001').set('x-user-id', '00000000-0000-0000-0000-000000000001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', '00000000-0000-0000-0000-000000000001');
  });
});
