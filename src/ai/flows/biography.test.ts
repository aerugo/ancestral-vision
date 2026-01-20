/**
 * Biography Flow Tests
 *
 * Tests for the AI biography generation Genkit flow.
 * Uses mocked AI responses for deterministic testing.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check
 * - INV-AI002: AI Operations Must Track Usage
 * - INV-AI005: AI Outputs Use Zod Validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BiographyInput } from '../schemas/biography';

// Create a mock generate function that returns realistic responses
const mockGenerate = vi.fn();

// Mock the genkit module
vi.mock('../genkit', () => ({
  getAI: vi.fn(() => ({
    generate: mockGenerate,
  })),
  getDefaultModel: vi.fn(() => 'gemini-1.5-flash'),
}));

describe('Biography Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to return a default response
    mockGenerate.mockResolvedValue({
      text: 'This is a generated biography for the person. They lived a meaningful life and contributed to their community.',
    });
  });

  describe('generateBiography', () => {
    it('should generate biography from complete profile', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'John Smith was born on May 15, 1920 in London, UK. He lived a full life and passed away on March 10, 2000 in Manchester, UK.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-123',
        givenName: 'John',
        surname: 'Smith',
        displayName: 'John Smith',
        gender: 'MALE',
        birthDate: { type: 'exact', year: 1920, month: 5, day: 15 },
        deathDate: { type: 'exact', year: 2000, month: 3, day: 10 },
        birthPlace: { name: 'London, UK' },
        deathPlace: { name: 'Manchester, UK' },
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      expect(result.biography).toBeDefined();
      expect(typeof result.biography).toBe('string');
      expect(result.biography.length).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle missing birth date gracefully', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Jane Doe passed away in 1990. Her life story remains largely unknown.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-456',
        givenName: 'Jane',
        surname: 'Doe',
        displayName: 'Jane Doe',
        // No birthDate
        deathDate: { type: 'exact', year: 1990 },
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      expect(result.biography).toBeDefined();
      // Should not contain specific birth date since it wasn't provided
      expect(result.sourcesUsed).not.toContain('birthDate');
    });

    it('should handle missing death date gracefully', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Alice was born in 1950. She continues to inspire those around her.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-789',
        givenName: 'Alice',
        displayName: 'Alice',
        birthDate: { type: 'exact', year: 1950 },
        // No deathDate - person may still be alive
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      expect(result.biography).toBeDefined();
      expect(result.sourcesUsed).not.toContain('deathDate');
    });

    it('should include occupation in narrative when provided', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Bob the Builder worked as a Construction Worker throughout his career.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-occ',
        givenName: 'Bob',
        displayName: 'Bob the Builder',
        occupation: 'Construction Worker',
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      expect(result.sourcesUsed).toContain('occupation');
    });

    it('should include locations in narrative when provided', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Carol was born in Paris, France and later moved to New York, USA where she spent her final years.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-loc',
        givenName: 'Carol',
        displayName: 'Carol',
        birthPlace: { name: 'Paris, France' },
        deathPlace: { name: 'New York, USA' },
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      expect(result.sourcesUsed).toContain('birthPlace');
      expect(result.sourcesUsed).toContain('deathPlace');
    });

    it('should respect max length parameter', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Short Bio lived briefly.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-short',
        givenName: 'Short',
        displayName: 'Short Bio',
        maxLength: 50, // Very short
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      // Word count should be roughly within the limit
      expect(result.wordCount).toBeLessThanOrEqual(100); // Allow some flexibility
    });

    it('should validate output with Zod schema (INV-AI005)', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Valid Person had a remarkable journey through life.',
      });

      const { generateBiography } = await import('./biography');
      const { BiographyOutputSchema } = await import('../schemas/biography');

      const input: BiographyInput = {
        personId: 'person-validate',
        givenName: 'Valid',
        displayName: 'Valid Person',
      };

      const result = await generateBiography(input);

      // Result should already be validated, but let's double-check
      const validation = BiographyOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('should return low confidence for minimal data', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Unknown Person. Little is known about their life.',
      });

      const { generateBiography } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-minimal',
        givenName: 'Unknown',
        displayName: 'Unknown Person',
        // No other data
      };

      const result = await generateBiography(input);

      expect(result).toBeDefined();
      // With minimal data, confidence should be lower
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('buildPrompt', () => {
    it('should build appropriate prompt from input', async () => {
      const { buildBiographyPrompt } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-prompt',
        givenName: 'Test',
        surname: 'Person',
        displayName: 'Test Person',
        gender: 'FEMALE',
        birthDate: { type: 'exact', year: 1900 },
      };

      const prompt = buildBiographyPrompt(input);

      expect(prompt).toContain('Test');
      expect(prompt).toContain('Person');
      expect(prompt).toContain('1900');
    });

    it('should handle FuzzyDate formats in prompt', async () => {
      const { buildBiographyPrompt } = await import('./biography');

      const input: BiographyInput = {
        personId: 'person-fuzzy',
        givenName: 'Fuzzy',
        displayName: 'Fuzzy Date Person',
        birthDate: { type: 'approximate', year: 1850 },
      };

      const prompt = buildBiographyPrompt(input);

      expect(prompt).toContain('1850');
      expect(prompt).toMatch(/around|approximately|circa/i);
    });
  });
});
