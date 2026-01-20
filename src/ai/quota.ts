/**
 * AI Quota Service
 *
 * Manages AI operation quotas and usage tracking for users.
 * Enforces rate limits based on subscription tier.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check - All AI operations must verify quota before execution
 * - INV-AI002: AI Operations Must Track Usage - All AI operations must increment usage counter
 */
import { prisma } from '../lib/prisma';

/** Default quota limits by tier */
const QUOTA_LIMITS = {
  free: 15,
  premium: 100,
} as const;

/**
 * Error thrown when user has exhausted their AI quota
 */
export class QuotaExceededError extends Error {
  constructor(message = 'AI operation quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Usage statistics for a user
 */
export interface UsageStats {
  used: number;
  limit: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Check if user has remaining AI quota.
 * Automatically resets quota if period has expired.
 *
 * @param userId - User ID to check quota for
 * @returns true if user has quota remaining
 */
export async function hasQuota(userId: string): Promise<boolean> {
  const usage = await getOrCreateUsageTracking(userId);

  // Check if period has expired and reset if needed
  if (usage.periodEnd < new Date()) {
    await resetQuotaForNewPeriod(userId);
    return true; // Fresh quota after reset
  }

  return usage.aiOperationsUsed < usage.aiOperationsLimit;
}

/**
 * Get remaining quota for a user.
 *
 * @param userId - User ID to check
 * @returns Number of remaining AI operations
 */
export async function getRemainingQuota(userId: string): Promise<number> {
  const usage = await getOrCreateUsageTracking(userId);

  // Check if period has expired and reset if needed
  if (usage.periodEnd < new Date()) {
    await resetQuotaForNewPeriod(userId);
    const refreshedUsage = await getOrCreateUsageTracking(userId);
    return refreshedUsage.aiOperationsLimit - refreshedUsage.aiOperationsUsed;
  }

  return Math.max(0, usage.aiOperationsLimit - usage.aiOperationsUsed);
}

/**
 * Check quota and consume one operation if available.
 * This is the main entry point for AI operations.
 *
 * @param userId - User ID attempting the operation
 * @throws QuotaExceededError if no quota remaining
 */
export async function checkAndConsumeQuota(userId: string): Promise<void> {
  const canProceed = await hasQuota(userId);

  if (!canProceed) {
    throw new QuotaExceededError();
  }

  // Increment usage counter
  await prisma.usageTracking.update({
    where: { userId },
    data: {
      aiOperationsUsed: { increment: 1 },
    },
  });
}

/**
 * Get usage statistics for a user.
 *
 * @param userId - User ID to get stats for
 * @returns Usage statistics
 */
export async function getUsageStats(userId: string): Promise<UsageStats> {
  const usage = await getOrCreateUsageTracking(userId);

  // Check if period has expired and reset if needed
  if (usage.periodEnd < new Date()) {
    await resetQuotaForNewPeriod(userId);
    const refreshedUsage = await getOrCreateUsageTracking(userId);
    return {
      used: refreshedUsage.aiOperationsUsed,
      limit: refreshedUsage.aiOperationsLimit,
      remaining: refreshedUsage.aiOperationsLimit - refreshedUsage.aiOperationsUsed,
      periodStart: refreshedUsage.periodStart,
      periodEnd: refreshedUsage.periodEnd,
    };
  }

  return {
    used: usage.aiOperationsUsed,
    limit: usage.aiOperationsLimit,
    remaining: Math.max(0, usage.aiOperationsLimit - usage.aiOperationsUsed),
    periodStart: usage.periodStart,
    periodEnd: usage.periodEnd,
  };
}

/**
 * Get or create usage tracking for a user.
 *
 * @param userId - User ID
 * @returns UsageTracking record
 */
async function getOrCreateUsageTracking(userId: string) {
  let usage = await prisma.usageTracking.findUnique({
    where: { userId },
  });

  if (!usage) {
    // Get user's subscription tier to determine limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true },
    });

    const subscription = user?.subscription as { plan?: string } | null;
    const plan = subscription?.plan ?? 'free';
    const limit = plan === 'premium' ? QUOTA_LIMITS.premium : QUOTA_LIMITS.free;

    // Create new usage tracking with current period
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month period

    usage = await prisma.usageTracking.create({
      data: {
        userId,
        periodStart: now,
        periodEnd,
        aiOperationsUsed: 0,
        aiOperationsLimit: limit,
      },
    });
  }

  return usage;
}

/**
 * Reset quota for a new billing period.
 *
 * @param userId - User ID to reset quota for
 */
async function resetQuotaForNewPeriod(userId: string): Promise<void> {
  // Get user's subscription tier to determine limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true },
  });

  const subscription = user?.subscription as { plan?: string } | null;
  const plan = subscription?.plan ?? 'free';
  const limit = plan === 'premium' ? QUOTA_LIMITS.premium : QUOTA_LIMITS.free;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.usageTracking.update({
    where: { userId },
    data: {
      periodStart: now,
      periodEnd,
      aiOperationsUsed: 0,
      aiOperationsLimit: limit,
    },
  });
}
