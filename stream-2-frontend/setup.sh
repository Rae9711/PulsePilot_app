#!/bin/bash
# FitForecast Frontend Setup Script
# This script sets up the frontend environment

set -e

echo "🎨 FitForecast Frontend Setup"
echo "============================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "To start the frontend development server, run:"
echo "  npm run dev"
echo ""
echo "The app will be available at: http://localhost:5173"
echo ""
echo "⚠️  Make sure the backend is running at ${VITE_API_BASE_URL:-http://localhost:3000}"
