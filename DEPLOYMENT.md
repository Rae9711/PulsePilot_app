# FitForecast MVP Deployment Guide

This guide provides step-by-step instructions for deploying and running the FitForecast MVP, integrating all four streams.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 15+ (or use Docker)
- npm or pnpm

### Optional (for Docker deployment)
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

## Quick Start (Local Development)

The fastest way to get the MVP running locally:

### 1. Start the Database

```bash
# Start PostgreSQL using Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify it's running
docker-compose -f docker-compose.dev.yml ps
```

### 2. Set Up the Backend

```bash
cd stream-1-backend

# Run setup script (creates .env, installs deps, runs migrations, seeds data)
chmod +x setup.sh
./setup.sh

# Start the backend server
npm run dev
```

The backend will now be running at `http://localhost:3000`

**Verify it's working:**
- Health check: `curl http://localhost:3000/health`
- API docs: Open `http://localhost:3000/docs` in your browser

### 3. Set Up the Frontend

```bash
# In a new terminal
cd stream-2-frontend

# Run setup script (creates .env, installs deps)
chmod +x setup.sh
./setup.sh

# Start the frontend dev server
npm run dev
```

The frontend will now be running at `http://localhost:5174`

### 4. Access the Application

Open your browser to `http://localhost:5174` and you should see the FitForecast dashboard!

**Default User:**
- User ID: `00000000-0000-0000-0000-000000000001` (configured in .env)
- The database is pre-seeded with sample entries for this user

## Docker Deployment

For a complete containerized deployment:

### 1. Build and Start All Services

```bash
# From the project root
docker-compose up --build -d
```

This will start:
- PostgreSQL database (port 5432)
- Backend API (port 3000)
- Frontend web app (port 5174)

### 2. Verify Services

```bash
# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Check backend health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:5174
```

### 3. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Manual Deployment

For deployment to a cloud provider or VPS:

### Backend Deployment

1. **Set up PostgreSQL database** (e.g., on RDS, DigitalOcean, etc.)

2. **Configure environment variables:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/fitforecast
PORT=3000
NODE_ENV=production
DEFAULT_USER_ID=your-user-id
```

3. **Deploy the backend:**
```bash
cd stream-1-backend

# Install production dependencies
npm ci --only=production

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database
npm run seed

# Build TypeScript
npm run build

# Start the server
npm start
```

### Frontend Deployment

1. **Configure environment variables:**
```bash
VITE_API_BASE_URL=https://your-api-domain.com
VITE_DEFAULT_USER_ID=your-user-id
VITE_ENABLE_MOCK_DATA=false
```

2. **Build and deploy:**
```bash
cd stream-2-frontend

# Install dependencies
npm ci

# Build for production
npm run build

# The dist/ folder contains static files
# Deploy to any static hosting (Vercel, Netlify, S3, etc.)
```

## Production Deployment

### Recommended Platforms

#### Backend Options:
- **Render** - Easy PostgreSQL + Node.js hosting
- **Fly.io** - Global edge deployment
- **Railway** - Simple full-stack deployment
- **Heroku** - Classic PaaS option
- **DigitalOcean App Platform** - VPS-based hosting

#### Frontend Options:
- **Vercel** - Optimized for React + Vite
- **Netlify** - Free tier with continuous deployment
- **Cloudflare Pages** - Free with CDN
- **AWS S3 + CloudFront** - Scalable static hosting

### Example: Render Deployment

#### Backend on Render:

1. Create a new Web Service
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `npm install && npm run prisma:generate && npm run build`
   - **Start Command:** `npm run prisma:migrate && npm run seed && npm start`
   - **Environment Variables:** Add `DATABASE_URL`, `PORT`, etc.

#### Frontend on Vercel:

1. Connect your GitHub repository
2. Set **Root Directory:** `stream-2-frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Add a SPA rewrite so direct requests to client routes resolve to `index.html`
6. **Environment Variables:** Add `VITE_API_BASE_URL`, etc.

If you deploy this React app on Vercel without a rewrite, requests to routes like `/login`, `/history`, or `/analytics` will return Vercel `NOT_FOUND` because those paths only exist in the client router. Keep the frontend [stream-2-frontend/vercel.json](/Users/rae/FitForcast_app/stream-2-frontend/vercel.json) file in the deployed root with:

```json
{
   "rewrites": [
      {
         "source": "/(.*)",
         "destination": "/index.html"
      }
   ]
}
```

If the Vercel log finishes in a fraction of a second and never shows dependency installation or `npm run build`, the project is likely deploying the repository root instead of `stream-2-frontend`. The root [vercel.json](/Users/rae/FitForcast_app/vercel.json) file provides a fallback for repo-root deployments by running the frontend build from `stream-2-frontend` and publishing `stream-2-frontend/dist`.

### Environment Variables Summary

#### Backend (.env)
```bash
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001
LOG_LEVEL=info
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=https://api.fitforecast.com
VITE_DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001
VITE_ENABLE_MOCK_DATA=false
```

## Stream Integration Status

### ✅ Stream 1: Backend & Infrastructure
- PostgreSQL schema with 6 tables
- 5 REST API endpoints
- Baseline computation service
- Insights engine
- Seed data for testing

### ✅ Stream 2: Frontend & Insights UI
- React app with TypeScript
- Logging interface (workouts & meals)
- Feeling capture (pre/post)
- History view
- Trends dashboard
- Insights display

### 🔄 Stream 3: Insights Engine & Analytics
- Python notebooks for rule validation
- Baseline metric definitions
- Integrated with backend via Prisma models

### 🔄 Stream 4: Data Quality & Integration
- LLM parser for natural language entries
- Scenario tests and personas
- E2E test infrastructure

## API Endpoints

Base URL: `http://localhost:3000` (development)

- `GET /health` - Health check
- `POST /entries` - Create log entry
- `POST /entries/:id/feelings` - Add feelings to entry
- `GET /entries?userId=X` - Get user entries
- `GET /trends?userId=X` - Get user trends & baselines
- `GET /insights?userId=X` - Get user insights
- `GET /docs` - API documentation (Swagger UI)

## Database Schema

The backend uses PostgreSQL with Prisma ORM. Key tables:

- **User** - User accounts
- **LogEntry** - Workout/meal logs
- **FeelingEntry** - Pre/post feelings (valence, energy, stress)
- **ParsedEntry** - NLP-enriched entry data
- **BaselineMetric** - Rolling averages per user
- **Insight** - Personalized insights

## Troubleshooting

### Backend Issues

**"Cannot connect to database"**
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Check DATABASE_URL in .env
cat stream-1-backend/.env

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres psql -U fitforecast -d fitforecast -c "SELECT 1"
```

**"Prisma Client not generated"**
```bash
cd stream-1-backend
npm run prisma:generate
```

**"Migration failed"**
```bash
cd stream-1-backend
# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset
npm run seed
```

### Frontend Issues

**"Cannot fetch data from API"**
1. Check backend is running: `curl http://localhost:3000/health`
2. Verify `VITE_API_BASE_URL` in `stream-2-frontend/.env`
3. Check browser console for CORS errors
4. Enable mocks temporarily: Set `VITE_ENABLE_MOCK_DATA=true`

**"Blank page or errors on load"**
```bash
cd stream-2-frontend
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

### Docker Issues

**"Port already in use"**
```bash
# Find what's using the port
lsof -i :3000  # or :5432, :5174

# Stop the conflicting service or change ports in docker-compose.yml
```

**"Container won't start"**
```bash
# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Restart specific service
docker-compose restart backend
```

## Testing the MVP

### 1. Create a Log Entry

Navigate to `/log` and create a workout or meal entry:
```
"30 min easy run"
```

### 2. Capture Feelings

After creating an entry, you'll be prompted to capture:
- Pre-workout feelings (valence, energy, stress)
- Post-workout feelings

### 3. View History

Navigate to `/history` to see all your logged entries.

### 4. Check Trends

Navigate to `/trends` to see:
- Baseline metrics (14-day and 30-day rolling averages)
- Recent activity vs. baseline
- Charts showing patterns over time

### 5. Discover Insights

On the dashboard or trends page, look for personalized insights like:
- "Your energy is 1.2 points higher after strength sessions"
- "Late meals correlate with lower morning energy"
- "Your mood variance decreased this week"

## Next Steps

After the stack is running:

1. **Configure production secrets:** tighten env vars, CORS, and database access for the target environment
2. **Enable narrative rewriting:** connect the optional Jac service to a working upstream model if you want AI-polished copy
3. **Expand analytics coverage:** promote additional notebook rules and evaluations into backend logic
4. **Add clients or integrations:** mobile surfaces and wearable sync remain natural follow-on work

## Support

For issues or questions:
- Start with [README.md](README.md) for architecture, setup, and route coverage
- Use [docs/END_TO_END_GUIDE.md](docs/END_TO_END_GUIDE.md) for product walkthrough and validation flow
- Check the relevant stream directory directly if you are changing service-specific code or configuration

---

**🎉 Congratulations! Your FitForecast MVP is now integrated and running!**
