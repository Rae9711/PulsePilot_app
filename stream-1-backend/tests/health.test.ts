import request from 'supertest';
import app from '../src/index';

// Health endpoint smoke test
//
// Purpose: A minimal readiness/liveness check used by CI and container
// orchestration to ensure the server has started and can respond to basic
// requests. This test intentionally keeps assertions narrow so it remains
// stable across environment differences (timezones, small format changes).
describe('health endpoint', () => {
  it('responds with ok status', async () => {
    const response = await request(app).get('/health');

    // Expect HTTP 200 and a minimal JSON payload with a timestamp.
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
