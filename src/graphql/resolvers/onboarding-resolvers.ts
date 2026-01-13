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
   * Creates Person records from saved onboarding data and establishes relationships
   */
  completeOnboarding: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    // Get current progress with saved data
    const progress = await prisma.onboardingProgress.findUnique({
      where: { userId: user.id },
    });

    // Get user's constellation
    const userWithConstellation = await prisma.user.findUnique({
      where: { id: user.id },
      include: { constellation: true },
    });

    const constellationId = userWithConstellation?.constellationId;

    if (constellationId && progress?.savedData) {
      const savedData = progress.savedData as Record<string, unknown>;

      // Track created people for idempotency check and relationship linking
      type PersonData = { givenName?: string; surname?: string };
      const createdPeople: { id: string; role: string }[] = [];

      // Check if people already exist (idempotency)
      const existingPeople = await prisma.person.findMany({
        where: { constellationId },
      });

      // Only create people if none exist (first completion)
      if (existingPeople.length === 0) {
        // 1. Create self person from ADD_SELF
        const selfData = savedData.ADD_SELF as PersonData | undefined;
        if (selfData?.givenName && selfData.givenName.trim()) {
          const displayName = selfData.surname
            ? `${selfData.givenName} ${selfData.surname}`
            : selfData.givenName;

          const selfPerson = await prisma.person.create({
            data: {
              constellationId,
              givenName: selfData.givenName,
              surname: selfData.surname || null,
              displayName,
              generation: 0, // Self is always generation 0
              createdBy: user.id,
            },
          });
          createdPeople.push({ id: selfPerson.id, role: 'self' });
        }

        // 2. Create parents from ADD_PARENTS
        const parentsData = savedData.ADD_PARENTS as {
          father?: PersonData;
          mother?: PersonData;
        } | undefined;

        let fatherId: string | null = null;
        let motherId: string | null = null;

        if (parentsData?.father?.givenName && parentsData.father.givenName.trim()) {
          const displayName = parentsData.father.surname
            ? `${parentsData.father.givenName} ${parentsData.father.surname}`
            : parentsData.father.givenName;

          const father = await prisma.person.create({
            data: {
              constellationId,
              givenName: parentsData.father.givenName,
              surname: parentsData.father.surname || null,
              displayName,
              generation: -1, // Parents are generation -1
              createdBy: user.id,
            },
          });
          fatherId = father.id;
          createdPeople.push({ id: father.id, role: 'father' });
        }

        if (parentsData?.mother?.givenName && parentsData.mother.givenName.trim()) {
          const displayName = parentsData.mother.surname
            ? `${parentsData.mother.givenName} ${parentsData.mother.surname}`
            : parentsData.mother.givenName;

          const mother = await prisma.person.create({
            data: {
              constellationId,
              givenName: parentsData.mother.givenName,
              surname: parentsData.mother.surname || null,
              displayName,
              generation: -1, // Parents are generation -1
              createdBy: user.id,
            },
          });
          motherId = mother.id;
          createdPeople.push({ id: mother.id, role: 'mother' });
        }

        // 3. Create parent-child relationships
        const selfPerson = createdPeople.find((p) => p.role === 'self');
        if (selfPerson) {
          if (fatherId) {
            await prisma.parentChildRelationship.create({
              data: {
                parentId: fatherId,
                childId: selfPerson.id,
                constellationId,
                createdBy: user.id,
              },
            });
          }
          if (motherId) {
            await prisma.parentChildRelationship.create({
              data: {
                parentId: motherId,
                childId: selfPerson.id,
                constellationId,
                createdBy: user.id,
              },
            });
          }
        }

        // 4. Create spouse relationship between parents if both exist
        if (fatherId && motherId) {
          await prisma.spouseRelationship.create({
            data: {
              person1Id: fatherId,
              person2Id: motherId,
              constellationId,
              createdBy: user.id,
            },
          });
        }
      }
    }

    // Mark onboarding as complete
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
