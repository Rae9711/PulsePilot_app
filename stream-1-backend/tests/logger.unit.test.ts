import { logger } from '../src/utils/logger';

describe('logger utility', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('logs info with JSON payload to console.log', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello', { foo: 'bar' });
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0];
    const parsed = JSON.parse(arg);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('hello');
    expect(parsed.foo).toBe('bar');
    expect(parsed).toHaveProperty('timestamp');
  });

  it('logs error with JSON payload to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom', { code: 123 });
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0];
    const parsed = JSON.parse(arg);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('boom');
    expect(parsed.code).toBe(123);
  });
});
