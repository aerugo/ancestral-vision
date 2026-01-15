/**
 * Genealogy Import Utilities
 *
 * Parse and transform data from ancestral-synth-json format
 * to Prisma-compatible format for database seeding.
 */

/**
 * Raw person data from ancestral-synth-json format
 */
export interface RawPerson {
  id: string;
  given_name: string;
  surname?: string;
  maiden_name?: string;
  name?: string;
  gender?: 'male' | 'female';
  birth_date?: string;
  birth_place?: string;
  death_date?: string;
  death_place?: string;
  biography?: string;
  status: 'complete' | 'pending';
  generation?: number;
}

/**
 * Raw parent-child link from ancestral-synth-json format
 */
export interface RawParentChildLink {
  parent_id: string;
  child_id: string;
}

/**
 * Raw spouse link from ancestral-synth-json format
 */
export interface RawSpouseLink {
  person1_id: string;
  person2_id: string;
}

/**
 * Genealogy JSON file structure (ancestral-synth-json format)
 *
 * Note: The JSON uses "child_links" as the key name (not "parent_child_links")
 */
export interface GenealogyJson {
  metadata: {
    format: string;
    version: string;
    exported_at: string;
    centeredPersonId: string;
  };
  persons: RawPerson[];
  child_links: RawParentChildLink[];
  spouse_links: RawSpouseLink[];
}

/**
 * Parsed metadata from genealogy JSON
 */
export interface ParsedMetadata {
  format: string;
  version: string;
  centeredPersonId: string;
}

/**
 * FuzzyDate JSON structure for Prisma
 */
export interface FuzzyDate {
  type: 'exact' | 'approximate' | 'range';
  year: number;
  month?: number;
  day?: number;
  isApproximate?: boolean;
}

/**
 * Place JSON structure for Prisma
 */
export interface Place {
  name: string;
}

/**
 * Mapped person data ready for Prisma
 */
export interface MappedPerson {
  id: string;
  givenName: string;
  surname: string | null;
  maidenName: string | null;
  displayName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  birthDate: FuzzyDate | null;
  birthPlace: Place | null;
  deathDate: FuzzyDate | null;
  deathPlace: Place | null;
  biography: string | null;
  generation: number;
}

/**
 * Parsed parent-child relationship
 */
export interface ParsedParentChildLink {
  parentId: string;
  childId: string;
}

/**
 * Parsed spouse relationship
 */
export interface ParsedSpouseLink {
  person1Id: string;
  person2Id: string;
}

/**
 * Parse metadata from genealogy JSON
 *
 * @param json - The parsed genealogy JSON object
 * @returns Parsed metadata with centeredPersonId
 * @throws Error if metadata or centeredPersonId is missing
 */
export function parseGenealogyMetadata(json: GenealogyJson): ParsedMetadata {
  if (!json.metadata) {
    throw new Error('Invalid genealogy JSON: missing metadata');
  }

  if (!json.metadata.centeredPersonId) {
    throw new Error('Invalid genealogy JSON: missing centeredPersonId in metadata');
  }

  return {
    format: json.metadata.format,
    version: json.metadata.version,
    centeredPersonId: json.metadata.centeredPersonId,
  };
}

/**
 * Parse a date string into FuzzyDate format
 *
 * Supports formats:
 * - YYYY-MM-DD (full date)
 * - YYYY-MM (year and month)
 * - YYYY (year only)
 *
 * @param dateStr - Date string to parse, or null/undefined
 * @returns FuzzyDate object or null if input is empty
 */
export function parseDateString(dateStr: string | null | undefined): FuzzyDate | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  const parts = dateStr.split('-');

  if (parts.length >= 3) {
    // Full date: YYYY-MM-DD
    return {
      type: 'exact',
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  } else if (parts.length === 2) {
    // Year and month: YYYY-MM
    return {
      type: 'exact',
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
    };
  } else {
    // Year only: YYYY
    return {
      type: 'exact',
      year: parseInt(parts[0], 10),
    };
  }
}

/**
 * Parse a place string into Place format
 *
 * @param placeStr - Place string to parse, or null/undefined
 * @returns Place object or null if input is empty
 */
export function parsePlaceString(placeStr: string | null | undefined): Place | null {
  if (!placeStr || placeStr.trim() === '') {
    return null;
  }

  return {
    name: placeStr.trim(),
  };
}

/**
 * Map a raw person from JSON to Prisma-compatible format
 *
 * @param person - Raw person from genealogy JSON
 * @returns Mapped person ready for Prisma
 */
export function mapPersonFields(person: RawPerson): MappedPerson {
  const givenName = person.given_name;
  const surname = person.surname ?? null;
  const displayName = surname ? `${givenName} ${surname}` : givenName;

  let gender: 'MALE' | 'FEMALE' | 'OTHER' | null = null;
  if (person.gender === 'male') {
    gender = 'MALE';
  } else if (person.gender === 'female') {
    gender = 'FEMALE';
  }

  return {
    id: person.id,
    givenName,
    surname,
    maidenName: person.maiden_name ?? null,
    displayName,
    gender,
    birthDate: parseDateString(person.birth_date),
    birthPlace: parsePlaceString(person.birth_place),
    deathDate: parseDateString(person.death_date),
    deathPlace: parsePlaceString(person.death_place),
    biography: person.biography ?? null,
    generation: person.generation ?? 0,
  };
}

/**
 * Parse parent-child links from genealogy JSON
 *
 * Note: The JSON uses "child_links" as the key name
 *
 * @param json - The genealogy JSON object
 * @returns Array of parsed parent-child relationships
 */
export function parseParentChildLinks(json: GenealogyJson): ParsedParentChildLink[] {
  if (!json.child_links) {
    return [];
  }

  return json.child_links.map((link) => ({
    parentId: link.parent_id,
    childId: link.child_id,
  }));
}

/**
 * Parse spouse links from genealogy JSON
 *
 * @param json - The genealogy JSON object
 * @returns Array of parsed spouse relationships
 */
export function parseSpouseLinks(json: GenealogyJson): ParsedSpouseLink[] {
  if (!json.spouse_links) {
    return [];
  }

  return json.spouse_links.map((link) => ({
    person1Id: link.person1_id,
    person2Id: link.person2_id,
  }));
}
