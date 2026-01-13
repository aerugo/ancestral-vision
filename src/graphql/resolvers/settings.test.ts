/**
 * Phase 1.9: Settings Resolver Tests
 *
 * TDD Tests for settings GraphQL operations including:
 * - Query: userSettings
 * - Mutation: updateProfile
 * - Mutation: updatePreferences
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

describe('Settings Resolvers', () => {
  let dbAvailable = false;
  let testData: SeedResult;
  let authContext: GraphQLContext;
  let unauthContext: GraphQLContext;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('Database not available - skipping settings resolver tests');
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
      testData = await seedTestUser('settings-test-user');
      authContext = { user: testData.user };
      unauthContext = { user: null };
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
    }
  });

  describe('Query: userSettings', () => {
    it('should return null for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Query.userSettings(null, {}, unauthContext);

      expect(result).toBeNull();
    });

    it('should return user settings for authenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Query.userSettings(null, {}, authContext);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(testData.user.id);
      expect(result!.email).toBe(testData.user.email);
      expect(result!.displayName).toBe(testData.user.displayName);
      expect(result!.preferences).toBeDefined();
    });

    it('should return preferences with theme', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Query.userSettings(null, {}, authContext);

      expect(result!.preferences).toHaveProperty('theme');
      expect(['dark', 'light', 'system']).toContain(result!.preferences.theme);
    });

    it('should return preferences with defaultPrivacy', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Query.userSettings(null, {}, authContext);

      expect(result!.preferences).toHaveProperty('defaultPrivacy');
      expect(['private', 'connections', 'public']).toContain(
        result!.preferences.defaultPrivacy
      );
    });
  });

  describe('Mutation: updateProfile', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.updateProfile(
          null,
          { input: { displayName: 'New Name' } },
          unauthContext
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should update display name', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Mutation.updateProfile(
        null,
        { input: { displayName: 'Updated Name' } },
        authContext
      );

      expect(result.displayName).toBe('Updated Name');

      // Verify persisted
      const user = await testPrisma.user.findUnique({
        where: { id: testData.user.id },
      });
      expect(user?.displayName).toBe('Updated Name');
    });

    it('should update avatar URL', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const avatarUrl = 'https://example.com/avatar.jpg';

      const result = await resolvers.Mutation.updateProfile(
        null,
        { input: { avatarUrl } },
        authContext
      );

      expect(result.avatarUrl).toBe(avatarUrl);
    });

    it('should reject empty display name', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.updateProfile(
          null,
          { input: { displayName: '' } },
          authContext
        )
      ).rejects.toThrow('Display name cannot be empty');
    });

    it('should reject display name that is too long', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const longName = 'a'.repeat(101);

      await expect(
        resolvers.Mutation.updateProfile(
          null,
          { input: { displayName: longName } },
          authContext
        )
      ).rejects.toThrow('Display name cannot exceed 100 characters');
    });
  });

  describe('Mutation: updatePreferences', () => {
    it('should throw for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.updatePreferences(
          null,
          { input: { theme: 'light' } },
          unauthContext
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should update theme preference', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Mutation.updatePreferences(
        null,
        { input: { theme: 'light' } },
        authContext
      );

      expect(result.preferences.theme).toBe('light');
    });

    it('should update default privacy preference', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Mutation.updatePreferences(
        null,
        { input: { defaultPrivacy: 'public' } },
        authContext
      );

      expect(result.preferences.defaultPrivacy).toBe('public');
    });

    it('should update email notifications preference', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Mutation.updatePreferences(
        null,
        { input: { emailNotifications: false } },
        authContext
      );

      expect(result.preferences.emailNotifications).toBe(false);
    });

    it('should update email digest frequency', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await resolvers.Mutation.updatePreferences(
        null,
        { input: { emailDigestFrequency: 'weekly' } },
        authContext
      );

      expect(result.preferences.emailDigestFrequency).toBe('weekly');
    });

    it('should reject invalid theme value', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.updatePreferences(
          null,
          { input: { theme: 'invalid' as any } },
          authContext
        )
      ).rejects.toThrow('Invalid theme value');
    });

    it('should reject invalid privacy value', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      await expect(
        resolvers.Mutation.updatePreferences(
          null,
          { input: { defaultPrivacy: 'invalid' as any } },
          authContext
        )
      ).rejects.toThrow('Invalid privacy value');
    });

    it('should preserve other preferences when updating one', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // First update theme
      await resolvers.Mutation.updatePreferences(
        null,
        { input: { theme: 'light' } },
        authContext
      );

      // Then update privacy - theme should be preserved
      const result = await resolvers.Mutation.updatePreferences(
        null,
        { input: { defaultPrivacy: 'public' } },
        authContext
      );

      expect(result.preferences.theme).toBe('light');
      expect(result.preferences.defaultPrivacy).toBe('public');
    });
  });
});
