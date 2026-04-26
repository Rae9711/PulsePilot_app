import { prisma } from '../db/prisma';
import type { AppLanguage } from '../utils/language';

type ConfidenceLabel = 'low' | 'medium' | 'high';
type CoachingMode = 'stabilize' | 'build' | 'optimize';

type Recommendation = {
  id: string;
  title: string;
  action: string;
  expectedBenefit: string;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  evidence: Array<{ label: string; value: string | number }>;
};

type WeeklyExperiment = {
  id: string;
  title: string;
  adherencePct: number;
  outcomeScore: number;
  status: 'winning' | 'neutral' | 'needs_attention';
  summary: string;
};

export type PersonalizationSummary = {
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
    evidence: Array<{ label: string; value: string | number }>;
  };
  recommendations: Recommendation[];
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
    evidence: Array<{ label: string; value: string | number }>;
  };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const avg = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const confidenceLabel = (score: number): ConfidenceLabel => {
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const pearson = (pairs: Array<{ x: number; y: number }>): number | null => {
  if (pairs.length < 3) return null;
  const meanX = avg(pairs.map((p) => p.x));
  const meanY = avg(pairs.map((p) => p.y));
  const numerator = pairs.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  const denomX = Math.sqrt(pairs.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0));
  const denomY = Math.sqrt(pairs.reduce((sum, p) => sum + (p.y - meanY) ** 2, 0));
  const denominator = denomX * denomY;
  if (denominator === 0) return null;
  return clamp(numerator / denominator, -1, 1);
};

const localizePersonalizationSummary = (summary: PersonalizationSummary): PersonalizationSummary => {
  const mapText = (value: string): string => {
    const exact: Record<string, string> = {
      'Move tomorrow workout earlier and cut intensity by one step': '将明天训练提前，并把强度下调一个档位。',
      'Keep current schedule and add one recovery-focused checkpoint': '保持当前训练节奏，并增加一个恢复检查点。',
      'Anchor one repeatable workout slot for the next 7 days': '在接下来 7 天固定一个可重复执行的训练时段。',
      'Reduce stress volatility and improve next-day readiness.': '降低压力波动，提升次日状态准备度。',
      'Protect performance while preventing hidden recovery debt.': '在保持表现的同时，避免隐性恢复负债。',
      'Increase consistency so recommendations get more precise week over week.': '提高一致性，让每周建议更精准。',
      'Protect your highest-yield workout timing': '保护你收益最高的训练时间段',
      'Try a consistent workout time for 7 days and compare post-workout energy.': '连续 7 天固定训练时间，并比较训练后精力变化。',
      'Faster pattern detection and better timing confidence.': '更快识别模式，并提高时间建议置信度。',
      'Higher probability of stable energy and lower stress after sessions.': '更高概率获得稳定精力与更低训练后压力。',
      'Use consistency as your primary lever': '把一致性作为你的核心杠杆',
      'Aim for 4 active days in the next 7 days before increasing intensity.': '先在未来 7 天达成 4 个活跃日，再提高强度。',
      'Maintain your active-day rhythm and avoid >2-day gaps.': '保持活跃日节奏，尽量避免超过 2 天的中断。',
      'Better week-to-week stability in mood and performance signals.': '让情绪与表现信号在周与周之间更稳定。',
      'Tune recovery to improve next-day output': '优化恢复以提升次日输出',
      'After high-stress sessions, use lower-intensity or mobility next day.': '高压力训练后，次日安排低强度或灵活性训练。',
      'Keep your current recovery routine and add one structured cooldown habit.': '保持当前恢复习惯，并增加一个结构化冷身动作。',
      'Higher next-session readiness and fewer stress spikes.': '提升下一次训练准备度，减少压力峰值。',
      'Consistent timing experiment': '固定时间实验',
      'Keep this timing pattern next week.': '下周继续保持这个训练时间模式。',
      'Reduce intensity or shift timing for recovery.': '为恢复起见，降低强度或调整训练时间。',
      'Run this experiment one more week for clearer signal.': '再执行一周该实验，获取更清晰信号。',
      'You maintained a strong activity cadence this month.': '你这个月保持了很好的活动节奏。',
      'Post-session stress is mostly controlled.': '训练后压力整体控制得不错。',
      'Energy improved compared with last week.': '相比上周，你的精力表现有所提升。',
      'Large gaps between active days are slowing adaptation.': '活跃日之间间隔过大，正在拖慢适应进度。',
      'Stress is still elevated after sessions.': '训练后压力仍偏高。',
      'Late-night training is creating recovery risk today.': '今天的晚间训练正在增加恢复风险。',
      'Prioritize recovery and timing stability this week.': '本周优先保证恢复与训练时间稳定。',
      'Keep your structure and test one precision tweak only.': '保持当前结构，只测试一个精细化调整。',
      'Lock in repeatable schedule blocks before adding complexity.': '先固定可重复的时间块，再增加复杂度。',
      'Not enough overlapping weight and feeling data yet to estimate linkage.': '当前体重与感受数据重叠不足，暂时无法估计关联。',
      'Lower body weight days are currently associated with higher post-workout energy.': '当前数据显示：体重较低的日子通常对应更高训练后精力。',
      'Higher body weight days are currently associated with higher post-workout energy.': '当前数据显示：体重较高的日子通常对应更高训练后精力。',
      'Weight and post-workout energy are weakly linked right now; behavior timing appears more important.': '目前体重与训练后精力关联较弱，训练时间安排可能更重要。',
      'Coaching mode': '教练模式',
      'Consistency (30d)': '一致性（30天）',
      'Post-feeling samples': '训练后感受样本数',
      'Workout samples (30d)': '训练样本数（30天）',
      'Best workout hour': '最佳训练时段',
      'Late workouts today': '今日晚间训练次数',
      'Active days (30d)': '活跃天数（30天）',
      'Consistency score': '一致性评分',
      'High-stress days (last 7d)': '高压力天数（近7天）',
      'Avg post energy': '平均训练后精力',
      'Avg post stress': '平均训练后压力',
      'Weight logs (30d)': '体重记录（30天）',
      'Overlapping days': '重叠天数',
      'Window': '窗口',
      'Not enough data': '数据不足',
      '30 days': '30天',
    };

    if (exact[value]) return exact[value];

    const hourMatch = value.match(/^Prioritize workouts around (\d{2}:00) when possible this week\.$/);
    if (hourMatch) {
      return `本周尽量把训练安排在 ${hourMatch[1]} 左右。`;
    }

    return value;
  };

  return {
    ...summary,
    outcomeFocus: {
      ...summary.outcomeFocus,
      bestNextAction: mapText(summary.outcomeFocus.bestNextAction),
      expectedBenefit: mapText(summary.outcomeFocus.expectedBenefit),
      evidence: summary.outcomeFocus.evidence.map((item) => ({ ...item, label: mapText(item.label) })),
    },
    recommendations: summary.recommendations.map((rec) => ({
      ...rec,
      title: mapText(rec.title),
      action: mapText(rec.action),
      expectedBenefit: mapText(rec.expectedBenefit),
      evidence: rec.evidence.map((item) => ({ ...item, label: mapText(item.label), value: typeof item.value === 'string' ? mapText(item.value) : item.value })),
    })),
    weeklyExperiments: summary.weeklyExperiments.map((exp) => ({
      ...exp,
      title: mapText(exp.title),
      summary: mapText(exp.summary),
    })),
    weeklyRecap: {
      wins: summary.weeklyRecap.wins.map(mapText),
      misses: summary.weeklyRecap.misses.map(mapText),
      nextFocus: mapText(summary.weeklyRecap.nextFocus),
    },
    weightPerformanceLink: {
      ...summary.weightPerformanceLink,
      summary: mapText(summary.weightPerformanceLink.summary),
      evidence: summary.weightPerformanceLink.evidence.map((item) => ({ ...item, label: mapText(item.label), value: typeof item.value === 'string' ? mapText(item.value) : item.value })),
    },
  };
};

export const buildPersonalizationSummary = async (userId: string, language: AppLanguage = 'en'): Promise<PersonalizationSummary> => {
  const now = new Date();
  const start30 = startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  const start14 = startOfDay(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
  const start7 = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const startPrev7 = startOfDay(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));

  const [entries30, weightLogs30] = await Promise.all([
    prisma.logEntry.findMany({
      where: { userId, occurredAt: { gte: start30 } },
      include: { feelings: true, parsedEntry: true },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.weightLog.findMany({
      where: { userId, loggedAt: { gte: start30 } },
      orderBy: { loggedAt: 'asc' },
    }),
  ]);

  const postFeelings = entries30
    .flatMap((entry) => entry.feelings.filter((f) => f.when === 'post'));
  const avgPostEnergy = avg(postFeelings.map((f) => f.energy));
  const avgPostStress = avg(postFeelings.map((f) => f.stress));

  const activeDays = new Set(entries30.map((entry) => entry.occurredAt.toISOString().slice(0, 10))).size;
  const consistency30d = clamp(activeDays / 30, 0, 1);

  const workoutHours = entries30
    .filter((entry) => entry.type === 'workout')
    .map((entry) => entry.occurredAt.getHours());
  const hourCounts = new Map<number, number>();
  for (const hour of workoutHours) {
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  let bestWorkoutHour: number | null = null;
  let bestHourCount = 0;
  for (const [hour, count] of hourCounts.entries()) {
    if (count > bestHourCount) {
      bestHourCount = count;
      bestWorkoutHour = hour;
    }
  }

  const highStressDays7 = new Set(
    entries30
      .filter((entry) => entry.occurredAt >= start7)
      .flatMap((entry) => entry.feelings.filter((f) => f.when === 'post' && f.stress >= 4).map(() => entry.occurredAt.toISOString().slice(0, 10))),
  ).size;

  let coachingMode: CoachingMode = 'build';
  if (avgPostStress >= 3.7 || consistency30d < 0.4) coachingMode = 'stabilize';
  else if (avgPostEnergy >= 3.4 && avgPostStress <= 2.6 && consistency30d >= 0.72) coachingMode = 'optimize';

  const riskLevel = avgPostStress >= 4 || consistency30d < 0.32
    ? 'high'
    : avgPostStress >= 3.2 || consistency30d < 0.55
      ? 'medium'
      : 'low';

  const todayEntries = entries30.filter((entry) => entry.occurredAt >= startOfDay(now));
  const todayLateWorkouts = todayEntries.filter((entry) => entry.type === 'workout' && entry.occurredAt.getHours() >= 21).length;

  const nextActionTitle = coachingMode === 'stabilize'
    ? 'Move tomorrow workout earlier and cut intensity by one step'
    : coachingMode === 'optimize'
      ? 'Keep current schedule and add one recovery-focused checkpoint'
      : 'Anchor one repeatable workout slot for the next 7 days';

  const outcomeFocusConfidence = clamp(
    0.3 + (postFeelings.length / 40) + (consistency30d * 0.35),
    0.2,
    0.95,
  );

  const timingConfidence = clamp(0.25 + (workoutHours.length / 35), 0.2, 0.92);
  const consistencyConfidence = clamp(0.3 + (entries30.length / 60), 0.2, 0.9);
  const recoveryConfidence = clamp(0.25 + (postFeelings.length / 45), 0.2, 0.88);

  const recommendations: Recommendation[] = [
    {
      id: 'timing',
      title: 'Protect your highest-yield workout timing',
      action: bestWorkoutHour == null
        ? 'Try a consistent workout time for 7 days and compare post-workout energy.'
        : `Prioritize workouts around ${String(bestWorkoutHour).padStart(2, '0')}:00 when possible this week.`,
      expectedBenefit: bestWorkoutHour == null
        ? 'Faster pattern detection and better timing confidence.'
        : 'Higher probability of stable energy and lower stress after sessions.',
      confidence: timingConfidence,
      confidenceLabel: confidenceLabel(timingConfidence),
      evidence: [
        { label: 'Workout samples (30d)', value: workoutHours.length },
        { label: 'Best workout hour', value: bestWorkoutHour == null ? 'Not enough data' : `${bestWorkoutHour}:00` },
        { label: 'Late workouts today', value: todayLateWorkouts },
      ],
    },
    {
      id: 'consistency',
      title: 'Use consistency as your primary lever',
      action: consistency30d < 0.6
        ? 'Aim for 4 active days in the next 7 days before increasing intensity.'
        : 'Maintain your active-day rhythm and avoid >2-day gaps.',
      expectedBenefit: 'Better week-to-week stability in mood and performance signals.',
      confidence: consistencyConfidence,
      confidenceLabel: confidenceLabel(consistencyConfidence),
      evidence: [
        { label: 'Active days (30d)', value: `${activeDays}/30` },
        { label: 'Consistency score', value: `${Math.round(consistency30d * 100)}%` },
        { label: 'High-stress days (last 7d)', value: highStressDays7 },
      ],
    },
    {
      id: 'recovery',
      title: 'Tune recovery to improve next-day output',
      action: avgPostStress >= 3.2
        ? 'After high-stress sessions, use lower-intensity or mobility next day.'
        : 'Keep your current recovery routine and add one structured cooldown habit.',
      expectedBenefit: 'Higher next-session readiness and fewer stress spikes.',
      confidence: recoveryConfidence,
      confidenceLabel: confidenceLabel(recoveryConfidence),
      evidence: [
        { label: 'Avg post energy', value: avgPostEnergy.toFixed(2) },
        { label: 'Avg post stress', value: avgPostStress.toFixed(2) },
        { label: 'Post-feeling samples', value: postFeelings.length },
      ],
    },
  ];

  const thisWeekPosts = entries30
    .filter((entry) => entry.occurredAt >= start7)
    .flatMap((entry) => entry.feelings.filter((f) => f.when === 'post'));
  const prevWeekPosts = entries30
    .filter((entry) => entry.occurredAt >= startPrev7 && entry.occurredAt < start7)
    .flatMap((entry) => entry.feelings.filter((f) => f.when === 'post'));

  const thisWeekEnergy = avg(thisWeekPosts.map((f) => f.energy));
  const prevWeekEnergy = avg(prevWeekPosts.map((f) => f.energy));
  const thisWeekStress = avg(thisWeekPosts.map((f) => f.stress));
  const prevWeekStress = avg(prevWeekPosts.map((f) => f.stress));

  const adherencePct = Math.round(clamp(new Set(entries30.filter((e) => e.occurredAt >= start7).map((e) => e.occurredAt.toISOString().slice(0, 10))).size / 7, 0, 1) * 100);
  const outcomeScoreRaw = (thisWeekEnergy - prevWeekEnergy) - (thisWeekStress - prevWeekStress) * 0.7;
  const outcomeScore = Number(clamp(outcomeScoreRaw, -2, 2).toFixed(2));

  const weeklyExperiments: WeeklyExperiment[] = [
    {
      id: 'timing-experiment',
      title: 'Consistent timing experiment',
      adherencePct,
      outcomeScore,
      status: outcomeScore >= 0.35 ? 'winning' : outcomeScore <= -0.35 ? 'needs_attention' : 'neutral',
      summary:
        outcomeScore >= 0.35
          ? 'Keep this timing pattern next week.'
          : outcomeScore <= -0.35
            ? 'Reduce intensity or shift timing for recovery.'
            : 'Run this experiment one more week for clearer signal.',
    },
  ];

  const wins: string[] = [];
  const misses: string[] = [];

  if (consistency30d >= 0.7) wins.push('You maintained a strong activity cadence this month.');
  if (avgPostStress <= 2.8) wins.push('Post-session stress is mostly controlled.');
  if (thisWeekEnergy > prevWeekEnergy + 0.15) wins.push('Energy improved compared with last week.');

  if (consistency30d < 0.45) misses.push('Large gaps between active days are slowing adaptation.');
  if (avgPostStress >= 3.4) misses.push('Stress is still elevated after sessions.');
  if (todayLateWorkouts > 0) misses.push('Late-night training is creating recovery risk today.');

  const weightByDay = new Map<string, number>();
  for (const log of weightLogs30) {
    weightByDay.set(log.loggedAt.toISOString().slice(0, 10), log.weightKg);
  }

  const dailyPostEnergy = new Map<string, number[]>();
  for (const entry of entries30) {
    const day = entry.occurredAt.toISOString().slice(0, 10);
    const post = entry.feelings.find((f) => f.when === 'post');
    if (!post) continue;
    const existing = dailyPostEnergy.get(day) ?? [];
    existing.push(post.energy);
    dailyPostEnergy.set(day, existing);
  }

  const pairs = [...weightByDay.entries()]
    .map(([day, weight]) => {
      const energies = dailyPostEnergy.get(day);
      if (!energies || energies.length === 0) return null;
      return { x: weight, y: avg(energies) };
    })
    .filter((item): item is { x: number; y: number } => Boolean(item));

  const weightCorr = pearson(pairs);
  const weightConfidence = clamp(0.2 + (pairs.length / 16), 0.2, 0.9);
  const weightSummary = weightCorr == null
    ? 'Not enough overlapping weight and feeling data yet to estimate linkage.'
    : weightCorr <= -0.25
      ? 'Lower body weight days are currently associated with higher post-workout energy.'
      : weightCorr >= 0.25
        ? 'Higher body weight days are currently associated with higher post-workout energy.'
        : 'Weight and post-workout energy are weakly linked right now; behavior timing appears more important.';

  const outcomeFocus = {
    bestNextAction: nextActionTitle,
    expectedBenefit:
      coachingMode === 'stabilize'
        ? 'Reduce stress volatility and improve next-day readiness.'
        : coachingMode === 'optimize'
          ? 'Protect performance while preventing hidden recovery debt.'
          : 'Increase consistency so recommendations get more precise week over week.',
    confidence: outcomeFocusConfidence,
    confidenceLabel: confidenceLabel(outcomeFocusConfidence),
    evidence: [
      { label: 'Coaching mode', value: coachingMode },
      { label: 'Consistency (30d)', value: `${Math.round(consistency30d * 100)}%` },
      { label: 'Post-feeling samples', value: postFeelings.length },
    ],
  };

  const summary: PersonalizationSummary = {
    generatedAt: new Date().toISOString(),
    coachingMode,
    riskLevel,
    profileMemory: {
      consistency30d,
      bestWorkoutHour,
      avgPostEnergy,
      avgPostStress,
    },
    outcomeFocus,
    recommendations,
    weeklyExperiments,
    weeklyRecap: {
      wins,
      misses,
      nextFocus: coachingMode === 'stabilize'
        ? 'Prioritize recovery and timing stability this week.'
        : coachingMode === 'optimize'
          ? 'Keep your structure and test one precision tweak only.'
          : 'Lock in repeatable schedule blocks before adding complexity.',
    },
    weightPerformanceLink: {
      summary: weightSummary,
      correlation: weightCorr == null ? null : Number(weightCorr.toFixed(3)),
      confidence: weightConfidence,
      confidenceLabel: confidenceLabel(weightConfidence),
      evidence: [
        { label: 'Weight logs (30d)', value: weightLogs30.length },
        { label: 'Overlapping days', value: pairs.length },
        { label: 'Window', value: '30 days' },
      ],
    },
  };

  return language === 'zh' ? localizePersonalizationSummary(summary) : summary;
};
