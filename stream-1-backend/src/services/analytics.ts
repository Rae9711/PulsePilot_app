import type { FeelingEntry, LogEntry } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { AppLanguage } from '../utils/language';

type DatabaseEntry = LogEntry & { feelings: FeelingEntry[] };
type ConfidenceLabel = 'emerging' | 'moderate' | 'strong';
type SeverityLabel = 'watch' | 'stable' | 'opportunity';
type PeriodLabel = 'daily' | 'weekly' | 'monthly';

type WorkoutSample = {
  occurredAt: Date;
  weekday: number;
  timeBucket: 'morning' | 'midday' | 'evening' | 'late';
  monthSegment: 'early' | 'mid' | 'late';
  preEnergy: number;
  preStress: number;
  preValence: number;
  postEnergy: number;
  postStress: number;
  postValence: number;
  energyDelta: number;
  stressDelta: number;
  valenceDelta: number;
  compositeScore: number;
  nextDayRecoveryQuality: number | null;
  hadBreakfastFuel: boolean;
  hadProteinRecoveryMeal: boolean;
  gapDays: number;
};

export type AnalyticsCorrelation = {
  id: string;
  title: string;
  summary: string;
  relationship: 'positive' | 'negative';
  strength: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  sampleCount: number;
  recommendation: string;
  evidence: Array<{ label: string; value: string | number }>;
};

export type PredictiveInsight = {
  id: string;
  title: string;
  summary: string;
  severity: SeverityLabel;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  expectedWindow: string;
  recommendation: string;
  evidence: Array<{ label: string; value: string | number }>;
};

export type RecurringPattern = {
  id: string;
  title: string;
  summary: string;
  period: PeriodLabel;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  sampleCount: number;
  recommendation: string;
  evidence: Array<{ label: string; value: string | number }>;
};

export type AnalyticsBundle = {
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
};

const localizeAnalyticsBundle = (bundle: AnalyticsBundle): AnalyticsBundle => {
  const t = (value: string): string => {
    const exact: Record<string, string> = {
      'Workout timing correlation': '训练时间相关性',
      'Fueling correlation': '营养补给相关性',
      'Pre-stress correlation': '训练前压力相关性',
      'Consistency correlation': '一致性相关性',
      'Weekly rhythm': '每周节律',
      'Monthly rhythm': '每月节律',
      'Daily slot pattern': '每日时段模式',
      'Sunday': '周日',
      'Monday': '周一',
      'Tuesday': '周二',
      'Wednesday': '周三',
      'Thursday': '周四',
      'Friday': '周五',
      'Saturday': '周六',
      'early month': '月初',
      'mid month': '月中',
      'late month': '月末',
      'morning': '早晨',
      'midday': '中午',
      'evening': '傍晚',
      'late': '夜间',
      'next session / tomorrow': '下一次训练 / 明天',
      'next 7 days': '未来7天',
      'next 2 weeks': '未来2周',
      'Tomorrow might be a tougher session': '明天这次训练可能更吃力',
      'Tomorrow is set up for a strong session': '明天已具备强势训练条件',
      'Tomorrow looks steady if you repeat the same pattern': '如果保持当前模式，明天表现将更稳定',
      'Late sessions are becoming tomorrow’s risk factor': '晚间训练正在成为次日风险因素',
      'Your schedule risk is under control': '你的训练时间风险目前可控',
      'Fueling is increasing forecast reliability': '补给策略正在提升预测可靠性',
      'Fueling gaps are reducing forecast quality': '补给缺口正在降低预测质量',
      'Use recovery or lower-intensity days when you start already stressed instead of forcing a hard session.': '当训练前压力已偏高时，优先恢复或低强度训练，而不是硬顶高强度。',
      'Try protecting a steadier workout rhythm instead of bunching sessions together after long gaps.': '与其长间隔后集中补课，不如保持更稳定的训练节奏。',
      'Plan demanding sessions on your stronger weekday and reserve the weaker slot for recovery or lighter work.': '把高强度训练安排在你更强的工作日，把较弱时段留给恢复或轻量训练。',
      'Use the stronger month segment for harder progressions and reduce friction in the weaker segment.': '在你更强的月份阶段推进难度，在较弱阶段降低阻力。',
      'Anchor your higher-value sessions around the daily slot that keeps showing up as your strongest.': '把高价值训练固定在你最稳定的优势时段。',
      'evaluation_window': '评估窗口',
      'combined_effect': '综合效应',
      'confidence': '置信度',
      'projected_energy': '预测精力',
      'projected_stress': '预测压力',
      'late_session_share': '晚间训练占比',
      'high_pre_stress_share': '高训练前压力占比',
      'consistent_spacing': '稳定间隔占比',
      'breakfast_share': '早餐/训练前补给占比',
      'recent_sessions': '近期训练次数',
      'best_slot': '最佳时段',
      'watch_slot': '需关注时段',
      'morning-midday': '早晨-中午',
      'evening-late': '傍晚-夜间',
      'fueled_sessions': '已补给训练',
      'unfueled_sessions': '未补给训练',
      'low_pre_stress': '低训练前压力',
      'high_pre_stress': '高训练前压力',
      'steady_spacing': '稳定间隔',
      'long_gaps': '长间隔',
      'daily': '每日',
      'weekly': '每周',
      'monthly': '每月',
    };
    if (exact[value]) return exact[value];

    return value
      .replace(/outperforming/g, '领先于')
      .replace(/weighted points/g, '加权分')
      .replace(/points/g, '分');
  };

  return {
    ...bundle,
    correlations: bundle.correlations.map((item) => ({
      ...item,
      title: t(item.title),
      summary: t(item.summary),
      recommendation: t(item.recommendation),
      evidence: item.evidence.map((ev) => ({ ...ev, label: t(ev.label), value: typeof ev.value === 'string' ? t(ev.value) : ev.value })),
    })),
    predictiveInsights: bundle.predictiveInsights.map((item) => ({
      ...item,
      title: t(item.title),
      summary: t(item.summary),
      expectedWindow: t(item.expectedWindow),
      recommendation: t(item.recommendation),
      evidence: item.evidence.map((ev) => ({ ...ev, label: t(ev.label), value: typeof ev.value === 'string' ? t(ev.value) : ev.value })),
    })),
    recurringPatterns: bundle.recurringPatterns.map((item) => ({
      ...item,
      title: t(item.title),
      summary: t(item.summary),
      period: t(item.period) as PeriodLabel,
      recommendation: t(item.recommendation),
      evidence: item.evidence.map((ev) => ({ ...ev, label: t(ev.label), value: typeof ev.value === 'string' ? t(ev.value) : ev.value })),
    })),
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 180;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampUnit = (value: number) => Number(clamp(value, 0, 1).toFixed(3));
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const percent = (value: number) => `${Math.round(value * 100)}%`;
const isDefined = <T>(value: T | null): value is T => value !== null;

const confidenceLabel = (confidence: number): ConfidenceLabel => {
  if (confidence >= 0.78) {
    return 'strong';
  }
  if (confidence >= 0.5) {
    return 'moderate';
  }
  return 'emerging';
};

const recencyWeight = (date: Date) => {
  const ageDays = Math.max(0, (Date.now() - date.getTime()) / DAY_MS);
  return Math.exp((-Math.log(2) * ageDays) / 21);
};

const weightedAverage = (values: number[], weights: number[]) => {
  if (!values.length) {
    return 0;
  }
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  if (!totalWeight) {
    return average(values);
  }
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight;
};

const buildConfidence = (sampleCount: number, effectSize: number) => {
  const sampleFactor = Math.min(1, sampleCount / 12);
  const effectFactor = Math.min(1, Math.abs(effectSize) / 1.2);
  return clampUnit(sampleFactor * 0.6 + effectFactor * 0.4);
};

const getWindowStart = (windowDays: number) => new Date(Date.now() - Math.min(windowDays, MAX_LOOKBACK_DAYS) * DAY_MS);

const getTimeBucket = (hour: number): WorkoutSample['timeBucket'] => {
  if (hour < 11) {
    return 'morning';
  }
  if (hour < 16) {
    return 'midday';
  }
  if (hour < 21) {
    return 'evening';
  }
  return 'late';
};

const getMonthSegment = (date: Date): WorkoutSample['monthSegment'] => {
  const day = date.getDate();
  if (day <= 10) {
    return 'early';
  }
  if (day <= 20) {
    return 'mid';
  }
  return 'late';
};

const normalizeRecoveryQuality = (energy: number, stress: number, valence: number) =>
  clampUnit((energy + (6 - stress) + valence) / 15);

const isBreakfastLike = (entry: DatabaseEntry) => {
  const normalized = entry.rawText.toLowerCase();
  const hour = entry.occurredAt.getHours();
  return hour < 11 || /(breakfast|oatmeal|smoothie|toast|egg|yogurt|coffee)/.test(normalized);
};

const isProteinRich = (entry: DatabaseEntry) => /(protein|chicken|salmon|steak|eggs|yogurt|creatine|shake)/.test(entry.rawText.toLowerCase());

const buildWorkoutSamples = (entries: DatabaseEntry[]) => {
  const sortedEntries = [...entries].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const meals = sortedEntries.filter((entry) => entry.type === 'meal');
  const workouts = sortedEntries.filter((entry) => entry.type === 'workout');
  const samples: WorkoutSample[] = [];

  for (let index = 0; index < workouts.length; index += 1) {
    const workout = workouts[index];
    const pre = workout.feelings.find((feeling) => feeling.when === 'pre');
    const post = workout.feelings.find((feeling) => feeling.when === 'post');
    if (!pre || !post) {
      continue;
    }

    const previousWorkout = workouts[index - 1];
    const nextEntry = sortedEntries.find((entry) => {
      if (entry.occurredAt <= workout.occurredAt) {
        return false;
      }
      const deltaHours = (entry.occurredAt.getTime() - workout.occurredAt.getTime()) / (60 * 60 * 1000);
      return deltaHours >= 8 && deltaHours <= 36 && Boolean(entry.feelings.find((feeling) => feeling.when === 'pre'));
    });
    const nextPre = nextEntry?.feelings.find((feeling) => feeling.when === 'pre');
    const preFuelMeal = meals.find((meal) => {
      const deltaMinutes = (workout.occurredAt.getTime() - meal.occurredAt.getTime()) / (60 * 1000);
      return deltaMinutes >= 0 && deltaMinutes <= 180;
    });
    const recoveryMeal = meals.find((meal) => {
      const deltaMinutes = (meal.occurredAt.getTime() - workout.occurredAt.getTime()) / (60 * 1000);
      return deltaMinutes >= 0 && deltaMinutes <= 120 && isProteinRich(meal);
    });

    samples.push({
      occurredAt: workout.occurredAt,
      weekday: workout.occurredAt.getDay(),
      timeBucket: getTimeBucket(workout.occurredAt.getHours()),
      monthSegment: getMonthSegment(workout.occurredAt),
      preEnergy: pre.energy,
      preStress: pre.stress,
      preValence: pre.valence,
      postEnergy: post.energy,
      postStress: post.stress,
      postValence: post.valence,
      energyDelta: post.energy - pre.energy,
      stressDelta: post.stress - pre.stress,
      valenceDelta: post.valence - pre.valence,
      compositeScore: post.energy + post.valence - post.stress * 0.6,
      nextDayRecoveryQuality: nextPre ? normalizeRecoveryQuality(nextPre.energy, nextPre.stress, nextPre.valence) : null,
      hadBreakfastFuel: Boolean(preFuelMeal && isBreakfastLike(preFuelMeal)),
      hadProteinRecoveryMeal: Boolean(recoveryMeal),
      gapDays: previousWorkout ? Number(((workout.occurredAt.getTime() - previousWorkout.occurredAt.getTime()) / DAY_MS).toFixed(2)) : 3,
    });
  }

  return samples;
};

const buildCorrelation = (params: {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  left: WorkoutSample[];
  right: WorkoutSample[];
  accessor: (sample: WorkoutSample) => number;
  recommendation: string;
}) => {
  const { id, title, leftLabel, rightLabel, left, right, accessor, recommendation } = params;
  if (left.length < 2 || right.length < 2) {
    return null;
  }

  const leftWeights = left.map((sample) => recencyWeight(sample.occurredAt));
  const rightWeights = right.map((sample) => recencyWeight(sample.occurredAt));
  const leftMean = weightedAverage(left.map(accessor), leftWeights);
  const rightMean = weightedAverage(right.map(accessor), rightWeights);
  const effectSize = Number((leftMean - rightMean).toFixed(2));
  const confidence = buildConfidence(left.length + right.length, effectSize);
  const relationship = effectSize >= 0 ? 'positive' : 'negative';
  const absoluteEffect = Math.abs(effectSize);

  return {
    id,
    title,
    summary: `${leftLabel} is outperforming ${rightLabel} by about ${absoluteEffect.toFixed(1)} weighted points in your recent data.`,
    relationship,
    strength: absoluteEffect,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    sampleCount: left.length + right.length,
    recommendation,
    evidence: [
      { label: leftLabel, value: leftMean.toFixed(1) },
      { label: rightLabel, value: rightMean.toFixed(1) },
      { label: 'confidence', value: percent(confidence) },
    ],
  } satisfies AnalyticsCorrelation;
};

const buildRecurringPattern = (params: {
  id: string;
  title: string;
  period: PeriodLabel;
  groups: Array<{ label: string; values: number[] }>;
  recommendation: string;
  sampleCount: number;
}) => {
  const ranked = params.groups
    .map((group) => ({ ...group, average: average(group.values) }))
    .filter((group) => group.values.length > 0)
    .sort((left, right) => right.average - left.average);

  if (ranked.length < 2) {
    return null;
  }

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const effectSize = Number((best.average - worst.average).toFixed(2));
  const confidence = buildConfidence(params.sampleCount, effectSize);
  if (effectSize < 0.35) {
    return null;
  }

  return {
    id: params.id,
    title: params.title,
    summary: `${best.label} is your strongest recurring slot, outperforming ${worst.label} by about ${effectSize.toFixed(1)} points.`,
    period: params.period,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    sampleCount: params.sampleCount,
    recommendation: params.recommendation,
    evidence: [
      { label: 'best_slot', value: best.label },
      { label: 'watch_slot', value: worst.label },
      { label: 'confidence', value: percent(confidence) },
    ],
  } satisfies RecurringPattern;
};

const buildPredictiveInsights = (samples: WorkoutSample[]) => {
  if (!samples.length) {
    return [];
  }

  const recent = samples.slice(-10);
  const weights = recent.map((sample) => recencyWeight(sample.occurredAt));
  const projectedEnergy = weightedAverage(recent.map((sample) => sample.postEnergy), weights);
  const projectedStress = weightedAverage(recent.map((sample) => sample.postStress), weights);
  const lateShare = recent.filter((sample) => sample.timeBucket === 'late').length / recent.length;
  const highStressShare = recent.filter((sample) => sample.preStress >= 4).length / recent.length;
  const breakfastShare = recent.filter((sample) => sample.hadBreakfastFuel).length / recent.length;
  const consistencyShare = recent.filter((sample) => sample.gapDays <= 2.5).length / recent.length;

  const tomorrowConfidence = buildConfidence(recent.length, projectedEnergy - projectedStress);
  const tomorrowSeverity: SeverityLabel = projectedEnergy >= 3.8 && projectedStress <= 2.3 ? 'opportunity' : projectedStress >= 3.2 ? 'watch' : 'stable';
  const tomorrowTitle = tomorrowSeverity === 'watch' ? 'Tomorrow might be a tougher session' : tomorrowSeverity === 'opportunity' ? 'Tomorrow is set up for a strong session' : 'Tomorrow looks steady if you repeat the same pattern';

  const alerts: PredictiveInsight[] = [
    {
      id: 'tomorrow-outlook',
      title: tomorrowTitle,
      summary: `Your recent pattern points to about ${projectedEnergy.toFixed(1)}/5 post-workout energy and ${projectedStress.toFixed(1)}/5 post-workout stress for the next comparable session.`,
      severity: tomorrowSeverity,
      confidence: tomorrowConfidence,
      confidenceLabel: confidenceLabel(tomorrowConfidence),
      expectedWindow: 'next session / tomorrow',
      recommendation: tomorrowSeverity === 'watch' ? 'Lower intensity or move the session earlier if you want to avoid another high-stress day.' : 'Repeat the same timing and fueling pattern so the forecast has a chance to hold.',
      evidence: [
        { label: 'projected_energy', value: projectedEnergy.toFixed(1) },
        { label: 'projected_stress', value: projectedStress.toFixed(1) },
        { label: 'confidence', value: percent(tomorrowConfidence) },
      ],
    },
    {
      id: 'late-session-risk',
      title: lateShare >= 0.3 ? 'Late sessions are becoming tomorrow’s risk factor' : 'Your schedule risk is under control',
      summary: lateShare >= 0.3
        ? `Late workouts make up ${Math.round(lateShare * 100)}% of your recent sessions, which often pushes next-day readiness down.`
        : `Only ${Math.round(lateShare * 100)}% of recent workouts were late, which keeps next-day disruption lower.` ,
      severity: lateShare >= 0.3 ? 'watch' : 'stable',
      confidence: buildConfidence(recent.length, lateShare * 2),
      confidenceLabel: confidenceLabel(buildConfidence(recent.length, lateShare * 2)),
      expectedWindow: 'next 7 days',
      recommendation: lateShare >= 0.3 ? 'Protect at least one morning or midday slot this week to rebalance the pattern.' : 'Keep preserving your earlier sessions because they are stabilizing the week.',
      evidence: [
        { label: 'late_session_share', value: percent(lateShare) },
        { label: 'high_pre_stress_share', value: percent(highStressShare) },
        { label: 'consistent_spacing', value: percent(consistencyShare) },
      ],
    },
    {
      id: 'fueling-readiness',
      title: breakfastShare >= 0.45 ? 'Fueling is increasing forecast reliability' : 'Fueling gaps are reducing forecast quality',
      summary: breakfastShare >= 0.45
        ? `Breakfast or pre-fuel shows up before ${Math.round(breakfastShare * 100)}% of recent sessions, which makes your outcomes more repeatable.`
        : `Only ${Math.round(breakfastShare * 100)}% of recent sessions were fueled early, so the model sees more variability than usual.` ,
      severity: breakfastShare >= 0.45 ? 'opportunity' : 'watch',
      confidence: buildConfidence(recent.length, breakfastShare - 0.35),
      confidenceLabel: confidenceLabel(buildConfidence(recent.length, breakfastShare - 0.35)),
      expectedWindow: 'next 2 weeks',
      recommendation: breakfastShare >= 0.45 ? 'Keep pairing hard workouts with consistent fueling to preserve the signal.' : 'Add a light breakfast or pre-workout fuel on your next two hard sessions and compare the result.',
      evidence: [
        { label: 'breakfast_share', value: percent(breakfastShare) },
        { label: 'recent_sessions', value: recent.length },
        { label: 'confidence', value: percent(buildConfidence(recent.length, breakfastShare - 0.35)) },
      ],
    },
  ];

  return alerts;
};

export const getAnalyticsBundleForUser = async (userId: string, windowDays: number, language: AppLanguage = 'en') => {
  const entries = await prisma.logEntry.findMany({
    where: {
      userId,
      occurredAt: {
        gte: getWindowStart(Math.max(windowDays, 90)),
      },
    },
    include: { feelings: true },
    orderBy: { occurredAt: 'asc' },
  });

  const samples = buildWorkoutSamples(entries);
  const windowedSamples = samples.filter((sample) => sample.occurredAt >= getWindowStart(windowDays));
  const trackedDays = new Set(entries.map((entry) => entry.occurredAt.toISOString().split('T')[0])).size;
  const loggedWorkouts = entries.filter((entry) => entry.type === 'workout').length;

  const correlations = [
    buildCorrelation({
      id: 'timing-correlation',
      title: 'Workout timing correlation',
      leftLabel: 'morning-midday',
      rightLabel: 'evening-late',
      left: windowedSamples.filter((sample) => sample.timeBucket === 'morning' || sample.timeBucket === 'midday'),
      right: windowedSamples.filter((sample) => sample.timeBucket === 'evening' || sample.timeBucket === 'late'),
      accessor: (sample) => sample.compositeScore,
      recommendation: 'Bias one or two important sessions toward your stronger time bucket and compare the outcome next week.',
    }),
    buildCorrelation({
      id: 'fuel-correlation',
      title: 'Fueling correlation',
      leftLabel: 'fueled_sessions',
      rightLabel: 'unfueled_sessions',
      left: windowedSamples.filter((sample) => sample.hadBreakfastFuel || sample.hadProteinRecoveryMeal),
      right: windowedSamples.filter((sample) => !sample.hadBreakfastFuel && !sample.hadProteinRecoveryMeal),
      accessor: (sample) => sample.energyDelta + (sample.nextDayRecoveryQuality ?? 0),
      recommendation: 'Keep fueling consistent around hard sessions if you want a more reliable energy lift and next-day recovery pattern.',
    }),
    buildCorrelation({
      id: 'stress-correlation',
      title: 'Pre-stress correlation',
      leftLabel: 'low_pre_stress',
      rightLabel: 'high_pre_stress',
      left: windowedSamples.filter((sample) => sample.preStress <= 2),
      right: windowedSamples.filter((sample) => sample.preStress >= 4),
      accessor: (sample) => sample.postEnergy - sample.postStress,
      recommendation: 'Use recovery or lower-intensity days when you start already stressed instead of forcing a hard session.',
    }),
    buildCorrelation({
      id: 'consistency-correlation',
      title: 'Consistency correlation',
      leftLabel: 'steady_spacing',
      rightLabel: 'long_gaps',
      left: windowedSamples.filter((sample) => sample.gapDays <= 2.5),
      right: windowedSamples.filter((sample) => sample.gapDays >= 4),
      accessor: (sample) => (sample.nextDayRecoveryQuality ?? 0) * 3 + sample.postEnergy,
      recommendation: 'Try protecting a steadier workout rhythm instead of bunching sessions together after long gaps.',
    }),
  ]
    .filter(isDefined)
    .sort((left, right) => right.confidence * right.strength - left.confidence * left.strength)
    .slice(0, 3);

  const recurringPatterns = [
    buildRecurringPattern({
      id: 'weekday-pattern',
      title: 'Weekly rhythm',
      period: 'weekly',
      groups: [
        { label: 'Sunday', values: windowedSamples.filter((sample) => sample.weekday === 0).map((sample) => sample.compositeScore) },
        { label: 'Monday', values: windowedSamples.filter((sample) => sample.weekday === 1).map((sample) => sample.compositeScore) },
        { label: 'Tuesday', values: windowedSamples.filter((sample) => sample.weekday === 2).map((sample) => sample.compositeScore) },
        { label: 'Wednesday', values: windowedSamples.filter((sample) => sample.weekday === 3).map((sample) => sample.compositeScore) },
        { label: 'Thursday', values: windowedSamples.filter((sample) => sample.weekday === 4).map((sample) => sample.compositeScore) },
        { label: 'Friday', values: windowedSamples.filter((sample) => sample.weekday === 5).map((sample) => sample.compositeScore) },
        { label: 'Saturday', values: windowedSamples.filter((sample) => sample.weekday === 6).map((sample) => sample.compositeScore) },
      ],
      recommendation: 'Plan demanding sessions on your stronger weekday and reserve the weaker slot for recovery or lighter work.',
      sampleCount: windowedSamples.length,
    }),
    buildRecurringPattern({
      id: 'month-pattern',
      title: 'Monthly rhythm',
      period: 'monthly',
      groups: [
        { label: 'early month', values: windowedSamples.filter((sample) => sample.monthSegment === 'early').map((sample) => sample.compositeScore) },
        { label: 'mid month', values: windowedSamples.filter((sample) => sample.monthSegment === 'mid').map((sample) => sample.compositeScore) },
        { label: 'late month', values: windowedSamples.filter((sample) => sample.monthSegment === 'late').map((sample) => sample.compositeScore) },
      ],
      recommendation: 'Use the stronger month segment for harder progressions and reduce friction in the weaker segment.',
      sampleCount: windowedSamples.length,
    }),
    buildRecurringPattern({
      id: 'daily-pattern',
      title: 'Daily slot pattern',
      period: 'daily',
      groups: [
        { label: 'morning', values: windowedSamples.filter((sample) => sample.timeBucket === 'morning').map((sample) => sample.compositeScore) },
        { label: 'midday', values: windowedSamples.filter((sample) => sample.timeBucket === 'midday').map((sample) => sample.compositeScore) },
        { label: 'evening', values: windowedSamples.filter((sample) => sample.timeBucket === 'evening').map((sample) => sample.compositeScore) },
        { label: 'late', values: windowedSamples.filter((sample) => sample.timeBucket === 'late').map((sample) => sample.compositeScore) },
      ],
      recommendation: 'Anchor your higher-value sessions around the daily slot that keeps showing up as your strongest.',
      sampleCount: windowedSamples.length,
    }),
  ].filter(isDefined);

  const bundle: AnalyticsBundle = {
    userId,
    generatedAt: new Date().toISOString(),
    windowDays,
    summary: {
      trackedDays,
      loggedWorkouts,
      completeWorkoutSamples: windowedSamples.length,
      latestWorkoutAt: entries.filter((entry) => entry.type === 'workout').at(-1)?.occurredAt.toISOString() ?? null,
    },
    correlations,
    predictiveInsights: buildPredictiveInsights(windowedSamples),
    recurringPatterns,
  };

  return language === 'zh' ? localizeAnalyticsBundle(bundle) : bundle;
};