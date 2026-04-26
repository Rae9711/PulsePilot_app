import type { LogEntry, FeelingEntry } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { chatWithCoach } from '../services/llm';
import { buildPersonalizationSummary } from '../services/personalization';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { isChineseLanguage, resolveRequestLanguage } from '../utils/language';


/**
 * Entries Router
 *
 * Handles all CRUD operations for LogEntry resources (workout/meal entries).
 * - POST /entries: Create a new log entry for a user
 * - GET /entries: List entries with optional filters and pagination
 * - GET /entries/:id: Retrieve a single entry and its associated feelings
 *
 * Input validation is performed using Zod schemas.
 * Database operations use Prisma ORM.
 * All responses are normalized for frontend consumption.
 */

// Instantiate a router dedicated to /entries operations.
const router = Router();


// Schema for validating entry creation requests.
// user_id: Optional override for admin/dev flows.
// type: Must be 'workout' or 'meal'.
// raw_text: Freeform description of the entry.
// occurred_at: ISO8601 datetime string.
const createEntrySchema = z.object({
  user_id: z.string().uuid().optional(),
  type: z.enum(['workout', 'meal']),
  raw_text: z.string().min(1),
  occurred_at: z.string().datetime()
});

const buildEntryAdvicePrompt = (input: {
  entryType: 'workout' | 'meal';
  entryText: string;
  occurredAt: string;
  mealCount: number;
  workoutCount: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  planSummary: string;
  coachingMode: 'stabilize' | 'build' | 'optimize';
  bestNextAction: string;
  language: 'en' | 'zh';
}) => {
  if (input.language === 'zh') {
    return [
      '用户刚记录了一条新的健身日志。请结合这条日志与当天整体上下文，给出简洁建议。',
      '请用 2-4 句话回答，并附上一行以“Next:”开头的简短行动。',
      '不要要求用户再次确认记录，这条记录已保存。',
      '',
      `新日志类型：${input.entryType}`,
      `新日志内容：${input.entryText}`,
      `记录时间：${input.occurredAt}`,
      '',
      `今天累计：${input.mealCount} 条饮食，${input.workoutCount} 条训练`,
      `今日营养总计：${Math.round(input.caloriesKcal)} kcal，蛋白 ${Math.round(input.proteinG)}g，碳水 ${Math.round(input.carbsG)}g，脂肪 ${Math.round(input.fatG)}g`,
      `计划目标：${input.planSummary}`,
      `教练模式：${input.coachingMode}`,
      `优先动作：${input.bestNextAction}`,
    ].join('\n');
  }

  return [
    'A user just logged a new fitness entry. Give concise advice that uses this entry and the full day context.',
    'Respond in 2-4 sentences plus one short action line starting with "Next:".',
    'Do not ask the user to confirm logging. This entry is already saved.',
    '',
    `New entry type: ${input.entryType}`,
    `New entry text: ${input.entryText}`,
    `Logged at: ${input.occurredAt}`,
    '',
    `Today so far: ${input.mealCount} meal(s), ${input.workoutCount} workout(s)` ,
    `Nutrition totals today: ${Math.round(input.caloriesKcal)} kcal, ${Math.round(input.proteinG)}g protein, ${Math.round(input.carbsG)}g carbs, ${Math.round(input.fatG)}g fat`,
    `Plan targets: ${input.planSummary}`,
    `Coaching mode: ${input.coachingMode}`,
    `Priority action: ${input.bestNextAction}`,
  ].join('\n');
};


/**
 * POST /entries
 * Creates a new log entry for the resolved user.
 * Validates input, persists to DB, returns normalized entry.
 */
router.post('/', validateRequest(createEntrySchema), async (req, res, next) => {
  try {
    // Extract validated fields from request
    const { user_id, type, raw_text, occurred_at } = res.locals.body as z.infer<typeof createEntrySchema>;
    // Use provided user_id or fallback to authenticated user
    const userId = user_id ?? req.userId;

    // User ID is required for all entry operations
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Create entry in database
    const entry = await prisma.logEntry.create({
      data: {
        userId,
        type,
        rawText: raw_text,
        occurredAt: new Date(occurred_at)
      }
    });

    const [plan, todayEntries, personalization] = await Promise.all([
      prisma.fitnessPlan.findUnique({ where: { userId } }),
      (() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return prisma.logEntry.findMany({
          where: { userId, occurredAt: { gte: start, lte: end } },
          include: { parsedEntry: true },
          orderBy: { occurredAt: 'asc' },
        });
      })(),
      buildPersonalizationSummary(userId, resolveRequestLanguage(req)),
    ]);
    const language = resolveRequestLanguage(req);
    const zh = isChineseLanguage(language);

    const mealCount = todayEntries.filter((item) => item.type === 'meal').length;
    const workoutCount = todayEntries.filter((item) => item.type === 'workout').length;
    const totals = todayEntries.reduce(
      (acc, item) => {
        const parsed = item.parsedEntry;
        if (!parsed) return acc;
        return {
          caloriesKcal: acc.caloriesKcal + (parsed.caloriesKcal ?? 0),
          proteinG: acc.proteinG + (parsed.proteinG ?? 0),
          carbsG: acc.carbsG + (parsed.carbsG ?? 0),
          fatG: acc.fatG + (parsed.fatG ?? 0),
        };
      },
      { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    const planSummary = plan
      ? `${Math.round(plan.dailyCalories)} kcal, ${Math.round(plan.dailyProteinG)}g protein, ${Math.round(plan.dailyCarbsG)}g carbs, ${Math.round(plan.dailyFatG)}g fat`
      : zh ? '暂无激活计划' : 'No active plan yet';

    const advicePrompt = buildEntryAdvicePrompt({
      entryType: type,
      entryText: raw_text,
      occurredAt: new Date(occurred_at).toISOString(),
      mealCount,
      workoutCount,
      caloriesKcal: totals.caloriesKcal,
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
      planSummary,
      coachingMode: personalization.coachingMode,
      bestNextAction: personalization.outcomeFocus.bestNextAction,
      language,
    });

    const coachAdvice = await chatWithCoach(
      [{ role: 'user', content: advicePrompt }],
      zh
        ? `你是处于 ${personalization.coachingMode} 模式的 AI 健身教练。请简洁、实用、鼓励地回答，并只使用已提供上下文。请使用简体中文。`
        : `You are an AI fitness coach in ${personalization.coachingMode} mode. Be concise, practical, and encouraging. Use only provided context.`,
    );

    if (coachAdvice && coachAdvice.trim().length > 0) {
      await prisma.aiChatMessage.create({
        data: {
          userId,
          role: 'assistant',
          content: coachAdvice.trim(),
          context: 'auto_entry_advice',
        },
      });
    }

    // Respond with normalized entry
    res.status(201).json({
      ...toApiEntry(entry),
      coach_advice: coachAdvice ?? undefined,
    });
  } catch (error) {
    logger.error('Failed to create entry', { error });
    next(error);
  }
});


// Schema for validating entry listing queries.
// Supports filtering by user, entry type, and pagination.
const listEntriesSchema = z.object({
  user_id: z.string().uuid().optional(),
  type: z.enum(['workout', 'meal']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});


/**
 * GET /entries
 * Fetches a page of entries for the user, optionally filtered and paginated.
 * Returns entries with associated feelings.
 */
router.get('/', validateRequest(listEntriesSchema, 'query'), async (req, res, next) => {
  try {
    const { user_id, type, limit, offset } = res.locals.query as z.infer<typeof listEntriesSchema>;
    const userId = user_id ?? req.userId;

    // User ID is required for listing
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Query entries from database, including associated feelings
    const entries = await prisma.logEntry.findMany({
      where: {
        userId,
        type
      },
      include: {
        feelings: true
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Respond with normalized entries
    res.json(entries.map((entry) => toApiEntry(entry)));
  } catch (error) {
    logger.error('Failed to list entries', { error });
    next(error);
  }
});


// Schema for validating path params for single entry retrieval.
const getEntrySchema = z.object({
  id: z.string().uuid()
});


/**
 * GET /entries/:id
 * Returns a single entry and its linked feelings.
 */
router.get('/:id', validateRequest(getEntrySchema, 'params'), async (req, res, next) => {
  try {
    const { id } = res.locals.params as z.infer<typeof getEntrySchema>;

    // Find entry by ID, include feelings
    const entry = await prisma.logEntry.findUnique({
      where: { id },
      include: { feelings: true }
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Respond with normalized entry
    res.json(toApiEntry(entry));
  } catch (error) {
    logger.error('Failed to fetch entry', { error });
    next(error);
  }
});


/**
 * DELETE /entries/:id
 * Deletes a log entry (and its feelings) for the authenticated user.
 */
router.delete('/:id', validateRequest(getEntrySchema, 'params'), async (req, res, next) => {
  try {
    const { id } = res.locals.params as z.infer<typeof getEntrySchema>;

    // Ensure the entry exists and belongs to the current user
    const entry = await prisma.logEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== req.userId) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Delete dependent feelings first, then the entry itself
    await prisma.feelingEntry.deleteMany({ where: { logEntryId: id } });
    await prisma.logEntry.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete entry', { error });
    next(error);
  }
});


/**
 * Helper: Converts FeelingEntry records into API response contract.
 */
const toApiFeeling = (feeling: FeelingEntry) => ({
  id: feeling.id,
  when: feeling.when,
  valence: feeling.valence,
  energy: feeling.energy,
  stress: feeling.stress,
  notes: feeling.notes,
  created_at: feeling.createdAt.toISOString()
});


/**
 * Helper: Shapes a log entry payload for API responses.
 */
const toApiEntry = (entry: LogEntry & { feelings?: FeelingEntry[] }) => ({
  id: entry.id,
  user_id: entry.userId,
  type: entry.type,
  raw_text: entry.rawText,
  occurred_at: entry.occurredAt.toISOString(),
  created_at: entry.createdAt.toISOString(),
  feelings: (entry.feelings ?? []).map(toApiFeeling)
});

export default router;
