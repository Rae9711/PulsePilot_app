// Entry point that wires middleware, routes, and server lifecycle for the FitForecast backend.
// HTTP middleware and framework imports wire up the core server plumbing.
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
// Route modules encapsulate each feature surface.
import authRouter from './api/auth';
import entriesRouter from './api/entries';
import feelingsRouter from './api/feelings';
import trendsRouter from './api/trends';
import insightsRouter from './api/insights';
import predictionsRouter from './api/predictions';
import analyticsRouter from './api/analytics';
import goalsRouter from './api/goals';
import weightRouter from './api/weight';
import profileRouter from './api/profile';
import coachRouter from './api/coach';
// Shared middleware and utilities keep cross-cutting concerns centralized.
import { attachUser } from './middleware/auth';
import { allowedCorsOrigins, jsonBodyLimit } from './config';
import { logger } from './utils/logger';
import {
  metricsHandler,
  requestMetricsMiddleware,
  securityHeadersMiddleware,
} from './middleware/monitoring';
import fs from 'fs';
import path from 'path';

// Optional: serve API docs via Swagger UI when dependency is installed.
// This is non-critical and will not affect runtime if `swagger-ui-express`
// is not present in the environment during tests.
let swaggerUi: any;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
  swaggerUi = require('swagger-ui-express');
} catch (err) {
  swaggerUi = null;
}

// Load environment variables before any component accesses configuration.
dotenv.config();

// Create the Express application instance that glues middleware and routes together.
const app = express();

// Enable CORS so the frontend can hit the API from other origins during development.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedCorsOrigins.length === 0 || allowedCorsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin not allowed'));
  },
}));
app.use(securityHeadersMiddleware);
app.use(requestMetricsMiddleware);
// Automatically parse JSON payloads on every request.
app.use(express.json({ limit: jsonBodyLimit }));
// Inject the resolved user id on each request for downstream handlers.
// Lightweight readiness probe ensures deployment targets can check service health.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/metrics', metricsHandler);
// Auth routes (signup, login) don't require authentication
app.use('/auth', authRouter);

// Apply auth middleware to all routes below

app.use(attachUser);

// Mount feature routers under their respective prefixes.
app.use('/entries', entriesRouter);
app.use('/entries/:entryId/feelings', feelingsRouter);
app.use('/trends', trendsRouter);
app.use('/insights', insightsRouter);
app.use('/predictions', predictionsRouter);
app.use('/analytics', analyticsRouter);
app.use('/goals', goalsRouter);
app.use('/weight', weightRouter);
app.use('/profile', profileRouter);
app.use('/coach', coachRouter);

// Serve OpenAPI YAML and host Swagger UI at /docs when available.
if (swaggerUi) {
  const openApiPath = [
    path.join(process.cwd(), 'docs', 'openapi.yaml'),
    path.join(process.cwd(), 'stream-1-backend', 'docs', 'openapi.yaml'),
    path.resolve(__dirname, '..', 'docs', 'openapi.yaml'),
  ].find((candidate) => fs.existsSync(candidate));

  if (openApiPath) {
    app.get('/docs/openapi.yaml', (_req, res) => res.sendFile(openApiPath));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(undefined, { swaggerUrl: '/docs/openapi.yaml' }));
  } else {
    logger.warn('OpenAPI spec not found; Swagger UI will be unavailable');
  }
}

// Resolve the port from configuration with a development default.
const port = Number(process.env.PORT) || 3000;

// Keep integration tests from opening sockets while still running the server in other envs.
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info(`FitForecast backend listening on port ${port}`);
  });
}

// Export the configured app for tests and external consumers.
export default app;
