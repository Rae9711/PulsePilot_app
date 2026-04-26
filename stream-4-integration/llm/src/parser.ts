export type EntryType = 'workout' | 'meal';

export interface ParserInput {
  rawText: string;
  type: EntryType;
  occurredAt?: string; // ISO8601, optional but used for meal_type inference when present
}

export interface ParserOutput {
  activity_type: string | null;
  duration_min: number | null;
  intensity: 'low' | 'medium' | 'high' | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  food_tags: string[];
  confidence: number; // 0–1 rough heuristic
}

function extractDuration(raw: string): number | null {
  const durationRegex = /(\d+)\s*(min|mins|minute|minutes)\b/i;
  const match = raw.match(durationRegex);
  if (!match) {
    return null;
  }
  const minutes = parseInt(match[1], 10);
  return Number.isNaN(minutes) ? null : minutes;
}

function extractActivityType(raw: string, type: EntryType): string | null {
  const text = raw.toLowerCase();
  if (type === 'meal') {
    return null;
  }

  if (text.includes('strength') || text.includes('weights') || text.includes('wght')) {
    return 'strength';
  }
  if (text.includes('run') || text.includes('jog')) {
    return 'run';
  }
  if (text.includes('walk')) {
    return 'walk';
  }
  if (text.includes('yoga')) {
    return 'yoga';
  }
  if (text.includes('hiit')) {
    return 'hiit';
  }

  return 'workout';
}

function extractIntensity(raw: string, activityType: string | null, durationMin: number | null): 'low' | 'medium' | 'high' | null {
  const text = raw.toLowerCase();

  if (text.includes('easy') || text.includes('light') || text.includes('recovery')) {
    return 'low';
  }

  if (text.includes('heavy') || text.includes('hiit') || text.includes('sprint')) {
    return 'high';
  }

  if (activityType === 'walk') {
    return 'low';
  }

  if (activityType === 'strength' && (durationMin ?? 0) >= 45) {
    return 'high';
  }

  if (activityType && durationMin != null) {
    // Fallback heuristic by duration
    if (durationMin <= 25) return 'low';
    if (durationMin >= 50) return 'high';
    return 'medium';
  }

  return null;
}

function inferMealType(type: EntryType, raw: string, occurredAt?: string): ParserOutput['meal_type'] {
  if (type !== 'meal') return null;

  const text = raw.toLowerCase();

  if (text.includes('breakfast')) {
    return 'breakfast';
  }
  if (text.includes('lunch')) {
    return 'lunch';
  }
  if (text.includes('dinner')) {
    return 'dinner';
  }
  if (text.includes('snack')) {
    return 'snack';
  }

  if (occurredAt) {
    const date = new Date(occurredAt);
    if (!Number.isNaN(date.getTime())) {
      const hour = date.getUTCHours();
      if (hour < 11) return 'breakfast';
      if (hour < 16) return 'lunch';
      return 'dinner';
    }
  }

  return null;
}

function extractFoodTags(raw: string): string[] {
  const text = raw.toLowerCase();
  const tags = new Set<string>();

  // Protein
  if (text.includes('chicken') || text.includes('eggs') || text.includes('burger') || text.includes('protein')) {
    tags.add('protein');
  }

  // Carbs
  if (text.includes('rice') || text.includes('toast') || text.includes('fries') || text.includes('bread')) {
    tags.add('carbs');
  }

  // Vegetables
  if (text.includes('broccoli') || text.includes('salad') || text.includes('veggies') || text.includes('vegetable')) {
    tags.add('vegetables');
  }

  // Fried
  if (text.includes('fried') || text.includes('fries')) {
    tags.add('fried');
  }

  return Array.from(tags);
}

function scoreConfidence(output: Omit<ParserOutput, 'confidence'>): number {
  let score = 0.3;
  if (output.activity_type) score += 0.25;
  if (output.duration_min != null) score += 0.2;
  if (output.intensity) score += 0.1;
  if (output.meal_type) score += 0.1;
  if (output.food_tags.length > 0) score += 0.05;
  if (score > 1) score = 1;
  return Number(score.toFixed(2));
}

export function parseLog(input: ParserInput): ParserOutput {
  const { rawText, type, occurredAt } = input;

  const duration_min = extractDuration(rawText);
  const activity_type = extractActivityType(rawText, type);
  const intensity = extractIntensity(rawText, activity_type, duration_min);
  const meal_type = inferMealType(type, rawText, occurredAt);
  const food_tags = type === 'meal' ? extractFoodTags(rawText) : [];

  const base: Omit<ParserOutput, 'confidence'> = {
    activity_type,
    duration_min,
    intensity,
    meal_type,
    food_tags,
  };

  const confidence = scoreConfidence(base);

  return {
    ...base,
    confidence,
  };
}

