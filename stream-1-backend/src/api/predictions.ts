import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { getPredictionBundleForUser } from '../services/predictions';

const router = Router();

const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  planned_hour: z.coerce.number().int().min(5).max(23).optional(),
  workout_kind: z.enum(['cardio', 'strength', 'recovery', 'mixed']).optional(),
  include_breakfast: z.coerce.boolean().optional(),
  include_protein_recovery_meal: z.coerce.boolean().optional(),
  pre_energy: z.coerce.number().min(1).max(5).optional(),
  pre_stress: z.coerce.number().min(1).max(5).optional(),
});

router.get('/', validateRequest(querySchema, 'query'), async (req, res, next) => {
  try {
    const query = res.locals.query as z.infer<typeof querySchema>;
    const userId = query.user_id ?? req.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const bundle = await getPredictionBundleForUser(userId, {
      plannedHour: query.planned_hour,
      workoutKind: query.workout_kind,
      includeBreakfast: query.include_breakfast,
      includeProteinRecoveryMeal: query.include_protein_recovery_meal,
      preEnergy: query.pre_energy,
      preStress: query.pre_stress,
    });

    return res.json(bundle);
  } catch (error) {
    logger.error('Failed to generate predictions', { error });
    return next(error);
  }
});

export default router;