import { Router } from 'express';
import { z } from 'zod';
import { dismissInsightForUser, listInsightsForUser } from '../services/insights';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { isChineseLanguage, resolveRequestLanguage } from '../utils/language';


/**
 * Insights Router
 *
 * Exposes endpoints for retrieving computed insights for a user based on baseline metrics and deterministic rules.
 * - GET /insights: Returns active insights with supporting stats and summaries.
 *
 * Input validation is performed using Zod schemas.
 * Insight computation logic is handled in the insights service.
 */

const router = Router();


// Schema for validating query params for /insights endpoint
// user_id: Optional override
// limit: Max number of insights to return
const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8)
});

const paramsSchema = z.object({
  insightId: z.string().uuid()
});


/**
 * GET /insights
 * Returns the freshest active insights for the user.
 * Validates input, fetches data from insights service, responds with summaries and supporting stats.
 */
router.get('/', validateRequest(querySchema, 'query'), async (req, res, next) => {
  try {
    const { user_id, limit } = res.locals.query as z.infer<typeof querySchema>;
    const userId = user_id ?? req.userId;

    // User ID is required for insights
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Fetch active insights for user
    const insights = await listInsightsForUser(userId, limit);
    const zh = isChineseLanguage(resolveRequestLanguage(req));

    if (!zh) {
      res.json(insights);
      return;
    }

    const t = (value: string): string => {
      const exact: Record<string, string> = {
        'consistency_rate': '一致性比率',
        'active_days_30': '30天活跃天数',
        'workout_energy_30d': '30天训练后精力',
        'average_gap_days': '平均间隔天数',
        'entries_last_30_days': '近30天记录数',
        'morning_workout_ratio': '晨练占比',
        'energy_delta': '精力变化',
        'stress_delta': '压力变化',
        'late_workout_ratio': '晚间训练占比',
        'post_workout_stress': '训练后压力',
        'preferred_workout_time': '偏好训练时段',
      };
      return exact[value] ?? value;
    };

    res.json(
      insights.map((insight) => ({
        ...insight,
        supporting_stats: insight.supporting_stats
          ? {
              ...(insight.supporting_stats as any),
              stats: Array.isArray((insight.supporting_stats as any).stats)
                ? (insight.supporting_stats as any).stats.map((stat: { label: string; value: string | number }) => ({
                    ...stat,
                    label: t(stat.label),
                  }))
                : (insight.supporting_stats as any).stats,
            }
          : insight.supporting_stats,
      }))
    );
  } catch (error) {
    logger.error('Failed to fetch insights', { error });
    next(error);
  }
});

router.patch('/:insightId/dismiss', validateRequest(paramsSchema, 'params'), async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { insightId } = res.locals.params as z.infer<typeof paramsSchema>;
    const dismissed = await dismissInsightForUser(req.userId, insightId);

    if (!dismissed) {
      return res.status(404).json({ message: 'Insight not found' });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Failed to dismiss insight', { error });
    next(error);
  }
});

export default router;
