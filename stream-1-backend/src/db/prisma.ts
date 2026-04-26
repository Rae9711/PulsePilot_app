import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Utility
 *
 * Exposes a singleton PrismaClient instance for database access.
 * Reuses client during development to avoid connection storms with hot reload.
 * Caches client globally except in production.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

// Lazily instantiate the client the first time this module is imported.
export const prisma = global.__prismaClient ?? new PrismaClient();

// Cache the client on the global scope except in production where processes are short-lived.
if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient = prisma;
}
