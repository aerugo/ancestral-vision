/**
 * Person Form Zod Schema (INV-U003)
 *
 * Validation schema for person creation and editing forms.
 * Supports international name formats and flexible date handling.
 */
import { z } from 'zod';

/**
 * Name order options for international name support
 */
export const nameOrderSchema = z.enum([
  'WESTERN',          // Given Surname (John Smith)
  'EASTERN',          // Surname Given (Smith John / 山田太郎)
  'PATRONYMIC',       // Given Patronymic Surname (Ivan Petrovich Sidorov)
  'PATRONYMIC_SUFFIX', // Given Surname Patronymic
  'MATRONYMIC',       // Given Matronymic (Björk Guðmundsdóttir)
]);

/**
 * Gender enum values
 */
const genderValues = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'] as const;

/**
 * Gender options
 */
export const genderSchema = z.enum(genderValues);

/**
 * Flexible date schema for genealogical dates
 * Supports exact, approximate, range, before, and after dates
 */
export const flexibleDateSchema = z.object({
  type: z.enum(['exact', 'approximate', 'range', 'before', 'after']),
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
  day: z.number().min(1).max(31).optional(),
  endYear: z.number().optional(), // For ranges
  endMonth: z.number().min(1).max(12).optional(),
  endDay: z.number().min(1).max(31).optional(),
  isApproximate: z.boolean().optional(),
}).optional();

/**
 * Helper to convert empty strings to undefined for optional fields
 */
const emptyStringToUndefined = (val: unknown) => (val === '' ? undefined : val);

/**
 * Main person form validation schema
 */
export const personFormSchema = z.object({
  // Name fields - givenName is required
  givenName: z.string().min(1, 'Given name is required'),
  surname: z.preprocess(emptyStringToUndefined, z.string().optional()),
  maidenName: z.preprocess(emptyStringToUndefined, z.string().optional()),
  patronymic: z.preprocess(emptyStringToUndefined, z.string().optional()),
  matronymic: z.preprocess(emptyStringToUndefined, z.string().optional()),
  nickname: z.preprocess(emptyStringToUndefined, z.string().optional()),
  suffix: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Name ordering for international support
  nameOrder: nameOrderSchema.default('WESTERN'),

  // Demographics - preprocess to handle empty string from select
  gender: z.preprocess(emptyStringToUndefined, genderSchema.optional()),

  // Dates (flexible format for genealogical research)
  birthDate: flexibleDateSchema,
  deathDate: flexibleDateSchema,

  // Biography with reasonable limit
  biography: z.preprocess(
    emptyStringToUndefined,
    z.string().max(50000, 'Biography cannot exceed 50,000 characters').optional()
  ),

  // Speculative flag for uncertain/theoretical ancestors
  speculative: z.boolean().default(false),
});

/**
 * TypeScript type for form output (after validation/transformation)
 */
export type PersonFormData = z.output<typeof personFormSchema>;

/**
 * TypeScript type for form input (what the form fields receive)
 */
export type PersonFormInput = z.input<typeof personFormSchema>;

/**
 * Type for name order enum
 */
export type NameOrder = z.infer<typeof nameOrderSchema>;

/**
 * Type for gender enum
 */
export type Gender = z.infer<typeof genderSchema>;

/**
 * Type for flexible date
 */
export type FlexibleDate = z.infer<typeof flexibleDateSchema>;
