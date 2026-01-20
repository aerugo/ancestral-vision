/**
 * Biography Schema
 *
 * Zod schemas for validating biography generation inputs and outputs.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation - All AI outputs validated with Zod schemas
 */
import { z } from 'zod';

/**
 * FuzzyDate schema matching the Prisma JSON structure
 */
export const FuzzyDateSchema = z.object({
  type: z.enum(['exact', 'approximate', 'range', 'before', 'after', 'unknown']),
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
  day: z.number().min(1).max(31).optional(),
  endYear: z.number().optional(),
  endMonth: z.number().min(1).max(12).optional(),
  endDay: z.number().min(1).max(31).optional(),
});

/**
 * Place schema matching the Prisma JSON structure
 */
export const PlaceSchema = z.object({
  name: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});

/**
 * Input schema for biography generation
 */
export const BiographyInputSchema = z.object({
  personId: z.string().min(1),
  givenName: z.string().min(1),
  surname: z.string().optional(),
  displayName: z.string().min(1),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  birthDate: FuzzyDateSchema.optional(),
  deathDate: FuzzyDateSchema.optional(),
  birthPlace: PlaceSchema.optional(),
  deathPlace: PlaceSchema.optional(),
  occupation: z.string().optional(),
  maxLength: z.number().positive().optional(),
});

export type BiographyInput = z.infer<typeof BiographyInputSchema>;

/**
 * Output schema for generated biography
 */
export const BiographyOutputSchema = z.object({
  biography: z.string().min(1),
  wordCount: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  sourcesUsed: z.array(z.string()),
});

export type BiographyOutput = z.infer<typeof BiographyOutputSchema>;
