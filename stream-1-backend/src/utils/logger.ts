
/**
 * Logger Utility
 *
 * Lightweight structured logger used throughout the backend. It intentionally
 * keeps dependencies minimal (no bunyan/pino) because tests and small demo
 * deployments prefer a zero-config approach. Messages are output as JSON so
 * logs can be parsed reliably by machines or easily grepped during development.
 *
 * Usage:
 * - `logger.info('message', { additional: 'context' })`
 * - `logger.error('failed', { error })`
 *
 * Important notes:
 * - The `meta` argument should be a plain object containing serializable
 *   values (avoid circular references).
 * - In production you may want to replace this module with a more featureful
 *   logger that supports sampling, structured transports, and log rotation.
 */

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

// Builds a consistent JSON payload and selects the appropriate console method.
// Using console.* keeps the runtime lightweight while tests can still capture
// output. The JSON shape is simple: { level, message, ...meta, timestamp }.
const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const payload = { level, message, ...meta, timestamp: new Date().toISOString() };
  // console[level] isn't typed as a function for every 'level', so choose
  // between `log` and the specific level name. eslint is disabled for the
  // direct console call to avoid forcing a logging dependency.
  // eslint-disable-next-line no-console
  console[level === 'info' ? 'log' : level](JSON.stringify(payload));
};

// Public logger facade exposes level helpers so callers don't need to pass
// the level string manually, ensuring consistent payloads across the codebase.
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta)
};
