export interface FeelingEntry {
  id: string;
  entryId: string;
  when: 'pre' | 'post';
  valence: number;
  energy: number;
  stress: number;
  notes?: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  userId: string;
  type: 'workout' | 'meal';
  raw_text: string;
  occurred_at: string;
  createdAt: string;
  coachAdvice?: string;
  feelings?: FeelingEntry[];
}

export type InsightPriority = 'high' | 'medium' | 'low';

export interface InsightStat {
  label: string;
  value: string | number;
}

export interface Insight {
  id: string;
  userId: string;
  category: string;
  priority: InsightPriority;
  title: string;
  summary: string;
  bullets: string[];
  stats: InsightStat[];
  dismissed: boolean;
  createdAt: string;
  source: 'deterministic' | 'llm';
  ruleName: string;
}

export type TrendMetricKey = 'post-energy' | 'post-valence' | 'post-stress';

export interface TrendDataPoint {
  date: string;
  baseline: number;
  actual: number;
  pre?: number | null;
  post?: number | null;
}

export interface TrendSummary {
  label: string;
  value: string;
  detail: string;
  direction: 'up' | 'down' | 'flat';
}

export interface TrendsData {
  metric: TrendMetricKey;
  data: TrendDataPoint[];
  windowDays: number;
  availableMetrics: TrendMetricKey[];
  summaries: TrendSummary[];
  patternHighlights: string[];
  recommendations: string[];
}

export interface PersonalizedHeuristic {
  id: string;
  category: 'timing' | 'mood' | 'nutrition' | 'consistency';
  title: string;
  summary: string;
  recommendation: string;
  direction: 'positive' | 'negative';
  effectSize: number;
  confidence: number;
  confidenceLabel: 'emerging' | 'moderate' | 'strong';
  sampleCount: number;
  windowDays: number;
  evidence: Array<{ label: string; value: string | number }>;
}

export interface PredictionMetric {
  value: number;
  confidence: number;
  confidenceLabel: 'emerging' | 'moderate' | 'strong';
  sampleCount: number;
  contributors: Array<{ label: string; value: number }>;
}

export interface ForecastNarrative {
  headline: string;
  coachSummary: string;
  priorities: string[];
  nextActions: string[];
  checkInQuestions: string[];
}

export interface ForecastScenario {
  id: string;
  label: string;
  description: string;
  plannedHour: number;
  workoutKind: 'cardio' | 'strength' | 'recovery' | 'mixed';
  includeBreakfast: boolean;
  includeProteinRecoveryMeal: boolean;
  predictions: {
    expectedPostWorkoutEnergy: PredictionMetric;
    expectedPostWorkoutStress: PredictionMetric;
    goodSessionLikelihood: PredictionMetric;
    nextDayRecoveryQuality: PredictionMetric;
  };
}

export interface AnalyticsEvidence {
  label: string;
  value: string | number;
}

export interface AnalyticsCorrelation {
  id: string;
  title: string;
  summary: string;
  relationship: 'positive' | 'negative';
  strength: number;
  confidence: number;
  confidenceLabel: 'emerging' | 'moderate' | 'strong';
  sampleCount: number;
  recommendation: string;
  evidence: AnalyticsEvidence[];
}

export interface PredictiveInsight {
  id: string;
  title: string;
  summary: string;
  severity: 'watch' | 'stable' | 'opportunity';
  confidence: number;
  confidenceLabel: 'emerging' | 'moderate' | 'strong';
  expectedWindow: string;
  recommendation: string;
  evidence: AnalyticsEvidence[];
}

export interface RecurringPattern {
  id: string;
  title: string;
  summary: string;
  period: 'daily' | 'weekly' | 'monthly';
  confidence: number;
  confidenceLabel: 'emerging' | 'moderate' | 'strong';
  sampleCount: number;
  recommendation: string;
  evidence: AnalyticsEvidence[];
}

export interface AnalyticsBundle {
  userId: string;
  generatedAt: string;
  windowDays: number;
  summary: {
    trackedDays: number;
    loggedWorkouts: number;
    completeWorkoutSamples: number;
    latestWorkoutAt: string | null;
  };
  correlations: AnalyticsCorrelation[];
  predictiveInsights: PredictiveInsight[];
  recurringPatterns: RecurringPattern[];
}

export type GoalMetric =
  | 'weekly_workouts'
  | 'active_days'
  | 'post_workout_energy'
  | 'post_workout_stress'
  | 'recovery_quality';

export type GoalDirection = 'at_least' | 'at_most';

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  direction: GoalDirection;
  targetValue: number;
  currentValue: number;
  progress: number;
  windowDays: number;
  note?: string | null;
  status: GoalStatus;
  isMet: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Weight Tracking ──────────────────────────────────────────────────────────

export interface WeightLog {
  id: string;
  userId: string;
  weightKg: number;
  loggedAt: string;
  note?: string | null;
  createdAt: string;
}

// ── User Profile ────────────────────────────────────────────────────────────

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'gain' | 'maintain';
export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  id?: string;
  userId?: string;
  birthYear?: number | null;
  gender?: Gender | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  goalType?: GoalType | null;
  goalWeightKg?: number | null;
  goalDays?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// ── Fitness Plan ────────────────────────────────────────────────────────────

export interface FitnessPlan {
  id: string;
  userId: string;
  bmr: number;
  tdee: number;
  dailyCalories: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  calorieDeficit: number;
  exercisePlan: string[];
  goalSummary: string;
  dailyTips?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── AI Coach Chat ───────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
  createdAt: string;
}

export interface CoachLogDraft {
  type: 'meal' | 'workout';
  rawText: string;
  occurredAt?: string;
}

export interface CoachChatResponse {
  reply: string;
  messageId: string;
}

// ── Nutrition Estimate ──────────────────────────────────────────────────────

export interface NutritionEstimate {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fiberG: number;
  fatG: number;
  summary: string;
}

// ── Daily Summary ───────────────────────────────────────────────────────────

export interface DailySummary {
  date: string;
  totals: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  remaining: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null;
  plan: {
    dailyCalories: number;
    dailyProteinG: number;
    dailyCarbsG: number;
    dailyFatG: number;
  } | null;
  mealCount: number;
}

export type CoachingMode = 'stabilize' | 'build' | 'optimize';
export type ConfidenceLabel = 'low' | 'medium' | 'high';

export interface PersonalizationEvidence {
  label: string;
  value: string | number;
}

export interface PersonalizationRecommendation {
  id: string;
  title: string;
  action: string;
  expectedBenefit: string;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  evidence: PersonalizationEvidence[];
}

export interface WeeklyExperiment {
  id: string;
  title: string;
  adherencePct: number;
  outcomeScore: number;
  status: 'winning' | 'neutral' | 'needs_attention';
  summary: string;
}

export interface PersonalizationSummary {
  generatedAt: string;
  coachingMode: CoachingMode;
  riskLevel: 'low' | 'medium' | 'high';
  profileMemory: {
    consistency30d: number;
    bestWorkoutHour: number | null;
    avgPostEnergy: number;
    avgPostStress: number;
  };
  outcomeFocus: {
    bestNextAction: string;
    expectedBenefit: string;
    confidence: number;
    confidenceLabel: ConfidenceLabel;
    evidence: PersonalizationEvidence[];
  };
  recommendations: PersonalizationRecommendation[];
  weeklyExperiments: WeeklyExperiment[];
  weeklyRecap: {
    wins: string[];
    misses: string[];
    nextFocus: string;
  };
  weightPerformanceLink: {
    summary: string;
    correlation: number | null;
    confidence: number;
    confidenceLabel: ConfidenceLabel;
    evidence: PersonalizationEvidence[];
  };
}

export interface GoalDraft {
  title: string;
  metric: GoalMetric;
  direction: GoalDirection;
  targetValue: number;
  windowDays: number;
  note?: string;
}

export interface PredictionBundle {
  userId: string;
  generatedAt: string;
  windows: number[];
  heuristics: PersonalizedHeuristic[];
  defaultScenario: ForecastScenario;
  scenarioComparisons: ForecastScenario[];
  modelNotes: {
    userWorkoutSamples: number;
    globalWorkoutSamples: number;
    personalWeight: number;
    globalWeight: number;
    calibrationNote: string;
  };
  narrative: ForecastNarrative;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
