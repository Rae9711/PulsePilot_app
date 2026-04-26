#!/bin/bash
# FitForecast Backend Setup Script
# This script sets up the backend environment and database

set -e

echo "🚀 FitForecast Backend Setup"
echo "============================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
fi

# Load environment variables
source .env

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔄 Generating Prisma Client..."
npm run prisma:generate

echo ""
echo "🗃️  Running database migrations..."
npm run prisma:migrate

echo ""
echo "🌱 Seeding database with sample data..."
npm run seed

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the backend server, run:"
echo "  npm run dev"
echo ""
echo "The API will be available at: http://localhost:${PORT:-3000}"
echo "API documentation: http://localhost:${PORT:-3000}/docs"
echo "Health check: http://localhost:${PORT:-3000}/health"
