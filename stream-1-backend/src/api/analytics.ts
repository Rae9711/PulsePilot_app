import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { getAnalyticsBundleForUser } from '../services/analytics';
import { resolveRequestLanguage } from '../utils/language';

const router = Router();

const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  window_days: z.coerce.number().int().min(7).max(180).default(30),
});

router.get('/', validateRequest(querySchema, 'query'), async (req, res, next) => {
  try {
    const { user_id, window_days } = res.locals.query as z.infer<typeof querySchema>;
    const userId = user_id ?? req.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const language = resolveRequestLanguage(req);
    const analytics = await getAnalyticsBundleForUser(userId, window_days, language);
    return res.json(analytics);
  } catch (error) {
    logger.error('Failed to build analytics bundle', { error });
    return next(error);
  }
});

export default router;