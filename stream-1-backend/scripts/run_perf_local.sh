#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export SEED_ENTRY_COUNT=${SEED_ENTRY_COUNT:-200}
echo "Seeding ${SEED_ENTRY_COUNT} entries per user..."
npx ts-node seeds/seed.ts

echo "Measuring baseline recompute..."
npx ts-node scripts/measure_recompute.ts

echo "Running autocannon 50 connections x 60s against /trends"
npx autocannon -c 50 -d 60 -j "http://localhost:3000/trends?user_id=00000000-0000-0000-0000-000000000001" > /tmp/trends_perf.json || true
echo "Results saved to /tmp/trends_perf.json"
