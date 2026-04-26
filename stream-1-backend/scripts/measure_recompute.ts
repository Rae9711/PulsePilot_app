import { recomputeBaselinesForUser } from '../src/services/baseline';
import { prisma } from '../src/db/prisma';

// Usage: SEED_ENTRY_COUNT=200 USER_ID=00000000-0000-0000-0000-000000000001 npx ts-node scripts/measure_recompute.ts

const userId = process.env.USER_ID || '00000000-0000-0000-0000-000000000001';

const run = async () => {
  try {
    console.log(`Measuring baseline recompute for user ${userId}`);
    const start = Date.now();
    await recomputeBaselinesForUser(userId);
    const took = Date.now() - start;
    console.log(`Recompute finished in ${took}ms`);
  } catch (err) {
    console.error('Recompute failed', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

run();
