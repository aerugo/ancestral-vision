# Phase 1: Template Seed Script

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create a Prisma seed script that imports `data/example-genealogy.json` into the database, creating a template user with a fully populated constellation including all persons and relationships.

---

## Invariants Enforced in This Phase

- **INV-D001**: Person IDs are globally unique UUIDs - Tests verify imported IDs match JSON
- **INV-D002**: A person cannot be their own ancestor - JSON data assumed valid, no circular check needed

---

## TDD Steps

### Step 1.1: Write Failing Tests for JSON Parsing (RED)

Create `src/lib/genealogy-import.test.ts`:

**Test Cases**:

1. `it('should parse metadata from genealogy JSON')` - Extract centeredPersonId
2. `it('should map person fields from snake_case to camelCase')` - Field transformation
3. `it('should parse date strings into FuzzyDate JSON')` - Date conversion
4. `it('should parse place strings into Place JSON')` - Place conversion
5. `it('should handle missing optional fields')` - Null handling
6. `it('should extract parent-child relationships')` - Relationship parsing
7. `it('should extract spouse relationships')` - Relationship parsing

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseGenealogyMetadata,
  mapPersonFields,
  parseDateString,
  parsePlaceString,
  parseParentChildLinks,
  parseSpouseLinks,
} from './genealogy-import';

describe('genealogy-import', () => {
  describe('parseGenealogyMetadata', () => {
    it('should extract centeredPersonId from metadata', () => {
      const json = {
        metadata: {
          format: 'ancestral-synth-json',
          version: '1.0',
          centeredPersonId: 'abc-123',
        },
        persons: [],
      };

      const result = parseGenealogyMetadata(json);

      expect(result.centeredPersonId).toBe('abc-123');
    });
  });

  describe('mapPersonFields', () => {
    it('should transform snake_case to camelCase', () => {
      const person = {
        id: 'person-1',
        given_name: 'John',
        surname: 'Doe',
        maiden_name: 'Smith',
        gender: 'male',
        birth_date: '1990-01-15',
        birth_place: 'New York, NY',
        death_date: null,
        death_place: null,
        biography: 'A biography.',
        status: 'complete',
      };

      const result = mapPersonFields(person);

      expect(result.id).toBe('person-1');
      expect(result.givenName).toBe('John');
      expect(result.surname).toBe('Doe');
      expect(result.maidenName).toBe('Smith');
      expect(result.gender).toBe('MALE');
      expect(result.biography).toBe('A biography.');
    });

    it('should handle missing optional fields', () => {
      const person = {
        id: 'person-2',
        given_name: 'Jane',
        status: 'pending',
      };

      const result = mapPersonFields(person);

      expect(result.givenName).toBe('Jane');
      expect(result.surname).toBeNull();
      expect(result.maidenName).toBeNull();
    });
  });

  describe('parseDateString', () => {
    it('should parse exact date string', () => {
      const result = parseDateString('1990-06-15');

      expect(result).toEqual({
        type: 'exact',
        year: 1990,
        month: 6,
        day: 15,
      });
    });

    it('should parse year-only date string', () => {
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
  });

  describe('parseParentChildLinks', () => {
    it('should extract parent-child relationships', () => {
      const json = {
        parent_child_links: [
          { parent_id: 'parent-1', child_id: 'child-1' },
          { parent_id: 'parent-2', child_id: 'child-1' },
        ],
      };

      const result = parseParentChildLinks(json);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ parentId: 'parent-1', childId: 'child-1' });
    });
  });

  describe('parseSpouseLinks', () => {
    it('should extract spouse relationships', () => {
      const json = {
        spouse_links: [
          { person1_id: 'person-1', person2_id: 'person-2' },
        ],
      };

      const result = parseSpouseLinks(json);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ person1Id: 'person-1', person2Id: 'person-2' });
    });
  });
});
```

### Step 1.2: Implement JSON Parsing (GREEN)

Create `src/lib/genealogy-import.ts`:

```typescript
/**
 * Genealogy Import Utilities
 *
 * Parse and transform data from ancestral-synth-json format
 * to Prisma-compatible format for database seeding.
 */
import { Gender, NameOrder } from '@prisma/client';

// ... implementation based on tests
```

### Step 1.3: Write Failing Tests for Database Seeding (RED)

Create `prisma/seed-template.test.ts`:

**Test Cases**:

1. `it('should create template user if not exists')` - User creation
2. `it('should skip user creation if already exists')` - Idempotent
3. `it('should create constellation for template user')` - Constellation setup
4. `it('should import all persons from JSON')` - Person import
5. `it('should create parent-child relationships')` - Relationship import
6. `it('should create spouse relationships')` - Relationship import
7. `it('should set centeredPersonId on constellation')` - Metadata
8. `it('should set onboarding status to COMPLETED')` - Onboarding bypass

```typescript
/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { seedTemplateData, TEMPLATE_USER_ID } from './seed-template';

const prisma = new PrismaClient();

describe('seed-template', () => {
  beforeEach(async () => {
    // Clean up template user data before each test
    await prisma.parentChildRelationship.deleteMany({
      where: { constellation: { ownerId: TEMPLATE_USER_ID } },
    });
    await prisma.spouseRelationship.deleteMany({
      where: { constellation: { ownerId: TEMPLATE_USER_ID } },
    });
    await prisma.person.deleteMany({
      where: { constellation: { ownerId: TEMPLATE_USER_ID } },
    });
    await prisma.constellation.deleteMany({
      where: { ownerId: TEMPLATE_USER_ID },
    });
    await prisma.onboardingProgress.deleteMany({
      where: { userId: TEMPLATE_USER_ID },
    });
    await prisma.user.deleteMany({
      where: { id: TEMPLATE_USER_ID },
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should create template user if not exists', async () => {
    await seedTemplateData();

    const user = await prisma.user.findUnique({
      where: { id: TEMPLATE_USER_ID },
    });

    expect(user).not.toBeNull();
    expect(user!.displayName).toBe('Template Person');
  });

  it('should skip user creation if already exists', async () => {
    // First seed
    await seedTemplateData();
    const firstUser = await prisma.user.findUnique({
      where: { id: TEMPLATE_USER_ID },
    });

    // Second seed - should not throw
    await seedTemplateData();
    const secondUser = await prisma.user.findUnique({
      where: { id: TEMPLATE_USER_ID },
    });

    expect(secondUser!.id).toBe(firstUser!.id);
  });

  it('should create constellation with persons', async () => {
    await seedTemplateData();

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEMPLATE_USER_ID },
      include: { people: true },
    });

    expect(constellation).not.toBeNull();
    expect(constellation!.people.length).toBeGreaterThan(100);
  });

  it('should set centeredPersonId from JSON metadata', async () => {
    await seedTemplateData();

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEMPLATE_USER_ID },
    });

    expect(constellation!.centeredPersonId).not.toBeNull();
  });

  it('should create parent-child relationships', async () => {
    await seedTemplateData();

    const relationships = await prisma.parentChildRelationship.findMany({
      where: { constellation: { ownerId: TEMPLATE_USER_ID } },
    });

    expect(relationships.length).toBeGreaterThan(50);
  });

  it('should create spouse relationships', async () => {
    await seedTemplateData();

    const relationships = await prisma.spouseRelationship.findMany({
      where: { constellation: { ownerId: TEMPLATE_USER_ID } },
    });

    expect(relationships.length).toBeGreaterThan(10);
  });

  it('should set onboarding status to COMPLETED', async () => {
    await seedTemplateData();

    const onboarding = await prisma.onboardingProgress.findFirst({
      where: { userId: TEMPLATE_USER_ID },
    });

    expect(onboarding).not.toBeNull();
    expect(onboarding!.status).toBe('COMPLETED');
  });
});
```

### Step 1.4: Implement Database Seeding (GREEN)

Create `prisma/seed-template.ts`:

```typescript
/**
 * Template Data Seed Script
 *
 * Seeds the database with data from data/example-genealogy.json
 * for visual testing in development mode.
 *
 * Run with: npx ts-node prisma/seed-template.ts
 */
import { PrismaClient, OnboardingStatus, OnboardingStep } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseGenealogyMetadata,
  mapPersonFields,
  parseParentChildLinks,
  parseSpouseLinks,
} from '../src/lib/genealogy-import';

export const TEMPLATE_USER_ID = 'template-user';
const TEMPLATE_EMAIL = 'template@ancestralvision.dev';

// ... implementation
```

### Step 1.5: Refactor

- Ensure complete type annotations (no implicit `any`)
- Add JSDoc comments for public APIs
- Extract helper functions if needed
- Optimize for readability

---

## Implementation Details

### JSON File Structure

```json
{
  "metadata": {
    "format": "ancestral-synth-json",
    "version": "1.0",
    "centeredPersonId": "2fdbb99d-9324-4c8c-b8f1-cd3aba32d58b"
  },
  "persons": [
    {
      "id": "uuid",
      "given_name": "string",
      "surname": "string",
      "maiden_name": "string",
      "gender": "male|female",
      "birth_date": "YYYY-MM-DD",
      "birth_place": "string",
      "death_date": "YYYY-MM-DD",
      "death_place": "string",
      "biography": "string",
      "status": "complete|pending",
      "generation": number
    }
  ],
  "parent_child_links": [
    { "parent_id": "uuid", "child_id": "uuid" }
  ],
  "spouse_links": [
    { "person1_id": "uuid", "person2_id": "uuid" }
  ]
}
```

### Field Mapping

| JSON Field | Prisma Field | Transformation |
|------------|--------------|----------------|
| `given_name` | `givenName` | Direct |
| `surname` | `surname` | Direct |
| `maiden_name` | `maidenName` | Direct |
| `gender` | `gender` | Uppercase: `male` → `MALE` |
| `birth_date` | `birthDate` | Parse to FuzzyDate JSON |
| `birth_place` | `birthPlace` | Parse to Place JSON |
| `death_date` | `deathDate` | Parse to FuzzyDate JSON |
| `death_place` | `deathPlace` | Parse to Place JSON |
| `biography` | `biography` | Direct |
| `generation` | `generation` | Direct (default 0) |

### Edge Cases to Handle

- Missing optional fields (surname, dates, places)
- Year-only dates (`1850` vs `1850-03-15`)
- Empty biography strings
- Persons with `status: pending` (import anyway)

### Error Handling

- File not found: Throw descriptive error with path
- Invalid JSON: Throw with parse error details
- Missing required fields: Throw with field name
- Database errors: Let Prisma errors propagate

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/genealogy-import.ts` | CREATE | JSON parsing and transformation |
| `src/lib/genealogy-import.test.ts` | CREATE | Unit tests for parsing |
| `prisma/seed-template.ts` | CREATE | Database seeding script |
| `prisma/seed-template.test.ts` | CREATE | Integration tests for seeding |

---

## Verification

```bash
# Run unit tests
npx vitest src/lib/genealogy-import.test.ts

# Run integration tests
npx vitest prisma/seed-template.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Manual verification
npx ts-node prisma/seed-template.ts
```

---

## Completion Criteria

- [ ] All test cases pass (unit + integration)
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Handles all edge cases (missing fields, date formats)
- [ ] Running seed script creates 119+ persons
- [ ] Relationships correctly imported

---

*Template version: 1.0*
