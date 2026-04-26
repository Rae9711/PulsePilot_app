import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const router = Router();

const profileSchema = z.object({
  birthYear: z.number().int().min(1920).max(2010).optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  heightCm: z.number().positive().max(300).optional().nullable(),
  currentWeightKg: z.number().positive().max(500).optional().nullable(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional().nullable(),
  goalType: z.enum(['lose', 'gain', 'maintain']).optional().nullable(),
  goalWeightKg: z.number().positive().max(500).optional().nullable(),
  goalDays: z.number().int().min(1).max(730).optional().nullable(),
});

/**
 * GET /profile
 * Returns the current user's fitness profile.
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    return res.json(profile ?? {});
  } catch (err) {
    logger.error('profile get failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PUT /profile
 * Upsert the current user's fitness profile.
 */
router.put('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: { ...parsed.data },
      create: { userId, ...parsed.data },
    });
    return res.json(profile);
  } catch (err) {
    logger.error('profile put failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
