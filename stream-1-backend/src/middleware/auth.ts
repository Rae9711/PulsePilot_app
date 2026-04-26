import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { allowDevAuthBypass, jwtAudience, jwtIssuer, jwtSecret } from '../config';
import { incrementAuthFailure } from './monitoring';

/**
 * Auth Middleware
 *
 * Supports two authentication modes:
 * 1. JWT token from Authorization header (production)
 * 2. x-user-id header or DEFAULT_USER_ID fallback (development)
 *
 * Attaches userId to each request for downstream handlers.
 * Returns 401 Unauthorized if userId cannot be determined.
 */

// Extend Express' request typing once so every handler can rely on req.userId.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
}

// Try to extract and verify JWT token
const verifyToken = (req: Request): string | null => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  try {
    const token = parts[1];
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: jwtIssuer,
      audience: jwtAudience,
    }) as JwtPayload;
    return decoded.userId;
  } catch (error) {
    incrementAuthFailure();
    return null;
  }
};

// Infers userId from JWT token, headers, or environment fallback
const inferUserId = (req: Request): string => {
  // 1. Try JWT token first (primary auth method)
  const tokenUserId = verifyToken(req);
  if (tokenUserId) {
    return tokenUserId;
  }

  // 2. Try x-user-id header (for development/testing)
  const headerUserId = req.header('x-user-id');
  if (allowDevAuthBypass && headerUserId) {
    return headerUserId;
  }

  // 3. Fallback to environment config (for unauthenticated dev flows)
  const fallback = process.env.DEFAULT_USER_ID;
  if (!allowDevAuthBypass || !fallback) {
    incrementAuthFailure();
    throw new Error('Authentication required. Please provide a valid token.');
  }
  return fallback;
};

// Attaches userId to request or returns 401 if not found
export const attachUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.userId = inferUserId(req);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized', detail: (error as Error).message });
  }
};

// Optional middleware for routes that REQUIRE authentication (no fallback)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const tokenUserId = verifyToken(req);
  if (!tokenUserId) {
    incrementAuthFailure();
    return res.status(401).json({
      message: 'Authentication required',
      detail: 'Please provide a valid JWT token',
    });
  }
  req.userId = tokenUserId;
  next();
};
