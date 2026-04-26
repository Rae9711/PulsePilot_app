import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { validateRequest } from '../middleware/validation';
import { queueBaselineRecomputeForUser } from '../services/baseline';
import { logger } from '../utils/logger';


/**
 * Feelings Router
 *
 * Handles creation of FeelingEntry records tied to LogEntry resources.
 * - POST /entries/:entryId/feelings: Add a pre/post feeling snapshot to a log entry
 *
 * Input validation is performed using Zod schemas.
 * Triggers baseline recomputation after each new feeling.
 * Returns normalized FeelingEntry objects.
 */

// Merge params so the parent /entries/:entryId scope is accessible inside this router.
const router = Router({ mergeParams: true });


// Schema for validating feeling submissions.
// when: 'pre' or 'post' (before/after activity)
// valence, energy, stress: 1-5 integer ratings
// notes: Optional freeform text (max 280 chars)
const createFeelingSchema = z.object({
  when: z.enum(['pre', 'post']),
  valence: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  notes: z.string().max(280).optional()
});


/**
 * POST /entries/:entryId/feelings
 * Appends a mood snapshot (pre/post) to a log entry.
 * Validates input, persists to DB, triggers baseline recomputation.
 */
router.post('/', validateRequest(createFeelingSchema), async (req, res, next) => {
  try {
    // Extract entryId from route params
    const { entryId } = req.params as { entryId: string };
    // Extract validated feeling fields
    const newFeeling = res.locals.body as z.infer<typeof createFeelingSchema>;

    // Find the log entry to attach the feeling
    const entry = await prisma.logEntry.findUnique({ where: { id: entryId } });

    if (!entry) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    // Create feeling entry in database
    const feeling = await prisma.feelingEntry.create({
      data: {
        logEntryId: entryId,
        when: newFeeling.when,
        valence: newFeeling.valence,
        energy: newFeeling.energy,
        stress: newFeeling.stress,
        notes: newFeeling.notes ?? null
      }
    });

    // Trigger downstream baseline windows to recompute after each new datapoint
    await queueBaselineRecomputeForUser(entry.userId);

    // Respond with normalized FeelingEntry
    res.status(201).json({
      id: feeling.id,
      log_entry_id: feeling.logEntryId,
      when: feeling.when,
      valence: feeling.valence,
      energy: feeling.energy,
      stress: feeling.stress,
      notes: feeling.notes,
      created_at: feeling.createdAt.toISOString()
    });
  } catch (error) {
    logger.error('Failed to create feeling entry', { error });
    next(error);
  }
});

export default router;
