import { GoalDirection, GoalMetric, GoalStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { createGoalForUser, listGoalsForUser, updateGoalForUser } from '../services/goals';

const router = Router();

const goalMetricSchema = z.nativeEnum(GoalMetric);
const goalDirectionSchema = z.nativeEnum(GoalDirection);
const goalStatusSchema = z.nativeEnum(GoalStatus);

const createGoalSchema = z.object({
  user_id: z.string().uuid().optional(),
  title: z.string().min(3).max(120),
  metric: goalMetricSchema,
  direction: goalDirectionSchema,
  target_value: z.coerce.number().min(0),
  window_days: z.coerce.number().int().min(7).max(180),
  note: z.string().max(280).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  metric: goalMetricSchema.optional(),
  direction: goalDirectionSchema.optional(),
  target_value: z.coerce.number().min(0).optional(),
  window_days: z.coerce.number().int().min(7).max(180).optional(),
  note: z.string().max(280).nullable().optional(),
  status: goalStatusSchema.optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

const toApiGoal = (goal: Awaited<ReturnType<typeof createGoalForUser>>) => ({
  id: goal.id,
  title: goal.title,
  metric: goal.metric,
  direction: goal.direction,
  target_value: goal.targetValue,
  current_value: goal.currentValue,
  progress: goal.progress,
  window_days: goal.windowDays,
  note: goal.note,
  status: goal.status,
  is_met: goal.isMet,
  created_at: goal.createdAt,
  updated_at: goal.updatedAt,
});

router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const goals = await listGoalsForUser(userId);
    return res.json(goals.map((goal) => toApiGoal(goal)));
  } catch (error) {
    logger.error('Failed to list goals', { error });
    return next(error);
  }
});

router.post('/', validateRequest(createGoalSchema), async (req, res, next) => {
  try {
    const body = res.locals.body as z.infer<typeof createGoalSchema>;
    const userId = body.user_id ?? req.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const goal = await createGoalForUser(userId, {
      title: body.title,
      metric: body.metric,
      direction: body.direction,
      targetValue: body.target_value,
      windowDays: body.window_days,
      note: body.note,
    });
    return res.status(201).json(toApiGoal(goal));
  } catch (error) {
    logger.error('Failed to create goal', { error });
    return next(error);
  }
});

router.patch('/:id', validateRequest(paramsSchema, 'params'), validateRequest(updateGoalSchema), async (req, res, next) => {
  try {
    const { id } = res.locals.params as z.infer<typeof paramsSchema>;
    const body = res.locals.body as z.infer<typeof updateGoalSchema>;
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const goal = await updateGoalForUser(userId, id, {
      title: body.title,
      metric: body.metric,
      direction: body.direction,
      targetValue: body.target_value,
      windowDays: body.window_days,
      note: body.note,
      status: body.status,
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    return res.json(toApiGoal(goal));
  } catch (error) {
    logger.error('Failed to update goal', { error });
    return next(error);
  }
});

export default router;