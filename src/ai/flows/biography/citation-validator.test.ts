/**
 * Citation Validator Tests
 *
 * TDD tests for validating AI-generated citations against source material.
 * Ensures citations reference actual sources that were passed to the AI.
 */
import { describe, it, expect } from 'vitest';
import { validateCitations, ValidationResult } from './citation-validator';
import type { SourceMaterial, RelatedContext } from '@/ai/schemas/biography';

// Test fixtures
const createSourceMaterial = (
  overrides: Partial<SourceMaterial> = {}
): SourceMaterial => ({
  personDetails: {
    personId: 'person-1',
    givenName: 'John',
    displayName: 'John Doe',
  },
  notes: [
    { noteId: 'note-1', title: 'Birth Record', content: 'Born in 1920', createdAt: '2024-01-01' },
    { noteId: 'note-2', title: 'Death Record', content: 'Died in 1990', createdAt: '2024-01-02' },
  ],
  events: [
    { eventId: 'event-1', title: 'Marriage' },
    { eventId: 'event-2', title: 'Graduation' },
  ],
  ...overrides,
});

const createRelatedContext = (): RelatedContext[] => [
  {
    relationshipType: 'parent',
    personId: 'parent-1',
    personName: 'James Doe',
    relevantFacts: [
      { fact: 'Was a farmer', source: 'biography', relevanceReason: 'Occupation context' },
      { fact: 'Lived in Ohio', source: 'note', sourceId: 'parent-note-1', relevanceReason: 'Location' },
    ],
  },
  {
    relationshipType: 'spouse',
    personId: 'spouse-1',
    personName: 'Jane Doe',
    relevantFacts: [
      { fact: 'Married in 1945', source: 'event', sourceId: 'spouse-event-1', relevanceReason: 'Marriage' },
    ],
  },
];

describe('validateCitations', () => {
  describe('Note citations', () => {
    it('validates a correct Note citation', () => {
      const biography = 'Born in 1920 [Note:note-1:Birth Record].';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(1);
      expect(result.invalidCitations).toHaveLength(0);
    });

    it('flags Note citation with non-existent ID', () => {
      const biography = 'Born in 1920 [Note:nonexistent:Birth].';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(false);
      expect(result.invalidCitations).toHaveLength(1);
      expect(result.invalidCitations[0].reason).toContain('not found');
    });

    it('validates multiple Note citations', () => {
      const biography = '[Note:note-1:Birth] and [Note:note-2:Death].';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(2);
    });
  });

  describe('Event citations', () => {
    it('validates a correct Event citation', () => {
      const biography = 'Got married [Event:event-1:Marriage].';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(1);
    });

    it('flags Event citation with non-existent ID', () => {
      const biography = 'Event [Event:fake-event:Something].';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(false);
      expect(result.invalidCitations).toHaveLength(1);
    });
  });

  describe('Biography citations', () => {
    it('validates Biography citation referencing a relative', () => {
      const biography = 'Father was a farmer [Biography:parent-1:parent:occupation].';
      const sources = createSourceMaterial();
      const related = createRelatedContext();

      const result = validateCitations(biography, sources, related);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(1);
    });

    it('flags Biography citation with non-existent person ID', () => {
      const biography = 'From unknown [Biography:unknown-person:parent:fact].';
      const sources = createSourceMaterial();
      const related = createRelatedContext();

      const result = validateCitations(biography, sources, related);

      expect(result.valid).toBe(false);
      expect(result.invalidCitations).toHaveLength(1);
    });
  });

  describe('Mixed citations', () => {
    it('validates a biography with all citation types', () => {
      const biography = `
        Born in 1920 [Note:note-1:Birth Record].
        Got married [Event:event-1:Marriage].
        Father was a farmer [Biography:parent-1:parent:occupation].
      `;
      const sources = createSourceMaterial();
      const related = createRelatedContext();

      const result = validateCitations(biography, sources, related);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(3);
    });

    it('reports all invalid citations', () => {
      const biography = `
        Born [Note:bad-note:Birth].
        Married [Event:bad-event:Wedding].
        Father [Biography:bad-person:parent:fact].
      `;
      const sources = createSourceMaterial();
      const related = createRelatedContext();

      const result = validateCitations(biography, sources, related);

      expect(result.valid).toBe(false);
      expect(result.invalidCitations).toHaveLength(3);
    });

    it('handles mix of valid and invalid citations', () => {
      const biography = `
        Born [Note:note-1:Birth].
        Event [Event:bad-event:Something].
      `;
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(false);
      expect(result.validCitations).toHaveLength(1);
      expect(result.invalidCitations).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('returns valid for text with no citations', () => {
      const biography = 'A biography with no citations.';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(0);
      expect(result.invalidCitations).toHaveLength(0);
    });

    it('handles empty source material', () => {
      const biography = 'Born [Note:note-1:Birth].';
      const sources = createSourceMaterial({ notes: [], events: [] });

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(false);
      expect(result.invalidCitations).toHaveLength(1);
    });

    it('handles duplicate citations gracefully', () => {
      const biography = '[Note:note-1:Birth] and again [Note:note-1:Birth].';
      const sources = createSourceMaterial();

      const result = validateCitations(biography, sources, []);

      expect(result.valid).toBe(true);
      expect(result.validCitations).toHaveLength(2);
    });
  });
});

describe('ValidationResult', () => {
  it('includes citation details in results', () => {
    const biography = 'Born [Note:note-1:Birth Record].';
    const sources = createSourceMaterial();

    const result = validateCitations(biography, sources, []);

    expect(result.validCitations[0].citation.type).toBe('Note');
    expect(result.validCitations[0].citation.id).toBe('note-1');
    expect(result.validCitations[0].citation.label).toBe('Birth Record');
  });

  it('includes helpful reason for invalid citations', () => {
    const biography = 'Born [Note:bad-id:Birth].';
    const sources = createSourceMaterial();

    const result = validateCitations(biography, sources, []);

    expect(result.invalidCitations[0].reason).toBeTruthy();
    expect(result.invalidCitations[0].citation.id).toBe('bad-id');
  });
});
