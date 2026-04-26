import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { metricsApiKey } from '../config';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

type StatusCounts = Record<string, number>;

const startedAt = Date.now();
let totalRequests = 0;
let totalAuthFailures = 0;
let total5xx = 0;
let latencyTotalMs = 0;
let maxLatencyMs = 0;
const statusCounts: StatusCounts = {};

export const incrementAuthFailure = () => {
  totalAuthFailures += 1;
};

export const requestMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const started = performance.now();
  req.requestId = req.header('x-request-id') || randomUUID();
  res.setHeader('x-request-id', req.requestId);

  res.on('finish', () => {
    const durationMs = Number((performance.now() - started).toFixed(2));
    totalRequests += 1;
    latencyTotalMs += durationMs;
    maxLatencyMs = Math.max(maxLatencyMs, durationMs);
    const statusKey = `${res.statusCode}`;
    statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;

    if (res.statusCode >= 500) {
      total5xx += 1;
    }
  });

  next();
};

export const securityHeadersMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

export const metricsHandler = (req: Request, res: Response) => {
  if (metricsApiKey) {
    const authHeader = req.header('authorization');
    if (authHeader !== `Bearer ${metricsApiKey}`) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
  }

  res.json({
    service: 'fitforecast-backend',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    requests: {
      total: totalRequests,
      authFailures: totalAuthFailures,
      serverErrors: total5xx,
      byStatus: statusCounts,
    },
    latency: {
      averageMs: totalRequests ? Number((latencyTotalMs / totalRequests).toFixed(2)) : 0,
      maxMs: Number(maxLatencyMs.toFixed(2)),
    },
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
};