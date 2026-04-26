import axios, { AxiosInstance } from 'axios';
import { AnalyticsBundle, ChatMessage, CoachChatResponse, CoachLogDraft, DailySummary, Entry, FeelingEntry, FitnessPlan, Goal, GoalDraft, GoalStatus, Insight, NutritionEstimate, PersonalizationSummary, PredictionBundle, TrendDataPoint, TrendMetricKey, TrendsData, UserProfile, WeightLog } from '../types/index';
import { mockApiClient } from './mocks';
import { clearStoredAuthToken, getSavedLanguage, getStoredAuthToken } from '../utils/preferences';

const USE_MOCKS = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
const AVAILABLE_METRICS: TrendMetricKey[] = ['post-energy', 'post-valence', 'post-stress'];

type BackendEntry = {
  id: string;
  user_id: string;
  type: 'workout' | 'meal';
  raw_text: string;
  occurred_at: string;
  created_at: string;
  coach_advice?: string;
  feelings?: Array<{
    id: string;
    when: 'pre' | 'post';
    valence: number;
    energy: number;
    stress: number;
    notes?: string | null;
    created_at: string;
  }>;
};

type BackendInsight = {
  id: string;
  user_id: string;
  type: string;
  summary: string;
  supporting_stats: {
    title?: string;
    priority?: 'high' | 'medium' | 'low';
    category?: string;
    bullets?: string[];
    stats?: Array<{ label: string; value: string | number }>;
  } | null;
  rule_name: string;
  created_at: string;
  is_active: boolean;
};

type BackendTrendSnapshot = {
  baselines: Array<{
    id: string;
    scope: string;
    metric: string;
    value: number;
    data_points: number;
    window_days: number;
    updated_at: string;
  }>;
  recent: Array<{
    id: string;
    entered: string;
    type: string;
    pre_energy: number | null;
    pre_valence: number | null;
    pre_stress: number | null;
    post_energy: number | null;
    post_valence: number | null;
    post_stress: number | null;
  }>;
};

const normalizeEntry = (entry: BackendEntry): Entry => ({
  id: entry.id,
  userId: entry.user_id,
  type: entry.type,
  raw_text: entry.raw_text,
  occurred_at: entry.occurred_at,
  createdAt: entry.created_at,
  coachAdvice: entry.coach_advice,
  feelings: (entry.feelings ?? []).map((feeling) => ({
    id: feeling.id,
    entryId: entry.id,
    when: feeling.when,
    valence: feeling.valence,
    energy: feeling.energy,
    stress: feeling.stress,
    notes: feeling.notes ?? undefined,
    createdAt: feeling.created_at,
  })),
});

const toInsight = (insight: BackendInsight): Insight => {
  const meta = insight.supporting_stats ?? {};
  return {
    id: insight.id,
    userId: insight.user_id,
    category: meta.category ?? insight.type,
    priority: meta.priority ?? 'medium',
    title: meta.title ?? insight.rule_name.replace(/_/g, ' '),
    summary: insight.summary,
    bullets: meta.bullets ?? [],
    stats: meta.stats ?? [],
    dismissed: !insight.is_active,
    createdAt: insight.created_at,
    source: meta.title ? 'llm' : 'deterministic',
    ruleName: insight.rule_name,
  };
};

type BackendPredictionBundle = PredictionBundle;

type BackendGoal = {
  id: string;
  title: string;
  metric: Goal['metric'];
  direction: Goal['direction'];
  target_value: number;
  current_value: number;
  progress: number;
  window_days: number;
  note?: string | null;
  status: GoalStatus;
  is_met: boolean;
  created_at: string;
  updated_at: string;
};

const normalizeGoal = (goal: BackendGoal): Goal => ({
  id: goal.id,
  title: goal.title,
  metric: goal.metric,
  direction: goal.direction,
  targetValue: goal.target_value,
  currentValue: goal.current_value,
  progress: goal.progress,
  windowDays: goal.window_days,
  note: goal.note ?? null,
  status: goal.status,
  isMet: goal.is_met,
  createdAt: goal.created_at,
  updatedAt: goal.updated_at,
});

const buildTrendData = (
  snapshot: BackendTrendSnapshot,
  windowDays: number,
  metric: TrendMetricKey
): TrendsData => {
  const zh = getSavedLanguage() === 'zh';
  const metricMap = {
    'post-energy': {
      baselineMetric: 'post_energy',
      actualKey: 'post_energy',
      preKey: 'pre_energy',
      betterWhenHigher: true,
    },
    'post-valence': {
      baselineMetric: 'post_valence',
      actualKey: 'post_valence',
      preKey: 'pre_valence',
      betterWhenHigher: true,
    },
    'post-stress': {
      baselineMetric: 'post_stress',
      actualKey: 'post_stress',
      preKey: 'pre_stress',
      betterWhenHigher: false,
    },
  } as const;

  const selected = metricMap[metric];
  const baseline =
    snapshot.baselines.find((item) => item.metric === selected.baselineMetric)?.value ?? 0;

  const data: TrendDataPoint[] = snapshot.recent
    .filter((item) => item[selected.actualKey] !== null)
    .map((item) => ({
      date: item.entered.split('T')[0],
      baseline: Number(baseline.toFixed(2)),
      actual: item[selected.actualKey] as number,
      pre: item[selected.preKey],
      post: item[selected.actualKey],
    }));

  const recentAverage = data.length
    ? data.reduce((sum, point) => sum + point.actual, 0) / data.length
    : 0;
  const delta = recentAverage - baseline;
  const rawDirection = delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const direction = selected.betterWhenHigher
    ? rawDirection
    : rawDirection === 'up'
      ? 'down'
      : rawDirection === 'down'
        ? 'up'
        : 'flat';
  const morningWorkouts = snapshot.recent.filter(
    (item) => item.type === 'workout' && new Date(item.entered).getHours() < 10
  ).length;
  const lateWorkouts = snapshot.recent.filter(
    (item) => item.type === 'workout' && new Date(item.entered).getHours() >= 21
  ).length;

  return {
    metric,
    windowDays,
    availableMetrics: AVAILABLE_METRICS,
    data,
    summaries: [
      {
        label: zh ? '基线' : 'Baseline',
        value: `${baseline.toFixed(1)}/5`,
        detail: zh ? `${windowDays}天滚动平均` : `${windowDays}-day rolling average`,
        direction: 'flat',
      },
      {
        label: zh ? '近期平均' : 'Recent Average',
        value: `${recentAverage.toFixed(1)}/5`,
        detail: zh ? `${data.length} 个记录样本` : `${data.length} logged samples`,
        direction,
      },
      {
        label: zh ? '变化' : 'Change',
        value: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`,
        detail: zh ? '近期平均 vs 基线' : 'Recent average vs baseline',
        direction,
      },
    ],
    patternHighlights: [
      zh ? `最近 ${windowDays} 天追踪到 ${data.length} 个样本` : `${data.length} tracked samples in the last ${windowDays} days`,
      zh ? `${morningWorkouts} 次早晨训练 vs ${lateWorkouts} 次夜间训练` : `${morningWorkouts} morning workouts vs ${lateWorkouts} late-night workouts`,
      direction === 'flat'
        ? (zh ? '该指标当前整体稳定。' : 'The metric is currently holding steady.')
        : direction === 'up'
          ? (zh ? '趋势正朝有利方向移动。' : 'The trend is moving in a favorable direction.')
          : (zh ? '趋势正在偏离你的理想基线。' : 'The trend is moving away from your preferred baseline.'),
    ],
    recommendations:
      metric === 'post-stress'
        ? [
            zh ? '当晚间训练开始集中出现时，优先保护恢复。' : 'Protect recovery when late workouts start to cluster together.',
            zh ? '当训练后压力持续偏高时，采用较低强度训练。' : 'Use lower-intensity sessions when post-workout stress stays elevated.',
          ]
        : [
            zh ? '持续记录训练前后感受，让每条趋势都可解释。' : 'Keep logging both pre and post feelings so each trend stays explainable.',
            zh ? '使用历史页对比你表现最好的日期附近记录。' : 'Use the History page to compare entries around your strongest days.',
          ],
  };
};

export interface IApiClient {
  createEntry(
    type: 'workout' | 'meal',
    raw_text: string,
    occurred_at: string
  ): Promise<Entry>;
  getEntries(userId: string, limit?: number, page?: number): Promise<Entry[]>;
  addFeeling(
    entryId: string,
    when: 'pre' | 'post',
    valence: number,
    energy: number,
    stress: number,
    notes?: string
  ): Promise<FeelingEntry>;
  getTrends(userId: string, windowDays?: number, metric?: TrendMetricKey): Promise<TrendsData>;
  getInsights(userId: string): Promise<Insight[]>;
  getPredictions(userId: string): Promise<PredictionBundle>;
  getAnalytics(userId: string, windowDays?: number): Promise<AnalyticsBundle>;
  getGoals(): Promise<Goal[]>;
  createGoal(input: GoalDraft): Promise<Goal>;
  updateGoal(goalId: string, input: Partial<GoalDraft> & { status?: GoalStatus }): Promise<Goal>;
  dismissInsight(insightId: string): Promise<void>;
  deleteEntry(entryId: string): Promise<void>;
  getPersonalizationSummary(): Promise<PersonalizationSummary>;
}

class ApiClient implements IApiClient {
  private axiosInstance: AxiosInstance;
  public baseURL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = getStoredAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        const language = getSavedLanguage();
        config.headers['x-app-language'] = language;
        config.headers['Accept-Language'] = language === 'zh' ? 'zh-CN,zh;q=0.9' : 'en-US,en;q=0.9';
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearStoredAuthToken();
          window.location.href = '/login';
        }
        throw error;
      }
    );
  }

  async createEntry(
    type: 'workout' | 'meal',
    raw_text: string,
    occurred_at: string
  ): Promise<Entry> {
    if (USE_MOCKS) {
      return mockApiClient.createEntry(type, raw_text, occurred_at);
    }

    const response = await this.axiosInstance.post<BackendEntry>('/entries', {
      type,
      raw_text,
      occurred_at,
    });
    return normalizeEntry(response.data);
  }

  async getEntries(userId: string, limit?: number, page?: number): Promise<Entry[]> {
    if (USE_MOCKS) {
      return mockApiClient.getEntries(userId, limit);
    }

    const response = await this.axiosInstance.get<BackendEntry[]>('/entries', {
      params: { userId, limit: limit || 100, offset: ((page || 1) - 1) * (limit || 100) },
    });
    return response.data.map(normalizeEntry);
  }

  async addFeeling(
    entryId: string,
    when: 'pre' | 'post',
    valence: number,
    energy: number,
    stress: number,
    notes?: string
  ): Promise<FeelingEntry> {
    if (USE_MOCKS) {
      return mockApiClient.addFeeling(entryId, when, valence, energy, stress, notes);
    }

    const response = await this.axiosInstance.post<{
      id: string;
      log_entry_id: string;
      when: 'pre' | 'post';
      valence: number;
      energy: number;
      stress: number;
      notes?: string | null;
      created_at: string;
    }>(`/entries/${entryId}/feelings`, {
      when,
      valence,
      energy,
      stress,
      notes,
    });

    return {
      id: response.data.id,
      entryId: response.data.log_entry_id,
      when: response.data.when,
      valence: response.data.valence,
      energy: response.data.energy,
      stress: response.data.stress,
      notes: response.data.notes ?? undefined,
      createdAt: response.data.created_at,
    };
  }

  async getTrends(
    userId: string,
    windowDays?: number,
    metric: TrendMetricKey = 'post-energy'
  ): Promise<TrendsData> {
    if (USE_MOCKS) {
      return mockApiClient.getTrends(userId, windowDays, metric);
    }

    const response = await this.axiosInstance.get<BackendTrendSnapshot>('/trends', {
      params: (() => {
        const params: Record<string, unknown> = {
          window_days: windowDays ?? 30,
        };
        if (userId) {
          params.user_id = userId;
        }
        return params;
      })(),
    });

    return buildTrendData(response.data, windowDays ?? 30, metric);
  }

  async getInsights(userId: string): Promise<Insight[]> {
    if (USE_MOCKS) {
      return mockApiClient.getInsights(userId);
    }

    const response = await this.axiosInstance.get<BackendInsight[]>('/insights');
    return response.data.map(toInsight);
  }

  async getPredictions(userId: string): Promise<PredictionBundle> {
    if (USE_MOCKS) {
      return mockApiClient.getPredictions(userId);
    }

    const response = await this.axiosInstance.get<BackendPredictionBundle>('/predictions', {
      params: userId ? { user_id: userId } : undefined,
    });
    return response.data;
  }

  async getAnalytics(userId: string, windowDays?: number): Promise<AnalyticsBundle> {
    if (USE_MOCKS) {
      return mockApiClient.getAnalytics(userId, windowDays);
    }

    const response = await this.axiosInstance.get<AnalyticsBundle>('/analytics', {
      params: {
        ...(userId ? { user_id: userId } : {}),
        ...(windowDays ? { window_days: windowDays } : {}),
      },
    });
    return response.data;
  }

  async getGoals(): Promise<Goal[]> {
    if (USE_MOCKS) {
      return mockApiClient.getGoals();
    }

    const response = await this.axiosInstance.get<BackendGoal[]>('/goals');
    return response.data.map(normalizeGoal);
  }

  async createGoal(input: GoalDraft): Promise<Goal> {
    if (USE_MOCKS) {
      return mockApiClient.createGoal(input);
    }

    const response = await this.axiosInstance.post<BackendGoal>('/goals', {
      title: input.title,
      metric: input.metric,
      direction: input.direction,
      target_value: input.targetValue,
      window_days: input.windowDays,
      note: input.note,
    });
    return normalizeGoal(response.data);
  }

  async updateGoal(goalId: string, input: Partial<GoalDraft> & { status?: GoalStatus }): Promise<Goal> {
    if (USE_MOCKS) {
      return mockApiClient.updateGoal(goalId, input);
    }

    const response = await this.axiosInstance.patch<BackendGoal>(`/goals/${goalId}`, {
      title: input.title,
      metric: input.metric,
      direction: input.direction,
      target_value: input.targetValue,
      window_days: input.windowDays,
      note: input.note,
      status: input.status,
    });
    return normalizeGoal(response.data);
  }

  async dismissInsight(insightId: string): Promise<void> {
    if (USE_MOCKS) {
      return mockApiClient.dismissInsight(insightId);
    }

    await this.axiosInstance.patch(`/insights/${insightId}/dismiss`);
  }

  async deleteEntry(entryId: string): Promise<void> {
    if (USE_MOCKS) {
      return;
    }

    await this.axiosInstance.delete(`/entries/${entryId}`);
  }

  // ── Weight Tracking ────────────────────────────────────────────────────────

  async getWeightLogs(limit?: number): Promise<WeightLog[]> {
    const response = await this.axiosInstance.get<WeightLog[]>('/weight', {
      params: { limit: limit ?? 90 },
    });
    return response.data;
  }

  async logWeight(weightKg: number, loggedAt?: string, note?: string): Promise<WeightLog> {
    const response = await this.axiosInstance.post<WeightLog>('/weight', {
      weightKg,
      loggedAt,
      note,
    });
    return response.data;
  }

  async deleteWeightLog(id: string): Promise<void> {
    await this.axiosInstance.delete(`/weight/${id}`);
  }

  // ── User Profile ───────────────────────────────────────────────────────────

  async getProfile(): Promise<UserProfile> {
    const response = await this.axiosInstance.get<UserProfile>('/profile');
    return response.data;
  }

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    const response = await this.axiosInstance.put<UserProfile>('/profile', profile);
    return response.data;
  }

  // ── Fitness Plan ───────────────────────────────────────────────────────────

  async generatePlan(input: {
    birthYear: number;
    gender: string;
    heightCm: number;
    currentWeightKg: number;
    activityLevel: string;
    goalType: string;
    goalWeightKg: number;
    goalDays: number;
  }): Promise<FitnessPlan> {
    const response = await this.axiosInstance.post<FitnessPlan>('/coach/plan', input);
    return response.data;
  }

  async getPlan(): Promise<FitnessPlan | null> {
    try {
      const response = await this.axiosInstance.get<FitnessPlan>('/coach/plan');
      return response.data;
    } catch {
      return null;
    }
  }

  // ── Coach Chat ─────────────────────────────────────────────────────────────

  async getChatHistory(): Promise<ChatMessage[]> {
    const response = await this.axiosInstance.get<ChatMessage[]>('/coach/chat');
    return response.data;
  }

  async sendChatMessage(message: string): Promise<CoachChatResponse> {
    const response = await this.axiosInstance.post<CoachChatResponse>('/coach/chat', {
      message,
    });
    return response.data;
  }

  async confirmCoachLogEntries(entries: CoachLogDraft[]): Promise<{ created: Array<{ id: string; type: 'meal' | 'workout'; rawText: string; occurredAt: string }> }> {
    const response = await this.axiosInstance.post<{ created: Array<{ id: string; type: 'meal' | 'workout'; rawText: string; occurredAt: string }> }>('/coach/log-entries/confirm', {
      entries,
    });
    return response.data;
  }

  async clearChatHistory(): Promise<void> {
    await this.axiosInstance.delete('/coach/chat');
  }

  // ── Nutrition Estimation ───────────────────────────────────────────────────

  async estimateNutrition(mealText: string): Promise<NutritionEstimate> {
    const response = await this.axiosInstance.post<NutritionEstimate>('/coach/nutrition', {
      mealText,
    });
    return response.data;
  }

  // ── Daily Summary ──────────────────────────────────────────────────────────

  async getDailySummary(): Promise<DailySummary> {
    const response = await this.axiosInstance.get<DailySummary>('/coach/daily-summary');
    return response.data;
  }

  async getPersonalizationSummary(): Promise<PersonalizationSummary> {
    const response = await this.axiosInstance.get<PersonalizationSummary>('/coach/personalization-summary');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export const api = apiClient;
