import type { BaselineMetric, Insight, LogEntry, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { maybeEnhanceInsightNarrative } from './llm';

type InsightPriority = 'high' | 'medium' | 'low';

type EntryWithFeelings = LogEntry & {
  feelings: Array<{
    when: 'pre' | 'post';
    valence: number;
    energy: number;
    stress: number;
  }>;
};

type RuleDraft = {
  type: string;
  ruleName: string;
  title: string;
  summary: string;
  category: string;
  priority: InsightPriority;
  bullets: string[];
  stats: Array<{ label: string; value: string | number }>;
};

const RULES = {
  consistencyPositive: { type: 'consistency', ruleName: 'consistency_positive' },
  consistencyGap: { type: 'consistency', ruleName: 'consistency_gap_warning' },
  morningMomentum: { type: 'energy', ruleName: 'morning_momentum' },
  lateWorkoutPenalty: { type: 'recovery', ruleName: 'late_workout_penalty' },
  stressReliefPositive: { type: 'stress', ruleName: 'stress_relief_positive' },
  stressStuck: { type: 'stress', ruleName: 'stress_relief_warning' },
  proteinTiming: { type: 'nutrition', ruleName: 'protein_timing_support' },
  breakfastOpportunity: { type: 'nutrition', ruleName: 'breakfast_opportunity' },
  recoveryDeficit: { type: 'recovery', ruleName: 'recovery_deficit' },
  peakPerformance: { type: 'energy', ruleName: 'peak_performance_pattern' }
} as const;

const clamp = (value: number, digits = 1) => Number(value.toFixed(digits));

const percent = (value: number) => `${Math.round(value * 100)}%`;

const average = (values: number[]) => {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildMetricKey = (scope: string, metric: string, windowDays: number) =>
  `${scope}:${metric}:${windowDays}`;

const labelHourBucket = (hour: number) => {
  if (hour < 11) {
    return 'morning';
  }
  if (hour < 16) {
    return 'midday';
  }
  if (hour < 21) {
    return 'evening';
  }
  return 'late night';
};

const buildProfile = (entries: EntryWithFeelings[], metrics: BaselineMetric[]) => {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const recentEntries = entries.filter((entry) => entry.occurredAt >= ninetyDaysAgo);
  const recent30Entries = recentEntries.filter((entry) => entry.occurredAt >= thirtyDaysAgo);
  const workouts = recentEntries.filter((entry) => entry.type === 'workout');
  const meals = recentEntries.filter((entry) => entry.type === 'meal');
  const completeWorkouts = workouts.filter(
    (entry) => entry.feelings.some((feeling) => feeling.when === 'pre') && entry.feelings.some((feeling) => feeling.when === 'post')
  );
  const completeMeals = meals.filter(
    (entry) => entry.feelings.some((feeling) => feeling.when === 'pre') && entry.feelings.some((feeling) => feeling.when === 'post')
  );

  const activityDays = Array.from(
    new Set(recent30Entries.map((entry) => entry.occurredAt.toISOString().split('T')[0]))
  ).sort();

  const gapDays = activityDays.slice(1).map((day, index) => {
    const current = new Date(day);
    const previous = new Date(activityDays[index]);
    return (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000);
  });

  const deltaFor = (entry: EntryWithFeelings, field: 'energy' | 'valence' | 'stress') => {
    const pre = entry.feelings.find((feeling) => feeling.when === 'pre');
    const post = entry.feelings.find((feeling) => feeling.when === 'post');
    if (!pre || !post) {
      return 0;
    }
    return post[field] - pre[field];
  };

  const workoutHours = completeWorkouts.map((entry) => entry.occurredAt.getHours());
  const morningWorkoutRatio = workoutHours.length
    ? workoutHours.filter((hour) => hour >= 5 && hour < 10).length / workoutHours.length
    : 0;
  const lateWorkoutRatio = workoutHours.length
    ? workoutHours.filter((hour) => hour >= 21).length / workoutHours.length
    : 0;
  const preferredWorkoutHour = workoutHours.length ? Math.round(average(workoutHours)) : 0;

  const breakfastMeals = meals.filter((entry) => {
    const text = entry.rawText.toLowerCase();
    const hour = entry.occurredAt.getHours();
    return (
      hour < 11 ||
      text.includes('breakfast') ||
      text.includes('oatmeal') ||
      text.includes('smoothie') ||
      text.includes('yogurt') ||
      text.includes('coffee')
    );
  });

  const workoutMealPairs = completeWorkouts.filter((workout) =>
    meals.some((meal) => {
      const deltaMinutes = (meal.occurredAt.getTime() - workout.occurredAt.getTime()) / (60 * 1000);
      return deltaMinutes >= 0 && deltaMinutes <= 120;
    })
  );

  const metricMap = new Map(metrics.map((metric) => [buildMetricKey(metric.scope, metric.metric, metric.windowDays), metric]));
  const getMetric = (scope: string, metric: string, windowDays: number) =>
    metricMap.get(buildMetricKey(scope, metric, windowDays))?.value ?? 0;
  const getPoints = (scope: string, metric: string, windowDays: number) =>
    metricMap.get(buildMetricKey(scope, metric, windowDays))?.dataPoints ?? 0;

  const workoutEnergy30 = getMetric('workout', 'post_energy', 30);
  const workoutEnergy90 = getMetric('workout', 'post_energy', 90);
  const workoutStress30 = getMetric('workout', 'post_stress', 30);

  return {
    recentEntryCount: recent30Entries.length,
    activeDays30: activityDays.length,
    consistencyRate30: activityDays.length / 30,
    averageGapDays: average(gapDays),
    workoutCount: completeWorkouts.length,
    mealCount: completeMeals.length,
    morningWorkoutRatio,
    lateWorkoutRatio,
    preferredWorkoutBucket: labelHourBucket(preferredWorkoutHour),
    workoutEnergyDelta: average(completeWorkouts.map((entry) => deltaFor(entry, 'energy'))),
    workoutStressDelta: average(completeWorkouts.map((entry) => deltaFor(entry, 'stress'))),
    mealEnergyDelta: average(completeMeals.map((entry) => deltaFor(entry, 'energy'))),
    breakfastRate: activityDays.length ? breakfastMeals.length / activityDays.length : 0,
    workoutMealPairRatio: completeWorkouts.length ? workoutMealPairs.length / completeWorkouts.length : 0,
    averagePostWorkoutStress: average(
      completeWorkouts.map((entry) => entry.feelings.find((feeling) => feeling.when === 'post')?.stress ?? 0)
    ),
    workoutEnergy30,
    workoutEnergy90,
    workoutStress30,
    workoutEnergyPoints30: getPoints('workout', 'post_energy', 30),
    peakProfile:
      completeWorkouts.length >= 8 &&
      workoutEnergy30 >= 3.8 &&
      average(completeWorkouts.map((entry) => entry.feelings.find((feeling) => feeling.when === 'post')?.stress ?? 0)) <= 2.2,
    stalledProfile:
      completeWorkouts.length >= 5 &&
      (workoutEnergy30 <= 2.2 || average(completeWorkouts.map((entry) => deltaFor(entry, 'energy'))) <= 0.1) &&
      average(completeWorkouts.map((entry) => entry.feelings.find((feeling) => feeling.when === 'post')?.stress ?? 0)) >= 3.6
  };
};

export const listInsightsForUser = async (userId: string, limit: number) => {
  const insights = await prisma.insight.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return insights.map((insight) => toApiInsight(insight));
};

export const dismissInsightForUser = async (userId: string, insightId: string) => {
  const result = await prisma.insight.updateMany({
    where: { id: insightId, userId },
    data: { isActive: false }
  });
  return result.count > 0;
};

export const upsertInsightFromRule = async (params: {
  userId: string;
  type: string;
  summary: string;
  supportingStats: Prisma.InputJsonValue;
  ruleName: string;
}) => {
  const { userId, type, summary, supportingStats, ruleName } = params;
  const insight = await prisma.insight.upsert({
    where: { userId_type_ruleName: { userId, type, ruleName } },
    create: {
      userId,
      type,
      summary,
      supportingStats,
      ruleName
    },
    update: {
      summary,
      supportingStats,
      isActive: true
    }
  });

  return toApiInsight(insight);
};

const persistDraft = async (userId: string, draft: RuleDraft) => {
  const narrative = await maybeEnhanceInsightNarrative(
    {
      title: draft.title,
      summary: draft.summary,
      priority: draft.priority,
      category: draft.category,
      bullets: draft.bullets
    },
    Object.fromEntries(draft.stats.map((stat) => [stat.label, stat.value]))
  );

  return upsertInsightFromRule({
    userId,
    type: draft.type,
    ruleName: draft.ruleName,
    summary: narrative.summary,
    supportingStats: {
      title: narrative.title,
      priority: narrative.priority,
      category: narrative.category,
      bullets: narrative.bullets,
      stats: draft.stats
    }
  });
};

const deactivateInsight = async (userId: string, type: string, ruleName: string) => {
  await prisma.insight.updateMany({
    where: { userId, type, ruleName },
    data: { isActive: false }
  });
};

export const evaluateInsightsForUser = async (userId: string) => {
  const [metrics, entries] = await Promise.all([
    prisma.baselineMetric.findMany({
      where: { userId, windowDays: { in: [30, 90, 365] } }
    }),
    prisma.logEntry.findMany({
      where: {
        userId,
        occurredAt: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        feelings: {
          select: {
            when: true,
            valence: true,
            energy: true,
            stress: true
          }
        }
      },
      orderBy: { occurredAt: 'asc' }
    })
  ]);

  const profile = buildProfile(entries as EntryWithFeelings[], metrics);
  const drafts: RuleDraft[] = [];

  if (profile.consistencyRate30 >= 0.72 && profile.workoutCount >= 8) {
    drafts.push({
      ...RULES.consistencyPositive,
      category: 'consistency',
      priority: 'high',
      title: 'Your consistency is paying off',
      summary:
        'You have built a repeatable routine over the last month, and your workout baselines suggest that routine is translating into better energy and steadier recovery.',
      bullets: [
        `${percent(profile.consistencyRate30)} activity consistency across the last 30 days`,
        `Average gap between activity days is ${clamp(profile.averageGapDays || 1)} days`,
        `Workout post-session energy baseline is ${clamp(profile.workoutEnergy30)}/5`
      ],
      stats: [
        { label: 'consistency_rate', value: percent(profile.consistencyRate30) },
        { label: 'active_days_30', value: profile.activeDays30 },
        { label: 'workout_energy_30d', value: clamp(profile.workoutEnergy30) }
      ]
    });
  } else if (profile.consistencyRate30 <= 0.55 || profile.averageGapDays >= 3) {
    drafts.push({
      ...RULES.consistencyGap,
      category: 'consistency',
      priority: 'high',
      title: 'Inconsistency is blocking your progress',
      summary:
        'Your current logging pattern has large breaks between activity days, which makes it harder to build momentum and harder for FitForecast to detect a stable upward trend.',
      bullets: [
        `Average gap between activity days is ${clamp(profile.averageGapDays || 4)} days`,
        `${percent(profile.consistencyRate30)} of the last 30 days include a logged activity`,
        'Aim to keep breaks between workouts to 2 days or less'
      ],
      stats: [
        { label: 'consistency_rate', value: percent(profile.consistencyRate30) },
        { label: 'average_gap_days', value: clamp(profile.averageGapDays || 4) },
        { label: 'entries_last_30_days', value: profile.recentEntryCount }
      ]
    });
  }

  if (profile.morningWorkoutRatio >= 0.55 && profile.workoutEnergyDelta >= 0.8) {
    drafts.push({
      ...RULES.morningMomentum,
      category: 'energy',
      priority: 'medium',
      title: 'Morning workouts boost your day',
      summary:
        'Your earlier sessions are consistently associated with better post-workout energy and lower stress, which suggests your schedule fits the way you recover best.',
      bullets: [
        `${percent(profile.morningWorkoutRatio)} of your recent workouts happen before 10 AM`,
        `Average post-workout energy gain is +${clamp(profile.workoutEnergyDelta)} points`,
        `Average post-workout stress change is ${clamp(profile.workoutStressDelta)} points`
      ],
      stats: [
        { label: 'morning_workout_ratio', value: percent(profile.morningWorkoutRatio) },
        { label: 'energy_delta', value: clamp(profile.workoutEnergyDelta) },
        { label: 'stress_delta', value: clamp(profile.workoutStressDelta) }
      ]
    });
  } else if (profile.lateWorkoutRatio >= 0.5 && profile.stalledProfile) {
    drafts.push({
      ...RULES.lateWorkoutPenalty,
      category: 'recovery',
      priority: 'high',
      title: 'Late workouts may be disrupting your recovery',
      summary:
        'A large share of your workouts happen late at night, and your recent baselines point to lower energy and elevated post-session stress instead of a clean recovery response.',
      bullets: [
        `${percent(profile.lateWorkoutRatio)} of recent workouts happen after 9 PM`,
        `Average post-workout stress is ${clamp(profile.averagePostWorkoutStress)}/5`,
        `Preferred workout window is currently ${profile.preferredWorkoutBucket}`
      ],
      stats: [
        { label: 'late_workout_ratio', value: percent(profile.lateWorkoutRatio) },
        { label: 'post_workout_stress', value: clamp(profile.averagePostWorkoutStress) },
        { label: 'preferred_workout_time', value: profile.preferredWorkoutBucket }
      ]
    });
  }

  if (profile.workoutStressDelta <= -0.8 && profile.averagePostWorkoutStress <= 2.4) {
    drafts.push({
      ...RULES.stressReliefPositive,
      category: 'stress',
      priority: 'medium',
      title: 'Your workouts are reliably lowering stress',
      summary:
        'Recent workout sessions are producing a strong drop in stress, which is a good sign that your training load and workout timing are manageable for your current routine.',
      bullets: [
        `Average workout stress change is ${clamp(profile.workoutStressDelta)} points`,
        `Post-workout stress baseline is ${clamp(profile.workoutStress30)}/5`,
        `You have ${profile.workoutCount} complete workout logs supporting this pattern`
      ],
      stats: [
        { label: 'stress_delta', value: clamp(profile.workoutStressDelta) },
        { label: 'post_workout_stress_30d', value: clamp(profile.workoutStress30) },
        { label: 'workout_samples', value: profile.workoutCount }
      ]
    });
  } else if (profile.workoutCount >= 5 && profile.averagePostWorkoutStress >= 3.5 && profile.workoutStressDelta > -0.5) {
    drafts.push({
      ...RULES.stressStuck,
      category: 'stress',
      priority: 'high',
      title: 'Stress is not dropping after exercise',
      summary:
        'Your recent workouts are not creating the usual calming effect. That usually points to timing, intensity, or recovery issues rather than lack of effort.',
      bullets: [
        `Average workout stress change is only ${clamp(profile.workoutStressDelta)} points`,
        `Post-workout stress still averages ${clamp(profile.averagePostWorkoutStress)}/5`,
        'Consider lower-intensity sessions or shifting workouts earlier in the day'
      ],
      stats: [
        { label: 'stress_delta', value: clamp(profile.workoutStressDelta) },
        { label: 'post_workout_stress', value: clamp(profile.averagePostWorkoutStress) },
        { label: 'workout_samples', value: profile.workoutCount }
      ]
    });
  }

  if (profile.workoutMealPairRatio >= 0.45 && profile.breakfastRate >= 0.45 && profile.mealCount >= 6) {
    drafts.push({
      ...RULES.proteinTiming,
      category: 'nutrition',
      priority: 'medium',
      title: 'Meal timing is supporting recovery',
      summary:
        'You regularly pair meals with training sessions and maintain a stable morning eating pattern, which is associated with steadier energy after workouts and meals.',
      bullets: [
        `${percent(profile.workoutMealPairRatio)} of workouts are followed by a meal within 2 hours`,
        `${percent(profile.breakfastRate)} of active days include a morning meal`,
        `Average post-meal energy gain is +${clamp(profile.mealEnergyDelta)} points`
      ],
      stats: [
        { label: 'post_workout_meal_ratio', value: percent(profile.workoutMealPairRatio) },
        { label: 'breakfast_rate', value: percent(profile.breakfastRate) },
        { label: 'meal_energy_delta', value: clamp(profile.mealEnergyDelta) }
      ]
    });
  } else if (profile.breakfastRate < 0.35 && profile.mealCount >= 5) {
    drafts.push({
      ...RULES.breakfastOpportunity,
      category: 'nutrition',
      priority: 'medium',
      title: 'Meal timing opportunity detected',
      summary:
        'Your recent logs show that morning fueling is inconsistent, which can make energy management harder across the rest of the day.',
      bullets: [
        `Only ${percent(profile.breakfastRate)} of active days include a morning meal`,
        `Average post-meal energy gain is +${clamp(profile.mealEnergyDelta)} points`,
        'A simple breakfast can improve the odds of steadier afternoon energy'
      ],
      stats: [
        { label: 'breakfast_rate', value: percent(profile.breakfastRate) },
        { label: 'meal_energy_delta', value: clamp(profile.mealEnergyDelta) },
        { label: 'meal_samples', value: profile.mealCount }
      ]
    });
  }

  if (profile.workoutEnergyPoints30 >= 5 && profile.workoutEnergy90 > 0 && profile.workoutEnergy30 < profile.workoutEnergy90 - 0.3) {
    drafts.push({
      ...RULES.recoveryDeficit,
      category: 'recovery',
      priority: 'medium',
      title: 'Recovery deficit warning',
      summary:
        'Your 30-day workout energy baseline is lower than your 90-day trend, which usually means fatigue is accumulating faster than you are recovering from it.',
      bullets: [
        `30-day workout energy baseline: ${clamp(profile.workoutEnergy30)}/5`,
        `90-day workout energy baseline: ${clamp(profile.workoutEnergy90)}/5`,
        'Consider a lighter week or more complete rest between hard sessions'
      ],
      stats: [
        { label: 'workout_energy_30d', value: clamp(profile.workoutEnergy30) },
        { label: 'workout_energy_90d', value: clamp(profile.workoutEnergy90) },
        { label: 'energy_drop', value: clamp(profile.workoutEnergy30 - profile.workoutEnergy90) }
      ]
    });
  }

  if (profile.peakProfile) {
    drafts.push({
      ...RULES.peakPerformance,
      category: 'energy',
      priority: 'medium',
      title: 'You have a repeatable peak-performance routine',
      summary:
        'Your recent logs show a stable high-energy pattern with low post-session stress, which is exactly what a mature training routine looks like when it fits the rest of your schedule.',
      bullets: [
        `Workout energy baseline is ${clamp(profile.workoutEnergy30)}/5`,
        `Average post-workout stress is ${clamp(profile.averagePostWorkoutStress)}/5`,
        `Preferred training window is ${profile.preferredWorkoutBucket}`
      ],
      stats: [
        { label: 'workout_energy_30d', value: clamp(profile.workoutEnergy30) },
        { label: 'post_workout_stress', value: clamp(profile.averagePostWorkoutStress) },
        { label: 'preferred_workout_time', value: profile.preferredWorkoutBucket }
      ]
    });
  }

  await Promise.all(drafts.map((draft) => persistDraft(userId, draft)));

  const activeRuleNames = new Set(drafts.map((draft) => draft.ruleName));
  await Promise.all(
    Object.values(RULES)
      .filter((rule) => !activeRuleNames.has(rule.ruleName))
      .map((rule) => deactivateInsight(userId, rule.type, rule.ruleName))
  );
};

const toApiInsight = (insight: Insight) => ({
  id: insight.id,
  user_id: insight.userId,
  type: insight.type,
  summary: insight.summary,
  supporting_stats: insight.supportingStats,
  rule_name: insight.ruleName,
  created_at: insight.createdAt.toISOString(),
  is_active: insight.isActive
});
