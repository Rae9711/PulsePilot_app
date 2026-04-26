import path from 'path';
import fs from 'fs';
import { parseLog, ParserInput, ParserOutput } from '../src/parser';

// These globals are provided by the test runner (e.g., Vitest/Jest).
// Declaring them here keeps TypeScript happy without importing a specific runner.
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: any;

interface SampleLog {
  id: string;
  persona_id: string;
  type: 'workout' | 'meal';
  raw_text: string;
  occurred_at: string;
  expected_parse: {
    activity_type: string | null;
    duration_min: number | null;
    intensity: ParserOutput['intensity'];
    meal_type: ParserOutput['meal_type'];
    food_tags: string[];
  };
}

function loadSamples(): SampleLog[] {
  const filePath = path.resolve(__dirname, '../../scenarios/sample_logs.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SampleLog[];
}

function arraysEqualIgnoreOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  return as.every((v, i) => v === bs[i]);
}

describe('Rule-based parser', () => {
  const samples = loadSamples();

  it('should parse individual fields correctly for known patterns', () => {
    const input: ParserInput = {
      rawText: '30 min easy run around the park',
      type: 'workout',
      occurredAt: '2026-02-10T07:00:00Z',
    };

    const output = parseLog(input);

    expect(output.activity_type).toBe('run');
    expect(output.duration_min).toBe(30);
    expect(output.intensity).toBe('low');
    expect(output.meal_type).toBeNull();
    expect(output.food_tags).toEqual([]);
    expect(output.confidence).toBeGreaterThan(0.5);
  });

  it('should achieve ≥90% accuracy on expected_parse fields from sample_logs.json', () => {
    let totalComparisons = 0;
    let correctComparisons = 0;

    for (const sample of samples) {
      const input: ParserInput = {
        rawText: sample.raw_text,
        type: sample.type,
        occurredAt: sample.occurred_at,
      };

      const parsed = parseLog(input);
      const expected = sample.expected_parse;

      // activity_type
      if (expected.activity_type !== null) {
        totalComparisons += 1;
        if (parsed.activity_type === expected.activity_type) {
          correctComparisons += 1;
        }
      }

      // duration_min
      if (expected.duration_min !== null) {
        totalComparisons += 1;
        if (parsed.duration_min === expected.duration_min) {
          correctComparisons += 1;
        }
      }

      // intensity
      if (expected.intensity !== null) {
        totalComparisons += 1;
        if (parsed.intensity === expected.intensity) {
          correctComparisons += 1;
        }
      }

      // meal_type
      if (expected.meal_type !== null) {
        totalComparisons += 1;
        if (parsed.meal_type === expected.meal_type) {
          correctComparisons += 1;
        }
      }

      // food_tags
      if (expected.food_tags && expected.food_tags.length > 0) {
        totalComparisons += 1;
        if (arraysEqualIgnoreOrder(parsed.food_tags, expected.food_tags)) {
          correctComparisons += 1;
        }
      }
    }

    const accuracy = totalComparisons === 0 ? 1 : correctComparisons / totalComparisons;

    // Ensure we meet the MVP target
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
  });
});

