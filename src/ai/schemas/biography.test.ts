/**
 * Biography Schema Tests
 *
 * Tests for Zod validation of AI-generated biography outputs.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation - All AI outputs validated with Zod schemas
 */
import { describe, it, expect } from 'vitest';

describe('Biography Schema (INV-AI005)', () => {
  describe('BiographyOutput schema', () => {
    it('should validate a complete biography output', async () => {
      const { BiographyOutputSchema } = await import('./biography');

      const validOutput = {
        biography: 'John Smith was born in 1920 in London. He lived a full life...',
        wordCount: 150,
        confidence: 0.85,
        sourcesUsed: ['birthDate', 'birthPlace', 'deathDate'],
      };

      const result = BiographyOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject biography with empty text', async () => {
      const { BiographyOutputSchema } = await import('./biography');

      const invalidOutput = {
        biography: '',
        wordCount: 0,
        confidence: 0.5,
        sourcesUsed: [],
      };

      const result = BiographyOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject confidence outside 0-1 range', async () => {
      const { BiographyOutputSchema } = await import('./biography');

      const invalidOutput = {
        biography: 'Some text here',
        wordCount: 3,
        confidence: 1.5, // Invalid: > 1
        sourcesUsed: [],
      };

      const result = BiographyOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should require all fields', async () => {
      const { BiographyOutputSchema } = await import('./biography');

      const incompleteOutput = {
        biography: 'Some text',
        // Missing other required fields
      };

      const result = BiographyOutputSchema.safeParse(incompleteOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('BiographyInput schema', () => {
    it('should validate complete person data', async () => {
      const { BiographyInputSchema } = await import('./biography');

      const validInput = {
        personId: 'person-123',
        givenName: 'John',
        surname: 'Smith',
        displayName: 'John Smith',
        gender: 'MALE',
        birthDate: { type: 'exact', year: 1920, month: 5, day: 15 },
        deathDate: { type: 'exact', year: 2000, month: 3, day: 10 },
        birthPlace: { name: 'London, UK' },
        deathPlace: { name: 'Manchester, UK' },
        maxLength: 500,
      };

      const result = BiographyInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields to be omitted', async () => {
      const { BiographyInputSchema } = await import('./biography');

      const minimalInput = {
        personId: 'person-123',
        givenName: 'John',
        displayName: 'John',
      };

      const result = BiographyInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should validate maxLength is positive', async () => {
      const { BiographyInputSchema } = await import('./biography');

      const invalidInput = {
        personId: 'person-123',
        givenName: 'John',
        displayName: 'John',
        maxLength: -100,
      };

      const result = BiographyInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
