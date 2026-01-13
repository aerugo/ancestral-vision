/**
 * Date Utils Tests (INV-D007: GEDCOM-style flexible dates)
 *
 * Tests for parsing, formatting, and validating fuzzy dates.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFuzzyDate,
  formatFuzzyDate,
  validateFuzzyDate,
  compareFuzzyDates,
  type FuzzyDate,
} from './date-utils';

describe('Date Utils', () => {
  describe('parseFuzzyDate', () => {
    it('should parse exact date YYYY-MM-DD', () => {
      const result = parseFuzzyDate('1985-06-15');

      expect(result).toEqual({
        type: 'exact',
        year: 1985,
        month: 6,
        day: 15,
      });
    });

    it('should parse partial date YYYY-MM', () => {
      const result = parseFuzzyDate('1985-06');

      expect(result).toEqual({
        type: 'exact',
        year: 1985,
        month: 6,
      });
    });

    it('should parse year only', () => {
      const result = parseFuzzyDate('1985');

      expect(result).toEqual({
        type: 'exact',
        year: 1985,
      });
    });

    it('should parse approximate date ABT', () => {
      const result = parseFuzzyDate('ABT 1920');

      expect(result).toEqual({
        type: 'approximate',
        year: 1920,
      });
    });

    it('should parse approximate date with month ABT YYYY-MM', () => {
      const result = parseFuzzyDate('ABT 1920-06');

      expect(result).toEqual({
        type: 'approximate',
        year: 1920,
        month: 6,
      });
    });

    it('should parse before date BEF', () => {
      const result = parseFuzzyDate('BEF 1920');

      expect(result).toEqual({
        type: 'before',
        year: 1920,
      });
    });

    it('should parse after date AFT', () => {
      const result = parseFuzzyDate('AFT 1920');

      expect(result).toEqual({
        type: 'after',
        year: 1920,
      });
    });

    it('should parse date range BET...AND', () => {
      const result = parseFuzzyDate('BET 1920 AND 1925');

      expect(result).toEqual({
        type: 'range',
        startYear: 1920,
        endYear: 1925,
      });
    });

    it('should be case-insensitive for prefixes', () => {
      expect(parseFuzzyDate('abt 1920')).toEqual({
        type: 'approximate',
        year: 1920,
      });

      expect(parseFuzzyDate('bef 1920')).toEqual({
        type: 'before',
        year: 1920,
      });

      expect(parseFuzzyDate('aft 1920')).toEqual({
        type: 'after',
        year: 1920,
      });

      expect(parseFuzzyDate('bet 1920 and 1925')).toEqual({
        type: 'range',
        startYear: 1920,
        endYear: 1925,
      });
    });

    it('should throw error for invalid date format', () => {
      expect(() => parseFuzzyDate('invalid')).toThrow();
      expect(() => parseFuzzyDate('')).toThrow();
      expect(() => parseFuzzyDate('ABC 1920')).toThrow();
    });
  });

  describe('formatFuzzyDate', () => {
    it('should format exact full date', () => {
      const date: FuzzyDate = { type: 'exact', year: 1985, month: 6, day: 15 };
      expect(formatFuzzyDate(date)).toBe('June 15, 1985');
    });

    it('should format exact date with month only', () => {
      const date: FuzzyDate = { type: 'exact', year: 1985, month: 6 };
      expect(formatFuzzyDate(date)).toBe('June 1985');
    });

    it('should format exact date with year only', () => {
      const date: FuzzyDate = { type: 'exact', year: 1985 };
      expect(formatFuzzyDate(date)).toBe('1985');
    });

    it('should format approximate date', () => {
      const date: FuzzyDate = { type: 'approximate', year: 1920 };
      expect(formatFuzzyDate(date)).toBe('About 1920');
    });

    it('should format approximate date with month', () => {
      const date: FuzzyDate = { type: 'approximate', year: 1920, month: 6 };
      expect(formatFuzzyDate(date)).toBe('About June 1920');
    });

    it('should format before date', () => {
      const date: FuzzyDate = { type: 'before', year: 1920 };
      expect(formatFuzzyDate(date)).toBe('Before 1920');
    });

    it('should format after date', () => {
      const date: FuzzyDate = { type: 'after', year: 1920 };
      expect(formatFuzzyDate(date)).toBe('After 1920');
    });

    it('should format range', () => {
      const date: FuzzyDate = { type: 'range', startYear: 1920, endYear: 1925 };
      expect(formatFuzzyDate(date)).toBe('Between 1920 and 1925');
    });
  });

  describe('validateFuzzyDate', () => {
    it('should validate correct exact date object', () => {
      const date: FuzzyDate = { type: 'exact', year: 1985 };
      expect(validateFuzzyDate(date)).toBe(true);
    });

    it('should validate correct approximate date object', () => {
      const date: FuzzyDate = { type: 'approximate', year: 1920 };
      expect(validateFuzzyDate(date)).toBe(true);
    });

    it('should validate correct range date object', () => {
      const date: FuzzyDate = { type: 'range', startYear: 1920, endYear: 1925 };
      expect(validateFuzzyDate(date)).toBe(true);
    });

    it('should reject invalid type', () => {
      expect(() => validateFuzzyDate({ type: 'invalid' })).toThrow();
    });

    it('should reject missing year for exact', () => {
      expect(() => validateFuzzyDate({ type: 'exact' })).toThrow();
    });

    it('should reject invalid month value', () => {
      expect(() => validateFuzzyDate({ type: 'exact', year: 1985, month: 13 })).toThrow();
      expect(() => validateFuzzyDate({ type: 'exact', year: 1985, month: 0 })).toThrow();
    });

    it('should reject invalid day value', () => {
      expect(() =>
        validateFuzzyDate({ type: 'exact', year: 1985, month: 6, day: 32 })
      ).toThrow();
      expect(() =>
        validateFuzzyDate({ type: 'exact', year: 1985, month: 6, day: 0 })
      ).toThrow();
    });

    it('should handle null/undefined dates', () => {
      expect(() => validateFuzzyDate(null)).toThrow();
      expect(() => validateFuzzyDate(undefined)).toThrow();
    });
  });

  describe('compareFuzzyDates', () => {
    it('should compare exact dates', () => {
      const a: FuzzyDate = { type: 'exact', year: 1985 };
      const b: FuzzyDate = { type: 'exact', year: 1990 };

      expect(compareFuzzyDates(a, b)).toBeLessThan(0);
      expect(compareFuzzyDates(b, a)).toBeGreaterThan(0);
    });

    it('should compare equal years', () => {
      const a: FuzzyDate = { type: 'exact', year: 1985 };
      const b: FuzzyDate = { type: 'exact', year: 1985 };

      expect(compareFuzzyDates(a, b)).toBe(0);
    });

    it('should compare range by start year', () => {
      const a: FuzzyDate = { type: 'range', startYear: 1920, endYear: 1925 };
      const b: FuzzyDate = { type: 'exact', year: 1930 };

      expect(compareFuzzyDates(a, b)).toBeLessThan(0);
    });

    it('should compare mixed date types', () => {
      const exact: FuzzyDate = { type: 'exact', year: 1985 };
      const approx: FuzzyDate = { type: 'approximate', year: 1980 };
      const before: FuzzyDate = { type: 'before', year: 1990 };

      expect(compareFuzzyDates(approx, exact)).toBeLessThan(0);
      expect(compareFuzzyDates(exact, before)).toBeLessThan(0);
    });

    it('should compare with month precision when years equal', () => {
      const a: FuzzyDate = { type: 'exact', year: 1985, month: 3 };
      const b: FuzzyDate = { type: 'exact', year: 1985, month: 9 };

      expect(compareFuzzyDates(a, b)).toBeLessThan(0);
    });
  });
});
