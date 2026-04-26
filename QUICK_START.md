# 🚀 FitForecast MVP - Quick Start Guide

## System Status: ✅ FULLY OPERATIONAL

**Last Updated**: March 16, 2026

---

## 🌐 Live URLs

### Frontend (User Interface)
**URL**: http://localhost:5174
- Login page: http://localhost:5174/login
- Signup page: http://localhost:5174/signup
- Dashboard (protected): http://localhost:5174/
- Log Entry (protected): http://localhost:5174/log
- History (protected): http://localhost:5174/history
- Trends (protected): http://localhost:5174/trends

### Backend (API)
**URL**: http://localhost:3000
- API Documentation (Swagger): http://localhost:3000/docs
- Health Check: http://localhost:3000/health

---

## 🔐 Demo Accounts

Quick login credentials for testing (all use password: `password123`):

| User | Email | Password | Data |
|------|-------|----------|------|
| **Athena** | athena@example.com | password123 | 50 entries with feelings |
| **Boris** | boris@example.com | password123 | 50 entries with feelings |
| **Cora** | cora@example.com | password123 | 50 entries with feelings |

---

## ⚡ Quick Start

### 1. Access the App
1. Open browser to: http://localhost:5174
2. You'll see the login page

### 2. Login with Demo Account
1. Click any "Demo" button (Athena, Boris, or Cora)
2. Click "Login"
3. You're now logged in with pre-populated data!

### 3. Explore Features

**Dashboard** (`/`):
- View your latest entries
- See personalized insights
- Track recent activity

**Log Entry** (`/log`):
- Create new workout or meal entries
- Add pre/post feelings
- Natural language input

**History** (`/history`):
- Browse all your entries
- Filter by type
- View feelings timeline

**Trends** (`/trends`):
- Visualize your patterns
- See baseline metrics
- Analyze correlations

### 4. Create Your Own Account
1. Click "Sign up" from login page
2. Enter your email and password (min 8 characters)
3. Optional: Add your name
4. Start logging your fitness journey!

---

## 🛠️ Technical Architecture

### Backend Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14
- **ORM**: Prisma
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **API Docs**: Swagger/OpenAPI

### Frontend Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Routing**: React Router v7

### Database
- **Type**: PostgreSQL 14
- **Name**: fitforecast
- **Connection**: localhost:5432
- **Tables**: 8 (User, LogEntry, ParsedEntry, FeelingEntry, BaselineMetric, Insight, ParsedMeal, ParsedWorkout)

---

## 📚 API Endpoints

### Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/login` - Login and get token
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout (client-side)

### Entries
- `POST /entries` - Create workout/meal entry
- `GET /entries` - List user's entries
- `POST /entries/:id/feelings` - Add feelings to entry

### Insights
- `GET /insights` - Get personalized insights
- `PATCH /insights/:id/dismiss` - Dismiss an insight

### Trends
- `GET /trends` - Get trends and baselines

### Health
- `GET /health` - Server health check

**All protected endpoints require**:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🎯 Key Features

### ✅ Authentication System
- Secure JWT-based authentication
- Password hashing with bcryptjs
- Per-user data isolation
- 7-day token expiration
- Auto-logout on token expiry

### ✅ Workout & Meal Logging
- Natural language input
- Automatic parsing
- Timestamp tracking
- Type classification

### ✅ Feelings Tracking
- Pre/post activity feelings
- Valence, energy, stress metrics
- Optional notes
- Timeline visualization

### ✅ Personalized Insights
- Pattern detection
- Actionable recommendations
- Based on baseline comparisons
- Dismissable notifications

### ✅ Trend Analysis
- Visual charts
-Baseline calculations
- 30-day windows
- Activity correlation

### ✅ Responsive UI
- Mobile-friendly
- Clean, modern design
- Intuitive navigation
- Real-time updates

---

## 🧪 Testing the System

### Manual Testing (Browser)
1. **Signup Flow**:
   - Go to /signup
   - Create account
   - Verify auto-login
   - Check navigation shows user info

2. **Login Flow**:
   - Logout if logged in
   - Go to /login
   - Use demo account
   - Verify redirect to dashboard

3. **Protected Routes**:
   - Logout
   - Try to access /dashboard
   - Should redirect to /login

4. **Data Isolation**:
   - Login as Athena
   - Note entry count
   - Logout and login as Boris
   - Verify different entries

### API Testing (curl)

**Signup**:
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Tester"}'
```

**Login**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"athena@example.com","password":"password123"}'
```

**Get User Info** (replace TOKEN):
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Create Entry** (replace TOKEN):
```bash
curl -X POST http://localhost:3000/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "workout",
    "raw_text": "Morning run 5km in 30 minutes",
    "occurred_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'
```

---

## 🔧 Development Commands

### Backend
```bash
cd stream-1-backend
npm run dev          # Start dev server (port 3000)
npm run build        # Build production
npm test             # Run tests
npm run seed         # Seed database
npx prisma studio    # Open Prisma Studio (DB GUI)
```

### Frontend
```bash
cd stream-2-frontend
npm run dev          # Start dev server (port 5174)
npm run build        # Build production
npm run preview      # Preview production build
npm test             # Run tests
```

### Database
```bash
cd stream-1-backend
npx prisma migrate dev    # Create migration
npx prisma db push        # Push schema (no migration)
npx prisma generate       # Regenerate client
npx prisma migrate reset  # Reset DB (destructive!)
```

---

## 📂 Project Structure

```
FitForcast_app/
├── stream-1-backend/          # Backend API
│   ├── src/
│   │   ├── api/              # Route handlers
│   │   │   ├── auth.ts       # Auth endpoints
│   │   │   ├── entries.ts    # Entry CRUD
│   │   │   ├── feelings.ts   # Feelings API
│   │   │   └── insights.ts   # Insights API
│   │   ├── middleware/       # Express middleware
│   │   │   ├── auth.ts       # JWT verification
│   │   │   └── validation.ts # Input validation
│   │   ├── services/         # Business logic
│   │   ├── db/              # Database
│   │   │   ├── prisma.ts    # Prisma client
│   │   │   └── schema.prisma # DB schema
│   │   └── index.ts         # App entry point
│   ├── seeds/               # Database seeds
│   └── tests/               # Tests
│
├── stream-2-frontend/         # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/         # React context
│   │   │   ├── AuthContext.tsx   # Auth state
│   │   │   └── AppProvider.tsx   # App state
│   │   ├── pages/           # Page components
│   │   │   ├── Login.tsx     # Login page
│   │   │   ├── Signup.tsx    # Signup page
│   │   │   ├── Dashboard.tsx # Dashboard
│   │   │   └── ...
│   │   ├── api/             # API client
│   │   └── types/           # TypeScript types
│   └── index.html
│
├── stream-3-analytics/        # Python analytics
│   ├── src/                  # Analysis code
│   ├── notebooks/            # Jupyter notebooks
│   └── tests/
│
└── stream-4-integration/      # Integration tests
    ├── llm/                  # LLM parsing
    └── scenarios/            # Test scenarios
```

---

## 🐛 Troubleshooting

### Frontend won't load
1. Check if port 5174 is in use: `lsof -i :5174`
2. Restart frontend: `cd stream-2-frontend && npm run dev`
3. Check browser console for errors

### Backend errors
1. Check if port 3000 is in use: `lsof -i :3000`
2. Verify PostgreSQL is running: `brew services list`
3. Check backend logs in terminal
4. Verify .env file exists

### Database connection issues
1. Check PostgreSQL status: `brew services list`
2. Start if needed: `brew services start postgresql@14`
3. Verify connection string in stream-1-backend/.env
4. Test connection: `psql postgresql://fitforecast:fitforecast@localhost:5432/fitforecast`

### Authentication not working
1. Clear localStorage: Open DevTools → Application → Local Storage → Clear
2. Check token in localStorage: Look for "authToken" key
3. Verify backend auth endpoints: `curl http://localhost:3000/auth/me`
4. Check browser network tab for 401 errors

### Can't see my data
1. Verify you're logged in: Check user name in nav bar
2. Check if token is valid: Look at network requests
3. Try logout and login again
4. Verify userId in database matches token

---

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://fitforecast:fitforecast@localhost:5432/fitforecast"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
DEFAULT_USER_ID="00000000-0000-0000-0000-000000000001"
PORT=3000
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🎉 Success Indicators

Your system is working correctly if:

✅ Frontend loads at http://localhost:5174
✅ Backend responds at http://localhost:3000/health
✅ Swagger UI loads at http://localhost:3000/docs  
✅ Can login with demo accounts
✅ Can create new account
✅ Dashboard shows personalized data
✅ Can create new entries
✅ Trends charts display data
✅ Logout clears session
✅ Protected routes redirect to login when not authenticated
✅ Each user sees only their own data

---

## 📞 Next Steps

1. **Explore the demo accounts** to see how data looks with history
2. **Create your own account** and start logging
3. **Review the API docs** at /docs to understand available endpoints
4. **Check out the code** to see implementation details
5. **Read AUTH_SYSTEM_DOCS.md** for authentication architecture

---

## 🚨 Important Notes

- **Demo accounts are shared** - Don't put sensitive data
- **Data persists** in PostgreSQL - Use `npm run seed` to reset
- **Tokens expire** after 7 days - You'll need to login again
- **Development mode** - Some endpoints have fallbacks for testing
- **HTTPS recommended** for production - Protects passwords in transit

---

**Enjoy using FitForecast! 🏋️‍♀️📊**

For questions or issues, check the documentation in `/docs` or review the code comments.
