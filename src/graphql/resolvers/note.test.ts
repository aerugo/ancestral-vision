/**
 * Phase 1.4: Note Resolver Tests
 *
 * TDD Tests for note GraphQL operations including:
 * - Query: personNotes
 * - Mutation: createNote
 * - Mutation: updateNote
 * - Mutation: deleteNote
 *
 * Invariants tested:
 * - INV-D001: Note IDs are UUID v4
 * - INV-D005: Soft delete with 30-day recovery
 * - INV-D006: Notes have version history (max 10)
 * - INV-S001: All mutations require authentication
 * - INV-S002: Users can only access their own constellation
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

describe('Note Resolvers', () => {
  let dbAvailable = false;
  let testData: SeedResult;
  let authContext: GraphQLContext;
  let unauthContext: GraphQLContext;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('Database not available - skipping note resolver tests');
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
      testData = await seedTestUser('note-test-user');
      authContext = { user: testData.user };
      unauthContext = { user: null };
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupTestData();
    }
  });

  describe('Query: personNotes', () => {
    it('should return notes for a person', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      // Create test notes
      await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          title: 'Test Note 1',
          content: 'Content 1',
          createdBy: testData.user.id,
        },
      });

      await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          title: 'Test Note 2',
          content: 'Content 2',
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Query.personNotes(
        null,
        { personId: person.id },
        authContext
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe('Test Note 2'); // Ordered by updatedAt desc
      expect(result[1]!.title).toBe('Test Note 1');
    });

    it('should return empty array for unauthenticated user', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          title: 'Test Note',
          content: 'Content',
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Query.personNotes(
        null,
        { personId: person.id },
        unauthContext
      );

      expect(result).toEqual([]);
    });

    it('should exclude deleted notes from queries', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      // Create active note
      await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          title: 'Active Note',
          content: 'Content',
          createdBy: testData.user.id,
        },
      });

      // Create deleted note
      await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          title: 'Deleted Note',
          content: 'Content',
          createdBy: testData.user.id,
          deletedAt: new Date(),
        },
      });

      const result = await resolvers.Query.personNotes(
        null,
        { personId: person.id },
        authContext
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('Active Note');
    });
  });

  describe('Mutation: createNote', () => {
    it('should create a note', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      const result = await resolvers.Mutation.createNote(
        null,
        {
          input: {
            personId: person.id,
            title: 'New Note',
            content: 'This is the note content',
            privacy: 'PRIVATE',
          },
        },
        authContext
      );

      expect(result.id).toBeDefined();
      expect(result.title).toBe('New Note');
      expect(result.content).toBe('This is the note content');
      expect(result.privacy).toBe('PRIVATE');
      expect(result.version).toBe(1);
    });

    it('should require authentication to create note', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      await expect(
        resolvers.Mutation.createNote(
          null,
          {
            input: {
              personId: person.id,
              title: 'Test',
              content: 'Content',
            },
          },
          unauthContext
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should enforce 50,000 character limit', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;
      const longContent = 'x'.repeat(50001);

      await expect(
        resolvers.Mutation.createNote(
          null,
          {
            input: {
              personId: person.id,
              title: 'Test',
              content: longContent,
            },
          },
          authContext
        )
      ).rejects.toThrow('Note content exceeds 50,000 character limit');
    });

    it('should support privacy levels', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      const privateNote = await resolvers.Mutation.createNote(
        null,
        { input: { personId: person.id, content: 'Private', privacy: 'PRIVATE' } },
        authContext
      );
      expect(privateNote.privacy).toBe('PRIVATE');

      const connectionsNote = await resolvers.Mutation.createNote(
        null,
        { input: { personId: person.id, content: 'Connections', privacy: 'CONNECTIONS' } },
        authContext
      );
      expect(connectionsNote.privacy).toBe('CONNECTIONS');

      const publicNote = await resolvers.Mutation.createNote(
        null,
        { input: { personId: person.id, content: 'Public', privacy: 'PUBLIC' } },
        authContext
      );
      expect(publicNote.privacy).toBe('PUBLIC');
    });

    it('should default privacy to PRIVATE', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      const result = await resolvers.Mutation.createNote(
        null,
        { input: { personId: person.id, content: 'Content' } },
        authContext
      );

      expect(result.privacy).toBe('PRIVATE');
    });
  });

  describe('Mutation: updateNote', () => {
    it('should update a note', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;
      const note = await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          title: 'Original',
          content: 'Original content',
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Mutation.updateNote(
        null,
        {
          id: note.id,
          input: {
            title: 'Updated',
            content: 'Updated content',
          },
        },
        authContext
      );

      expect(result.title).toBe('Updated');
      expect(result.content).toBe('Updated content');
    });

    it('should increment version on update', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;
      const note = await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          content: 'Original',
          version: 1,
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Mutation.updateNote(
        null,
        { id: note.id, input: { content: 'Updated' } },
        authContext
      );

      expect(result.version).toBe(2);
    });

    it('should store previous version on update', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;
      const note = await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          content: 'Version 1 content',
          version: 1,
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Mutation.updateNote(
        null,
        { id: note.id, input: { content: 'Version 2 content' } },
        authContext
      );

      expect(result.previousVersions).toBeDefined();
      expect(Array.isArray(result.previousVersions)).toBe(true);
      const versions = result.previousVersions as Array<{ version: number; content: string }>;
      expect(versions[0]!.version).toBe(1);
      expect(versions[0]!.content).toBe('Version 1 content');
    });

    it('should limit to 10 previous versions', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;

      // Create a note with 10 previous versions already
      const existingVersions = Array.from({ length: 10 }, (_, i) => ({
        version: i + 1,
        content: `Version ${i + 1}`,
        updatedAt: new Date().toISOString(),
      }));

      const note = await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          content: 'Version 11 content',
          version: 11,
          previousVersions: existingVersions,
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Mutation.updateNote(
        null,
        { id: note.id, input: { content: 'Version 12 content' } },
        authContext
      );

      const versions = result.previousVersions as Array<{ version: number }>;
      expect(versions.length).toBe(10);
      // Should have versions 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 (oldest version 1 dropped)
      expect(versions[0]!.version).toBe(11);
    });
  });

  describe('Mutation: deleteNote', () => {
    it('should soft delete a note', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;
      const note = await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          content: 'To be deleted',
          createdBy: testData.user.id,
        },
      });

      const result = await resolvers.Mutation.deleteNote(
        null,
        { id: note.id },
        authContext
      );

      expect(result.deletedAt).toBeDefined();
      expect(result.deletedAt).not.toBeNull();

      // Verify in database
      const deletedNote = await testPrisma.note.findUnique({ where: { id: note.id } });
      expect(deletedNote?.deletedAt).not.toBeNull();
    });

    it('should require authentication to delete note', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const person = testData.people[0]!;
      const note = await testPrisma.note.create({
        data: {
          personId: person.id,
          constellationId: testData.constellation.id,
          content: 'Content',
          createdBy: testData.user.id,
        },
      });

      await expect(
        resolvers.Mutation.deleteNote(null, { id: note.id }, unauthContext)
      ).rejects.toThrow('Authentication required');
    });

    it('should not allow deleting notes from other constellations', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create another user with their own constellation and note
      const otherUser = await testPrisma.user.create({
        data: {
          id: 'other-user',
          email: 'other@test.com',
          displayName: 'Other User',
        },
      });

      const otherConstellation = await testPrisma.constellation.create({
        data: {
          ownerId: otherUser.id,
          title: 'Other Constellation',
        },
      });

      const otherPerson = await testPrisma.person.create({
        data: {
          constellationId: otherConstellation.id,
          givenName: 'Other',
          displayName: 'Other Person',
          createdBy: otherUser.id,
        },
      });

      const otherNote = await testPrisma.note.create({
        data: {
          personId: otherPerson.id,
          constellationId: otherConstellation.id,
          content: 'Other content',
          createdBy: otherUser.id,
        },
      });

      await expect(
        resolvers.Mutation.deleteNote(null, { id: otherNote.id }, authContext)
      ).rejects.toThrow('Note not found');
    });
  });
});
