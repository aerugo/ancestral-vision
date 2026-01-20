/**
 * Biography Eligibility Tests
 *
 * Tests for checking if a person is eligible for biography generation.
 * Eligibility requires at least one note OR one event.
 *
 * Invariants:
 * - INV-AI007: Biography Requires Source Material
 * - INV-S002: Constellation Isolation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockPersonFindFirst, mockNoteCount, mockEventCount } = vi.hoisted(() => ({
  mockPersonFindFirst: vi.fn(),
  mockNoteCount: vi.fn(),
  mockEventCount: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findFirst: mockPersonFindFirst,
    },
    note: {
      count: mockNoteCount,
    },
    event: {
      count: mockEventCount,
    },
  },
}));

// Import after mock setup
import { checkBiographyEligibility } from './eligibility';

describe('checkBiographyEligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: person exists
    mockPersonFindFirst.mockResolvedValue({
      id: 'person-123',
      givenName: 'John',
      displayName: 'John Smith',
    });
  });

  describe('when person has notes', () => {
    it('should return eligible=true', async () => {
      mockNoteCount.mockResolvedValue(3);
      mockEventCount.mockResolvedValue(0);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.eligible).toBe(true);
      expect(result.noteCount).toBe(3);
      expect(result.eventCount).toBe(0);
    });
  });

  describe('when person has events', () => {
    it('should return eligible=true', async () => {
      mockNoteCount.mockResolvedValue(0);
      mockEventCount.mockResolvedValue(5);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.eligible).toBe(true);
      expect(result.noteCount).toBe(0);
      expect(result.eventCount).toBe(5);
    });
  });

  describe('when person has both notes and events', () => {
    it('should return eligible=true', async () => {
      mockNoteCount.mockResolvedValue(2);
      mockEventCount.mockResolvedValue(4);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.eligible).toBe(true);
      expect(result.noteCount).toBe(2);
      expect(result.eventCount).toBe(4);
    });
  });

  describe('when person has no notes or events (INV-AI007)', () => {
    it('should return eligible=false', async () => {
      mockNoteCount.mockResolvedValue(0);
      mockEventCount.mockResolvedValue(0);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.eligible).toBe(false);
      expect(result.noteCount).toBe(0);
      expect(result.eventCount).toBe(0);
    });

    it('should include reason mentioning notes and events', async () => {
      mockNoteCount.mockResolvedValue(0);
      mockEventCount.mockResolvedValue(0);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.reason).toBeDefined();
      expect(result.reason?.toLowerCase()).toContain('note');
      expect(result.reason?.toLowerCase()).toContain('event');
    });

    it('should include helpful guidance for user', async () => {
      mockNoteCount.mockResolvedValue(0);
      mockEventCount.mockResolvedValue(0);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.guidance).toBeDefined();
      expect(result.guidance?.toLowerCase()).toContain('add');
    });
  });

  describe('when person not found (INV-S002)', () => {
    it('should throw error', async () => {
      mockPersonFindFirst.mockResolvedValue(null);

      await expect(
        checkBiographyEligibility('nonexistent', 'user-123')
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('when person exists but not in user constellation (INV-S002)', () => {
    it('should throw same error as not found', async () => {
      // findFirst returns null when constellation owner doesn't match
      mockPersonFindFirst.mockResolvedValue(null);

      await expect(
        checkBiographyEligibility('person-456', 'wrong-user')
      ).rejects.toThrow(/not found|access denied/i);
    });
  });

  describe('personId in result', () => {
    it('should include personId in result', async () => {
      mockNoteCount.mockResolvedValue(1);
      mockEventCount.mockResolvedValue(0);

      const result = await checkBiographyEligibility('person-123', 'user-123');

      expect(result.personId).toBe('person-123');
    });
  });
});
