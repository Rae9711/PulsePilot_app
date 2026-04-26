# Stream 4: Scenarios & Test Data

**Role:** Shared test fixtures and user stories used by all streams

## Overview

This directory contains **realistic user stories, sample logs, and edge cases** that drive development across all teams. Every sample log has "expected outcomes" so teams can validate their work against common scenarios.

## User Stories

### User Story 1: Jordan (28, Active Gym-Goer)

**Profile:**
- Strength training enthusiast, 4–5 days/week
- Interested in understanding energy recovery post-workout
- Tracks nutrition loosely but consistently

**Typical Log Pattern:**
- Morning (6–7am): 60–90 min strength session (bench, squats, deadlifts)
  - Pre-feeling: Energy 2/5, Valence 3/5, Stress 3/5
  - Post-feeling: Energy 4/5, Valence 5/5, Stress 1/5
- Lunch (12pm): "Chicken breast, brown rice, broccoli"
  - Post-feeling: Energy 4/5, Valence 4/5, Stress 2/5
- Evening: Rest day or light 20–30 min walk

**Expected Insights (After 20–30 entries):**
- ✓ "Energy uplift after strength workouts"
- ✓ "Routine days stabilize mood"
- ✓ "Consistent strength training frequency"

---

### User Story 2: Alex (35, Fitness & Nutrition Conscious)

**Profile:**
- Recently adopted stricter nutrition and workout routine
- Highly sensitive to meal timing effects on sleep and morning energy
- Logs consistently but sometimes late

**Typical Log Pattern:**
- Breakfast (7am): "Eggs, toast, coffee"
  - Post-feeling: Energy 4/5, Valence 4/5, Stress 3/5
- Lunch (12:30pm): Salad or leftovers
- Workout (5–6pm): 30 min moderate run or 45 min yoga
- Dinner (varies 6–9:30pm): Sometimes late after social events
  - Next morning energy: 3–4/5 if late, 4–5/5 if early

**Expected Insights (After 25–30 entries):**
- ✓ "Late meals correlate with lower morning energy"
- ✓ "Consistent breakfast timing improves mood stability"
- ✗ "Energy uplift after strength" (does mostly cardio/yoga)

---

### User Story 3: Sam (42, New to Structured Logging)

**Profile:**
- Returning to fitness after 5+ years
- Logs inconsistently at first, then stabilizes
- Sensitive to perceived results (quick insights critical)

**Log Pattern Timeline:**
- **Days 1–10:** Sparse, 1–2 entries/day, minimal feelings → **No insights**
- **Days 11–20:** Increases to 3–4 entries/day, detailed inputs → **First insights begin**
- **Days 21+:** Consistent, detailed logging → **All relevant insights fire**

---

## Sample Logs (JSON Format)

Each entry includes:
- id, type (workout/meal), raw_text, occurred_at
- expected_parse (what NLP should extract)
- expected_feelings_pre/post (user input)
- expected_insights (insights this should trigger)

### Example 1: Easy Run

```json
{
  "id": "sample-run-001",
  "type": "workout",
  "raw_text": "30 min easy run around the park",
  "occurred_at": "2026-02-10T07:00:00Z",
  "expected_parse": {
    "activity_type": "run",
    "duration_min": 30,
    "intensity": "low"
  },
  "expected_feelings": {
    "pre": { "valence": 3, "energy": 2, "stress": 3 },
    "post": { "valence": 4, "energy": 3, "stress": 2 }
  }
}
```

### Example 2: Heavy Strength

```json
{
  "id": "sample-strength-001",
  "type": "workout",
  "raw_text": "60 min strength training - bench 3x5, squats 5x5, deadlifts 3x3",
  "occurred_at": "2026-02-10T06:30:00Z",
  "expected_parse": {
    "activity_type": "strength",
    "duration_min": 60,
    "intensity": "high"
  },
  "expected_feelings": {
    "pre": { "valence": 3, "energy": 2, "stress": 2 },
    "post": { "valence": 5, "energy": 4, "stress": 1 }
  }
}
```

### Example 3: Nutritious Lunch

```json
{
  "id": "sample-meal-001",
  "type": "meal",
  "raw_text": "grilled chicken breast, brown rice, steamed broccoli",
  "occurred_at": "2026-02-10T12:30:00Z",
  "expected_parse": {
    "meal_type": "lunch",
    "food_tags": ["protein", "carbs", "vegetables"]
  },
  "expected_feelings": {
    "pre": { "valence": 3, "energy": 3, "stress": 3 },
    "post": { "valence": 4, "energy": 4, "stress": 2 }
  }
}
```

---

## Edge Cases

### Edge Case 1: New User (Sparse Data)
**Scenario:** Day 1, user logs 3 entries.
- Expected: Baselines compute but mark as "uncertain" (low confidence)
- No insights fire yet (require ≥5 similar entries)
- UI shows: "More logs needed (3/5)"

### Edge Case 2: Conflicting Signals
**Scenario:** "30 min strength workout" → Energy 2/5, Valence 4/5, Stress 1/5
- Expected: Accept both signals; no conflict resolution
- Insights use both dimensions

### Edge Case 3: Very Long Log Text
**Scenario:** Multi-activity log ("HIIT 45 min... then made a smoothie...")
- Expected: Parser handles long text; extracts key signals
- Flag as "multi-activity" in UI

### Edge Case 4: Typos & Abbreviations
**Scenario:** "30min HIIT + weights", "chkn w/ rice n broc"
- Expected: Parser handles common typos/abbreviations with high confidence

---

## Success Criteria

- [ ] 3+ detailed user stories with realistic patterns
- [ ] 10+ sample log entries with expected outputs
- [ ] 5+ edge case scenarios documented
- [ ] All teams reference this for test data and validation

## File Structure

```
stream-4-integration/scenarios/
├── README.md ← You are here
├── sample_logs.json
└── personas/
    ├── jordan.json
    ├── alex.json
    └── sam.json
```
