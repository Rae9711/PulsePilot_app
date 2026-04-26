import { Router } from 'express';
import { z } from 'zod';
import { getTrendSnapshot } from '../services/baseline';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';


/**
 * Trends Router
 *
 * Exposes endpoints for retrieving user's baseline metrics and recent entry trends.
 * - GET /trends: Returns rolling baseline metrics and recent entries for charting.
 *
 * Input validation is performed using Zod schemas.
 * Baseline computation logic is handled in the baseline service.
 */

const router = Router();


// Supported window lengths for baseline metrics (days)
const SUPPORTED_WINDOWS = [7, 30, 90, 365] as const;

// Schema for validating query params for /trends endpoint
// user_id: Optional override
// window_days: Must be one of SUPPORTED_WINDOWS
const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  window_days: z.coerce
    .number()
    .int()
    .refine((value) => SUPPORTED_WINDOWS.includes(value as (typeof SUPPORTED_WINDOWS)[number]), {
      message: 'window_days must be one of 7, 30, 90, 365'
    })
    .default(7)
});


/**
 * GET /trends
 * Returns current baselines plus recent entry summaries for the user.
 * Validates input, fetches data from baseline service, responds with chart-ready payload.
 */
router.get('/', validateRequest(querySchema, 'query'), async (req, res, next) => {
  try {
    const { user_id, window_days } = res.locals.query as z.infer<typeof querySchema>;
    const userId = user_id ?? req.userId;

    // User ID is required for trends
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Fetch baseline metrics and recent entries for charting
    const snapshot = await getTrendSnapshot(userId, window_days);
    res.json(snapshot);
  } catch (error) {
    logger.error('Failed to fetch trends', { error });
    next(error);
  }
});

export default router;
