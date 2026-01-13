/**
 * Phase 1.1: Relationship Resolver Tests
 *
 * TDD Tests for relationship GraphQL operations including:
 * - Query: personRelationships
 * - Mutation: createParentChildRelationship
 * - Mutation: createSpouseRelationship
 * - Mutation: updateParentChildRelationship
 * - Mutation: updateSpouseRelationship
 * - Mutation: deleteParentChildRelationship
 * - Mutation: deleteSpouseRelationship
 * - Person field resolvers: parents, children, spouses
 *
 * Invariants tested:
 * - INV-D001: Relationship IDs are UUID v4
 * - INV-S001: All mutations require authentication
 * - INV-S002: Users can only access their own constellation
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  createTestContext,
  cleanupTestData,
  seedTestUserWithPeople,
  seedTestUser,
  testPrisma,
  isDatabaseAvailable,
} from '../../../tests/graphql-test-utils';
import { resolvers } from './index';

describe('Relationship Resolvers', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('Database not available - skipping relationship resolver tests');
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

  describe('Query: personRelationships', () => {
    it('should return all relationships for a person', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people, person3 } =
        await seedTestUserWithPeople('rel-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      // Create relationships
      await testPrisma.parentChildRelationship.create({
        data: {
          parentId: people[0]!.id,
          childId: people[1]!.id,
          constellationId: constellation.id,
          relationshipType: 'BIOLOGICAL',
          createdBy: user.id,
        },
      });

      await testPrisma.spouseRelationship.create({
        data: {
          person1Id: people[0]!.id,
          person2Id: person3.id,
          constellationId: constellation.id,
          createdBy: user.id,
        },
      });

      const result = await resolvers.Query.personRelationships(
        null,
        { personId: people[0]!.id },
        context
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty array for person with no relationships', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUserWithPeople('no-rel-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.personRelationships(
        null,
        { personId: people[0]!.id },
        context
      );

      expect(result).toEqual([]);
    });

    it('should return empty array for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.personRelationships(
        null,
        { personId: 'any-id' },
        context
      );

      expect(result).toEqual([]);
    });

    it('should throw error for person not in user constellation (INV-S002)', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create two users with separate constellations
      const { people: otherPeople } = await seedTestUser('other-user');
      const context = await createTestContext({
        authenticated: true,
        userId: 'requesting-user',
      });

      await expect(
        resolvers.Query.personRelationships(null, { personId: otherPeople[0]!.id }, context)
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Mutation: createParentChildRelationship', () => {
    it('should create parent-child relationship for authenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUserWithPeople('create-pc-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createParentChildRelationship(
        null,
        {
          input: {
            parentId: people[0]!.id,
            childId: people[1]!.id,
            relationshipType: 'BIOLOGICAL',
          },
        },
        context
      );

      expect(result.parentId).toBe(people[0]!.id);
      expect(result.childId).toBe(people[1]!.id);
      expect(result.relationshipType).toBe('BIOLOGICAL');
    });

    it('should generate UUID for relationship ID (INV-D001)', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUserWithPeople('uuid-pc-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createParentChildRelationship(
        null,
        {
          input: {
            parentId: people[0]!.id,
            childId: people[1]!.id,
            relationshipType: 'BIOLOGICAL',
          },
        },
        context
      );

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should support adoptive relationship type', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUserWithPeople('adoptive-pc-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createParentChildRelationship(
        null,
        {
          input: {
            parentId: people[0]!.id,
            childId: people[1]!.id,
            relationshipType: 'ADOPTIVE',
          },
        },
        context
      );

      expect(result.relationshipType).toBe('ADOPTIVE');
    });

    it('should support optional start and end dates', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people } = await seedTestUserWithPeople('dates-pc-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createParentChildRelationship(
        null,
        {
          input: {
            parentId: people[0]!.id,
            childId: people[1]!.id,
            relationshipType: 'ADOPTIVE',
            startDate: { type: 'exact', year: 2000, month: 6, day: 15 },
            endDate: { type: 'exact', year: 2018, month: 8, day: 1 },
          },
        },
        context
      );

      expect(result.startDate).toEqual({
        type: 'exact',
        year: 2000,
        month: 6,
        day: 15,
      });
      expect(result.endDate).toEqual({
        type: 'exact',
        year: 2018,
        month: 8,
        day: 1,
      });
    });

    it('should throw error for unauthenticated request (INV-S001)', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.createParentChildRelationship(
          null,
          {
            input: {
              parentId: 'any-id',
              childId: 'any-id',
              relationshipType: 'BIOLOGICAL',
            },
          },
          context
        )
      ).rejects.toThrow(/authentication/i);
    });

    it('should throw error when parent is not in user constellation (INV-S002)', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { people: otherPeople } = await seedTestUser('other-parent-user');
      const { user, people } = await seedTestUserWithPeople('own-child-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      await expect(
        resolvers.Mutation.createParentChildRelationship(
          null,
          {
            input: {
              parentId: otherPeople[0]!.id,
              childId: people[0]!.id,
              relationshipType: 'BIOLOGICAL',
            },
          },
          context
        )
      ).rejects.toThrow(/constellation/i);
    });

    it('should throw error when child is not in user constellation (INV-S002)', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { people: otherPeople } = await seedTestUser('other-child-user');
      const { user, people } = await seedTestUserWithPeople('own-parent-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      await expect(
        resolvers.Mutation.createParentChildRelationship(
          null,
          {
            input: {
              parentId: people[0]!.id,
              childId: otherPeople[0]!.id,
              relationshipType: 'BIOLOGICAL',
            },
          },
          context
        )
      ).rejects.toThrow(/constellation/i);
    });
  });

  describe('Mutation: createSpouseRelationship', () => {
    it('should create spouse relationship for authenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people, person3 } = await seedTestUserWithPeople('create-spouse-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createSpouseRelationship(
        null,
        {
          input: {
            person1Id: people[0]!.id,
            person2Id: person3.id,
          },
        },
        context
      );

      expect(result.person1Id).toBe(people[0]!.id);
      expect(result.person2Id).toBe(person3.id);
    });

    it('should support marriage date and place', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, people, person3 } = await seedTestUserWithPeople('marriage-date-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createSpouseRelationship(
        null,
        {
          input: {
            person1Id: people[0]!.id,
            person2Id: person3.id,
            marriageDate: { type: 'exact', year: 2010, month: 9, day: 20 },
            marriagePlace: { city: 'New York', country: 'USA' },
          },
        },
        context
      );

      expect(result.marriageDate).toEqual({
        type: 'exact',
        year: 2010,
        month: 9,
        day: 20,
      });
      expect(result.marriagePlace).toEqual({
        city: 'New York',
        country: 'USA',
      });
    });

    it('should throw error for unauthenticated request (INV-S001)', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.createSpouseRelationship(
          null,
          {
            input: {
              person1Id: 'any-id',
              person2Id: 'any-id',
            },
          },
          context
        )
      ).rejects.toThrow(/authentication/i);
    });
  });

  describe('Mutation: deleteParentChildRelationship', () => {
    it('should delete relationship for owner', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people } = await seedTestUserWithPeople('delete-pc-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      // Create relationship first
      const relationship = await testPrisma.parentChildRelationship.create({
        data: {
          parentId: people[0]!.id,
          childId: people[1]!.id,
          constellationId: constellation.id,
          relationshipType: 'BIOLOGICAL',
          createdBy: user.id,
        },
      });

      const result = await resolvers.Mutation.deleteParentChildRelationship(
        null,
        { id: relationship.id },
        context
      );

      expect(result.id).toBe(relationship.id);

      // Verify deleted
      const found = await testPrisma.parentChildRelationship.findUnique({
        where: { id: relationship.id },
      });
      expect(found).toBeNull();
    });

    it('should throw error for non-existent relationship', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user } = await seedTestUserWithPeople('delete-notfound-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      await expect(
        resolvers.Mutation.deleteParentChildRelationship(
          null,
          { id: '00000000-0000-4000-a000-000000000000' },
          context
        )
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Mutation: deleteSpouseRelationship', () => {
    it('should delete spouse relationship for owner', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people, person3 } =
        await seedTestUserWithPeople('delete-spouse-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      // Create relationship first
      const relationship = await testPrisma.spouseRelationship.create({
        data: {
          person1Id: people[0]!.id,
          person2Id: person3.id,
          constellationId: constellation.id,
          createdBy: user.id,
        },
      });

      const result = await resolvers.Mutation.deleteSpouseRelationship(
        null,
        { id: relationship.id },
        context
      );

      expect(result.id).toBe(relationship.id);

      // Verify deleted
      const found = await testPrisma.spouseRelationship.findUnique({
        where: { id: relationship.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Mutation: updateParentChildRelationship', () => {
    it('should update relationship type', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people } = await seedTestUserWithPeople('update-pc-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      // Create relationship first
      const relationship = await testPrisma.parentChildRelationship.create({
        data: {
          parentId: people[0]!.id,
          childId: people[1]!.id,
          constellationId: constellation.id,
          relationshipType: 'BIOLOGICAL',
          createdBy: user.id,
        },
      });

      const result = await resolvers.Mutation.updateParentChildRelationship(
        null,
        {
          id: relationship.id,
          input: {
            relationshipType: 'ADOPTIVE',
          },
        },
        context
      );

      expect(result.relationshipType).toBe('ADOPTIVE');
    });
  });

  describe('Mutation: updateSpouseRelationship', () => {
    it('should update marriage and divorce dates', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people, person3 } =
        await seedTestUserWithPeople('update-spouse-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      // Create relationship first
      const relationship = await testPrisma.spouseRelationship.create({
        data: {
          person1Id: people[0]!.id,
          person2Id: person3.id,
          constellationId: constellation.id,
          createdBy: user.id,
        },
      });

      const result = await resolvers.Mutation.updateSpouseRelationship(
        null,
        {
          id: relationship.id,
          input: {
            marriageDate: { type: 'exact', year: 2010 },
            divorceDate: { type: 'exact', year: 2020 },
          },
        },
        context
      );

      expect(result.marriageDate).toEqual({ type: 'exact', year: 2010 });
      expect(result.divorceDate).toEqual({ type: 'exact', year: 2020 });
    });
  });

  describe('Person field resolver: parents', () => {
    it('should return parents for a person', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people } = await seedTestUserWithPeople('parents-field-user');

      // Create parent-child relationship
      await testPrisma.parentChildRelationship.create({
        data: {
          parentId: people[0]!.id,
          childId: people[1]!.id,
          constellationId: constellation.id,
          relationshipType: 'BIOLOGICAL',
          createdBy: user.id,
        },
      });

      const child = await testPrisma.person.findUnique({ where: { id: people[1]!.id } });
      const parents = await resolvers.Person.parents(child!);

      expect(parents).toHaveLength(1);
      expect(parents[0]!.id).toBe(people[0]!.id);
    });
  });

  describe('Person field resolver: children', () => {
    it('should return children for a person', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people } = await seedTestUserWithPeople('children-field-user');

      // Create parent-child relationship
      await testPrisma.parentChildRelationship.create({
        data: {
          parentId: people[0]!.id,
          childId: people[1]!.id,
          constellationId: constellation.id,
          relationshipType: 'BIOLOGICAL',
          createdBy: user.id,
        },
      });

      const parent = await testPrisma.person.findUnique({ where: { id: people[0]!.id } });
      const children = await resolvers.Person.children(parent!);

      expect(children).toHaveLength(1);
      expect(children[0]!.id).toBe(people[1]!.id);
    });
  });

  describe('Person field resolver: spouses', () => {
    it('should return spouses for a person', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people, person3 } =
        await seedTestUserWithPeople('spouses-field-user');

      // Create spouse relationship
      await testPrisma.spouseRelationship.create({
        data: {
          person1Id: people[0]!.id,
          person2Id: person3.id,
          constellationId: constellation.id,
          createdBy: user.id,
        },
      });

      const person = await testPrisma.person.findUnique({ where: { id: people[0]!.id } });
      const spouses = await resolvers.Person.spouses(person!);

      expect(spouses).toHaveLength(1);
      expect(spouses[0]!.id).toBe(person3.id);
    });

    it('should return spouse regardless of which side of relationship', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const { user, constellation, people, person3 } =
        await seedTestUserWithPeople('spouses-reverse-user');

      // Create spouse relationship
      await testPrisma.spouseRelationship.create({
        data: {
          person1Id: people[0]!.id,
          person2Id: person3.id,
          constellationId: constellation.id,
          createdBy: user.id,
        },
      });

      const person = await testPrisma.person.findUnique({ where: { id: person3.id } });
      const spouses = await resolvers.Person.spouses(person!);

      expect(spouses).toHaveLength(1);
      expect(spouses[0]!.id).toBe(people[0]!.id);
    });
  });
});
