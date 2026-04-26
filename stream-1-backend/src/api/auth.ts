import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';
import { jwtAudience, jwtExpiresIn, jwtIssuer, jwtSecret } from '../config';

const router = Router();

const tokenOptions: jwt.SignOptions = {
  expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn'],
  issuer: jwtIssuer,
  audience: jwtAudience,
};

const toErrorMeta = (error: unknown) => ({
  error: error instanceof Error ? error.message : error,
});

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attemptsByKey = new Map<string, { count: number; resetAt: number }>();

const getRequestKey = (req: Request) => req.ip || req.header('x-forwarded-for') || 'unknown';

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const current = attemptsByKey.get(key);
  if (!current || current.resetAt <= now) {
    attemptsByKey.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  attemptsByKey.set(key, current);
  return current.count > MAX_ATTEMPTS;
};

const clearRateLimit = (key: string) => {
  attemptsByKey.delete(key);
};

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().regex(PASSWORD_POLICY, 'Password must include upper, lower, and numeric characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/signup
 * Create a new user account
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const requestKey = `${getRequestKey(req)}:signup`;
    if (checkRateLimit(requestKey)) {
      return res.status(429).json({ message: 'Too many signup attempts. Please try again later.' });
    }

    // Validate input
    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.errors,
      });
    }

    const { email, password, name } = validation.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      tokenOptions
    );

    clearRateLimit(requestKey);

    logger.info(`New user signed up: ${user.email}`);

    res.status(201).json({
      message: 'User created successfully',
      user,
      token,
    });
  } catch (error) {
    logger.error('Signup error', toErrorMeta(error));
    res.status(500).json({
      message: 'Internal server error during signup',
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const requestKey = `${getRequestKey(req)}:login`;
    if (checkRateLimit(requestKey)) {
      return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
    }

    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.errors,
      });
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      tokenOptions
    );

    clearRateLimit(requestKey);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error', toErrorMeta(error));
    res.status(500).json({
      message: 'Internal server error during login',
    });
  }
});

/**
 * GET /auth/me
 * Get current user info from token
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // userId is set by requireAuth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error', toErrorMeta(error));
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

/**
 * POST /auth/logout
 * Logout (client-side token removal, but endpoint for consistency)
 */
router.post('/logout', (req: Request, res: Response) => {
  // With JWT, logout is primarily client-side (remove token)
  // This endpoint is here for consistency and future enhancements (e.g., token blacklist)
  logger.info(`User logged out: ${req.userId || 'unknown'}`);
  res.json({
    message: 'Logout successful',
  });
});

export default router;
