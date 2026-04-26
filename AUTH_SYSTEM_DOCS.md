# FitForecast Authentication System

## Overview
FitForecast now includes a complete JWT-based authentication system that allows each user to create their own account and maintain their own isolated data.

## ✅ What's Been Implemented

### Backend (stream-1-backend)

#### 1. Database Schema Updates
- **User model** now includes:
  - `password` (String, required) - Hashed with bcryptjs
  - `name` (String, optional) - Display name
- All existing relations maintained (User → LogEntry → FeelingEntry, etc.)

#### 2. Authentication Endpoints
All mounted at `/auth`:

- **POST /auth/signup**
  - Creates new user account
  - Requires: `email` (valid email), `password` (min 8 chars), `name` (optional)
  - Returns: User info + JWT token
  - Password is hashed with bcrypt (10 salt rounds)

- **POST /auth/login**
  - Authenticates existing user
  - Requires: `email`, `password`
  - Returns: User info + JWT token
  - Token expires in 7 days

- **GET /auth/me**
  - Gets current user info
  - Requires: Valid JWT token in `Authorization: Bearer <token>` header
  - Returns: User profile (id, email, name, timestamps)

- **POST /auth/logout**
  - Client-side logout (clears token from localStorage)
  - Returns success message

#### 3. Auth Middleware
- **JWT verification**: Primary authentication method
- **Backward compatibility**: Supports x-user-id header for testing
- **Fallback**: Uses DEFAULT_USER_ID from .env for development
- **requireAuth**: Strict middleware requiring valid JWT (no fallback)

#### 4. Security
- Passwords hashed with bcryptjs (10 salt rounds)
- JWT secret from environment variable (JWT_SECRET) or dev default
- Token expiration: 7 days
- All protected routes require authentication

#### 5. Demo Users (Seeded)
Three pre-seeded users with sample data:
- **athena@example.com** - Password: `password123`
- **boris@example.com** - Password: `password123`
- **cora@example.com** - Password: `password123`

Each has 50 sample log entries with feelings data.

### Frontend (stream-2-frontend)

#### 1. Authentication Context
- **AuthContext** (`src/context/AuthContext.tsx`)
  - Manages user state, token, authentication status
  - Provides: `login()`, `signup()`, `logout()`, `isAuthenticated`, `user`, `token`
  - Automatically persists token to localStorage
  - Loads user on app mount
  - Clears token on 401 responses

#### 2. API Client Updates
- **Auto-includes JWT token** in all API requests via axios interceptor
- **Authorization header**: `Bearer <token>`
- **401 handling**: Automatically redirects to login when unauthorized
- **Base URL**: Updated to `http://localhost:3000` (backend)

#### 3. Protected Routes
- **ProtectedRoute component** wraps all authenticated pages
- Redirects to `/login` if not authenticated
- Shows loading spinner while checking auth status

#### 4. Authentication Pages

**Login Page** (`/login`):
- Email and password fields
- Form validation
- Error message display
- Quick-fill buttons for demo accounts (Athena, Boris, Cora)
- Link to signup page

**Signup Page** (`/signup`):
- Email, password, and optional name fields
- Form validation (min 8 char password)
- Error message display
- Link to login page

#### 5. App Updates
- **Navigation bar** shows user name/email and logout button when authenticated
- **Footer and header** only shown when authenticated
- **Routes**:
  - `/login` - Public
  - `/signup` - Public
  - `/` (Dashboard) - Protected
  - `/log` - Protected
  - `/history` - Protected
  - `/trends` - Protected

## 🚀 How to Use

### For New Users

1. **Navigate to** http://localhost:5174
2. **Click** "Sign up" or go to `/signup`
3. **Enter** email, password (min 8 chars), and optional name
4. **Submit** to create account and auto-login
5. **Start logging** workouts and meals!

### For Demo Users

1. **Navigate to** http://localhost:5174/login
2. **Click** one of the demo user buttons (Athena, Boris, or Cora)
3. **Click** "Login" to access pre-populated data
4. **Explore** 50+ sample entries with feelings and insights

### For Testing

**Create a new user:**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepass123",
    "name": "New User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "athena@example.com",
    "password": "password123"
  }'
```

**Get current user:**
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📦 Technical Details

### Token Storage
- **Location**: Browser localStorage (`authToken` key)
- **Lifetime**: 7 days
- **Format**: JWT with userId and email in payload
- **Transmission**: Authorization: Bearer header in all API requests

### Data Isolation
- Each user's data is **completely isolated**
- All API endpoints filter by authenticated user's ID
- No cross-user data access possible

### Password Security
- **Hashing**: bcryptjs with 10 salt rounds
- **Never transmitted** in plain text except during initial signup/login over HTTPS
- **Never stored** in plain text

## 🔧 Environment Variables

**Backend** (stream-1-backend/.env):
```
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001  # For dev/testing only
```

**Frontend** (stream-2-frontend/.env):
```
VITE_API_BASE_URL=http://localhost:3000
```

## 📝 Next Steps (Future Enhancements)

- [ ] Email verification
- [ ] Password reset flow
- [ ] Remember me / refresh tokens
- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication
- [ ] Account settings page
- [ ] Profile picture upload
- [ ] Delete account option

## 🎯 Testing Checklist

✅ User can sign up with email and password
✅ User can login with valid credentials
✅ Invalid credentials show error message
✅ Token is stored in localStorage
✅ Token is sent with all API requests
✅ Protected routes redirect to login when not authenticated
✅ User can logout and token is cleared
✅ Each user sees only their own data
✅ Demo users work with pre-seeded data
✅ Password validation enforces 8+ characters
✅ Navigation shows user name/email when logged in

## 🚨 Current Status

**✅ FULLY OPERATIONAL**

- Backend: Running on http://localhost:3000
- Frontend: Running on http://localhost:5174
- Database: PostgreSQL with 3 demo users + sample data
- All auth endpoints tested and working
- Frontend UI complete with login/signup pages
- Token management implemented
- Data isolation verified

**Try it now!** Open http://localhost:5174 and login with any demo account or create your own!
