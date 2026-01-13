/**
 * Prisma Client Singleton
 *
 * This module provides a singleton PrismaClient instance for database operations.
 * It ensures only one client is created during development hot reloading.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Create PrismaClient singleton
 *
 * In development, store the client on globalThis to prevent multiple
 * instances during hot module replacement.
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  return client;
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
