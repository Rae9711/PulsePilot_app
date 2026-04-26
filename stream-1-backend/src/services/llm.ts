type InsightNarrative = {
  title: string;
  summary: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  bullets: string[];
};

type ForecastNarrative = {
  headline: string;
  coachSummary: string;
  priorities: string[];
  nextActions: string[];
  checkInQuestions: string[];
};

type LlmProvider = 'off' | 'openai' | 'ollama' | 'jac';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

const provider = (process.env.INSIGHTS_LLM_PROVIDER ?? 'off') as LlmProvider;

const buildMessages = (narrative: InsightNarrative, stats: Record<string, unknown>): ChatMessage[] => [
  {
    role: 'system',
    content:
      'You rewrite personalized fitness insights into concise, plain-language user copy. Preserve the evidence-based meaning. Return valid JSON only.'
  },
  {
    role: 'user',
    content: JSON.stringify({
      task: 'Rewrite the following FitForecast insight without inventing any new evidence.',
      output_schema: {
        title: 'string',
        summary: 'string',
        priority: 'high | medium | low',
        category: 'string',
        bullets: ['string', 'string', 'string']
      },
      insight: narrative,
      supporting_stats: stats
    })
  }
];

const buildForecastMessages = (narrative: ForecastNarrative, stats: Record<string, unknown>): ChatMessage[] => [
  {
    role: 'system',
    content:
      'You turn structured fitness prediction output into concise, evidence-grounded coaching language. Preserve the evidence, do not invent claims, and return valid JSON only.'
  },
  {
    role: 'user',
    content: JSON.stringify({
      task: 'Rewrite the following FitForecast forecast summary into clearer coaching copy without changing the evidence or confidence.',
      output_schema: {
        headline: 'string',
        coachSummary: 'string',
        priorities: ['string', 'string', 'string'],
        nextActions: ['string', 'string', 'string'],
        checkInQuestions: ['string', 'string']
      },
      narrative,
      supporting_stats: stats
    })
  }
];

const extractJson = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<InsightNarrative>;
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.summary !== 'string' ||
      typeof parsed.priority !== 'string' ||
      typeof parsed.category !== 'string' ||
      !Array.isArray(parsed.bullets)
    ) {
      return null;
    }

    return {
      title: parsed.title,
      summary: parsed.summary,
      priority: parsed.priority as InsightNarrative['priority'],
      category: parsed.category,
      bullets: parsed.bullets.filter((item): item is string => typeof item === 'string').slice(0, 3)
    } satisfies InsightNarrative;
  } catch {
    return null;
  }
};

const extractForecastJson = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<ForecastNarrative>;
    if (
      typeof parsed.headline !== 'string' ||
      typeof parsed.coachSummary !== 'string' ||
      !Array.isArray(parsed.priorities) ||
      !Array.isArray(parsed.nextActions) ||
      !Array.isArray(parsed.checkInQuestions)
    ) {
      return null;
    }

    return {
      headline: parsed.headline,
      coachSummary: parsed.coachSummary,
      priorities: parsed.priorities.filter((item): item is string => typeof item === 'string').slice(0, 3),
      nextActions: parsed.nextActions.filter((item): item is string => typeof item === 'string').slice(0, 3),
      checkInQuestions: parsed.checkInQuestions.filter((item): item is string => typeof item === 'string').slice(0, 2)
    } satisfies ForecastNarrative;
  } catch {
    return null;
  }
};

const callOpenAiCompatible = async (messages: ChatMessage[], forceJson = true) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    messages,
  };
  if (forceJson) {
    body.response_format = { type: 'json_object' };
  }
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? null;
};

const callOllama = async (messages: ChatMessage[], forceJson = true) => {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';
  const body: Record<string, unknown> = {
    model,
    stream: false,
    messages,
  };
  if (forceJson) {
    body.format = 'json';
  }
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    message?: { content?: string };
  };
  return payload.message?.content ?? null;
};

const callJac = async (narrative: InsightNarrative, stats: Record<string, unknown>) => {
  const baseUrl = process.env.JAC_LLM_URL ?? 'http://127.0.0.1:8787';
  const apiKey = process.env.JAC_LLM_API_KEY;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rewrite-insight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      narrative,
      supporting_stats: stats
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    result?: InsightNarrative;
  };
  return payload.result ? JSON.stringify(payload.result) : null;
};

const callJacForecast = async (narrative: ForecastNarrative, stats: Record<string, unknown>) => {
  const baseUrl = process.env.JAC_LLM_URL ?? 'http://127.0.0.1:8787';
  const apiKey = process.env.JAC_LLM_API_KEY;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/personalize-forecast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      narrative,
      supporting_stats: stats
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    result?: ForecastNarrative;
  };
  return payload.result ? JSON.stringify(payload.result) : null;
};

export const maybeEnhanceInsightNarrative = async (
  narrative: InsightNarrative,
  stats: Record<string, unknown>
) => {
  if (provider === 'off') {
    return narrative;
  }

  try {
    const messages = buildMessages(narrative, stats);
    const raw =
      provider === 'openai'
        ? await callOpenAiCompatible(messages)
        : provider === 'ollama'
          ? await callOllama(messages)
          : await callJac(narrative, stats);

    if (!raw) {
      return narrative;
    }

    return extractJson(raw) ?? narrative;
  } catch {
    return narrative;
  }
};

export const maybePersonalizeForecastNarrative = async (
  narrative: ForecastNarrative,
  stats: Record<string, unknown>
) => {
  if (provider === 'off') {
    return narrative;
  }

  try {
    const messages = buildForecastMessages(narrative, stats);
    const raw =
      provider === 'openai'
        ? await callOpenAiCompatible(messages)
        : provider === 'ollama'
          ? await callOllama(messages)
          : await callJacForecast(narrative, stats);

    if (!raw) {
      return narrative;
    }

    return extractForecastJson(raw) ?? narrative;
  } catch {
    return narrative;
  }
};

// ── Nutrition Estimation ────────────────────────────────────────────────────

export type NutritionEstimate = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fiberG: number;
  fatG: number;
  summary: string;
};

const buildNutritionMessages = (mealText: string): ChatMessage[] => [
  {
    role: 'system',
    content:
      'You are a nutrition expert. Estimate the nutritional content of a meal described in plain text. Return valid JSON only with the exact schema provided. Use realistic average values. Do not invent impossible numbers.',
  },
  {
    role: 'user',
    content: JSON.stringify({
      task: 'Estimate the nutrition for this meal/food description.',
      meal: mealText,
      output_schema: {
        caloriesKcal: 'number (total calories)',
        proteinG: 'number (grams of protein)',
        carbsG: 'number (grams of carbohydrates)',
        fiberG: 'number (grams of fiber)',
        fatG: 'number (grams of fat)',
        summary: 'string (one sentence describing what was estimated)',
      },
    }),
  },
];

const extractNutritionJson = (raw: string, mealDescription: string): NutritionEstimate | null => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<NutritionEstimate>;
    if (
      typeof parsed.caloriesKcal !== 'number' ||
      typeof parsed.proteinG !== 'number' ||
      typeof parsed.carbsG !== 'number' ||
      typeof parsed.fiberG !== 'number' ||
      typeof parsed.fatG !== 'number'
    ) {
      return null;
    }
    return {
      caloriesKcal: parsed.caloriesKcal,
      proteinG: parsed.proteinG,
      carbsG: parsed.carbsG,
      fiberG: parsed.fiberG,
      fatG: parsed.fatG,
      summary: parsed.summary ?? mealDescription,
    };
  } catch {
    return null;
  }
};

export const estimateNutrition = async (mealText: string): Promise<NutritionEstimate | null> => {
  if (provider === 'off') return null;
  try {
    const messages = buildNutritionMessages(mealText);
    const raw =
      provider === 'openai' || provider === 'jac'
        ? await callOpenAiCompatible(messages)
        : await callOllama(messages);
    if (!raw) return null;
    return extractNutritionJson(raw, mealText);
  } catch {
    return null;
  }
};

// ── AI Coach Chat ───────────────────────────────────────────────────────────

export type CoachChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export type CoachLogDraft = {
  type: 'meal' | 'workout';
  rawText: string;
  occurredAt?: string;
};

const buildCoachLogDraftMessages = (assistantReply: string): ChatMessage[] => [
  {
    role: 'system',
    content:
      'Extract log entries from the assistant summary text. Return JSON only. Do not add entries that are not explicitly present in the text.',
  },
  {
    role: 'user',
    content: JSON.stringify({
      task: 'Extract meal/workout entries from this coach summary.',
      assistantReply,
      output_schema: {
        entries: [
          {
            type: 'meal | workout',
            rawText: 'string',
            occurredAt: 'optional ISO datetime string',
          },
        ],
      },
    }),
  },
];

const extractCoachLogDrafts = (raw: string): CoachLogDraft[] => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return [];

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      entries?: Array<{ type?: string; rawText?: string; occurredAt?: string }>;
    };
    if (!Array.isArray(parsed.entries)) return [];

    return parsed.entries
      .filter((entry): entry is { type: 'meal' | 'workout'; rawText: string; occurredAt?: string } =>
        (entry.type === 'meal' || entry.type === 'workout') && typeof entry.rawText === 'string' && entry.rawText.trim().length > 0,
      )
      .map((entry) => ({
        type: entry.type,
        rawText: entry.rawText.trim(),
        occurredAt: typeof entry.occurredAt === 'string' ? entry.occurredAt : undefined,
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
};

export const chatWithCoach = async (
  messages: CoachChatMessage[],
  systemPrompt: string
): Promise<string | null> => {
  if (provider === 'off') return null;
  try {
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user', content: m.content })),
    ];
    const raw =
      provider === 'openai' || provider === 'jac'
        ? await callOpenAiCompatible(fullMessages, false) // plain text for chat
        : await callOllama(fullMessages, false); // plain text for chat
    return raw;
  } catch {
    return null;
  }
};

export const proposeCoachLogDrafts = async (assistantReply: string): Promise<CoachLogDraft[]> => {
  if (provider === 'off') return [];
  try {
    const messages = buildCoachLogDraftMessages(assistantReply);
    const raw =
      provider === 'openai' || provider === 'jac'
        ? await callOpenAiCompatible(messages)
        : await callOllama(messages);
    if (!raw) return [];
    return extractCoachLogDrafts(raw);
  } catch {
    return [];
  }
};

// ── Fitness Plan Generation ─────────────────────────────────────────────────

export type FitnessPlanSuggestion = {
  goalSummary: string;
  exercisePlan: string[];
  dailyTips: string[];
};

export const generateFitnessPlanNarrative = async (
  profile: {
    age: number;
    gender: string;
    heightCm: number;
    currentWeightKg: number;
    goalWeightKg: number;
    goalDays: number;
    goalType: string;
    activityLevel: string;
    bmr: number;
    tdee: number;
    dailyCalories: number;
    calorieDeficit: number;
  }
): Promise<FitnessPlanSuggestion | null> => {
  if (provider === 'off') return null;
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a certified personal trainer and nutritionist. Create a practical, evidence-based fitness plan. Return valid JSON only.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate a personalized fitness plan based on this profile.',
        profile,
        output_schema: {
          goalSummary: 'string (2-3 sentence motivating summary of the plan)',
          exercisePlan: 'array of 5 exercise recommendations (e.g. "3x 30-min brisk walks per week")',
          dailyTips: 'array of 3 practical daily nutrition/lifestyle tips',
        },
      }),
    },
  ];
  try {
    const raw =
      provider === 'openai' || provider === 'jac'
        ? await callOpenAiCompatible(messages)
        : await callOllama(messages);
    if (!raw) return null;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<FitnessPlanSuggestion>;
    return {
      goalSummary: parsed.goalSummary ?? '',
      exercisePlan: Array.isArray(parsed.exercisePlan) ? parsed.exercisePlan : [],
      dailyTips: Array.isArray(parsed.dailyTips) ? parsed.dailyTips : [],
    };
  } catch {
    return null;
  }
};