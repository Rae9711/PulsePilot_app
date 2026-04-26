import { prisma } from '../src/db/prisma';
import { LogEntryType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { recomputeBaselinesForUser } from '../src/services/baseline';

// Enhanced Seed Script with Distinct User Personas
// 
// Creates 3 demo users with unique patterns (90+ entries each):
// - Athena: Consistent morning exerciser, balanced diet, steady improvement
// - Boris: Inconsistent routine, high stress, needs recovery optimization
// - Cora: Evening workout enthusiast, meal prep focused, maintaining peak

const ENTRY_COUNT = Number(process.env.SEED_ENTRY_COUNT ?? 95);
const SPAN_DAYS = Number(process.env.SEED_SPAN_DAYS ?? 180);

// Demo user personas with distinct characteristics
const demoUsers = [
  { 
    id: '00000000-0000-0000-0000-000000000001', 
    email: 'athena@example.com', 
    name: 'Athena',
    persona: 'consistent_improver' // Morning person, steady progress
  },
  { 
    id: '00000000-0000-0000-0000-000000000002', 
    email: 'boris@example.com', 
    name: 'Boris',
    persona: 'stressed_inconsistent' // Irregular schedule, high stress
  },
  { 
    id: '00000000-0000-0000-0000-000000000003', 
    email: 'cora@example.com', 
    name: 'Cora',
    persona: 'peak_performer' // Evening workouts, optimized nutrition
  }
];

// Expanded activity pools for each persona
const athenaActivities = [
  { type: 'workout' as LogEntryType, rawText: 'Morning run: 6am, 5 miles, easy pace', hour: 6 },
  { type: 'workout' as LogEntryType, rawText: 'Strength training: upper body, 45 minutes', hour: 7 },
  { type: 'workout' as LogEntryType, rawText: 'Yoga flow: 30 minutes morning stretch', hour: 6 },
  { type: 'workout' as LogEntryType, rawText: 'Cycling: 10 miles moderate pace', hour: 7 },
  { type: 'workout' as LogEntryType, rawText: 'Swimming: 30 laps, technique focus', hour: 6 },
  { type: 'meal' as LogEntryType, rawText: 'Breakfast: oatmeal with berries and almonds', hour: 8 },
  { type: 'meal' as LogEntryType, rawText: 'Lunch: grilled chicken, quinoa, roasted vegetables', hour: 12 },
  { type: 'meal' as LogEntryType, rawText: 'Dinner: baked salmon, sweet potato, green beans', hour: 18 },
  { type: 'meal' as LogEntryType, rawText: 'Post-workout: protein smoothie with banana', hour: 9 },
  { type: 'meal' as LogEntryType, rawText: 'Snack: Greek yogurt with honey and walnuts', hour: 15 }
];

const borisActivities = [
  { type: 'workout' as LogEntryType, rawText: 'Late night gym: chest and triceps, rushed', hour: 21 },
  { type: 'workout' as LogEntryType, rawText: 'Quick HIIT: 15 minutes between meetings', hour: 14 },
  { type: 'workout' as LogEntryType, rawText: 'Stress relief run: 3 miles, hard pace', hour: 22 },
  { type: 'workout' as LogEntryType, rawText: 'Home workout: bodyweight exercises, 20 min', hour: 23 },
  { type: 'workout' as LogEntryType, rawText: 'Lunch break: quick weights session', hour: 13 },
  { type: 'meal' as LogEntryType, rawText: 'Breakfast: coffee and granola bar on the go', hour: 9 },
  { type: 'meal' as LogEntryType, rawText: 'Lunch: takeout burrito from food truck', hour: 14 },
  { type: 'meal' as LogEntryType, rawText: 'Dinner: pizza delivery, working late', hour: 21 },
  { type: 'meal' as LogEntryType, rawText: 'Late night snack: chips while coding', hour: 23 },
  { type: 'meal' as LogEntryType, rawText: 'Skipped breakfast, had large coffee instead', hour: 10 }
];

const coraActivities = [
  { type: 'workout' as LogEntryType, rawText: 'Evening CrossFit: WOD with PRs, 60 minutes', hour: 17 },
  { type: 'workout' as LogEntryType, rawText: 'After-work run: 8K tempo run, felt strong', hour: 18 },
  { type: 'workout' as LogEntryType, rawText: 'Power lifting: squats and deadlifts, heavy day', hour: 17 },
  { type: 'workout' as LogEntryType, rawText: 'Boxing class: high intensity, 45 minutes', hour: 18 },
  { type: 'workout' as LogEntryType, rawText: 'Recovery yoga: evening stretch and mobility', hour: 19 },
  { type: 'meal' as LogEntryType, rawText: 'Meal prep: grilled chicken, brown rice, broccoli', hour: 12 },
  { type: 'meal' as LogEntryType, rawText: 'Pre-workout: banana and almond butter', hour: 16 },
  { type: 'meal' as LogEntryType, rawText: 'Post-workout: protein shake with creatine', hour: 19 },
  { type: 'meal' as LogEntryType, rawText: 'Dinner: lean steak, quinoa, mixed greens', hour: 20 },
  { type: 'meal' as LogEntryType, rawText: 'Breakfast: egg whites, avocado, whole grain toast', hour: 7 }
];

// Deterministic pseudo-random helper
const deterministic = (seed: number) => {
  let x = seed % 2147483647;
  return () => {
    x = (x * 48271) % 2147483647;
    return x / 2147483647;
  };
};

const daysAgo = (days: number, hour: number = 12) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return date;
};

const seededNoise = (rand: () => number, magnitude: number) => {
  return (rand() - 0.5) * 2 * magnitude;
};

const seedWeightLogsForUser = async (params: {
  userId: string;
  persona: string;
  rand: () => number;
}) => {
  const { userId, persona, rand } = params;

  await prisma.weightLog.deleteMany({ where: { userId } });

  // Log roughly every 3 days so the chart always has enough points across the demo window.
  const cadenceDays = 3;
  const points = Math.max(24, Math.floor(SPAN_DAYS / cadenceDays));

  let startKg = 72;
  let endKg = 71;

  if (persona === 'consistent_improver') {
    startKg = 74.5;
    endKg = 70.8;
  } else if (persona === 'stressed_inconsistent') {
    startKg = 88.2;
    endKg = 89.0;
  } else if (persona === 'peak_performer') {
    startKg = 62.4;
    endKg = 62.0;
  }

  const rows: Array<{ userId: string; weightKg: number; loggedAt: Date; note?: string }> = [];

  for (let i = 0; i < points; i += 1) {
    const progress = i / Math.max(points - 1, 1);
    const daysBack = SPAN_DAYS - i * cadenceDays;
    if (daysBack < 0) continue;

    const linear = startKg + (endKg - startKg) * progress;
    const wave = persona === 'stressed_inconsistent'
      ? Math.sin(i / 1.8) * 0.9
      : persona === 'peak_performer'
        ? Math.sin(i / 2.4) * 0.25
        : Math.sin(i / 2.1) * 0.35;
    const noise = seededNoise(rand, persona === 'stressed_inconsistent' ? 0.45 : 0.2);
    const weightKg = Number((linear + wave + noise).toFixed(1));

    const note = i % 7 === 0
      ? (persona === 'consistent_improver'
          ? 'Morning fasted weigh-in'
          : persona === 'stressed_inconsistent'
            ? 'After short sleep'
            : 'Post-recovery day')
      : undefined;

    rows.push({
      userId,
      weightKg,
      loggedAt: daysAgo(daysBack, 7),
      note,
    });
  }

  if (rows.length > 0) {
    await prisma.weightLog.createMany({ data: rows });
  }
};

const seed = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — aborting seed to avoid accidental writes.');
    process.exit(1);
  }

  // Hash default password once for all demo users
  const defaultPassword = await bcrypt.hash('password123', 10);

  for (const user of demoUsers) {
    console.log(`\n🌱 Seeding ${user.name} (${user.persona})...`);
    
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, name: user.name },
      create: { 
        id: user.id, 
        email: user.email,
        name: user.name,
        password: defaultPassword
      }
    });

    const rand = deterministic(user.id.charCodeAt(user.id.length - 1));
    
    // Select activity pool based on persona
    let activityPool: Array<{ type: LogEntryType; rawText: string; hour: number }>;
    let consistencyRate: number; // % chance of logging on any given day
    let improvementTrend: boolean; // whether feelings improve over time
    let stressLevel: number; // base stress level (1-5)
    
    switch (user.persona) {
      case 'consistent_improver':
        activityPool = athenaActivities;
        consistencyRate = 0.85; // Very consistent
        improvementTrend = true; // Gets better over time
        stressLevel = 2; // Low stress
        break;
      case 'stressed_inconsistent':
        activityPool = borisActivities;
        consistencyRate = 0.45; // Often skips days
        improvementTrend = false; // No clear improvement
        stressLevel = 4; // High stress
        break;
      case 'peak_performer':
        activityPool = coraActivities;
        consistencyRate = 0.90; // Very consistent
        improvementTrend = false; // Already at peak
        stressLevel = 2; // Low stress, well managed
        break;
      default:
        activityPool = athenaActivities;
        consistencyRate = 0.70;
        improvementTrend = false;
        stressLevel = 3;
    }

    let entriesCreated = 0;
    let dayOffset = 0;
    
    // Create entries spread across time, respecting consistency rate
    while (entriesCreated < ENTRY_COUNT && dayOffset < SPAN_DAYS * 2) {
      dayOffset++;
      
      // Skip some days based on consistency
      if (rand() > consistencyRate) {
        continue;
      }
      
      // Pick activity template
      const template = activityPool[Math.floor(rand() * activityPool.length)];
      
      // Calculate progression factor (0.0 = oldest, 1.0 = newest)
      const progressionFactor = 1 - (dayOffset / SPAN_DAYS);
      
      const entry = await prisma.logEntry.create({
        data: {
          userId: user.id,
          type: template.type,
          rawText: template.rawText,
          occurredAt: daysAgo(dayOffset, template.hour)
        }
      });

      // Calculate feelings based on persona and progression
      let baseValence: number, baseEnergy: number, baseStress: number;
      
      if (user.persona === 'consistent_improver') {
        // Athena: improving over time
        baseValence = Math.floor(2 + progressionFactor * 2); // 2->4
        baseEnergy = Math.floor(2 + progressionFactor * 2); // 2->4
        baseStress = Math.floor(3 - progressionFactor); // 3->2
      } else if (user.persona === 'stressed_inconsistent') {
        // Boris: high stress, variable energy
        baseValence = Math.floor(2 + rand() * 2); // 2-3 (inconsistent)
        baseEnergy = Math.floor(1 + rand() * 3); // 1-3 (varies wildly)
        baseStress = Math.floor(3 + rand() * 2); // 3-5 (always stressed)
      } else {
        // Cora: peak performer, consistently high
        baseValence = Math.floor(3 + rand()); // 3-4 (high)
        baseEnergy = Math.floor(3 + rand()); // 3-4 (high)
        baseStress = Math.floor(1 + rand()); // 1-2 (low)
      }

      // Create pre-activity feeling
      await prisma.feelingEntry.create({
        data: {
          logEntryId: entry.id,
          when: 'pre',
          valence: Math.max(1, Math.min(5, baseValence)),
          energy: Math.max(1, Math.min(5, baseEnergy)),
          stress: Math.max(1, Math.min(5, baseStress)),
          notes: template.type === 'workout' 
            ? 'Ready for workout' 
            : 'About to eat'
        }
      });

      // Post-activity: workouts boost feelings (except for Boris when stressed)
      const isWorkout = template.type === 'workout';
      const stressReduction = user.persona === 'stressed_inconsistent' ? 0 : 1;
      const boost = isWorkout ? 1 : 0;
      
      await prisma.feelingEntry.create({
        data: {
          logEntryId: entry.id,
          when: 'post',
          valence: Math.max(1, Math.min(5, baseValence + boost)),
          energy: Math.max(1, Math.min(5, baseEnergy + boost)),
          stress: Math.max(1, Math.min(5, baseStress - stressReduction)),
          notes: isWorkout 
            ? (user.persona === 'stressed_inconsistent' ? 'Still feeling overwhelmed' : 'Feeling great!') 
            : 'Satisfied'
        }
      });

      entriesCreated++;
    }
    
    console.log(`✅ Created ${entriesCreated} entries for ${user.name}`);

    await seedWeightLogsForUser({
      userId: user.id,
      persona: user.persona,
      rand,
    });
    console.log(`⚖️  Seeded weight logs for ${user.name}`);
    
    // Compute baselines for this user
    console.log(`📊 Computing baselines for ${user.name}...`);
    await recomputeBaselinesForUser(user.id);
    console.log(`✅ Baselines computed for ${user.name}`);
  }
};

seed()
  .then(async () => {
    console.log(`\n🎉 Seeding complete!`);
    console.log(`   • Athena: Consistent morning exerciser with steady improvement`);
    console.log(`   • Boris: Inconsistent routine with high stress levels`);
    console.log(`   • Cora: Peak performer with optimized evening workouts\n`);
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
