/**
 * AI Quota Service Tests
 *
 * Tests for AI operation quota checking and usage tracking.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check - All AI operations must verify quota before execution
 * - INV-AI002: AI Operations Must Track Usage - All AI operations must increment usage counter
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AI Quota Service', () => {
  let isDatabaseAvailable = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      isDatabaseAvailable = true;
    } catch {
      isDatabaseAvailable = false;
      console.log('Database not available - some tests will be skipped');
    }
  });

  beforeEach(async () => {
    if (isDatabaseAvailable) {
      // Clean up test data
      await prisma.usageTracking.deleteMany({
        where: { userId: { startsWith: 'quota-test-' } },
      });
      await prisma.user.deleteMany({
        where: { id: { startsWith: 'quota-test-' } },
      });
    }
  });

  afterEach(async () => {
    if (isDatabaseAvailable) {
      await prisma.usageTracking.deleteMany({
        where: { userId: { startsWith: 'quota-test-' } },
      });
      await prisma.user.deleteMany({
        where: { id: { startsWith: 'quota-test-' } },
      });
    }
  });

  describe('hasQuota (INV-AI001)', () => {
    it('should return true when user has remaining quota', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create test user with usage tracking
      const user = await prisma.user.create({
        data: {
          id: 'quota-test-has-quota',
          email: 'quota-has@test.com',
          displayName: 'Quota Has User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 5,
              aiOperationsLimit: 15, // Free tier
            },
          },
        },
      });

      const { hasQuota } = await import('./quota');
      const result = await hasQuota(user.id);

      expect(result).toBe(true);
    });

    it('should return false when quota exhausted', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create test user with exhausted quota
      const user = await prisma.user.create({
        data: {
          id: 'quota-test-exhausted',
          email: 'quota-exhausted@test.com',
          displayName: 'Quota Exhausted User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 15,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { hasQuota } = await import('./quota');
      const result = await hasQuota(user.id);

      expect(result).toBe(false);
    });

    it('should handle free tier (15 ops/month)', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-free-tier',
          email: 'quota-free@test.com',
          displayName: 'Free Tier User',
          subscription: JSON.stringify({ plan: 'free', status: 'active' }),
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 14,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { hasQuota, getRemainingQuota } = await import('./quota');

      expect(await hasQuota(user.id)).toBe(true);
      expect(await getRemainingQuota(user.id)).toBe(1);
    });

    it('should handle premium tier (100 ops/month)', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-premium-tier',
          email: 'quota-premium@test.com',
          displayName: 'Premium Tier User',
          subscription: JSON.stringify({ plan: 'premium', status: 'active' }),
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 50,
              aiOperationsLimit: 100,
            },
          },
        },
      });

      const { hasQuota, getRemainingQuota } = await import('./quota');

      expect(await hasQuota(user.id)).toBe(true);
      expect(await getRemainingQuota(user.id)).toBe(50);
    });
  });

  describe('checkAndConsumeQuota (INV-AI001, INV-AI002)', () => {
    it('should throw QuotaExceededError on operation attempt with no quota', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-throw',
          email: 'quota-throw@test.com',
          displayName: 'Quota Throw User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 15,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { checkAndConsumeQuota, QuotaExceededError } = await import('./quota');

      await expect(checkAndConsumeQuota(user.id)).rejects.toThrow(QuotaExceededError);
    });

    it('should increment usage after successful operation', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-increment',
          email: 'quota-increment@test.com',
          displayName: 'Quota Increment User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 5,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { checkAndConsumeQuota } = await import('./quota');
      await checkAndConsumeQuota(user.id);

      // Verify usage was incremented
      const usage = await prisma.usageTracking.findUnique({
        where: { userId: user.id },
      });
      expect(usage?.aiOperationsUsed).toBe(6);
    });

    it('should not increment usage on operation failure', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-no-increment',
          email: 'quota-no-increment@test.com',
          displayName: 'No Increment User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 15,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { checkAndConsumeQuota, QuotaExceededError } = await import('./quota');

      try {
        await checkAndConsumeQuota(user.id);
      } catch (error) {
        expect(error).toBeInstanceOf(QuotaExceededError);
      }

      // Verify usage was NOT incremented
      const usage = await prisma.usageTracking.findUnique({
        where: { userId: user.id },
      });
      expect(usage?.aiOperationsUsed).toBe(15);
    });
  });

  describe('getUsageStats', () => {
    it('should return current usage statistics', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-stats',
          email: 'quota-stats@test.com',
          displayName: 'Stats User',
          usage: {
            create: {
              periodStart,
              periodEnd,
              aiOperationsUsed: 7,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { getUsageStats } = await import('./quota');
      const stats = await getUsageStats(user.id);

      expect(stats).toEqual({
        used: 7,
        limit: 15,
        remaining: 8,
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
      });
    });

    it('should create usage tracking if not exists', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'quota-test-create-tracking',
          email: 'quota-create@test.com',
          displayName: 'Create Tracking User',
          subscription: JSON.stringify({ plan: 'free', status: 'active' }),
        },
      });

      const { getUsageStats } = await import('./quota');
      const stats = await getUsageStats(user.id);

      expect(stats).toEqual({
        used: 0,
        limit: 15, // Free tier default
        remaining: 15,
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
      });

      // Verify tracking was created
      const usage = await prisma.usageTracking.findUnique({
        where: { userId: user.id },
      });
      expect(usage).not.toBeNull();
    });
  });

  describe('resetQuotaForNewPeriod', () => {
    it('should reset quota when period has expired', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user with expired period
      const expiredPeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const user = await prisma.user.create({
        data: {
          id: 'quota-test-reset',
          email: 'quota-reset@test.com',
          displayName: 'Reset User',
          usage: {
            create: {
              periodStart: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
              periodEnd: expiredPeriodEnd,
              aiOperationsUsed: 15,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const { hasQuota } = await import('./quota');
      const result = await hasQuota(user.id);

      // Should have quota after reset
      expect(result).toBe(true);

      // Verify period was reset
      const usage = await prisma.usageTracking.findUnique({
        where: { userId: user.id },
      });
      expect(usage?.aiOperationsUsed).toBe(0);
      expect(usage?.periodEnd.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
