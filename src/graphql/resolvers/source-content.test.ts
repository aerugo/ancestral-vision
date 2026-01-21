/**
 * Source Content Resolver Tests
 *
 * TDD tests for fetching source content (notes, events, biographies)
 * for display in the citation modal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sourceContentQueries } from './source-content-resolvers';
import { prisma } from '@/lib/prisma';
import type { GraphQLContext } from './utils';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    constellation: { findUnique: vi.fn() },
    note: { findFirst: vi.fn() },
    event: { findFirst: vi.fn() },
    person: { findFirst: vi.fn() },
  },
}));

// Test helper to create context
const createContext = (userId?: string): GraphQLContext => ({
  user: userId ? { id: userId, email: 'test@example.com' } : null,
});

describe('sourceContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('returns null when not authenticated', async () => {
      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Note', id: 'note-1' },
        createContext()
      );

      expect(result).toBeNull();
    });

    it('returns null when user has no constellation', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue(null);

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Note', id: 'note-1' },
        createContext('user-1')
      );

      expect(result).toBeNull();
    });
  });

  describe('Note content', () => {
    it('returns note content when found', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockNote = {
        id: 'note-1',
        personId: 'person-1',
        constellationId: 'const-1',
        title: 'Birth Record',
        content: 'Born in 1920',
        privacy: 'PRIVATE',
        version: 1,
        previousVersions: null,
        referencedPersonIds: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };
      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote);

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Note', id: 'note-1' },
        createContext('user-1')
      );

      expect(result).toEqual({
        __typename: 'NoteContent',
        id: 'note-1',
        title: 'Birth Record',
        content: 'Born in 1920',
        privacy: 'PRIVATE',
        createdAt: mockNote.createdAt,
        updatedAt: mockNote.updatedAt,
      });
    });

    it('returns null for non-existent note', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Note', id: 'nonexistent' },
        createContext('user-1')
      );

      expect(result).toBeNull();
    });

    it('enforces constellation-scoped access for notes', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      await sourceContentQueries.sourceContent(
        null,
        { type: 'Note', id: 'note-1' },
        createContext('user-1')
      );

      expect(prisma.note.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'note-1',
          constellationId: 'const-1',
          deletedAt: null,
        },
      });
    });
  });

  describe('Event content', () => {
    it('returns event content when found', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockEvent = {
        id: 'event-1',
        constellationId: 'const-1',
        primaryPersonId: 'person-1',
        title: 'Marriage',
        description: 'Married Jane in 1945',
        icon: null,
        date: { type: 'exact', year: 1945, month: 6, day: 15 },
        location: { name: 'New York' },
        privacy: 'PRIVATE',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        participants: [
          { id: 'p1', personId: 'person-2', eventId: 'event-1', person: { id: 'person-2', givenName: 'Jane', surname: 'Doe' } },
        ],
      };
      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent as never);

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Event', id: 'event-1' },
        createContext('user-1')
      );

      expect(result).toEqual({
        __typename: 'EventContent',
        id: 'event-1',
        title: 'Marriage',
        description: 'Married Jane in 1945',
        date: { type: 'exact', year: 1945, month: 6, day: 15 },
        location: { name: 'New York' },
        participants: [{ id: 'person-2', displayName: 'Jane Doe' }],
        createdAt: mockEvent.createdAt,
      });
    });

    it('enforces constellation-scoped access for events', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

      await sourceContentQueries.sourceContent(
        null,
        { type: 'Event', id: 'event-1' },
        createContext('user-1')
      );

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'event-1',
          constellationId: 'const-1',
          deletedAt: null,
        },
        include: {
          participants: {
            include: { person: true },
          },
        },
      });
    });
  });

  describe('Biography content', () => {
    it('returns biography content when found', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPerson = {
        id: 'person-1',
        constellationId: 'const-1',
        givenName: 'John',
        surname: 'Doe',
        biography: 'John was a farmer...',
        deletedAt: null,
      };
      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as never);

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Biography', id: 'person-1' },
        createContext('user-1')
      );

      expect(result).toEqual({
        __typename: 'BiographyContent',
        id: 'person-1',
        personName: 'John Doe',
        biography: 'John was a farmer...',
      });
    });

    it('returns null for person without biography', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPerson = {
        id: 'person-1',
        constellationId: 'const-1',
        givenName: 'John',
        surname: null,
        biography: null,
        deletedAt: null,
      };
      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as never);

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Biography', id: 'person-1' },
        createContext('user-1')
      );

      // Returns content even with null biography (shows person exists)
      expect(result).toEqual({
        __typename: 'BiographyContent',
        id: 'person-1',
        personName: 'John',
        biography: null,
      });
    });

    it('enforces constellation-scoped access for biographies', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      await sourceContentQueries.sourceContent(
        null,
        { type: 'Biography', id: 'person-1' },
        createContext('user-1')
      );

      expect(prisma.person.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'person-1',
          constellationId: 'const-1',
          deletedAt: null,
        },
      });
    });
  });

  describe('invalid type', () => {
    it('returns null for unknown source type', async () => {
      vi.mocked(prisma.constellation.findUnique).mockResolvedValue({
        id: 'const-1',
        title: 'Test',
        userId: 'user-1',
        description: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await sourceContentQueries.sourceContent(
        null,
        { type: 'Unknown' as 'Note', id: 'some-id' },
        createContext('user-1')
      );

      expect(result).toBeNull();
    });
  });
});
