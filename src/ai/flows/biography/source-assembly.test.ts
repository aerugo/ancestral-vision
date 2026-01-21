/**
 * Source Assembly Tests
 *
 * Tests for gathering and structuring source material for biography generation.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-S002: Constellation Isolation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockPersonFindFirst, mockEventFindMany } = vi.hoisted(() => ({
  mockPersonFindFirst: vi.fn(),
  mockEventFindMany: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findFirst: mockPersonFindFirst,
    },
    event: {
      findMany: mockEventFindMany,
    },
  },
}));

// Import after mock setup
import { assembleSourceMaterial } from './source-assembly';
import { SourceMaterialSchema } from '@/ai/schemas/biography';

describe('assembleSourceMaterial', () => {
  const mockPerson = {
    id: 'person-123',
    givenName: 'John',
    surname: 'Smith',
    displayName: 'John Smith',
    gender: 'MALE',
    birthDate: { type: 'exact', year: 1920, month: 5, day: 15 },
    deathDate: { type: 'exact', year: 2000, month: 3, day: 10 },
    birthPlace: { name: 'London, UK' },
    deathPlace: { name: 'Manchester, UK' },
    occupation: null,
    biography: null,
    notes: [],
  };

  const mockNotes = [
    {
      id: 'note-1',
      title: 'Early Life',
      content: 'John was born on a farm...',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'note-2',
      title: 'Career',
      content: 'He worked as a carpenter...',
      createdAt: new Date('2024-01-02'),
    },
  ];

  const mockEvents = [
    {
      id: 'event-1',
      title: 'Marriage',
      description: 'Married Mary Jones',
      date: { type: 'exact', year: 1945, month: 6, day: 15 },
      location: { name: 'London, UK' },
      participants: [
        { person: { id: 'person-123', displayName: 'John Smith' } },
        { person: { id: 'person-456', displayName: 'Mary Jones' } },
      ],
    },
    {
      id: 'event-2',
      title: 'Birth of Son',
      description: 'First child born',
      date: { type: 'exact', year: 1947 },
      location: null,
      participants: [
        { person: { id: 'person-123', displayName: 'John Smith' } },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('person details assembly', () => {
    it('should assemble all person details', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: mockNotes,
      });
      mockEventFindMany.mockResolvedValue([]);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.personDetails.personId).toBe('person-123');
      expect(result.personDetails.givenName).toBe('John');
      expect(result.personDetails.surname).toBe('Smith');
      expect(result.personDetails.displayName).toBe('John Smith');
      expect(result.personDetails.gender).toBe('MALE');
      expect(result.personDetails.birthDate).toEqual({
        type: 'exact',
        year: 1920,
        month: 5,
        day: 15,
      });
    });

    it('should handle person with minimal details', async () => {
      mockPersonFindFirst.mockResolvedValue({
        id: 'person-456',
        givenName: 'Jane',
        surname: null,
        displayName: 'Jane',
        gender: null,
        birthDate: null,
        deathDate: null,
        birthPlace: null,
        deathPlace: null,
        occupation: null,
        biography: null,
        notes: [mockNotes[0]],
      });
      mockEventFindMany.mockResolvedValue([]);

      const result = await assembleSourceMaterial('person-456', 'user-123');

      expect(result.personDetails.personId).toBe('person-456');
      expect(result.personDetails.givenName).toBe('Jane');
      expect(result.personDetails.surname).toBeUndefined();
      expect(result.personDetails.gender).toBeUndefined();
    });
  });

  describe('notes assembly', () => {
    it('should assemble all notes with citation info', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: mockNotes,
      });
      mockEventFindMany.mockResolvedValue([]);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.notes).toHaveLength(2);
      expect(result.notes[0]!.noteId).toBe('note-1');
      expect(result.notes[0]!.title).toBe('Early Life');
      expect(result.notes[0]!.content).toBe('John was born on a farm...');
      expect(result.notes[0]!.createdAt).toBeDefined();
    });

    it('should handle notes without title', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: [{ ...mockNotes[0], title: null }],
      });
      mockEventFindMany.mockResolvedValue([]);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.notes[0]!.title).toBeUndefined();
    });
  });

  describe('events assembly', () => {
    it('should assemble all events with citation info', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: [],
      });
      mockEventFindMany.mockResolvedValue(mockEvents);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.events).toHaveLength(2);
      expect(result.events[0]!.eventId).toBe('event-1');
      expect(result.events[0]!.title).toBe('Marriage');
      expect(result.events[0]!.description).toBe('Married Mary Jones');
    });

    it('should include event participants', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: [],
      });
      mockEventFindMany.mockResolvedValue(mockEvents);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.events[0]!.participants).toHaveLength(2);
      expect(result.events[0]!.participants![0]!.personId).toBe('person-123');
      expect(result.events[0]!.participants![0]!.displayName).toBe('John Smith');
    });

    it('should include event date and location', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: [],
      });
      mockEventFindMany.mockResolvedValue(mockEvents);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.events[0]!.date).toEqual({
        type: 'exact',
        year: 1945,
        month: 6,
        day: 15,
      });
      expect(result.events[0]!.location).toEqual({ name: 'London, UK' });
    });

    it('should handle events without location', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: [],
      });
      mockEventFindMany.mockResolvedValue([mockEvents[1]]);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      expect(result.events[0]!.location).toBeUndefined();
    });
  });

  describe('validation (INV-AI005)', () => {
    it('should return result that validates against SourceMaterialSchema', async () => {
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: mockNotes,
      });
      mockEventFindMany.mockResolvedValue(mockEvents);

      const result = await assembleSourceMaterial('person-123', 'user-123');

      // Should not throw
      const validated = SourceMaterialSchema.parse(result);
      expect(validated).toBeDefined();
    });

    it('should throw validation error for invalid source material', async () => {
      // Person with no notes and no events
      mockPersonFindFirst.mockResolvedValue({
        ...mockPerson,
        notes: [],
      });
      mockEventFindMany.mockResolvedValue([]);

      // Should throw because INV-AI007 requires at least one note or event
      await expect(
        assembleSourceMaterial('person-123', 'user-123')
      ).rejects.toThrow(/INV-AI007|note|event/i);
    });
  });

  describe('access control (INV-S002)', () => {
    it('should throw when person not found', async () => {
      mockPersonFindFirst.mockResolvedValue(null);

      await expect(
        assembleSourceMaterial('nonexistent', 'user-123')
      ).rejects.toThrow(/not found/i);
    });

    it('should throw when person not in user constellation', async () => {
      // findFirst returns null when ownerId doesn't match
      mockPersonFindFirst.mockResolvedValue(null);

      await expect(
        assembleSourceMaterial('person-123', 'wrong-user')
      ).rejects.toThrow(/not found|access denied/i);
    });
  });
});
