import type { FeelingEntry, LogEntry } from '@prisma/client';
import { prisma } from '../db/prisma';
import { maybePersonalizeForecastNarrative } from './llm';

type DatabaseEntry = LogEntry & { feelings: FeelingEntry[] };

type WorkoutKind = 'cardio' | 'strength' | 'recovery' | 'mixed';
type TimeBucket = 'morning' | 'midday' | 'evening' | 'late';
type ConfidenceLabel = 'emerging' | 'moderate' | 'strong';

type WorkoutSample = {
  userId: string;
  entryId: string;
  occurredAt: Date;
  hour: number;
  timeBucket: TimeBucket;
  workoutKind: WorkoutKind;
  preEnergy: number;
  preStress: number;
  preValence: number;
  postEnergy: number;
  postStress: number;
  postValence: number;
  energyDelta: number;
  stressDelta: number;
  valenceDelta: number;
  goodSession: number;
  recoveryQuality: number | null;
  consistency7: number;
  consistency30: number;
  consistency90: number;
  consistency180: number;
  gapDays: number;
  hadPreFuel: boolean;
  hadBreakfastFuel: boolean;
  hadProteinRecoveryMeal: boolean;
};

type NumericPrediction = {
  value: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  sampleCount: number;
  contributors: Array<{ label: string; value: number }>;
};

type ProbabilityPrediction = NumericPrediction;

type HeuristicCategory = 'timing' | 'mood' | 'nutrition' | 'consistency';

export type PersonalizedHeuristic = {
  id: string;
  category: HeuristicCategory;
  title: string;
  summary: string;
  recommendation: string;
  direction: 'positive' | 'negative';
  effectSize: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  sampleCount: number;
  windowDays: number;
  evidence: Array<{ label: string; value: string | number }>;
};

export type ForecastNarrative = {
  headline: string;
  coachSummary: string;
  priorities: string[];
  nextActions: string[];
  checkInQuestions: string[];
};

export type ForecastScenario = {
  id: string;
  label: string;
  description: string;
  plannedHour: number;
  workoutKind: WorkoutKind;
  includeBreakfast: boolean;
  includeProteinRecoveryMeal: boolean;
  predictions: {
    expectedPostWorkoutEnergy: NumericPrediction;
    expectedPostWorkoutStress: NumericPrediction;
    goodSessionLikelihood: ProbabilityPrediction;
    nextDayRecoveryQuality: ProbabilityPrediction;
  };
};

export type PredictionRequest = {
  plannedHour?: number;
  workoutKind?: WorkoutKind;
  includeBreakfast?: boolean;
  includeProteinRecoveryMeal?: boolean;
  preEnergy?: number;
  preStress?: number;
};

export type PredictionBundle = {
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
};

const WINDOWS = [7, 30, 90, 180] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 21;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampScale = (value: number) => Number(clamp(value, 1, 5).toFixed(2));
const clampUnit = (value: number) => Number(clamp(value, 0, 1).toFixed(3));
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const recencyWeight = (date: Date) => {
  const ageDays = Math.max(0, (Date.now() - date.getTime()) / DAY_MS);
  return Math.exp((-Math.log(2) * ageDays) / HALF_LIFE_DAYS);
};

const weightedAverage = (values: number[], weights: number[]) => {
  if (!values.length || !weights.length) {
    return 0;
  }

  const totalWeight = sum(weights);
  if (!totalWeight) {
    return average(values);
  }

  return values.reduce((accumulator, value, index) => accumulator + value * weights[index], 0) / totalWeight;
};

const weightedDifference = (left: WorkoutSample[], right: WorkoutSample[], accessor: (sample: WorkoutSample) => number) => {
  const leftWeights = left.map((sample) => recencyWeight(sample.occurredAt));
  const rightWeights = right.map((sample) => recencyWeight(sample.occurredAt));
  const leftMean = weightedAverage(left.map(accessor), leftWeights);
  const rightMean = weightedAverage(right.map(accessor), rightWeights);
  return leftMean - rightMean;
};

const confidenceLabel = (confidence: number): ConfidenceLabel => {
  if (confidence >= 0.78) {
    return 'strong';
  }
  if (confidence >= 0.5) {
    return 'moderate';
  }
  return 'emerging';
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

const toDayKey = (date: Date) => date.toISOString().split('T')[0];

const getWindowStart = (windowDays: number) => new Date(Date.now() - windowDays * DAY_MS);

const getTimeBucket = (hour: number): TimeBucket => {
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

const detectWorkoutKind = (text: string): WorkoutKind => {
  const normalized = text.toLowerCase();
  if (/(run|cycling|swimming|cardio|tempo|hiit|boxing)/.test(normalized)) {
    return 'cardio';
  }
  if (/(strength|weights|lifting|deadlift|squat|triceps|upper body|power lifting)/.test(normalized)) {
    return 'strength';
  }
  if (/(yoga|mobility|stretch|recovery)/.test(normalized)) {
    return 'recovery';
  }
  return 'mixed';
};

const isBreakfastLike = (entry: DatabaseEntry) => {
  const normalized = entry.rawText.toLowerCase();
  const hour = entry.occurredAt.getHours();
  return hour < 11 || /(breakfast|oatmeal|smoothie|toast|egg|yogurt|coffee)/.test(normalized);
};

const isProteinRich = (entry: DatabaseEntry) => /(protein|chicken|salmon|steak|eggs|yogurt|creatine|shake)/.test(entry.rawText.toLowerCase());

const normalizeRecoveryQuality = (energy: number, stress: number, valence: number) =>
  clampUnit((energy + (6 - stress) + valence) / 15);

const getPreFeeling = (entry: DatabaseEntry) => entry.feelings.find((feeling) => feeling.when === 'pre');
const getPostFeeling = (entry: DatabaseEntry) => entry.feelings.find((feeling) => feeling.when === 'post');

const buildActivityDayCache = (entries: DatabaseEntry[]) => {
  const entriesByUser = new Map<string, DatabaseEntry[]>();
  for (const entry of entries) {
    const list = entriesByUser.get(entry.userId) ?? [];
    list.push(entry);
    entriesByUser.set(entry.userId, list);
  }

  const dayCache = new Map<string, string[]>();
  for (const [userId, userEntries] of entriesByUser.entries()) {
    const uniqueDays = Array.from(new Set(userEntries.map((entry) => toDayKey(entry.occurredAt)))).sort();
    dayCache.set(userId, uniqueDays);
  }

  return { entriesByUser, dayCache };
};

const getConsistencyRatio = (activityDays: string[], endDate: Date, windowDays: number) => {
  const windowStart = getWindowStart(windowDays).getTime();
  const effectiveStart = Math.max(windowStart, endDate.getTime() - windowDays * DAY_MS);
  const activeDays = activityDays.filter((day) => {
    const timestamp = new Date(day).getTime();
    return timestamp <= endDate.getTime() && timestamp >= effectiveStart;
  }).length;
  return clampUnit(activeDays / windowDays);
};

const buildWorkoutSamples = (entries: DatabaseEntry[]) => {
  const { entriesByUser, dayCache } = buildActivityDayCache(entries);
  const samples: WorkoutSample[] = [];

  for (const [userId, userEntries] of entriesByUser.entries()) {
    const sortedEntries = [...userEntries].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    const activityDays = dayCache.get(userId) ?? [];
    const meals = sortedEntries.filter((entry) => entry.type === 'meal');
    const workouts = sortedEntries.filter((entry) => entry.type === 'workout');

    for (let index = 0; index < workouts.length; index += 1) {
      const workout = workouts[index];
      const pre = getPreFeeling(workout);
      const post = getPostFeeling(workout);
      if (!pre || !post) {
        continue;
      }

      const previousWorkout = workouts[index - 1];
      const nextEntry = sortedEntries.find((entry) => {
        if (entry.occurredAt <= workout.occurredAt) {
          return false;
        }
        const deltaHours = (entry.occurredAt.getTime() - workout.occurredAt.getTime()) / (60 * 60 * 1000);
        return deltaHours >= 8 && deltaHours <= 36 && Boolean(getPreFeeling(entry));
      });
      const nextPre = nextEntry ? getPreFeeling(nextEntry) : null;
      const preFuelMeal = meals.find((meal) => {
        const deltaMinutes = (workout.occurredAt.getTime() - meal.occurredAt.getTime()) / (60 * 1000);
        return deltaMinutes >= 0 && deltaMinutes <= 180;
      });
      const recoveryMeal = meals.find((meal) => {
        const deltaMinutes = (meal.occurredAt.getTime() - workout.occurredAt.getTime()) / (60 * 1000);
        return deltaMinutes >= 0 && deltaMinutes <= 120 && isProteinRich(meal);
      });

      samples.push({
        userId,
        entryId: workout.id,
        occurredAt: workout.occurredAt,
        hour: workout.occurredAt.getHours(),
        timeBucket: getTimeBucket(workout.occurredAt.getHours()),
        workoutKind: detectWorkoutKind(workout.rawText),
        preEnergy: pre.energy,
        preStress: pre.stress,
        preValence: pre.valence,
        postEnergy: post.energy,
        postStress: post.stress,
        postValence: post.valence,
        energyDelta: post.energy - pre.energy,
        stressDelta: post.stress - pre.stress,
        valenceDelta: post.valence - pre.valence,
        goodSession: Number(post.energy >= pre.energy && post.stress <= pre.stress && post.valence >= pre.valence),
        recoveryQuality: nextPre ? normalizeRecoveryQuality(nextPre.energy, nextPre.stress, nextPre.valence) : null,
        consistency7: getConsistencyRatio(activityDays, workout.occurredAt, 7),
        consistency30: getConsistencyRatio(activityDays, workout.occurredAt, 30),
        consistency90: getConsistencyRatio(activityDays, workout.occurredAt, 90),
        consistency180: getConsistencyRatio(activityDays, workout.occurredAt, 180),
        gapDays: previousWorkout ? Number(((workout.occurredAt.getTime() - previousWorkout.occurredAt.getTime()) / DAY_MS).toFixed(2)) : 3,
        hadPreFuel: Boolean(preFuelMeal),
        hadBreakfastFuel: Boolean(preFuelMeal && isBreakfastLike(preFuelMeal)),
        hadProteinRecoveryMeal: Boolean(recoveryMeal),
      });
    }
  }

  return samples.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
};

const buildConfidence = (sampleCount: number, effectSize: number) => {
  const sampleFactor = Math.min(1, sampleCount / 14);
  const effectFactor = Math.min(1, Math.abs(effectSize) / 1.1);
  return clampUnit(sampleFactor * 0.55 + effectFactor * 0.45);
};

const pickStrongestWindow = (windows: Array<{ windowDays: number; effectSize: number; confidence: number; sampleCount: number }>) =>
  windows.sort((left, right) => right.confidence - left.confidence || right.windowDays - left.windowDays)[0] ?? null;

const buildTimingHeuristic = (samples: WorkoutSample[]): PersonalizedHeuristic | null => {
  const candidates = WINDOWS.flatMap((windowDays) => {
    const windowSamples = samples.filter((sample) => sample.occurredAt >= getWindowStart(windowDays));
    const morning = windowSamples.filter((sample) => sample.timeBucket === 'morning');
    const evening = windowSamples.filter((sample) => sample.timeBucket === 'evening' || sample.timeBucket === 'late');
    if (morning.length < 2 || evening.length < 2) {
      return [];
    }

    const effectSize = weightedDifference(morning, evening, (sample) => sample.postEnergy - sample.postStress * 0.35);
    return [{ windowDays, effectSize, confidence: buildConfidence(windowSamples.length, effectSize), sampleCount: windowSamples.length }];
  });

  const strongest = pickStrongestWindow(candidates);
  if (!strongest || strongest.confidence < 0.35) {
    return null;
  }

  const direction = strongest.effectSize >= 0 ? 'positive' : 'negative';
  const absoluteEffect = Math.abs(Number(strongest.effectSize.toFixed(2)));
  const title = direction === 'positive' ? 'Workout timing is now personal' : 'Late sessions are dragging outcomes down';
  const summary =
    direction === 'positive'
      ? `Your ${strongest.windowDays}-day history shows that earlier workouts outperform your evening sessions by about ${absoluteEffect.toFixed(1)} points once energy and stress are combined.`
      : `Your ${strongest.windowDays}-day history shows that evening and late workouts underperform your earlier sessions by about ${absoluteEffect.toFixed(1)} combined points.`;

  return {
    id: `timing-${strongest.windowDays}`,
    category: 'timing',
    title,
    summary,
    recommendation: direction === 'positive' ? 'Protect two early workout slots this week and treat them as your anchor sessions.' : 'Test moving one late workout earlier this week and compare next-day energy.',
    direction,
    effectSize: absoluteEffect,
    confidence: strongest.confidence,
    confidenceLabel: confidenceLabel(strongest.confidence),
    sampleCount: strongest.sampleCount,
    windowDays: strongest.windowDays,
    evidence: [
      { label: 'evaluation_window', value: `${strongest.windowDays} days` },
      { label: 'combined_effect', value: absoluteEffect.toFixed(1) },
      { label: 'confidence', value: percent(strongest.confidence) },
    ],
  };
};

const buildMoodShiftHeuristic = (samples: WorkoutSample[]): PersonalizedHeuristic | null => {
  const candidates = WINDOWS.flatMap((windowDays) => {
    const windowSamples = samples.filter((sample) => sample.occurredAt >= getWindowStart(windowDays));
    if (windowSamples.length < 3) {
      return [];
    }
    const weights = windowSamples.map((sample) => recencyWeight(sample.occurredAt));
    const moodLift = weightedAverage(windowSamples.map((sample) => sample.energyDelta + sample.valenceDelta - sample.stressDelta), weights);
    return [{ windowDays, effectSize: moodLift, confidence: buildConfidence(windowSamples.length, moodLift), sampleCount: windowSamples.length }];
  });

  const strongest = pickStrongestWindow(candidates);
  if (!strongest || strongest.confidence < 0.35) {
    return null;
  }

  const direction = strongest.effectSize >= 0 ? 'positive' : 'negative';
  const absoluteEffect = Math.abs(Number(strongest.effectSize.toFixed(2)));
  return {
    id: `mood-${strongest.windowDays}`,
    category: 'mood',
    title: direction === 'positive' ? 'Your mood shift is becoming predictable' : 'Your sessions are not resetting stress yet',
    summary:
      direction === 'positive'
        ? `Across the last ${strongest.windowDays} days, your pre-to-post workout mood pattern is improving by ${absoluteEffect.toFixed(1)} weighted points, which means the app can forecast your likely post-session state with more confidence.`
        : `Across the last ${strongest.windowDays} days, your pre-to-post mood shift has weakened by ${absoluteEffect.toFixed(1)} weighted points, which is usually a sign that recovery or intensity needs adjustment.`,
    recommendation: direction === 'positive' ? 'Keep logging both pre and post feelings because they are sharpening your personal prediction curve.' : 'Prioritize lighter recovery work until the post-session stress drop returns.',
    direction,
    effectSize: absoluteEffect,
    confidence: strongest.confidence,
    confidenceLabel: confidenceLabel(strongest.confidence),
    sampleCount: strongest.sampleCount,
    windowDays: strongest.windowDays,
    evidence: [
      { label: 'weighted_shift', value: absoluteEffect.toFixed(1) },
      { label: 'samples', value: strongest.sampleCount },
      { label: 'confidence', value: percent(strongest.confidence) },
    ],
  };
};

const buildMealTimingHeuristic = (samples: WorkoutSample[]): PersonalizedHeuristic | null => {
  const candidates = WINDOWS.flatMap((windowDays) => {
    const windowSamples = samples.filter((sample) => sample.occurredAt >= getWindowStart(windowDays));
    const fueled = windowSamples.filter((sample) => sample.hadProteinRecoveryMeal || sample.hadBreakfastFuel);
    const unfueled = windowSamples.filter((sample) => !sample.hadProteinRecoveryMeal && !sample.hadBreakfastFuel);
    if (fueled.length < 2 || unfueled.length < 2) {
      return [];
    }

    const effectSize = weightedDifference(fueled, unfueled, (sample) => sample.postEnergy + (sample.recoveryQuality ?? 0) * 2 - sample.postStress * 0.4);
    return [{ windowDays, effectSize, confidence: buildConfidence(windowSamples.length, effectSize), sampleCount: windowSamples.length }];
  });

  const strongest = pickStrongestWindow(candidates);
  if (!strongest || strongest.confidence < 0.35) {
    return null;
  }

  const direction = strongest.effectSize >= 0 ? 'positive' : 'negative';
  const absoluteEffect = Math.abs(Number(strongest.effectSize.toFixed(2)));
  return {
    id: `nutrition-${strongest.windowDays}`,
    category: 'nutrition',
    title: direction === 'positive' ? 'Meal timing is shaping recovery' : 'Fueling gaps are limiting recovery',
    summary:
      direction === 'positive'
        ? `In your last ${strongest.windowDays} days, workouts with breakfast support or a protein recovery meal outperform the unfueled version by about ${absoluteEffect.toFixed(1)} points.`
        : `In your last ${strongest.windowDays} days, the workouts missing timely fuel underperform by about ${absoluteEffect.toFixed(1)} points, especially on energy and next-day recovery.`,
    recommendation: direction === 'positive' ? 'Keep pairing harder sessions with breakfast support or a protein recovery meal.' : 'Add a reliable pre-workout or recovery meal on your next two hard sessions and compare the result.',
    direction,
    effectSize: absoluteEffect,
    confidence: strongest.confidence,
    confidenceLabel: confidenceLabel(strongest.confidence),
    sampleCount: strongest.sampleCount,
    windowDays: strongest.windowDays,
    evidence: [
      { label: 'meal_timing_effect', value: absoluteEffect.toFixed(1) },
      { label: 'samples', value: strongest.sampleCount },
      { label: 'confidence', value: percent(strongest.confidence) },
    ],
  };
};

const buildConsistencyHeuristic = (samples: WorkoutSample[]): PersonalizedHeuristic | null => {
  const candidates = WINDOWS.flatMap((windowDays) => {
    const windowSamples = samples.filter((sample) => sample.occurredAt >= getWindowStart(windowDays));
    const highConsistency = windowSamples.filter((sample) => sample.consistency30 >= 0.55);
    const lowConsistency = windowSamples.filter((sample) => sample.consistency30 < 0.55);
    if (highConsistency.length < 2 || lowConsistency.length < 2) {
      return [];
    }

    const effectSize = weightedDifference(highConsistency, lowConsistency, (sample) => sample.goodSession + (sample.recoveryQuality ?? 0));
    return [{ windowDays, effectSize, confidence: buildConfidence(windowSamples.length, effectSize), sampleCount: windowSamples.length }];
  });

  const strongest = pickStrongestWindow(candidates);
  if (!strongest || strongest.confidence < 0.35) {
    return null;
  }

  const direction = strongest.effectSize >= 0 ? 'positive' : 'negative';
  const absoluteEffect = Math.abs(Number(strongest.effectSize.toFixed(2)));
  return {
    id: `consistency-${strongest.windowDays}`,
    category: 'consistency',
    title: direction === 'positive' ? 'Consistency is compounding for you' : 'Gaps are reducing prediction quality',
    summary:
      direction === 'positive'
        ? `When your 30-day consistency stays above 55%, your sessions produce about ${absoluteEffect.toFixed(1)} more good-session and recovery points than your inconsistent periods.`
        : `When multi-day gaps pile up, your sessions lose about ${absoluteEffect.toFixed(1)} combined performance and recovery points, and the model confidence drops with them.`,
    recommendation: direction === 'positive' ? 'Maintain the current cadence so the prediction engine keeps compounding on stable signals.' : 'Reduce the longest gap in your next seven days to restore stronger personal signal.',
    direction,
    effectSize: absoluteEffect,
    confidence: strongest.confidence,
    confidenceLabel: confidenceLabel(strongest.confidence),
    sampleCount: strongest.sampleCount,
    windowDays: strongest.windowDays,
    evidence: [
      { label: 'consistency_effect', value: absoluteEffect.toFixed(1) },
      { label: 'samples', value: strongest.sampleCount },
      { label: 'confidence', value: percent(strongest.confidence) },
    ],
  };
};

type ScenarioFeatures = {
  plannedHour: number;
  workoutKind: WorkoutKind;
  includeBreakfast: boolean;
  includeProteinRecoveryMeal: boolean;
  preEnergy: number;
  preStress: number;
  consistency30: number;
  gapDays: number;
};

const workoutKinds: WorkoutKind[] = ['cardio', 'strength', 'recovery', 'mixed'];

const encodeScenario = (scenario: ScenarioFeatures) => [
  scenario.plannedHour / 24,
  Number(getTimeBucket(scenario.plannedHour) === 'morning'),
  Number(getTimeBucket(scenario.plannedHour) === 'late'),
  scenario.preEnergy / 5,
  scenario.preStress / 5,
  scenario.consistency30,
  clamp(scenario.gapDays / 7, 0, 1),
  Number(scenario.includeBreakfast),
  Number(scenario.includeProteinRecoveryMeal),
  ...workoutKinds.map((kind) => Number(kind === scenario.workoutKind)),
];

const scenarioFromSample = (sample: WorkoutSample) => ({
  plannedHour: sample.hour,
  workoutKind: sample.workoutKind,
  includeBreakfast: sample.hadBreakfastFuel,
  includeProteinRecoveryMeal: sample.hadProteinRecoveryMeal,
  preEnergy: sample.preEnergy,
  preStress: sample.preStress,
  consistency30: sample.consistency30,
  gapDays: sample.gapDays,
});

type Standardization = {
  means: number[];
  scales: number[];
  rows: number[][];
};

const standardize = (rows: number[][]): Standardization => {
  const featureCount = rows[0]?.length ?? 0;
  const means = Array.from({ length: featureCount }, (_, index) => average(rows.map((row) => row[index])));
  const scales = Array.from({ length: featureCount }, (_, index) => {
    const variance = average(rows.map((row) => {
      const delta = row[index] - means[index];
      return delta * delta;
    }));
    return Math.sqrt(variance) || 1;
  });

  return {
    means,
    scales,
    rows: rows.map((row) => row.map((value, index) => (value - means[index]) / scales[index])),
  };
};

type LogisticModel = {
  weights: number[];
  bias: number;
  means: number[];
  scales: number[];
};

const trainLogisticRegression = (rows: number[][], labels: number[]): LogisticModel | null => {
  if (rows.length < 4 || rows[0]?.length === 0) {
    return null;
  }

  const standardized = standardize(rows);
  const weights = Array(standardized.rows[0].length).fill(0);
  let bias = 0;
  const learningRate = 0.18;
  const l2 = 0.015;

  for (let iteration = 0; iteration < 280; iteration += 1) {
    const gradients = Array(weights.length).fill(0);
    let biasGradient = 0;

    standardized.rows.forEach((row, index) => {
      const prediction = sigmoid(row.reduce((total, value, featureIndex) => total + value * weights[featureIndex], bias));
      const error = prediction - labels[index];
      row.forEach((value, featureIndex) => {
        gradients[featureIndex] += error * value;
      });
      biasGradient += error;
    });

    weights.forEach((_, index) => {
      weights[index] -= learningRate * (gradients[index] / rows.length + l2 * weights[index]);
    });
    bias -= learningRate * (biasGradient / rows.length);
  }

  return {
    weights,
    bias,
    means: standardized.means,
    scales: standardized.scales,
  };
};

const predictLogistic = (model: LogisticModel | null, row: number[]) => {
  if (!model) {
    return 0.5;
  }

  const normalized = row.map((value, index) => (value - model.means[index]) / model.scales[index]);
  return clampUnit(sigmoid(normalized.reduce((total, value, index) => total + value * model.weights[index], model.bias)));
};

type RegressionStump = {
  featureIndex: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
};

type BoostedRegressor = {
  baseValue: number;
  learningRate: number;
  trees: RegressionStump[];
};

const stumpPredict = (stump: RegressionStump, row: number[]) => (row[stump.featureIndex] <= stump.threshold ? stump.leftValue : stump.rightValue);

const buildThresholds = (values: number[]) => {
  const unique = Array.from(new Set(values)).sort((left, right) => left - right);
  if (unique.length <= 1) {
    return unique;
  }
  if (unique.length <= 8) {
    return unique.slice(0, -1).map((value, index) => (value + unique[index + 1]) / 2);
  }

  const thresholds: number[] = [];
  for (let quantile = 1; quantile <= 6; quantile += 1) {
    const index = Math.floor((quantile / 7) * (unique.length - 1));
    thresholds.push(unique[index]);
  }
  return Array.from(new Set(thresholds));
};

const fitBestStump = (rows: number[][], residuals: number[]): RegressionStump | null => {
  if (!rows.length || !rows[0]?.length) {
    return null;
  }

  let best: RegressionStump | null = null;
  let bestError = Number.POSITIVE_INFINITY;

  for (let featureIndex = 0; featureIndex < rows[0].length; featureIndex += 1) {
    const thresholds = buildThresholds(rows.map((row) => row[featureIndex]));
    for (const threshold of thresholds) {
      const leftValues = residuals.filter((_, index) => rows[index][featureIndex] <= threshold);
      const rightValues = residuals.filter((_, index) => rows[index][featureIndex] > threshold);
      if (!leftValues.length || !rightValues.length) {
        continue;
      }

      const leftMean = average(leftValues);
      const rightMean = average(rightValues);
      const error = residuals.reduce((total, residual, index) => {
        const prediction = rows[index][featureIndex] <= threshold ? leftMean : rightMean;
        const delta = residual - prediction;
        return total + delta * delta;
      }, 0);

      if (error < bestError) {
        bestError = error;
        best = { featureIndex, threshold, leftValue: leftMean, rightValue: rightMean };
      }
    }
  }

  return best;
};

const trainBoostedRegressor = (rows: number[][], labels: number[], rounds = 12, learningRate = 0.25): BoostedRegressor | null => {
  if (rows.length < 4) {
    return null;
  }

  const baseValue = average(labels);
  const predictions = Array(rows.length).fill(baseValue);
  const trees: RegressionStump[] = [];

  for (let round = 0; round < rounds; round += 1) {
    const residuals = labels.map((label, index) => label - predictions[index]);
    const stump = fitBestStump(rows, residuals);
    if (!stump) {
      break;
    }
    trees.push(stump);
    predictions.forEach((_, index) => {
      predictions[index] += learningRate * stumpPredict(stump, rows[index]);
    });
  }

  return { baseValue, learningRate, trees };
};

const predictBoostedRegressor = (model: BoostedRegressor | null, row: number[]) => {
  if (!model) {
    return 0;
  }

  return model.baseValue + model.trees.reduce((total, tree) => total + model.learningRate * stumpPredict(tree, row), 0);
};

const bayesianBlend = (userValues: number[], globalValues: number[], pseudoCount: number) => {
  const userMean = average(userValues);
  const globalMean = average(globalValues);
  return ((userMean * userValues.length) + (globalMean * pseudoCount)) / Math.max(userValues.length + pseudoCount, 1);
};

const buildScenarioContext = (userSamples: WorkoutSample[], request?: PredictionRequest): ScenarioFeatures => {
  const fallback = userSamples[userSamples.length - 1];
  const sortedByRecency = [...userSamples].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
  const recent = sortedByRecency.slice(0, 10);
  const weighted = recent.map((sample) => recencyWeight(sample.occurredAt));
  const preferredHour = Math.round(weightedAverage(recent.map((sample) => sample.hour), weighted) || fallback?.hour || 7);
  const kindScores = new Map<WorkoutKind, number>();
  recent.forEach((sample) => {
    kindScores.set(sample.workoutKind, (kindScores.get(sample.workoutKind) ?? 0) + recencyWeight(sample.occurredAt));
  });
  const workoutKind = Array.from(kindScores.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? fallback?.workoutKind ?? 'mixed';

  return {
    plannedHour: clamp(request?.plannedHour ?? preferredHour, 5, 23),
    workoutKind: request?.workoutKind ?? workoutKind,
    includeBreakfast: request?.includeBreakfast ?? (weightedAverage(recent.map((sample) => Number(sample.hadBreakfastFuel)), weighted) >= 0.45),
    includeProteinRecoveryMeal: request?.includeProteinRecoveryMeal ?? (weightedAverage(recent.map((sample) => Number(sample.hadProteinRecoveryMeal)), weighted) >= 0.5),
    preEnergy: clamp(request?.preEnergy ?? (weightedAverage(recent.map((sample) => sample.preEnergy), weighted) || 3), 1, 5),
    preStress: clamp(request?.preStress ?? (weightedAverage(recent.map((sample) => sample.preStress), weighted) || 3), 1, 5),
    consistency30: clamp(weightedAverage(recent.map((sample) => sample.consistency30), weighted) || 0.5, 0, 1),
    gapDays: clamp(weightedAverage(recent.map((sample) => sample.gapDays), weighted) || 2, 0.5, 7),
  };
};

const calibrateGlobalPrediction = (globalModel: BoostedRegressor | null, userRows: number[][], userLabels: number[], scenarioRow: number[]) => {
  const rawPrediction = predictBoostedRegressor(globalModel, scenarioRow);
  if (!globalModel || !userRows.length) {
    return rawPrediction;
  }

  const residualMean = average(userLabels.map((label, index) => label - predictBoostedRegressor(globalModel, userRows[index])));
  return rawPrediction + residualMean;
};

const toNumericPrediction = (
  value: number,
  sampleCount: number,
  contributors: Array<{ label: string; value: number }>,
  confidence: number,
  unit: 'scale' | 'probability'
): NumericPrediction => ({
  value: unit === 'scale' ? clampScale(value) : clampUnit(value),
  confidence,
  confidenceLabel: confidenceLabel(confidence),
  sampleCount,
  contributors: contributors.map((item) => ({ label: item.label, value: Number(item.value.toFixed(3)) })),
});

const buildPredictions = (userSamples: WorkoutSample[], globalSamples: WorkoutSample[], scenario: ScenarioFeatures) => {
  const userRows = userSamples.map((sample) => encodeScenario(scenarioFromSample(sample)));
  const globalRows = globalSamples.map((sample) => encodeScenario(scenarioFromSample(sample)));
  const scenarioRow = encodeScenario(scenario);

  const userWeight = clampUnit((userSamples.length - 4) / 18);
  const personalWeight = clamp(userWeight, 0.2, 0.82);
  const globalWeight = Number((1 - personalWeight).toFixed(3));

  const energyEma = weightedAverage(userSamples.map((sample) => sample.postEnergy), userSamples.map((sample) => recencyWeight(sample.occurredAt)));
  const stressEma = weightedAverage(userSamples.map((sample) => sample.postStress), userSamples.map((sample) => recencyWeight(sample.occurredAt)));
  const goodEma = weightedAverage(userSamples.map((sample) => sample.goodSession), userSamples.map((sample) => recencyWeight(sample.occurredAt)));
  const recoverySamples = userSamples.filter((sample) => sample.recoveryQuality !== null);
  const recoveryEma = recoverySamples.length
    ? weightedAverage(recoverySamples.map((sample) => sample.recoveryQuality ?? 0), recoverySamples.map((sample) => recencyWeight(sample.occurredAt)))
    : 0.55;

  const energyBayes = bayesianBlend(userSamples.map((sample) => sample.postEnergy), globalSamples.map((sample) => sample.postEnergy), 10);
  const stressBayes = bayesianBlend(userSamples.map((sample) => sample.postStress), globalSamples.map((sample) => sample.postStress), 10);
  const goodBayes = bayesianBlend(userSamples.map((sample) => sample.goodSession), globalSamples.map((sample) => sample.goodSession), 12);
  const recoveryBayes = bayesianBlend(
    recoverySamples.map((sample) => sample.recoveryQuality ?? 0),
    globalSamples.filter((sample) => sample.recoveryQuality !== null).map((sample) => sample.recoveryQuality ?? 0),
    10
  );

  const userEnergyBoost = trainBoostedRegressor(userRows, userSamples.map((sample) => sample.postEnergy));
  const globalEnergyBoost = trainBoostedRegressor(globalRows, globalSamples.map((sample) => sample.postEnergy));
  const userStressBoost = trainBoostedRegressor(userRows, userSamples.map((sample) => sample.postStress));
  const globalStressBoost = trainBoostedRegressor(globalRows, globalSamples.map((sample) => sample.postStress));
  const userRecoveryBoost = trainBoostedRegressor(
    recoverySamples.map((sample) => encodeScenario(scenarioFromSample(sample))),
    recoverySamples.map((sample) => sample.recoveryQuality ?? 0)
  );
  const globalRecoveryBoost = trainBoostedRegressor(
    globalSamples.filter((sample) => sample.recoveryQuality !== null).map((sample) => encodeScenario(scenarioFromSample(sample))),
    globalSamples.filter((sample) => sample.recoveryQuality !== null).map((sample) => sample.recoveryQuality ?? 0)
  );
  const userGoodLogistic = trainLogisticRegression(userRows, userSamples.map((sample) => sample.goodSession));
  const globalGoodLogistic = trainLogisticRegression(globalRows, globalSamples.map((sample) => sample.goodSession));
  const userGoodBoost = trainBoostedRegressor(userRows, userSamples.map((sample) => sample.goodSession), 10, 0.2);
  const globalGoodBoost = trainBoostedRegressor(globalRows, globalSamples.map((sample) => sample.goodSession), 10, 0.2);

  const userEnergyBoosted = predictBoostedRegressor(userEnergyBoost, scenarioRow);
  const globalEnergyBoosted = calibrateGlobalPrediction(globalEnergyBoost, userRows, userSamples.map((sample) => sample.postEnergy), scenarioRow);
  const userStressBoosted = predictBoostedRegressor(userStressBoost, scenarioRow);
  const globalStressBoosted = calibrateGlobalPrediction(globalStressBoost, userRows, userSamples.map((sample) => sample.postStress), scenarioRow);
  const userRecoveryBoosted = predictBoostedRegressor(userRecoveryBoost, scenarioRow);
  const globalRecoveryBoosted = calibrateGlobalPrediction(
    globalRecoveryBoost,
    recoverySamples.map((sample) => encodeScenario(scenarioFromSample(sample))),
    recoverySamples.map((sample) => sample.recoveryQuality ?? 0),
    scenarioRow
  );
  const goodLogistic = personalWeight * predictLogistic(userGoodLogistic, scenarioRow) + globalWeight * predictLogistic(globalGoodLogistic, scenarioRow);
  const goodBoosted = clampUnit(personalWeight * predictBoostedRegressor(userGoodBoost, scenarioRow) + globalWeight * predictBoostedRegressor(globalGoodBoost, scenarioRow));

  const energyConfidence = buildConfidence(userSamples.length, energyEma - energyBayes) * 0.5 + 0.4;
  const stressConfidence = buildConfidence(userSamples.length, stressEma - stressBayes) * 0.5 + 0.4;
  const goodConfidence = buildConfidence(userSamples.length, goodLogistic - 0.5) * 0.5 + 0.35;
  const recoveryConfidence = buildConfidence(recoverySamples.length, recoveryEma - recoveryBayes) * 0.5 + 0.35;

  const expectedPostWorkoutEnergy = 0.3 * energyEma + 0.2 * energyBayes + 0.5 * (personalWeight * userEnergyBoosted + globalWeight * globalEnergyBoosted);
  const expectedPostWorkoutStress = 0.3 * stressEma + 0.2 * stressBayes + 0.5 * (personalWeight * userStressBoosted + globalWeight * globalStressBoosted);
  const goodSessionLikelihood = 0.2 * goodEma + 0.2 * goodBayes + 0.3 * goodLogistic + 0.3 * goodBoosted;
  const nextDayRecoveryQuality = 0.25 * recoveryEma + 0.2 * recoveryBayes + 0.55 * clampUnit(personalWeight * userRecoveryBoosted + globalWeight * globalRecoveryBoosted);

  return {
    personalWeight,
    globalWeight,
    predictions: {
      expectedPostWorkoutEnergy: toNumericPrediction(expectedPostWorkoutEnergy, userSamples.length, [
        { label: 'ema', value: energyEma },
        { label: 'bayesian', value: energyBayes },
        { label: 'boosted_hybrid', value: personalWeight * userEnergyBoosted + globalWeight * globalEnergyBoosted },
      ], clampUnit(energyConfidence), 'scale'),
      expectedPostWorkoutStress: toNumericPrediction(expectedPostWorkoutStress, userSamples.length, [
        { label: 'ema', value: stressEma },
        { label: 'bayesian', value: stressBayes },
        { label: 'boosted_hybrid', value: personalWeight * userStressBoosted + globalWeight * globalStressBoosted },
      ], clampUnit(stressConfidence), 'scale'),
      goodSessionLikelihood: toNumericPrediction(goodSessionLikelihood, userSamples.length, [
        { label: 'ema', value: goodEma },
        { label: 'bayesian', value: goodBayes },
        { label: 'logistic_hybrid', value: goodLogistic },
        { label: 'boosted_hybrid', value: goodBoosted },
      ], clampUnit(goodConfidence), 'probability'),
      nextDayRecoveryQuality: toNumericPrediction(nextDayRecoveryQuality, recoverySamples.length, [
        { label: 'ema', value: recoveryEma },
        { label: 'bayesian', value: recoveryBayes },
        { label: 'boosted_hybrid', value: personalWeight * userRecoveryBoosted + globalWeight * globalRecoveryBoosted },
      ], clampUnit(recoveryConfidence), 'probability'),
    },
  };
};

const buildScenario = (
  id: string,
  label: string,
  description: string,
  scenario: ScenarioFeatures,
  userSamples: WorkoutSample[],
  globalSamples: WorkoutSample[]
): ForecastScenario => {
  const predictionSet = buildPredictions(userSamples, globalSamples, scenario);
  return {
    id,
    label,
    description,
    plannedHour: scenario.plannedHour,
    workoutKind: scenario.workoutKind,
    includeBreakfast: scenario.includeBreakfast,
    includeProteinRecoveryMeal: scenario.includeProteinRecoveryMeal,
    predictions: predictionSet.predictions,
  };
};

const buildFallbackNarrative = (bundle: {
  heuristics: PersonalizedHeuristic[];
  defaultScenario: ForecastScenario;
}): ForecastNarrative => {
  const topHeuristic = bundle.heuristics[0];
  const energy = bundle.defaultScenario.predictions.expectedPostWorkoutEnergy.value;
  const stress = bundle.defaultScenario.predictions.expectedPostWorkoutStress.value;
  const recovery = bundle.defaultScenario.predictions.nextDayRecoveryQuality.value;

  return {
    headline: topHeuristic ? topHeuristic.title : 'Your next workout is becoming easier to predict',
    coachSummary: topHeuristic
      ? `${topHeuristic.summary} For your current default scenario, the model expects post-workout energy around ${energy}/5, stress around ${stress}/5, and next-day recovery quality near ${Math.round(recovery * 100)}%.`
      : `Your recent logs are producing a stable forecast: about ${energy}/5 post-workout energy, ${stress}/5 post-workout stress, and ${Math.round(recovery * 100)}% next-day recovery quality.` ,
    priorities: bundle.heuristics.slice(0, 3).map((heuristic) => heuristic.recommendation),
    nextActions: [
      'Keep logging both pre and post feelings so the personal model keeps tightening.',
      'Repeat your best timing and fueling combination twice this week.',
      'Use the scenario comparison before moving a hard session later in the day.',
    ],
    checkInQuestions: [
      'Did this session match the energy score the forecast expected?',
      'Was recovery better when you kept the same timing and fueling pattern?',
    ],
  };
};

export const getPredictionBundleForUser = async (userId: string, request?: PredictionRequest): Promise<PredictionBundle> => {
  const [userEntries, allEntries] = await Promise.all([
    prisma.logEntry.findMany({
      where: {
        userId,
        occurredAt: {
          gte: getWindowStart(180),
        },
      },
      include: { feelings: true },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.logEntry.findMany({
      where: {
        occurredAt: {
          gte: getWindowStart(180),
        },
      },
      include: { feelings: true },
      orderBy: { occurredAt: 'asc' },
    }),
  ]);

  const userSamples = buildWorkoutSamples(userEntries as DatabaseEntry[]);
  const globalSamples = buildWorkoutSamples(allEntries as DatabaseEntry[]);

  if (userSamples.length < 3 || globalSamples.length < 6) {
    const defaultScenario = buildScenario(
      'default',
      'Default next workout',
      'Not enough workout history yet, so this uses your latest complete workout as the default scenario.',
      buildScenarioContext(userSamples.length ? userSamples : globalSamples, request),
      userSamples.length ? userSamples : globalSamples,
      globalSamples
    );
    const narrative = buildFallbackNarrative({ heuristics: [], defaultScenario });
    return {
      userId,
      generatedAt: new Date().toISOString(),
      windows: [...WINDOWS],
      heuristics: [],
      defaultScenario,
      scenarioComparisons: [defaultScenario],
      modelNotes: {
        userWorkoutSamples: userSamples.length,
        globalWorkoutSamples: globalSamples.length,
        personalWeight: 0.2,
        globalWeight: 0.8,
        calibrationNote: 'The hybrid model is still leaning on the global population because the personal sample size is small.',
      },
      narrative,
    };
  }

  const heuristics = [
    buildTimingHeuristic(userSamples),
    buildMoodShiftHeuristic(userSamples),
    buildMealTimingHeuristic(userSamples),
    buildConsistencyHeuristic(userSamples),
  ]
    .filter((heuristic): heuristic is PersonalizedHeuristic => Boolean(heuristic))
    .sort((left, right) => right.confidence - left.confidence || right.effectSize - left.effectSize);

  const defaultScenarioInput = buildScenarioContext(userSamples, request);
  const defaultPredictionSet = buildPredictions(userSamples, globalSamples, defaultScenarioInput);
  const defaultScenario: ForecastScenario = {
    id: 'default',
    label: 'Default next workout',
    description: 'Uses your current personal baseline, preferred workout timing, and recent fueling habits.',
    plannedHour: defaultScenarioInput.plannedHour,
    workoutKind: defaultScenarioInput.workoutKind,
    includeBreakfast: defaultScenarioInput.includeBreakfast,
    includeProteinRecoveryMeal: defaultScenarioInput.includeProteinRecoveryMeal,
    predictions: defaultPredictionSet.predictions,
  };

  const morningScenario = buildScenario(
    'morning-test',
    'Morning test',
    'Moves the same workout to an early time slot while keeping the rest of the pattern stable.',
    { ...defaultScenarioInput, plannedHour: 7, includeBreakfast: true },
    userSamples,
    globalSamples
  );
  const preferredScenario = buildScenario(
    'preferred-repeat',
    'Repeat your best pattern',
    'Repeats your current preferred timing and adds the fueling pattern that has produced your best outcomes.',
    { ...defaultScenarioInput, includeProteinRecoveryMeal: true },
    userSamples,
    globalSamples
  );
  const lateScenario = buildScenario(
    'late-tradeoff',
    'Late-session tradeoff',
    'Simulates moving the workout later to show the personal recovery cost.',
    { ...defaultScenarioInput, plannedHour: 21, includeBreakfast: false },
    userSamples,
    globalSamples
  );

  const fallbackNarrative = buildFallbackNarrative({ heuristics, defaultScenario });
  const narrative = await maybePersonalizeForecastNarrative({
    headline: fallbackNarrative.headline,
    coachSummary: fallbackNarrative.coachSummary,
    priorities: fallbackNarrative.priorities,
    nextActions: fallbackNarrative.nextActions,
    checkInQuestions: fallbackNarrative.checkInQuestions,
  }, {
    heuristics,
    defaultScenario,
    scenarioComparisons: [morningScenario, preferredScenario, lateScenario],
  });

  return {
    userId,
    generatedAt: new Date().toISOString(),
    windows: [...WINDOWS],
    heuristics,
    defaultScenario,
    scenarioComparisons: [morningScenario, preferredScenario, lateScenario],
    modelNotes: {
      userWorkoutSamples: userSamples.length,
      globalWorkoutSamples: globalSamples.length,
      personalWeight: defaultPredictionSet.personalWeight,
      globalWeight: defaultPredictionSet.globalWeight,
      calibrationNote:
        defaultPredictionSet.personalWeight >= 0.55
          ? 'The hybrid model now leans mostly on the individual user because there is enough personal history to calibrate against the population.'
          : 'The hybrid model still uses the global population as a stabilizer, then calibrates it back toward the individual user.',
    },
    narrative,
  };
};