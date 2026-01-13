/**
 * Phase 1.8: Onboarding Resolver Tests
 *
 * TDD Tests for onboarding GraphQL operations including:
 * - Query: onboardingProgress
 * - Mutation: startOnboarding
 * - Mutation: updateOnboardingStep
 * - Mutation: completeOnboardingStep
 * - Mutation: saveOnboardingData
 * - Mutation: completeTour
 * - Mutation: skipTour
 * - Mutation: completeOnboarding
 * - Mutation: skipOnboarding
 *
 * Invariants tested:
 * - INV-S001: All mutations require authentication
 * - INV-S002: Users can only access their own data
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  cleanupTestData,
  seedTestUser,
  testPrisma,
  isDatabaseAvailable,
  type SeedResult,
} from '../../../tests/graphql-test-utils';
import { resolvers } from './index';
import type { GraphQLContext } from './index';

describe('Onboarding Resolvers', () => {
  let dbAvailable = false;
  let testData: SeedResult;
  let authContext: GraphQLContext;
  let unauthContext: GraphQLContext;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('Database not available - skipping onboarding resolver tests');
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
      testData = await seedTestUser('onboarding-test-user');
      authContext = { user: testData.user };
      unauthContext = { user: null };
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
    }
  });

  describe('Query: onboardingProgress', () => {
    it('should return null for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Query.onboardingProgress(null, {}, unauthContext);

      expect(result).toBeNull();
    });

    it('should create and return progress if none exists', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Query.onboardingProgress(null, {}, authContext);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('NOT_STARTED');
      expect(result!.currentStep).toBe('TOUR');
      expect(result!.completedSteps).toEqual([]);
      expect(result!.userId).toBe(testData.user.id);
    });

    it('should return existing progress', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create existing progress
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'ADD_PARENTS',
          completedSteps: ['TOUR', 'ADD_SELF'],
        },
      });

      const result = await resolvers.Query.onboardingProgress(null, {}, authContext);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('IN_PROGRESS');
      expect(result!.currentStep).toBe('ADD_PARENTS');
      expect(result!.completedSteps).toContain('TOUR');
      expect(result!.completedSteps).toContain('ADD_SELF');
    });
  });

  describe('Mutation: startOnboarding', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.startOnboarding(null, {}, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should create progress and set status to IN_PROGRESS', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Mutation.startOnboarding(null, {}, authContext);

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.userId).toBe(testData.user.id);
    });

    it('should update existing progress to IN_PROGRESS', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create existing NOT_STARTED progress
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'NOT_STARTED',
        },
      });

      const result = await resolvers.Mutation.startOnboarding(null, {}, authContext);

      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('Mutation: updateOnboardingStep', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.updateOnboardingStep(null, { step: 'ADD_SELF' }, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should update current step', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'TOUR',
        },
      });

      const result = await resolvers.Mutation.updateOnboardingStep(
        null,
        { step: 'ADD_SELF' },
        authContext
      );

      expect(result.currentStep).toBe('ADD_SELF');
    });
  });

  describe('Mutation: completeOnboardingStep', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.completeOnboardingStep(null, { step: 'TOUR' }, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should add step to completedSteps', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'TOUR',
          completedSteps: [],
        },
      });

      const result = await resolvers.Mutation.completeOnboardingStep(
        null,
        { step: 'TOUR' },
        authContext
      );

      expect(result.completedSteps).toContain('TOUR');
    });

    it('should save step data as JSON', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'ADD_SELF',
          completedSteps: ['TOUR'],
        },
      });

      const stepData = { givenName: 'John', surname: 'Doe' };

      const result = await resolvers.Mutation.completeOnboardingStep(
        null,
        { step: 'ADD_SELF', data: stepData },
        authContext
      );

      expect(result.completedSteps).toContain('ADD_SELF');
      expect(result.savedData).toHaveProperty('ADD_SELF');
      expect((result.savedData as Record<string, unknown>).ADD_SELF).toEqual(stepData);
    });

    it('should not duplicate steps in completedSteps', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress with TOUR already completed
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'ADD_SELF',
          completedSteps: ['TOUR'],
        },
      });

      // Complete TOUR again
      const result = await resolvers.Mutation.completeOnboardingStep(
        null,
        { step: 'TOUR' },
        authContext
      );

      // Should only have one TOUR entry
      const tourCount = result.completedSteps.filter((s: string) => s === 'TOUR').length;
      expect(tourCount).toBe(1);
    });
  });

  describe('Mutation: saveOnboardingData', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.saveOnboardingData(null, { data: {} }, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should save arbitrary JSON data', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          savedData: { existing: 'data' },
        },
      });

      const newData = { formData: { name: 'Test' }, preferences: { theme: 'dark' } };

      const result = await resolvers.Mutation.saveOnboardingData(
        null,
        { data: newData },
        authContext
      );

      expect(result.savedData).toHaveProperty('existing', 'data');
      expect(result.savedData).toHaveProperty('formData');
      expect(result.savedData).toHaveProperty('preferences');
    });
  });

  describe('Mutation: completeTour', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.completeTour(null, {}, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should mark tour as completed and advance to ADD_SELF', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'TOUR',
        },
      });

      const result = await resolvers.Mutation.completeTour(null, {}, authContext);

      expect(result.hasCompletedTour).toBe(true);
      expect(result.currentStep).toBe('ADD_SELF');
    });
  });

  describe('Mutation: skipTour', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.skipTour(null, {}, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should mark tour as skipped and advance to ADD_SELF', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'TOUR',
        },
      });

      const result = await resolvers.Mutation.skipTour(null, {}, authContext);

      expect(result.tourSkipped).toBe(true);
      expect(result.currentStep).toBe('ADD_SELF');
    });
  });

  describe('Mutation: completeOnboarding', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.completeOnboarding(null, {}, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should set status to COMPLETED with timestamp', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS', 'ADD_GRANDPARENTS'],
        },
      });

      const result = await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should create self person from savedData.ADD_SELF', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress with saved self data
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe', birthYear: 1990 },
          },
        },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      // Verify person was created
      const people = await testPrisma.person.findMany({
        where: { constellationId: testData.constellation.id },
      });

      expect(people.length).toBe(1);
      expect(people[0]!.givenName).toBe('John');
      expect(people[0]!.surname).toBe('Doe');
    });

    it('should create parents from savedData.ADD_PARENTS', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress with saved self and parent data
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe' },
            ADD_PARENTS: {
              father: { givenName: 'Robert', surname: 'Doe' },
              mother: { givenName: 'Mary', surname: 'Smith' },
            },
          },
        },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      // Verify people were created
      const people = await testPrisma.person.findMany({
        where: { constellationId: testData.constellation.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(people.length).toBe(3);

      // Check self
      expect(people.some((p) => p.givenName === 'John')).toBe(true);

      // Check parents
      expect(people.some((p) => p.givenName === 'Robert')).toBe(true);
      expect(people.some((p) => p.givenName === 'Mary')).toBe(true);
    });

    it('should create parent-child relationships', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe' },
            ADD_PARENTS: {
              father: { givenName: 'Robert', surname: 'Doe' },
              mother: { givenName: 'Mary', surname: 'Smith' },
            },
          },
        },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      // Verify parent-child relationships were created
      const parentChildRels = await testPrisma.parentChildRelationship.findMany({
        where: { constellationId: testData.constellation.id },
      });

      // Should have 2 parent-child relationships (father-child, mother-child)
      expect(parentChildRels.length).toBe(2);
    });

    it('should create spouse relationship for parents', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe' },
            ADD_PARENTS: {
              father: { givenName: 'Robert', surname: 'Doe' },
              mother: { givenName: 'Mary', surname: 'Smith' },
            },
          },
        },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      // Verify spouse relationship was created
      const spouseRels = await testPrisma.spouseRelationship.findMany({
        where: { constellationId: testData.constellation.id },
      });

      expect(spouseRels.length).toBe(1);
    });

    it('should handle missing optional parent data gracefully', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Only father provided, no mother
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe' },
            ADD_PARENTS: {
              father: { givenName: 'Robert', surname: 'Doe' },
              // mother not provided
            },
          },
        },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      const people = await testPrisma.person.findMany({
        where: { constellationId: testData.constellation.id },
      });

      // Should have self + father = 2 people
      expect(people.length).toBe(2);
    });

    it('should skip people with empty givenName', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe' },
            ADD_PARENTS: {
              father: { givenName: '', surname: '' }, // Empty - should skip
              mother: { givenName: 'Mary', surname: 'Smith' },
            },
          },
        },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      const people = await testPrisma.person.findMany({
        where: { constellationId: testData.constellation.id },
      });

      // Should have self + mother = 2 people (father skipped due to empty name)
      expect(people.length).toBe(2);
    });

    it('should be idempotent - not create duplicates on retry', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'AHA_MOMENT',
          completedSteps: ['TOUR', 'ADD_SELF'],
          savedData: {
            ADD_SELF: { givenName: 'John', surname: 'Doe' },
          },
        },
      });

      // Complete twice
      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      // Reset status to allow second completion
      await testPrisma.onboardingProgress.update({
        where: { userId: testData.user.id },
        data: { status: 'IN_PROGRESS' },
      });

      await resolvers.Mutation.completeOnboarding(null, {}, authContext);

      const people = await testPrisma.person.findMany({
        where: { constellationId: testData.constellation.id },
      });

      // Should still only have 1 person
      expect(people.length).toBe(1);
    });
  });

  describe('Mutation: skipOnboarding', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.skipOnboarding(null, {}, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should set status to SKIPPED with timestamp', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create progress first
      await testPrisma.onboardingProgress.create({
        data: {
          userId: testData.user.id,
          status: 'IN_PROGRESS',
          currentStep: 'TOUR',
        },
      });

      const result = await resolvers.Mutation.skipOnboarding(null, {}, authContext);

      expect(result.status).toBe('SKIPPED');
      expect(result.completedAt).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});
