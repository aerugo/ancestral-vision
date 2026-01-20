/**
 * Biography V2 Schema Tests
 *
 * Tests for the comprehensive Zod schemas used in agentic biography generation.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-AI007: Biography Requires Source Material
 */
import { describe, it, expect } from 'vitest';
import {
  PersonDetailsSchema,
  NoteSourceSchema,
  EventSourceSchema,
  SourceMaterialSchema,
  RelationshipTypeSchema,
  RelevantFactSchema,
  RelatedContextSchema,
  RelativeInfoSchema,
} from './biography-v2';

describe('Biography V2 Schemas', () => {
  describe('PersonDetailsSchema', () => {
    it('should validate complete person details', () => {
      const valid = {
        personId: 'person-123',
        givenName: 'John',
        surname: 'Smith',
        displayName: 'John Smith',
        gender: 'MALE',
        birthDate: { type: 'exact', year: 1920 },
        deathDate: { type: 'exact', year: 2000 },
        birthPlace: { name: 'London, UK' },
        deathPlace: { name: 'Manchester, UK' },
      };
      expect(PersonDetailsSchema.safeParse(valid).success).toBe(true);
    });

    it('should allow minimal person details', () => {
      const minimal = {
        personId: 'person-123',
        givenName: 'John',
        displayName: 'John',
      };
      expect(PersonDetailsSchema.safeParse(minimal).success).toBe(true);
    });

    it('should reject person details without required fields', () => {
      const invalid = {
        personId: 'person-123',
        // missing givenName and displayName
      };
      expect(PersonDetailsSchema.safeParse(invalid).success).toBe(false);
    });

    it('should validate all gender options', () => {
      const genders = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
      for (const gender of genders) {
        const valid = {
          personId: 'person-123',
          givenName: 'Test',
          displayName: 'Test',
          gender,
        };
        expect(PersonDetailsSchema.safeParse(valid).success).toBe(true);
      }
    });
  });

  describe('NoteSourceSchema', () => {
    it('should validate note with all fields', () => {
      const valid = {
        noteId: 'note-123',
        title: 'Early Life',
        content: 'John was born on a farm in rural England...',
        createdAt: new Date().toISOString(),
      };
      expect(NoteSourceSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate note without optional title', () => {
      const valid = {
        noteId: 'note-123',
        content: 'Some note content here',
        createdAt: new Date().toISOString(),
      };
      expect(NoteSourceSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject note without content', () => {
      const invalid = {
        noteId: 'note-123',
        title: 'Empty Note',
        createdAt: new Date().toISOString(),
        // missing content
      };
      expect(NoteSourceSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('EventSourceSchema', () => {
    it('should validate event with all fields', () => {
      const valid = {
        eventId: 'event-123',
        title: 'Marriage',
        description: 'Married Mary Jones at St. Paul Church',
        date: { type: 'exact', year: 1945, month: 6, day: 15 },
        location: { name: 'London, UK' },
        participants: [
          { personId: 'person-1', displayName: 'John Smith' },
          { personId: 'person-2', displayName: 'Mary Jones' },
        ],
      };
      expect(EventSourceSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate minimal event', () => {
      const minimal = {
        eventId: 'event-123',
        title: 'Birth',
      };
      expect(EventSourceSchema.safeParse(minimal).success).toBe(true);
    });

    it('should validate event with date only', () => {
      const valid = {
        eventId: 'event-123',
        title: 'Birth',
        date: { type: 'exact', year: 1920 },
      };
      expect(EventSourceSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject event without title', () => {
      const invalid = {
        eventId: 'event-123',
        // missing title
      };
      expect(EventSourceSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('SourceMaterialSchema (INV-AI007)', () => {
    const validPersonDetails = {
      personId: 'person-123',
      givenName: 'John',
      displayName: 'John',
    };

    const validNote = {
      noteId: 'note-1',
      title: 'Note',
      content: 'Some content',
      createdAt: new Date().toISOString(),
    };

    const validEvent = {
      eventId: 'event-1',
      title: 'Birth',
      date: { type: 'exact', year: 1920 },
    };

    it('should reject when both notes AND events are empty (INV-AI007)', () => {
      const invalid = {
        personDetails: validPersonDetails,
        notes: [],
        events: [],
      };
      const result = SourceMaterialSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('INV-AI007');
      }
    });

    it('should accept with at least one note', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [validNote],
        events: [],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept with at least one event', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [],
        events: [validEvent],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept with both notes and events', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [validNote],
        events: [validEvent],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept with multiple notes', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [
          { ...validNote, noteId: 'note-1' },
          { ...validNote, noteId: 'note-2' },
          { ...validNote, noteId: 'note-3' },
        ],
        events: [],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept with multiple events', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [],
        events: [
          { ...validEvent, eventId: 'event-1', title: 'Birth' },
          { ...validEvent, eventId: 'event-2', title: 'Marriage' },
        ],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('RelationshipTypeSchema', () => {
    it('should validate all relationship types', () => {
      const types = ['parent', 'child', 'sibling', 'spouse', 'coparent'];
      for (const type of types) {
        expect(RelationshipTypeSchema.safeParse(type).success).toBe(true);
      }
    });

    it('should reject invalid relationship types', () => {
      expect(RelationshipTypeSchema.safeParse('cousin').success).toBe(false);
      expect(RelationshipTypeSchema.safeParse('uncle').success).toBe(false);
    });
  });

  describe('RelevantFactSchema', () => {
    it('should validate fact with all fields', () => {
      const valid = {
        fact: 'John was present at the wedding',
        source: 'note',
        sourceId: 'note-123',
        relevanceReason: 'Directly mentions John as a participant',
      };
      expect(RelevantFactSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate fact without optional sourceId', () => {
      const valid = {
        fact: 'John grew up on the same farm',
        source: 'biography',
        relevanceReason: 'Describes shared childhood environment',
      };
      expect(RelevantFactSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate all source types', () => {
      const sources = ['biography', 'note', 'event'];
      for (const source of sources) {
        const valid = {
          fact: 'Some fact',
          source,
          relevanceReason: 'Some reason',
        };
        expect(RelevantFactSchema.safeParse(valid).success).toBe(true);
      }
    });

    it('should reject empty fact', () => {
      const invalid = {
        fact: '',
        source: 'note',
        relevanceReason: 'Some reason',
      };
      expect(RelevantFactSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject empty relevanceReason', () => {
      const invalid = {
        fact: 'Some fact',
        source: 'note',
        relevanceReason: '',
      };
      expect(RelevantFactSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('RelatedContextSchema', () => {
    it('should validate related context with facts', () => {
      const valid = {
        relationshipType: 'parent',
        personId: 'person-456',
        personName: 'James Smith',
        relevantFacts: [
          {
            fact: 'James was a carpenter who taught his trade',
            source: 'biography',
            relevanceReason: 'John likely learned carpentry from his father',
          },
        ],
      };
      expect(RelatedContextSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate related context with empty facts', () => {
      const valid = {
        relationshipType: 'sibling',
        personId: 'person-789',
        personName: 'Mary Smith',
        relevantFacts: [],
      };
      expect(RelatedContextSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject related context without personId', () => {
      const invalid = {
        relationshipType: 'spouse',
        personName: 'Jane Doe',
        relevantFacts: [],
      };
      expect(RelatedContextSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('RelativeInfoSchema', () => {
    it('should validate relative info with all content', () => {
      const valid = {
        relationshipType: 'parent',
        personId: 'person-456',
        personName: 'James Smith',
        biography: 'James was a carpenter...',
        notes: [
          {
            noteId: 'note-1',
            content: 'Some note content',
            createdAt: new Date().toISOString(),
          },
        ],
        events: [
          {
            eventId: 'event-1',
            title: 'Marriage',
          },
        ],
      };
      expect(RelativeInfoSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate relative info without biography', () => {
      const valid = {
        relationshipType: 'child',
        personId: 'person-789',
        personName: 'John Jr.',
        notes: [],
        events: [],
      };
      expect(RelativeInfoSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject relative info without personName', () => {
      const invalid = {
        relationshipType: 'spouse',
        personId: 'person-123',
        notes: [],
        events: [],
      };
      expect(RelativeInfoSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
