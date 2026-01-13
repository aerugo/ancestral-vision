/**
 * Date Utilities (INV-D007: GEDCOM-style flexible dates)
 *
 * Parses, formats, and validates fuzzy dates for genealogical data.
 * Supports exact dates, approximate dates, before/after, and date ranges.
 */
import { z } from 'zod';

/**
 * Zod schema for exact dates
 */
const exactDateSchema = z.object({
  type: z.literal('exact'),
  year: z.number().int().min(1).max(9999),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
});

/**
 * Zod schema for approximate dates
 */
const approximateDateSchema = z.object({
  type: z.literal('approximate'),
  year: z.number().int().min(1).max(9999),
  month: z.number().int().min(1).max(12).optional(),
});

/**
 * Zod schema for before dates
 */
const beforeDateSchema = z.object({
  type: z.literal('before'),
  year: z.number().int().min(1).max(9999),
});

/**
 * Zod schema for after dates
 */
const afterDateSchema = z.object({
  type: z.literal('after'),
  year: z.number().int().min(1).max(9999),
});

/**
 * Zod schema for date ranges
 */
const rangeDateSchema = z.object({
  type: z.literal('range'),
  startYear: z.number().int().min(1).max(9999),
  endYear: z.number().int().min(1).max(9999),
  startMonth: z.number().int().min(1).max(12).optional(),
  endMonth: z.number().int().min(1).max(12).optional(),
});

/**
 * Combined Zod schema for all fuzzy date types
 */
export const fuzzyDateSchema = z.discriminatedUnion('type', [
  exactDateSchema,
  approximateDateSchema,
  beforeDateSchema,
  afterDateSchema,
  rangeDateSchema,
]);

/**
 * TypeScript type for fuzzy dates
 */
export type FuzzyDate = z.infer<typeof fuzzyDateSchema>;

/**
 * Month names for formatting
 */
const MONTHS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Parse a GEDCOM-style date string into a FuzzyDate object
 *
 * Supported formats:
 * - YYYY-MM-DD (exact date)
 * - YYYY-MM (month precision)
 * - YYYY (year only)
 * - ABT YYYY or ABT YYYY-MM (approximate)
 * - BEF YYYY (before)
 * - AFT YYYY (after)
 * - BET YYYY AND YYYY (range)
 *
 * @param input - The date string to parse
 * @returns A FuzzyDate object
 * @throws Error if the date cannot be parsed
 */
export function parseFuzzyDate(input: string): FuzzyDate {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    throw new Error('Cannot parse empty date string');
  }

  // Range: BET 1920 AND 1925
  const rangeMatch = trimmed.match(/^BET\s+(\d{4})\s+AND\s+(\d{4})$/);
  if (rangeMatch) {
    return {
      type: 'range',
      startYear: parseInt(rangeMatch[1], 10),
      endYear: parseInt(rangeMatch[2], 10),
    };
  }

  // Before: BEF 1920
  const befMatch = trimmed.match(/^BEF\s+(\d{4})$/);
  if (befMatch) {
    return { type: 'before', year: parseInt(befMatch[1], 10) };
  }

  // After: AFT 1920
  const aftMatch = trimmed.match(/^AFT\s+(\d{4})$/);
  if (aftMatch) {
    return { type: 'after', year: parseInt(aftMatch[1], 10) };
  }

  // Approximate: ABT 1920 or ABT 1920-06
  const abtMatch = trimmed.match(/^ABT\s+(\d{4})(?:-(\d{2}))?$/);
  if (abtMatch) {
    return {
      type: 'approximate',
      year: parseInt(abtMatch[1], 10),
      month: abtMatch[2] ? parseInt(abtMatch[2], 10) : undefined,
    };
  }

  // Exact: YYYY-MM-DD, YYYY-MM, or YYYY
  const exactMatch = input.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (exactMatch) {
    return {
      type: 'exact',
      year: parseInt(exactMatch[1], 10),
      month: exactMatch[2] ? parseInt(exactMatch[2], 10) : undefined,
      day: exactMatch[3] ? parseInt(exactMatch[3], 10) : undefined,
    };
  }

  throw new Error(`Cannot parse date: ${input}`);
}

/**
 * Format a FuzzyDate object for display
 *
 * @param date - The FuzzyDate to format
 * @returns A human-readable string representation
 */
export function formatFuzzyDate(date: FuzzyDate): string {
  switch (date.type) {
    case 'exact': {
      if (date.month && date.day) {
        return `${MONTHS[date.month]} ${date.day}, ${date.year}`;
      }
      if (date.month) {
        return `${MONTHS[date.month]} ${date.year}`;
      }
      return date.year.toString();
    }
    case 'approximate': {
      if (date.month) {
        return `About ${MONTHS[date.month]} ${date.year}`;
      }
      return `About ${date.year}`;
    }
    case 'before':
      return `Before ${date.year}`;
    case 'after':
      return `After ${date.year}`;
    case 'range':
      return `Between ${date.startYear} and ${date.endYear}`;
  }
}

/**
 * Validate a FuzzyDate object using Zod schema
 *
 * @param date - The object to validate
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateFuzzyDate(date: unknown): boolean {
  const result = fuzzyDateSchema.safeParse(date);
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return true;
}

/**
 * Get the primary year from a FuzzyDate for sorting
 *
 * @param date - The FuzzyDate
 * @returns The year to use for comparison
 */
function getPrimaryYear(date: FuzzyDate): number {
  if (date.type === 'range') {
    return date.startYear;
  }
  return date.year;
}

/**
 * Get the month from a FuzzyDate for sorting (0 if not specified)
 *
 * @param date - The FuzzyDate
 * @returns The month or 0
 */
function getMonth(date: FuzzyDate): number {
  if (date.type === 'exact' || date.type === 'approximate') {
    return date.month || 0;
  }
  if (date.type === 'range') {
    return date.startMonth || 0;
  }
  return 0;
}

/**
 * Compare two FuzzyDate objects for sorting
 *
 * @param a - First date
 * @param b - Second date
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareFuzzyDates(a: FuzzyDate, b: FuzzyDate): number {
  const yearDiff = getPrimaryYear(a) - getPrimaryYear(b);
  if (yearDiff !== 0) {
    return yearDiff;
  }

  // If years are equal, compare by month
  return getMonth(a) - getMonth(b);
}
