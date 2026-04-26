jest.mock('../src/db/prisma', () => ({
  prisma: {
    logEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/db/prisma';

describe('Entries API', () => {
  const mocked = prisma as unknown as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /entries - creates an entry', async () => {
    mocked.logEntry.create.mockResolvedValue({
      id: 'ent-1',
      userId: '00000000-0000-0000-0000-000000000001',
      type: 'workout',
      rawText: 'Test create',
      occurredAt: new Date(),
      createdAt: new Date()
    });

    const res = await request(app)
      .post('/entries')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .send({ type: 'workout', raw_text: 'Test create', occurred_at: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(mocked.logEntry.create).toHaveBeenCalled();
  });

  it('POST /entries - validation error when missing fields', async () => {
    const res = await request(app)
      .post('/entries')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .send({ raw_text: 'Missing type', occurred_at: new Date().toISOString() });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation failed');
  });

  it('GET /entries - lists entries with feelings', async () => {
    mocked.logEntry.findMany.mockResolvedValue([
      {
        id: 'ent-2',
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'meal',
        rawText: 'Dinner',
        occurredAt: new Date(),
        createdAt: new Date(),
        feelings: [
          { id: 'f1', when: 'post', valence: 4, energy: 4, stress: 2, notes: null, createdAt: new Date() }
        ]
      }
    ]);

    const res = await request(app).get('/entries').set('x-user-id', '00000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('feelings');
  });

  it('GET /entries/:id - returns 404 when not found', async () => {
    mocked.logEntry.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/entries/00000000-0000-0000-0000-000000000002').set('x-user-id', '00000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(404);
  });

  it('GET /entries/:id - returns entry when found', async () => {
    mocked.logEntry.findUnique.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000003',
      userId: '00000000-0000-0000-0000-000000000001',
      type: 'workout',
      rawText: 'Run',
      occurredAt: new Date(),
      createdAt: new Date(),
      feelings: []
    });

    const res = await request(app).get('/entries/00000000-0000-0000-0000-000000000003').set('x-user-id', '00000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', '00000000-0000-0000-0000-000000000003');
  });
});
