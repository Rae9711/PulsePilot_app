/**
 * Baseline Service
 *
 * Provides functions for computing rolling baseline metrics (weekly, monthly, yearly) and trend aggregation for each user.
 * - queueBaselineRecomputeForUser: Triggers recomputation after new feelings
 * - recomputeBaselinesForUser: Calculates baselines for all windows and metrics
 * - getTrendSnapshot: Fetches baselines and recent entries for charting
 *
 * Uses Prisma ORM for database access and logs operations for observability.
 */
import type { BaselineMetric, BaselineScope, FeelingEntry, LogEntry, LogEntryType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { evaluateInsightsForUser } from './insights';

type MetricField = 'energy' | 'valence' | 'stress';

type MetricDefinition = {
  scope: BaselineScope;
  metric: string;
  entryType: LogEntryType;
  field: MetricField;
};


// Definitions for which metrics are computed for each scope and entry type
const METRIC_DEFINITIONS: MetricDefinition[] = [
  { scope: 'workout', metric: 'post_energy', entryType: 'workout', field: 'energy' },
  { scope: 'workout', metric: 'post_valence', entryType: 'workout', field: 'valence' },
  { scope: 'workout', metric: 'post_stress', entryType: 'workout', field: 'stress' },
  { scope: 'meal', metric: 'post_energy', entryType: 'meal', field: 'energy' },
  { scope: 'meal', metric: 'post_valence', entryType: 'meal', field: 'valence' },
  { scope: 'meal', metric: 'post_stress', entryType: 'meal', field: 'stress' }
];

// Supported rolling window lengths (days)
export const BASELINE_WINDOWS = [7, 30, 90, 365] as const;


// Shape of the trends endpoint response: combines baselines and recent entries
export type TrendSnapshot = {
  baselines: Array<ReturnType<typeof toApiBaseline>>;
  recent: Array<ReturnType<typeof toRecentEntry>>;
};


/**
 * Triggers baseline recomputation for a user after new feeling is added.
 */
export const queueBaselineRecomputeForUser = async (userId: string) => {
  logger.info('Queued baseline recompute', { userId });
  try {
    await recomputeBaselinesForUser(userId);
  } catch (error) {
    logger.error('Baseline recompute failed', { userId, error });
    throw error;
  }
};


/**
 * Recomputes baselines for all supported windows and metrics for a user.
 * Also triggers insight evaluation after baselines are updated.
 */
export const recomputeBaselinesForUser = async (userId: string) => {
  const startMs = Date.now();
  logger.info('Starting baseline recompute', { userId });
  for (const windowDays of BASELINE_WINDOWS) {
    const windowStart = getWindowStart(windowDays);

    for (const definition of METRIC_DEFINITIONS) {
      // Fetch feelings for the window and metric
      const feelings = await prisma.feelingEntry.findMany({
        where: {
          when: 'post',
          logEntry: {
            userId,
            type: definition.entryType,
            occurredAt: {
              gte: windowStart
            }
          }
        },
        select: {
          energy: true,
          valence: true,
          stress: true
        }
      });

      // Compute and persist baseline
      await persistBaselineFromFeelings({ userId, definition, windowDays, feelings });
    }
  }

  // Evaluate insights after baselines are updated
  await evaluateInsightsForUser(userId);
  const durationMs = Date.now() - startMs;
  logger.info('Finished baseline recompute', { userId, durationMs });
  if (durationMs > 5000) {
    logger.warn('Baseline recompute exceeded 5s threshold', { userId, durationMs });
  }
};


/**
 * Fetches current baseline metrics plus a slice of recent entries for charting.
 */
export const getTrendSnapshot = async (userId: string, windowDays: number): Promise<TrendSnapshot> => {
  const [baselines, recentEntries] = await Promise.all([
    prisma.baselineMetric.findMany({
      where: { userId, windowDays },
      orderBy: { metric: 'asc' }
    }),
    prisma.logEntry.findMany({
      where: {
        userId,
        occurredAt: {
          gte: getWindowStart(windowDays)
        }
      },
      include: { feelings: true },
      orderBy: { occurredAt: 'asc' },
      take: Math.max(windowDays, 45)
    })
  ]);

  return {
    baselines: baselines.map((baseline) => toApiBaseline(baseline)),
    recent: recentEntries.map((entry) => toRecentEntry(entry))
  };
};


/**
 * Computes and persists baseline metric for a user, scope, metric, and window.
 * Deletes baseline if no data points are available.
 */
const persistBaselineFromFeelings = async (params: {
  userId: string;
  definition: MetricDefinition;
  windowDays: number;
  feelings: Array<Pick<FeelingEntry, 'energy' | 'valence' | 'stress'>>;
}) => {
  const { userId, definition, windowDays, feelings } = params;
  const dataPoints = feelings.length;

  if (!dataPoints) {
    // Delete baseline if no data points
    await prisma.baselineMetric.deleteMany({
      where: {
        userId,
        scope: definition.scope,
        metric: definition.metric,
        windowDays
      }
    });
    return;
  }

  // Compute average value for the metric
  const aggregate = feelings.reduce((sum, feeling) => sum + feeling[definition.field], 0);
  const value = aggregate / dataPoints;

  // Upsert baseline metric in database
  await prisma.baselineMetric.upsert({
    where: {
      user_scope_metric_window: {
        userId,
        scope: definition.scope,
        metric: definition.metric,
        windowDays
      }
    },
    create: {
      userId,
      scope: definition.scope,
      metric: definition.metric,
      value,
      windowDays,
      dataPoints
    },
    update: {
      value,
      dataPoints
    }
  });
};


/**
 * Helper: Computes the start date for a rolling window.
 */
const getWindowStart = (windowDays: number) => {
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return new Date(now - windowMs);
};


/**
 * Helper: Normalizes baseline records to API response schema.
 */
const toApiBaseline = (baseline: BaselineMetric) => ({
  id: baseline.id,
  scope: baseline.scope,
  metric: baseline.metric,
  value: baseline.value,
  data_points: baseline.dataPoints,
  window_days: baseline.windowDays,
  updated_at: baseline.updatedAt.toISOString()
});


/**
 * Helper: Summarizes recent entries for charting (focuses on post-activity feelings).
 */
const toRecentEntry = (entry: LogEntry & { feelings: FeelingEntry[] }) => {
  const preFeeling = entry.feelings.find((feeling) => feeling.when === 'pre');
  const postFeeling = entry.feelings.find((feeling) => feeling.when === 'post');
  return {
    id: entry.id,
    entered: entry.occurredAt.toISOString(),
    type: entry.type,
    pre_energy: preFeeling?.energy ?? null,
    pre_valence: preFeeling?.valence ?? null,
    pre_stress: preFeeling?.stress ?? null,
    post_energy: postFeeling?.energy ?? null,
    post_valence: postFeeling?.valence ?? null,
    post_stress: postFeeling?.stress ?? null
  };
};
