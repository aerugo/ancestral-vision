/**
 * Onboarding Resolvers
 *
 * GraphQL resolvers for onboarding wizard functionality.
 * Manages user onboarding progress, step completion, and tour tracking.
 *
 * Invariants:
 * - INV-S001: All mutations require authentication
 * - INV-S002: Users can only access their own onboarding data
 */
import { prisma } from '@/lib/prisma';
import { requireAuth, type GraphQLContext } from './utils';
import type { OnboardingProgress, OnboardingStep, OnboardingStatus } from '@prisma/client';

/**
 * Onboarding query resolvers
 */
export const onboardingQueries = {
  /**
   * Get onboarding progress for current user
   * Creates progress record if none exists
   */
  onboardingProgress: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress | null> => {
    if (!context.user) {
      return null;
    }

    // Get or create onboarding progress
    let progress = await prisma.onboardingProgress.findUnique({
      where: { userId: context.user.id },
    });

    if (!progress) {
      progress = await prisma.onboardingProgress.create({
        data: { userId: context.user.id },
      });
    }

    return progress;
  },
};

/**
 * Onboarding mutation resolvers
 */
export const onboardingMutations = {
  /**
   * Start onboarding process
   * Sets status to IN_PROGRESS
   */
  startOnboarding: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    return prisma.onboardingProgress.upsert({
      where: { userId: user.id },
      update: { status: 'IN_PROGRESS' },
      create: { userId: user.id, status: 'IN_PROGRESS' },
    });
  },

  /**
   * Update current onboarding step
   */
  updateOnboardingStep: async (
    _parent: unknown,
    { step }: { step: OnboardingStep },
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: { currentStep: step },
    });
  },

  /**
   * Complete an onboarding step with optional data
   */
  completeOnboardingStep: async (
    _parent: unknown,
    { step, data }: { step: OnboardingStep; data?: unknown },
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    const progress = await prisma.onboardingProgress.findUnique({
      where: { userId: user.id },
    });

    // Build completedSteps array without duplicates
    const completedSteps = [...(progress?.completedSteps || [])];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    // Merge saved data
    const existingData = (progress?.savedData as Record<string, unknown>) || {};
    const savedData = data ? { ...existingData, [step]: data } : existingData;

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: {
        completedSteps,
        savedData,
      },
    });
  },

  /**
   * Save arbitrary onboarding data
   */
  saveOnboardingData: async (
    _parent: unknown,
    { data }: { data: unknown },
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    const progress = await prisma.onboardingProgress.findUnique({
      where: { userId: user.id },
    });

    const existingData = (progress?.savedData as Record<string, unknown>) || {};
    const savedData = { ...existingData, ...(data as Record<string, unknown>) };

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: { savedData },
    });
  },

  /**
   * Mark tour as completed and advance to ADD_SELF
   */
  completeTour: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: {
        hasCompletedTour: true,
        currentStep: 'ADD_SELF',
      },
    });
  },

  /**
   * Skip tour and advance to ADD_SELF
   */
  skipTour: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: {
        tourSkipped: true,
        currentStep: 'ADD_SELF',
      },
    });
  },

  /**
   * Complete the entire onboarding process
   */
  completeOnboarding: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  },

  /**
   * Skip the entire onboarding process
   */
  skipOnboarding: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: {
        status: 'SKIPPED',
        completedAt: new Date(),
      },
    });
  },
};
