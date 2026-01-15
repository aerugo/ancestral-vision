/**
 * Genealogy Import Tests
 *
 * Tests for parsing and transforming ancestral-synth-json format
 * to Prisma-compatible format for database seeding.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  parseGenealogyMetadata,
  mapPersonFields,
  parseDateString,
  parsePlaceString,
  parseParentChildLinks,
  parseSpouseLinks,
  type GenealogyJson,
  type RawPerson,
} from './genealogy-import';

describe('genealogy-import', () => {
  describe('parseGenealogyMetadata', () => {
    it('should extract centeredPersonId from metadata', () => {
      const json: GenealogyJson = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
          exported_at: '2025-11-24T01:00:25.087135Z',
          centeredPersonId: 'abc-123-def-456',
        },
        persons: [],
        child_links: [],
        spouse_links: [],
      };

      const result = parseGenealogyMetadata(json);

      expect(result.centeredPersonId).toBe('abc-123-def-456');
      expect(result.format).toBe('ancestral-synth-json');
      expect(result.version).toBe('1.0');
    });

    it('should throw if metadata is missing', () => {
      const json = {
        persons: [],
      } as unknown as GenealogyJson;

      expect(() => parseGenealogyMetadata(json)).toThrow(/metadata/i);
    });

    it('should throw if centeredPersonId is missing', () => {
      const json = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
        },
        persons: [],
      } as unknown as GenealogyJson;

      expect(() => parseGenealogyMetadata(json)).toThrow(/centeredPersonId/i);
    });
  });

  describe('mapPersonFields', () => {
    it('should transform snake_case to camelCase', () => {
      const person: RawPerson = {
        id: 'person-1',
        given_name: 'John',
        surname: 'Doe',
        maiden_name: 'Smith',
        gender: 'male',
        birth_date: '1990-01-15',
        birth_place: 'New York, NY',
        death_date: '2050-12-31',
        death_place: 'Boston, MA',
        biography: 'A biography text.',
        status: 'complete',
        generation: 0,
      };

      const result = mapPersonFields(person);

      expect(result.id).toBe('person-1');
      expect(result.givenName).toBe('John');
      expect(result.surname).toBe('Doe');
      expect(result.maidenName).toBe('Smith');
      expect(result.gender).toBe('MALE');
      expect(result.biography).toBe('A biography text.');
      expect(result.generation).toBe(0);
    });

    it('should convert gender to uppercase enum value', () => {
      const malePerson: RawPerson = {
        id: 'p1',
        given_name: 'John',
        gender: 'male',
        status: 'complete',
      };
      const femalePerson: RawPerson = {
        id: 'p2',
        given_name: 'Jane',
        gender: 'female',
        status: 'complete',
      };

      expect(mapPersonFields(malePerson).gender).toBe('MALE');
      expect(mapPersonFields(femalePerson).gender).toBe('FEMALE');
    });

    it('should handle missing optional fields', () => {
      const person: RawPerson = {
        id: 'person-2',
        given_name: 'Jane',
        status: 'pending',
      };

      const result = mapPersonFields(person);

      expect(result.givenName).toBe('Jane');
      expect(result.surname).toBeNull();
      expect(result.maidenName).toBeNull();
      expect(result.gender).toBeNull();
      expect(result.birthDate).toBeNull();
      expect(result.birthPlace).toBeNull();
      expect(result.deathDate).toBeNull();
      expect(result.deathPlace).toBeNull();
      expect(result.biography).toBeNull();
    });

    it('should default generation to 0 if not provided', () => {
      const person: RawPerson = {
        id: 'person-3',
        given_name: 'Bob',
        status: 'complete',
      };

      const result = mapPersonFields(person);

      expect(result.generation).toBe(0);
    });

    it('should generate displayName from givenName and surname', () => {
      const person: RawPerson = {
        id: 'person-4',
        given_name: 'John',
        surname: 'Doe',
        status: 'complete',
      };

      const result = mapPersonFields(person);

      expect(result.displayName).toBe('John Doe');
    });

    it('should use only givenName for displayName if no surname', () => {
      const person: RawPerson = {
        id: 'person-5',
        given_name: 'Madonna',
        status: 'complete',
      };

      const result = mapPersonFields(person);

      expect(result.displayName).toBe('Madonna');
    });
  });

  describe('parseDateString', () => {
    it('should parse full date string (YYYY-MM-DD)', () => {
      const result = parseDateString('1990-06-15');

      expect(result).toEqual({
        type: 'exact',
        year: 1990,
        month: 6,
        day: 15,
      });
    });

    it('should parse year-month date string (YYYY-MM)', () => {
      const result = parseDateString('1990-06');

      expect(result).toEqual({
        type: 'exact',
        year: 1990,
        month: 6,
      });
    });

    it('should parse year-only date string (YYYY)', () => {
      const result = parseDateString('1850');

      expect(result).toEqual({
        type: 'exact',
        year: 1850,
      });
    });

    it('should return null for null input', () => {
      const result = parseDateString(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parseDateString(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseDateString('');
      expect(result).toBeNull();
    });
  });

  describe('parsePlaceString', () => {
    it('should parse place string into Place object', () => {
      const result = parsePlaceString('Springfield, Ohio');

      expect(result).toEqual({
        name: 'Springfield, Ohio',
      });
    });

    it('should return null for null input', () => {
      const result = parsePlaceString(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parsePlaceString(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parsePlaceString('');
      expect(result).toBeNull();
    });

    it('should trim whitespace from place names', () => {
      const result = parsePlaceString('  New York, NY  ');

      expect(result).toEqual({
        name: 'New York, NY',
      });
    });
  });

  describe('parseParentChildLinks', () => {
    it('should extract parent-child relationships', () => {
      const json: GenealogyJson = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
          exported_at: '',
          centeredPersonId: 'test',
        },
        persons: [],
        child_links: [
          { parent_id: 'parent-1', child_id: 'child-1' },
          { parent_id: 'parent-2', child_id: 'child-1' },
          { parent_id: 'parent-1', child_id: 'child-2' },
        ],
        spouse_links: [],
      };

      const result = parseParentChildLinks(json);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ parentId: 'parent-1', childId: 'child-1' });
      expect(result[1]).toEqual({ parentId: 'parent-2', childId: 'child-1' });
      expect(result[2]).toEqual({ parentId: 'parent-1', childId: 'child-2' });
    });

    it('should return empty array if no child_links', () => {
      const json: GenealogyJson = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
          exported_at: '',
          centeredPersonId: 'test',
        },
        persons: [],
        child_links: [],
        spouse_links: [],
      };

      const result = parseParentChildLinks(json);

      expect(result).toEqual([]);
    });
  });

  describe('parseSpouseLinks', () => {
    it('should extract spouse relationships', () => {
      const json: GenealogyJson = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
          exported_at: '',
          centeredPersonId: 'test',
        },
        persons: [],
        child_links: [],
        spouse_links: [
          { person1_id: 'person-1', person2_id: 'person-2' },
          { person1_id: 'person-3', person2_id: 'person-4' },
        ],
      };

      const result = parseSpouseLinks(json);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ person1Id: 'person-1', person2Id: 'person-2' });
      expect(result[1]).toEqual({ person1Id: 'person-3', person2Id: 'person-4' });
    });

    it('should return empty array if no spouse_links', () => {
      const json: GenealogyJson = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
          exported_at: '',
          centeredPersonId: 'test',
        },
        persons: [],
        child_links: [],
        spouse_links: [],
      };

      const result = parseSpouseLinks(json);

      expect(result).toEqual([]);
    });
  });
});
