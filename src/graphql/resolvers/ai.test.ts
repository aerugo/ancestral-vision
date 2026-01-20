/**
 * AI GraphQL Resolver Tests
 *
 * Tests for AI-related GraphQL queries and mutations including
 * quota checking and usage tracking.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check
 * - INV-AI002: AI Operations Must Track Usage
 * - INV-AI003: AI Suggestions Require User Approval
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import {
  createTestContext,
  cleanupTestData,
  testPrisma,
  isDatabaseAvailable,
} from '../../../tests/graphql-test-utils';

// Mock the biography flow to avoid needing API keys in tests
vi.mock('../../ai/flows/biography', () => ({
  generateBiography: vi.fn().mockResolvedValue({
    biography: 'John Smith was born on May 15, 1920. He lived a full and meaningful life.',
    wordCount: 12,
    confidence: 0.75,
    sourcesUsed: ['birthDate', 'gender'],
  }),
}));

describe('AI GraphQL Resolvers', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('Database not available - skipping AI resolver tests');
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
    }
  });

  describe('Query: aiUsage', () => {
    it('should return current AI usage statistics', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user with usage tracking
      const user = await testPrisma.user.create({
        data: {
          id: 'ai-usage-test-user',
          email: 'ai-usage@test.com',
          displayName: 'AI Usage User',
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

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');
      const result = await resolvers.Query.aiUsage(null, {}, context);

      expect(result).toEqual({
        used: 5,
        limit: 15,
        remaining: 10,
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
      });
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const { resolvers } = await import('./index');
      const result = await resolvers.Query.aiUsage(null, {}, context);

      expect(result).toBeNull();
    });

    it('should create usage tracking if not exists', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user without usage tracking
      const user = await testPrisma.user.create({
        data: {
          id: 'ai-no-usage-test-user',
          email: 'ai-no-usage@test.com',
          displayName: 'No Usage User',
        },
      });

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');
      const result = await resolvers.Query.aiUsage(null, {}, context);

      expect(result).not.toBeNull();
      expect(result?.used).toBe(0);
      expect(result?.limit).toBe(15); // Free tier default
    });
  });

  describe('Quota Enforcement (INV-AI001)', () => {
    it('should reject mutation when quota exhausted', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user with exhausted quota
      const user = await testPrisma.user.create({
        data: {
          id: 'ai-quota-exhausted-user',
          email: 'ai-quota-exhausted@test.com',
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

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');

      // Any AI mutation should throw QuotaExceededError
      await expect(
        resolvers.Mutation.checkAIQuota(null, {}, context)
      ).rejects.toThrow(/quota/i);
    });

    it('should return remaining quota in response', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user with available quota
      const user = await testPrisma.user.create({
        data: {
          id: 'ai-quota-available-user',
          email: 'ai-quota-available@test.com',
          displayName: 'Quota Available User',
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

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');
      const result = await resolvers.Mutation.checkAIQuota(null, {}, context);

      // Note: remaining is 9 because checkAIQuota consumes one operation
      // Started with 5 used, 15 limit = 10 remaining, minus 1 consumed = 9
      expect(result).toEqual({
        hasQuota: true,
        remaining: 9,
      });
    });
  });

  describe('Usage Tracking (INV-AI002)', () => {
    it('should increment usage after AI operation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user with available quota
      const user = await testPrisma.user.create({
        data: {
          id: 'ai-usage-track-user',
          email: 'ai-usage-track@test.com',
          displayName: 'Usage Track User',
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

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');

      // Simulate an AI operation that consumes quota
      await resolvers.Mutation.checkAIQuota(null, {}, context);

      // Verify usage was incremented
      const usage = await testPrisma.usageTracking.findUnique({
        where: { userId: user.id },
      });
      expect(usage?.aiOperationsUsed).toBe(6);
    });
  });

  describe('Mutation: generateBiography (INV-AI003)', () => {
    it('should create AI suggestion for biography', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user with constellation and person
      const user = await testPrisma.user.create({
        data: {
          id: 'ai-bio-test-user',
          email: 'ai-bio@test.com',
          displayName: 'Bio Test User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 0,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const constellation = await testPrisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Test Family',
        },
      });

      const person = await testPrisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'John',
          surname: 'Smith',
          displayName: 'John Smith',
          gender: 'MALE',
          birthDate: { type: 'exact', year: 1920, month: 5, day: 15 },
          deathDate: { type: 'exact', year: 2000, month: 3, day: 10 },
          createdBy: user.id,
        },
      });

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');
      const result = await resolvers.Mutation.generateBiography(
        null,
        { personId: person.id },
        context
      );

      expect(result).toBeDefined();
      expect(result.suggestionId).toBeDefined();
      expect(result.biography).toBeDefined();
      expect(result.biography.length).toBeGreaterThan(0);
    });

    it('should not modify profile directly (INV-AI003)', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await testPrisma.user.create({
        data: {
          id: 'ai-bio-nomod-user',
          email: 'ai-bio-nomod@test.com',
          displayName: 'No Mod User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 0,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const constellation = await testPrisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'No Mod Family',
        },
      });

      const person = await testPrisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Jane',
          surname: 'Doe',
          displayName: 'Jane Doe',
          biography: null, // No existing biography
          createdBy: user.id,
        },
      });

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');
      await resolvers.Mutation.generateBiography(
        null,
        { personId: person.id },
        context
      );

      // Verify the person's biography was NOT modified
      const updatedPerson = await testPrisma.person.findUnique({
        where: { id: person.id },
      });
      expect(updatedPerson?.biography).toBeNull();
    });

    it('should return suggestion ID for approval workflow', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await testPrisma.user.create({
        data: {
          id: 'ai-bio-suggestion-user',
          email: 'ai-bio-suggestion@test.com',
          displayName: 'Suggestion User',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 0,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const constellation = await testPrisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Suggestion Family',
        },
      });

      const person = await testPrisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Bob',
          displayName: 'Bob',
          createdBy: user.id,
        },
      });

      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const { resolvers } = await import('./index');
      const result = await resolvers.Mutation.generateBiography(
        null,
        { personId: person.id },
        context
      );

      // Verify suggestion was created in database
      const suggestion = await testPrisma.aISuggestion.findUnique({
        where: { id: result.suggestionId },
      });

      expect(suggestion).toBeDefined();
      expect(suggestion?.type).toBe('BIOGRAPHY');
      expect(suggestion?.status).toBe('PENDING');
      expect(suggestion?.personId).toBe(person.id);
    });

    it('should reject request for person not in user constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create two different users with their own constellations
      const user1 = await testPrisma.user.create({
        data: {
          id: 'ai-bio-user1',
          email: 'ai-bio-user1@test.com',
          displayName: 'User 1',
          usage: {
            create: {
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              aiOperationsUsed: 0,
              aiOperationsLimit: 15,
            },
          },
        },
      });

      const user2 = await testPrisma.user.create({
        data: {
          id: 'ai-bio-user2',
          email: 'ai-bio-user2@test.com',
          displayName: 'User 2',
        },
      });

      const constellation2 = await testPrisma.constellation.create({
        data: {
          ownerId: user2.id,
          title: 'User 2 Family',
        },
      });

      const person = await testPrisma.person.create({
        data: {
          constellationId: constellation2.id,
          givenName: 'Private',
          displayName: 'Private Person',
          createdBy: user2.id,
        },
      });

      // User 1 tries to generate biography for User 2's person
      const context = await createTestContext({
        authenticated: true,
        userId: user1.id,
      });

      const { resolvers } = await import('./index');

      await expect(
        resolvers.Mutation.generateBiography(null, { personId: person.id }, context)
      ).rejects.toThrow(/not found|unauthorized|access/i);
    });
  });
});
