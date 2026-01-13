/**
 * GraphQL Resolvers Tests
 *
 * Tests for all GraphQL resolvers including queries and mutations.
 * Tests are organized by resolver type.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  createTestContext,
  cleanupTestData,
  seedTestUser,
  testPrisma,
  isDatabaseAvailable,
} from '../../../tests/graphql-test-utils';
import { resolvers } from './index';

describe('GraphQL Resolvers', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('Database not available - skipping resolver tests');
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

  describe('Query: me', () => {
    it('should return current user for authenticated request', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context = await createTestContext({
        authenticated: true,
        userId: 'me-test-user',
        email: 'me@test.com',
        displayName: 'Me User',
      });

      const result = await resolvers.Query.me(null, {}, context);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('me-test-user');
      expect(result?.email).toBe('me@test.com');
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.me(null, {}, context);

      expect(result).toBeNull();
    });
  });

  describe('Query: constellation', () => {
    it('should return user constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation } = await seedTestUser('constellation-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.constellation(null, {}, context);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(constellation.id);
    });

    it('should return null for user without constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context = await createTestContext({
        authenticated: true,
        userId: 'no-constellation-user',
      });

      const result = await resolvers.Query.constellation(null, {}, context);

      expect(result).toBeNull();
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.constellation(null, {}, context);

      expect(result).toBeNull();
    });
  });

  describe('Query: person', () => {
    it('should return person by ID in user constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUser('person-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.person(null, { id: people[0]!.id }, context);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(people[0]!.id);
    });

    it('should return null for person in other user constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { people: otherPeople } = await seedTestUser('other-person-user');
      const context = await createTestContext({
        authenticated: true,
        userId: 'different-user-id',
      });

      const result = await resolvers.Query.person(
        null,
        { id: otherPeople[0]!.id },
        context
      );

      expect(result).toBeNull();
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.person(
        null,
        { id: 'some-person-id' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('Query: people', () => {
    it('should return all non-deleted people in constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUser('people-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.people(
        null,
        { includeDeleted: false },
        context
      );

      expect(result.length).toBe(people.length);
    });

    it('should return empty array for user without constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context = await createTestContext({
        authenticated: true,
        userId: 'no-constellation-people-user',
      });

      const result = await resolvers.Query.people(null, {}, context);

      expect(result).toEqual([]);
    });

    it('should return empty array for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.people(null, {}, context);

      expect(result).toEqual([]);
    });
  });

  describe('Mutation: createConstellation', () => {
    it('should create constellation for authenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context = await createTestContext({
        authenticated: true,
        userId: 'create-constellation-user',
      });

      const result = await resolvers.Mutation.createConstellation(
        null,
        { input: { title: 'New Family', description: 'Test description' } },
        context
      );

      expect(result).not.toBeNull();
      expect(result.title).toBe('New Family');
      expect(result.description).toBe('Test description');
    });

    it('should throw error for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.createConstellation(null, { input: { title: 'Test' } }, context)
      ).rejects.toThrow(/authentication/i);
    });

    it('should throw error if user already has constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user } = await seedTestUser('duplicate-constellation-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      await expect(
        resolvers.Mutation.createConstellation(
          null,
          { input: { title: 'Second Constellation' } },
          context
        )
      ).rejects.toThrow(/already/i);
    });
  });

  describe('Mutation: createPerson', () => {
    it('should create person in user constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user } = await seedTestUser('create-person-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createPerson(
        null,
        { input: { givenName: 'John', surname: 'Doe' } },
        context
      );

      expect(result).not.toBeNull();
      expect(result.givenName).toBe('John');
      expect(result.surname).toBe('Doe');
    });

    it('should throw error without authentication', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.createPerson(null, { input: { givenName: 'Test' } }, context)
      ).rejects.toThrow(/authentication/i);
    });

    it('should throw error if user has no constellation', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context = await createTestContext({
        authenticated: true,
        userId: 'no-constellation-create-user',
      });

      await expect(
        resolvers.Mutation.createPerson(null, { input: { givenName: 'Test' } }, context)
      ).rejects.toThrow(/constellation/i);
    });
  });

  describe('Mutation: deletePerson', () => {
    it('should soft delete person (set deletedAt)', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUser('delete-person-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.deletePerson(
        null,
        { id: people[0]!.id },
        context
      );

      expect(result.deletedAt).not.toBeNull();
      expect(result.deletedBy).toBe(user.id);

      // Verify still in database
      const dbPerson = await testPrisma.person.findUnique({
        where: { id: people[0]!.id },
      });
      expect(dbPerson).not.toBeNull();
    });

    it('should throw error without authentication', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.deletePerson(null, { id: 'some-id' }, context)
      ).rejects.toThrow(/authentication/i);
    });
  });
});
