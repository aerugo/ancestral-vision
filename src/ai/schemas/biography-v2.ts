/**
 * Biography V2 Schemas
 *
 * Comprehensive Zod schemas for the agentic biography generation flow.
 * These schemas enforce source material requirements and provide type safety
 * for the multi-step biography generation process.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-AI007: Biography Requires Source Material
 */
import { z } from 'zod';
import { FuzzyDateSchema, PlaceSchema } from './biography';

/**
 * Person details for biography generation.
 * Contains basic biographical information that serves as context.
 */
export const PersonDetailsSchema = z.object({
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
  biography: z.string().optional(), // Existing biography if any
});

export type PersonDetails = z.infer<typeof PersonDetailsSchema>;

/**
 * Note as source material with citation information.
 * Notes are primary sources for biography generation.
 */
export const NoteSourceSchema = z.object({
  noteId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(1),
  createdAt: z.string(), // ISO date string
});

export type NoteSource = z.infer<typeof NoteSourceSchema>;

/**
 * Event participant information for context.
 */
export const EventParticipantSchema = z.object({
  personId: z.string(),
  displayName: z.string(),
});

/**
 * Event as source material with citation information.
 * Events are primary sources for biography generation.
 */
export const EventSourceSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  date: FuzzyDateSchema.optional(),
  location: PlaceSchema.optional(),
  participants: z.array(EventParticipantSchema).optional(),
});

export type EventSource = z.infer<typeof EventSourceSchema>;

/**
 * Complete source material bundle for biography generation.
 *
 * Enforces INV-AI007: At least one note OR one event is required.
 * Biography generation cannot proceed with only person details.
 */
export const SourceMaterialSchema = z
  .object({
    personDetails: PersonDetailsSchema,
    notes: z.array(NoteSourceSchema),
    events: z.array(EventSourceSchema),
  })
  .refine((data) => data.notes.length > 0 || data.events.length > 0, {
    message:
      'Biography generation requires at least one note or event (INV-AI007)',
    path: ['notes', 'events'],
  });

export type SourceMaterial = z.infer<typeof SourceMaterialSchema>;

/**
 * Eligibility check result.
 * Returned by checkBiographyEligibility to indicate if generation can proceed.
 */
export const EligibilityResultSchema = z.object({
  eligible: z.boolean(),
  personId: z.string(),
  noteCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  reason: z.string().optional(),
  guidance: z.string().optional(),
});

export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;

/**
 * Relationship types for related context mining.
 */
export const RelationshipTypeSchema = z.enum([
  'parent',
  'child',
  'sibling',
  'spouse',
  'coparent',
]);

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

/**
 * A relevant fact extracted from a relative's information.
 * Includes source attribution for traceability.
 */
export const RelevantFactSchema = z.object({
  fact: z.string().min(1),
  source: z.enum(['biography', 'note', 'event']),
  // AI may return null for optional fields - convert to undefined
  sourceId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  relevanceReason: z.string().min(1),
});

export type RelevantFact = z.infer<typeof RelevantFactSchema>;

/**
 * Context mined from a related person.
 * Contains facts relevant to the target person with source attribution.
 */
export const RelatedContextSchema = z.object({
  relationshipType: RelationshipTypeSchema,
  personId: z.string().min(1),
  personName: z.string().min(1),
  relevantFacts: z.array(RelevantFactSchema),
});

export type RelatedContext = z.infer<typeof RelatedContextSchema>;

/**
 * Array of related context from multiple relatives.
 */
export const RelatedContextArraySchema = z.array(RelatedContextSchema);

/**
 * Information about a relative for context mining.
 * Includes their content (biography, notes, events) for extraction.
 */
export const RelativeInfoSchema = z.object({
  relationshipType: RelationshipTypeSchema,
  personId: z.string().min(1),
  personName: z.string().min(1),
  biography: z.string().optional(),
  notes: z.array(NoteSourceSchema),
  events: z.array(EventSourceSchema),
});

export type RelativeInfo = z.infer<typeof RelativeInfoSchema>;
