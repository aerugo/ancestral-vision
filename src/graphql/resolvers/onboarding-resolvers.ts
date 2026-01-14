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
import type { OnboardingProgress, OnboardingStep, OnboardingStatus, Prisma } from '@prisma/client';

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
   * Creates Person records immediately for ADD_SELF, ADD_PARENTS, ADD_GRANDPARENTS (AC33)
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

    // Create people immediately for AC33 (Real-time stars during onboarding)
    if (data && (step === 'ADD_SELF' || step === 'ADD_PARENTS' || step === 'ADD_GRANDPARENTS')) {
      // Get or create constellation
      let constellation = await prisma.constellation.findUnique({
        where: { ownerId: user.id },
      });

      if (!constellation) {
        constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: 'My Family',
          },
        });
      }

      const constellationId = constellation.id;
      type PersonData = { givenName?: string; surname?: string };

      if (step === 'ADD_SELF') {
        const selfData = data as PersonData;
        if (selfData?.givenName && selfData.givenName.trim()) {
          const displayName = selfData.surname
            ? `${selfData.givenName} ${selfData.surname}`
            : selfData.givenName;

          // Check if self already exists
          const existingSelf = await prisma.person.findFirst({
            where: { constellationId, generation: 0 },
          });

          if (!existingSelf) {
            await prisma.person.create({
              data: {
                constellationId,
                givenName: selfData.givenName,
                surname: selfData.surname || null,
                displayName,
                generation: 0,
                createdBy: user.id,
              },
            });
          }
        }
      }

      if (step === 'ADD_PARENTS') {
        const parentsData = data as { father?: PersonData; mother?: PersonData };

        // Get self person for relationship
        const selfPerson = await prisma.person.findFirst({
          where: { constellationId, generation: 0 },
        });

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
              generation: -1,
              createdBy: user.id,
            },
          });
          fatherId = father.id;

          // Create parent-child relationship
          if (selfPerson) {
            await prisma.parentChildRelationship.create({
              data: {
                parentId: fatherId,
                childId: selfPerson.id,
                constellationId,
                createdBy: user.id,
              },
            });
          }
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
              generation: -1,
              createdBy: user.id,
            },
          });
          motherId = mother.id;

          // Create parent-child relationship
          if (selfPerson) {
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

        // Create spouse relationship between parents
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

      if (step === 'ADD_GRANDPARENTS') {
        const grandparentsData = data as Record<string, PersonData>;

        // Map grandparent keys to their parent's role and position
        const grandparentRoles = {
          paternalGrandfather: { generation: -2, side: 'paternal' },
          paternalGrandmother: { generation: -2, side: 'paternal' },
          maternalGrandfather: { generation: -2, side: 'maternal' },
          maternalGrandmother: { generation: -2, side: 'maternal' },
        };

        for (const [key, gp] of Object.entries(grandparentsData)) {
          if (gp?.givenName && gp.givenName.trim()) {
            const role = grandparentRoles[key as keyof typeof grandparentRoles];
            if (!role) continue;

            const displayName = gp.surname
              ? `${gp.givenName} ${gp.surname}`
              : gp.givenName;

            await prisma.person.create({
              data: {
                constellationId,
                givenName: gp.givenName,
                surname: gp.surname || null,
                displayName,
                generation: role.generation,
                createdBy: user.id,
              },
            });
          }
        }
      }
    }

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: {
        completedSteps,
        savedData: savedData as Prisma.InputJsonValue,
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
    const mergedData = { ...existingData, ...(data as Record<string, unknown>) };

    return prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: { savedData: mergedData as Prisma.InputJsonValue },
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
   * People are now created during each step (AC33), so this just marks completion
   */
  completeOnboarding: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<OnboardingProgress> => {
    const user = requireAuth(context);

    // Ensure constellation exists (should have been created during steps)
    let constellation = await prisma.constellation.findUnique({
      where: { ownerId: user.id },
    });

    if (!constellation) {
      constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'My Family',
        },
      });
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
