import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import {
  chatWithCoach,
  estimateNutrition,
  generateFitnessPlanNarrative,
  type NutritionEstimate,
} from '../services/llm';
import { buildPersonalizationSummary, type PersonalizationSummary } from '../services/personalization';
import { isChineseLanguage, resolveRequestLanguage } from '../utils/language';

const router = Router();

// ── BMR / TDEE helpers ──────────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const calcBmr = (gender: string, weightKg: number, heightCm: number, age: number): number => {
  // Mifflin–St Jeor equation
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
};

const calcTdee = (bmr: number, activityLevel: string): number => {
  return bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55);
};

const buildFallbackPersonalizationSummary = (zh: boolean): PersonalizationSummary => ({
  generatedAt: new Date().toISOString(),
  coachingMode: 'build',
  riskLevel: 'medium',
  profileMemory: {
    consistency30d: 0,
    bestWorkoutHour: null,
    avgPostEnergy: 0,
    avgPostStress: 0,
  },
  outcomeFocus: {
    bestNextAction: zh
      ? '先保持稳定记录，本周固定 3-4 天训练时间。'
      : 'Keep logging consistently and lock in 3-4 repeatable workout slots this week.',
    expectedBenefit: zh
      ? '数据更稳定后，系统可以给出更精准的个性化建议。'
      : 'More stable data will improve personalization quality and recommendation accuracy.',
    confidence: 0.3,
    confidenceLabel: 'low',
    evidence: [{ label: zh ? '数据状态' : 'Data status', value: zh ? '回退模式' : 'fallback mode' }],
  },
  recommendations: [],
  weeklyExperiments: [],
  weeklyRecap: {
    wins: [],
    misses: [],
    nextFocus: zh
      ? '先建立稳定节奏，再逐步提高训练强度。'
      : 'Rebuild consistency first, then increase intensity progressively.',
  },
  weightPerformanceLink: {
    summary: zh
      ? '当前数据不足，暂时无法生成体重与表现的关联分析。'
      : 'Not enough data to compute weight-performance linkage yet.',
    correlation: null,
    confidence: 0.2,
    confidenceLabel: 'low',
    evidence: [{ label: zh ? '数据状态' : 'Data status', value: zh ? '数据不足' : 'insufficient data' }],
  },
});

// ── Plan generation ─────────────────────────────────────────────────────────

const planSchema = z.object({
  birthYear: z.number().int().min(1920).max(2010),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z.number().positive().max(300),
  currentWeightKg: z.number().positive().max(500),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goalType: z.enum(['lose', 'gain', 'maintain']),
  goalWeightKg: z.number().positive().max(500),
  goalDays: z.number().int().min(7).max(730),
});

/**
 * POST /coach/plan
 * Generate a personalized fitness plan for the user.
 */
router.post('/plan', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  const {
    birthYear,
    gender,
    heightCm,
    currentWeightKg,
    activityLevel,
    goalType,
    goalWeightKg,
    goalDays,
  } = parsed.data;

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  const bmr = calcBmr(gender, currentWeightKg, heightCm, age);
  const tdee = calcTdee(bmr, activityLevel);

  // calories per kg of body weight to lose/gain: ~7700 kcal / kg
  const weightDeltaKg = goalWeightKg - currentWeightKg;
  const totalCalorieAdjustment = weightDeltaKg * 7700;
  const dailyCalorieAdjustment = totalCalorieAdjustment / goalDays;
  // Cap at ±1000 kcal/day for safety
  const cappedAdjustment = Math.max(-1000, Math.min(1000, dailyCalorieAdjustment));
  const dailyCalories = Math.round(tdee + cappedAdjustment);
  const calorieDeficit = Math.round(tdee - dailyCalories);

  // Macro split: protein 30%, carbs 40%, fat 30%
  const dailyProteinG = Math.round((dailyCalories * 0.30) / 4);
  const dailyCarbsG = Math.round((dailyCalories * 0.40) / 4);
  const dailyFatG = Math.round((dailyCalories * 0.30) / 9);

  // Persist profile first
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      birthYear,
      gender,
      heightCm,
      currentWeightKg,
      activityLevel,
      goalType,
      goalWeightKg,
      goalDays,
    },
    create: {
      userId,
      birthYear,
      gender,
      heightCm,
      currentWeightKg,
      activityLevel,
      goalType,
      goalWeightKg,
      goalDays,
    },
  });

  // Try LLM for narrative
  const narrative = await generateFitnessPlanNarrative({
    age,
    gender,
    heightCm,
    currentWeightKg,
    goalWeightKg,
    goalDays,
    goalType,
    activityLevel,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalories,
    calorieDeficit,
  });

  const defaultGoalSummary = `Your ${goalDays}-day plan targets ${dailyCalories} kcal/day with a ${calorieDeficit} kcal ${calorieDeficit > 0 ? 'deficit' : 'surplus'}. Aim for ${dailyProteinG}g protein, ${dailyCarbsG}g carbs, and ${dailyFatG}g fat daily.`;
  const defaultExercisePlan = [
    '3× 30-min moderate cardio per week (brisk walk, cycling, or swimming)',
    '2× full-body strength training per week (squats, push-ups, rows)',
    'Daily 10-min morning stretch or yoga',
    'One active recovery day (light walk or mobility work)',
    'Aim for 8,000–10,000 steps per day',
  ];

  try {
    const plan = await prisma.fitnessPlan.upsert({
      where: { userId },
      update: {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        dailyCalories,
        dailyProteinG,
        dailyCarbsG,
        dailyFatG,
        calorieDeficit,
        exercisePlan: (narrative?.exercisePlan ?? defaultExercisePlan) as any,
        goalSummary: narrative?.goalSummary ?? defaultGoalSummary,
      },
      create: {
        userId,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        dailyCalories,
        dailyProteinG,
        dailyCarbsG,
        dailyFatG,
        calorieDeficit,
        exercisePlan: (narrative?.exercisePlan ?? defaultExercisePlan) as any,
        goalSummary: narrative?.goalSummary ?? defaultGoalSummary,
      },
    });

    return res.status(201).json({
      ...plan,
      dailyTips: narrative?.dailyTips ?? [],
    });
  } catch (err) {
    logger.error('plan generation failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /coach/plan
 * Retrieve the user's current fitness plan.
 */
router.get('/plan', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const plan = await prisma.fitnessPlan.findUnique({ where: { userId } });
    if (!plan) return res.json(null);
    return res.json(plan);
  } catch (err) {
    logger.error('plan get failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Chat ────────────────────────────────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

const buildSystemPrompt = (plan: any, profile: any, mode: 'stabilize' | 'build' | 'optimize' | undefined, isZh: boolean): string => {
  const lines = isZh
    ? [
        '你是 PulsePilot 的 AI 健身与营养教练。请简洁、鼓励且基于证据地回答。',
        '只能基于用户真实数据给建议，不要编造诊断。',
        '默认使用简体中文回答。',
      ]
    : [
        'You are an AI fitness and nutrition coach for PulsePilot. Be concise, encouraging, and evidence-based.',
        'Only give advice grounded in the user\'s actual stats. Do not invent diagnoses.',
      ];
  if (mode) {
    lines.push(isZh ? `当前教练模式：${mode}。` : `Current coaching mode: ${mode}.`);
  }
  if (plan) {
    if (isZh) {
      lines.push(
        `用户当前计划：每日目标 ${plan.dailyCalories} kcal，蛋白 ${plan.dailyProteinG}g，碳水 ${plan.dailyCarbsG}g，脂肪 ${plan.dailyFatG}g。`,
        `目标：${plan.goalSummary}`,
      );
    } else {
      lines.push(
        `User's current plan: daily target ${plan.dailyCalories} kcal, protein ${plan.dailyProteinG}g, carbs ${plan.dailyCarbsG}g, fat ${plan.dailyFatG}g.`,
        `Goal: ${plan.goalSummary}`,
      );
    }
  }
  if (profile?.currentWeightKg) {
    lines.push(
      isZh
        ? `当前体重：${profile.currentWeightKg} kg，目标体重：${profile.goalWeightKg} kg，目标周期：${profile.goalDays} 天。`
        : `Current weight: ${profile.currentWeightKg} kg, goal weight: ${profile.goalWeightKg} kg in ${profile.goalDays} days.`,
    );
  }
  return lines.join('\n');
};

const MEAL_KEYWORDS = /\b(ate|eat|had|drank|breakfast|lunch|dinner|snack|coffee|tea|juice|milk|protein|shake|burger|pizza|rice|noodle|pasta|salad|egg|chicken|beef|fish|fruit|veg|toast|bread|cereal|oatmeal|yogurt|smoothie|bar|meal|food|calories?|kcal)\b/i;
const WORKOUT_KEYWORDS = /\b(workout|worked out|exercised|ran|run|jogged|walked|hiked|cycled|swam|lifted|gym|cardio|yoga|pilates|pushup|pull.?up|squat|lunge|stretch|sprint|training|trained|minutes? of|sets? of|reps? of)\b/i;
const FOOD_ONLY_HINT = /\b(food entries?|log (?:that )?food|food only|meals? only|only meals?)\b/i;
const WORKOUT_ONLY_HINT = /\b(workout entries?|log workouts?|workouts? only|only workouts?)\b/i;

const splitMessageItems = (message: string): string[] => {
  const text = message.trim();
  if (!text) return [];
  const payloadText = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text;
  return payloadText
    .split(/(?:\s+and\s+|\s*[,;]\s*)/i)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .slice(0, 8);
};

const cleanSegmentForLog = (segment: string): string => {
  const cleaned = segment
    .replace(/\b(?:also\s+)?can\s+you\b.*$/i, '')
    .replace(/\b(?:please\s+)?generate\b.*$/i, '')
    .replace(/\b(?:should|could)\s+you\b.*$/i, '')
    .replace(/\?.*$/g, '')
    .trim()
    .replace(/[\s.,;:!?-]+$/g, '');
  return cleaned;
};

const buildFoodOnlyDraftsFromMessage = (message: string): Array<{ type: 'meal'; rawText: string }> => {
  const items = splitMessageItems(message).map(cleanSegmentForLog).filter((item) => item.length > 0);
  if (items.length > 0) {
    return items.map((item) => ({ type: 'meal' as const, rawText: item })).slice(0, 5);
  }
  const fallback = message.includes(':') ? message.split(':').slice(1).join(':').trim() : message.trim();
  return fallback ? [{ type: 'meal', rawText: fallback }] : [];
};

const buildFallbackDraftsFromMessage = (message: string): Array<{ type: 'meal' | 'workout'; rawText: string }> => {
  const text = message.trim();
  if (!text) return [];

  const payloadText = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text;

  const segments = splitMessageItems(payloadText);

  const drafts = (segments.length > 0 ? segments : [payloadText])
    .map(cleanSegmentForLog)
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (WORKOUT_KEYWORDS.test(segment)) return { type: 'workout' as const, rawText: segment };
      if (MEAL_KEYWORDS.test(segment)) return { type: 'meal' as const, rawText: segment };
      return null;
    })
    .filter((entry): entry is { type: 'meal' | 'workout'; rawText: string } => Boolean(entry));

  // If we cannot classify segments, still offer a meal draft for common "food logging" requests.
  if (drafts.length === 0 && MEAL_KEYWORDS.test(payloadText)) {
    return [{ type: 'meal', rawText: payloadText }];
  }

  return drafts.slice(0, 5);
};

const buildFallbackCoachReply = (
  message: string,
  entries: Array<{ type: 'meal' | 'workout'; rawText: string }>,
  isZh: boolean,
): string => {
  if (entries.length > 0) {
    const mealCount = entries.filter((entry) => entry.type === 'meal').length;
    const workoutCount = entries.filter((entry) => entry.type === 'workout').length;
    if (isZh) {
      const parts: string[] = [];
      if (mealCount > 0) parts.push(`${mealCount} 条饮食记录`);
      if (workoutCount > 0) parts.push(`${workoutCount} 条训练记录`);
      return `我已根据你的消息草拟了${parts.join('和')}，请确认后保存。`;
    }
    const parts: string[] = [];
    if (mealCount > 0) parts.push(`${mealCount} food ${mealCount === 1 ? 'entry' : 'entries'}`);
    if (workoutCount > 0) parts.push(`${workoutCount} workout ${workoutCount === 1 ? 'entry' : 'entries'}`);
    return `I drafted ${parts.join(' and ')} from your message. Please review and confirm to log them.`;
  }

  if (FOOD_ONLY_HINT.test(message) || MEAL_KEYWORDS.test(message)) {
    return isZh
      ? '我暂时无法高置信度提取食物项。请用逗号分隔食物，我会先生成草稿供你确认。'
      : 'I could not confidently extract food items from that message. Please list foods separated by commas, and I will draft entries for confirmation.';
  }

  if (WORKOUT_ONLY_HINT.test(message) || WORKOUT_KEYWORDS.test(message)) {
    return isZh
      ? '我暂时无法高置信度提取训练项。请提供训练动作或时长，我会先生成草稿供你确认。'
      : 'I could not confidently extract workout items from that message. Please share exercises or duration, and I will draft entries for confirmation.';
  }

  return isZh
    ? '我暂时无法生成完整 AI 回复，但你可以用简单列表提供饮食或训练内容，我仍可帮你生成日志草稿。'
    : 'I could not generate a full AI response right now, but I can still draft log entries if you share foods or workouts in a simple list.';
};

const extractLastMetric = (text: string, regex: RegExp): number | null => {
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return null;
  const value = Number(matches[matches.length - 1]?.[1]);
  return Number.isFinite(value) ? value : null;
};

const estimateNutritionFromText = (mealText: string): NutritionEstimate | null => {
  const text = mealText.toLowerCase();
  const caloriesKcal = extractLastMetric(text, /(\d+(?:\.\d+)?)\s*kcal\b/g);
  const proteinG = extractLastMetric(text, /(\d+(?:\.\d+)?)\s*g\s*protein\b/g);
  const carbsG = extractLastMetric(text, /(\d+(?:\.\d+)?)\s*g\s*carb(?:s|ohydrates?)?\b/g);
  const fatG = extractLastMetric(text, /(\d+(?:\.\d+)?)\s*g\s*fat\b/g);
  const fiberG = extractLastMetric(text, /(\d+(?:\.\d+)?)\s*g\s*fib(?:er|re)\b/g);

  // Need at least calories or protein to produce a meaningful fallback estimate.
  if (caloriesKcal == null && proteinG == null) return null;

  return {
    caloriesKcal: caloriesKcal ?? 0,
    proteinG: proteinG ?? 0,
    carbsG: carbsG ?? 0,
    fiberG: fiberG ?? 0,
    fatG: fatG ?? 0,
    summary: 'Estimated from logged nutrition text.',
  };
};

const confirmLogEntriesSchema = z.object({
  entries: z
    .array(
      z.object({
        type: z.enum(['meal', 'workout']),
        rawText: z.string().min(1).max(2000),
        occurredAt: z.string().optional(),
      }),
    )
    .min(1)
    .max(10),
});

/**
 * POST /coach/chat
 * Send a message to the AI coach and return a chat response.
 */
router.post('/chat', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const language = resolveRequestLanguage(req);
  const zh = isChineseLanguage(language);

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  const { message } = parsed.data;

  try {
    // Fetch plan and profile for system context
    const [plan, profile] = await Promise.all([
      prisma.fitnessPlan.findUnique({ where: { userId } }),
      prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    let personalization: PersonalizationSummary;
    try {
      personalization = await buildPersonalizationSummary(userId, language);
    } catch (personalizationErr) {
      logger.warn('coach chat personalization fallback', { err: personalizationErr, userId });
      personalization = buildFallbackPersonalizationSummary(zh);
    }

    // Fetch today's messages only for context (daily reset)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const history = await prisma.aiChatMessage.findMany({
      where: { userId, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    // Persist user message
    await prisma.aiChatMessage.create({
      data: { userId, role: 'user', content: message, context: 'general' },
    });

    // Build system prompt — include what was just auto-logged for context
    const systemPrompt = [
      buildSystemPrompt(plan, profile, personalization.coachingMode, zh),
      zh ? `当前风险等级：${personalization.riskLevel}。` : `Current risk level: ${personalization.riskLevel}.`,
      zh ? `当前最佳动作：${personalization.outcomeFocus.bestNextAction}。` : `Best next action: ${personalization.outcomeFocus.bestNextAction}.`,
      zh ? `预期收益：${personalization.outcomeFocus.expectedBenefit}。` : `Expected benefit: ${personalization.outcomeFocus.expectedBenefit}.`,
      zh ? '请使用简体中文回答。' : 'Respond in English.',
    ].join('\n');
    const historyMessages = history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    historyMessages.push({ role: 'user', content: message });

    const reply = await chatWithCoach(historyMessages, systemPrompt);
    const finalAssistantContent = reply ?? (zh
      ? '我暂时无法生成回复，请稍后再试。'
      : 'I could not generate a response right now. Please try again in a moment.');

    const assistantMsg = await prisma.aiChatMessage.create({
      data: { userId, role: 'assistant', content: finalAssistantContent, context: 'general' },
    });

    return res.json({ reply: finalAssistantContent, messageId: assistantMsg.id });
  } catch (err) {
    logger.error('coach chat failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /coach/log-entries/confirm
 * Persist user-confirmed (and optionally edited) draft entries generated by AI.
 */
router.post('/log-entries/confirm', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = confirmLogEntriesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  try {
    const created = [] as Array<{ id: string; type: 'meal' | 'workout'; rawText: string; occurredAt: string }>;

    for (const draft of parsed.data.entries) {
      const parsedOccurredAt = draft.occurredAt ? new Date(draft.occurredAt) : null;
      const occurredAt = parsedOccurredAt && !Number.isNaN(parsedOccurredAt.getTime()) ? parsedOccurredAt : new Date();
      const entry = await prisma.logEntry.create({
        data: {
          userId,
          type: draft.type,
          rawText: draft.rawText,
          occurredAt,
        },
      });

      if (draft.type === 'meal') {
        const nutrition = (await estimateNutrition(draft.rawText)) ?? estimateNutritionFromText(draft.rawText);
        if (nutrition) {
          await prisma.parsedEntry.upsert({
            where: { logEntryId: entry.id },
            update: {
              caloriesKcal: nutrition.caloriesKcal,
              proteinG: nutrition.proteinG,
              carbsG: nutrition.carbsG,
              fiberG: nutrition.fiberG,
              fatG: nutrition.fatG,
            },
            create: {
              logEntryId: entry.id,
              caloriesKcal: nutrition.caloriesKcal,
              proteinG: nutrition.proteinG,
              carbsG: nutrition.carbsG,
              fiberG: nutrition.fiberG,
              fatG: nutrition.fatG,
            },
          });
        }
      }

      created.push({ id: entry.id, type: entry.type, rawText: entry.rawText, occurredAt: entry.occurredAt.toISOString() });
    }

    return res.status(201).json({ created });
  } catch (err) {
    logger.error('confirm log entries failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /coach/chat?limit=50
 * Fetch today's chat history only (resets each day).
 */
router.get('/chat', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const messages = await prisma.aiChatMessage.findMany({
      where: { userId, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return res.json(messages);
  } catch (err) {
    logger.error('chat history failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /coach/chat
 * Clear all chat history for the user.
 */
router.delete('/chat', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  await prisma.aiChatMessage.deleteMany({ where: { userId } });
  return res.status(204).send();
});

// ── Nutrition estimation ────────────────────────────────────────────────────

const nutritionSchema = z.object({
  mealText: z.string().min(1).max(1000),
});

/**
 * POST /coach/nutrition
 * Estimate nutrition for a meal description using LLM.
 */
router.post('/nutrition', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = nutritionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  try {
    const estimate = await estimateNutrition(parsed.data.mealText);
    if (!estimate) {
      return res.status(503).json({
        message: 'LLM not configured. Set INSIGHTS_LLM_PROVIDER=openai and OPENAI_API_KEY.',
      });
    }
    return res.json(estimate);
  } catch (err) {
    logger.error('nutrition estimate failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /coach/daily-summary
 * Returns today's logged meals with totals, and remaining targets vs plan.
 */
router.get('/daily-summary', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const [plan, todayEntries] = await Promise.all([
      prisma.fitnessPlan.findUnique({ where: { userId } }),
      (() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return prisma.logEntry.findMany({
          where: { userId, type: 'meal', occurredAt: { gte: start, lte: end } },
          include: { parsedEntry: true },
        });
      })(),
    ]);

    const totals = todayEntries.reduce(
      (acc, entry) => {
        const pe = entry.parsedEntry;
        if (!pe) return acc;
        return {
          caloriesKcal: acc.caloriesKcal + (pe.caloriesKcal ?? 0),
          proteinG: acc.proteinG + (pe.proteinG ?? 0),
          carbsG: acc.carbsG + (pe.carbsG ?? 0),
          fatG: acc.fatG + (pe.fatG ?? 0),
          fiberG: acc.fiberG + (pe.fiberG ?? 0),
        };
      },
      { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
    );

    const remaining = plan
      ? {
          caloriesKcal: Math.round(plan.dailyCalories - totals.caloriesKcal),
          proteinG: Math.round(plan.dailyProteinG - totals.proteinG),
          carbsG: Math.round(plan.dailyCarbsG - totals.carbsG),
          fatG: Math.round(plan.dailyFatG - totals.fatG),
        }
      : null;

    return res.json({
      date: new Date().toISOString().split('T')[0],
      totals,
      remaining,
      plan: plan
        ? {
            dailyCalories: plan.dailyCalories,
            dailyProteinG: plan.dailyProteinG,
            dailyCarbsG: plan.dailyCarbsG,
            dailyFatG: plan.dailyFatG,
          }
        : null,
      mealCount: todayEntries.length,
    });
  } catch (err) {
    logger.error('daily summary failed', { err });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /coach/personalization-summary
 * Returns personalization memory, next best action, weekly recap, and explainability payloads.
 */
router.get('/personalization-summary', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const language = resolveRequestLanguage(req);
  const zh = isChineseLanguage(language);

  try {
    const summary = await buildPersonalizationSummary(userId, language);
    return res.json(summary);
  } catch (err) {
    logger.warn('personalization summary fallback', { err, userId });
    return res.json(buildFallbackPersonalizationSummary(zh));
  }
});

export default router;
