#!/usr/bin/env bash
set -euo pipefail

# Run local Postgres, apply migrations, seed DB, start server, and run a load test.
# Usage: ./scripts/run_local_load_test.sh

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

command -v docker >/dev/null 2>&1 || { echo "docker is required but not installed or not in PATH"; exit 1; }

# Suppress Homebrew environment hints in output when starting services
export HOMEBREW_NO_ENV_HINTS=1

CONTAINER_NAME=fitforecast-postgres
POSTGRES_VERSION=15

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" = "" ]; then
  echo "Creating Postgres container $CONTAINER_NAME..."
  docker run --name $CONTAINER_NAME -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fitforecast -p 5432:5432 -d postgres:$POSTGRES_VERSION
else
  if [ "$(docker ps -q -f name=$CONTAINER_NAME)" = "" ]; then
    echo "Starting existing Postgres container $CONTAINER_NAME..."
    docker start $CONTAINER_NAME
  else
    echo "Postgres container $CONTAINER_NAME already running"
  fi
fi

echo "Waiting for Postgres to become available..."
until docker exec $CONTAINER_NAME pg_isready -U postgres -d fitforecast >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready"

export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitforecast"
export SEED_ENTRY_COUNT=${SEED_ENTRY_COUNT:-50}
export SEED_SPAN_DAYS=${SEED_SPAN_DAYS:-180}

cd stream-1-backend

echo "Generating Prisma client..."
npx prisma generate --schema=src/db/schema.prisma

echo "Applying migrations..."
npx prisma migrate deploy --schema=src/db/schema.prisma

echo "Seeding database with $SEED_ENTRY_COUNT entries per user..."
npm run seed

echo "Starting backend server (background)..."
PORT=3000 npm run dev &
SERVER_PID=$!

sleep 2

echo "Running load test (autocannon) against /trends (50 connections, 30s)..."
command -v npx >/dev/null 2>&1 || { echo "npx is required to run autocannon"; exit 1; }
npx autocannon -c 50 -d 30 "http://localhost:3000/trends?user_id=00000000-0000-0000-0000-000000000001"

echo "Load test finished; stopping server (PID $SERVER_PID)"
kill $SERVER_PID || true

echo "Done. To stop and remove the Postgres container run:"
echo "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
