import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const router = Router();

const weightSchema = z.object({
  weightKg: z.number().positive().max(500),
  loggedAt: z.string().datetime().optional(),
  note: z.string().max(200).optional(),
});

/**
 * GET /weight?limit=90
 * Returns weight logs for the authenticated user, newest first.
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const limit = Math.min(Number(req.query.limit ?? 90), 365);
  try {
    const logs = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });
    return res.json(logs);
  } catch (err) {
    logger.error('weight get failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /weight
 * Log a new weight entry for today (or a specified date).
 */
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = weightSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  const { weightKg, loggedAt, note } = parsed.data;
  try {
    const log = await prisma.weightLog.create({
      data: {
        userId,
        weightKg,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        note,
      },
    });
    return res.status(201).json(log);
  } catch (err) {
    logger.error('weight post failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /weight/:id
 * Remove a weight log entry.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const existing = await prisma.weightLog.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    await prisma.weightLog.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    logger.error('weight delete failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
