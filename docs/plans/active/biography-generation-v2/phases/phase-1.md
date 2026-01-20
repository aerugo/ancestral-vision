# Phase 1: Eligibility & Source Assembly

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement eligibility checking (must have notes OR events) and source material assembly (gather all relevant data with proper structure and citations).

---

## Invariants Enforced in This Phase

- **INV-AI007**: Biography Requires Source Material - Tests verify generation blocked without notes/events
- **INV-AI005**: AI Outputs Use Zod Validation - All data structures validated with Zod schemas

---

## TDD Steps

### Step 1.1: Write Failing Tests for New Schemas (RED)

Create `src/ai/schemas/biography-v2.test.ts`:

**Test Cases**:

1. `it('should validate PersonDetails schema')` - Validates person basic info
2. `it('should validate NoteSource schema')` - Validates note with citation info
3. `it('should validate EventSource schema')` - Validates event with citation info
4. `it('should validate SourceMaterial schema')` - Validates complete source bundle
5. `it('should reject SourceMaterial with empty notes AND empty events')` - Enforces INV-AI007
6. `it('should accept SourceMaterial with at least one note')` - Allows notes-only
7. `it('should accept SourceMaterial with at least one event')` - Allows events-only

```typescript
import { describe, it, expect } from 'vitest';
import {
  PersonDetailsSchema,
  NoteSourceSchema,
  EventSourceSchema,
  SourceMaterialSchema,
} from './biography-v2';

describe('Biography V2 Schemas', () => {
  describe('PersonDetailsSchema', () => {
    it('should validate complete person details', () => {
      const valid = {
        personId: 'person-123',
        givenName: 'John',
        surname: 'Smith',
        displayName: 'John Smith',
        gender: 'MALE',
        birthDate: { type: 'exact', year: 1920 },
        deathDate: { type: 'exact', year: 2000 },
        birthPlace: { name: 'London, UK' },
        deathPlace: { name: 'Manchester, UK' },
      };
      expect(PersonDetailsSchema.safeParse(valid).success).toBe(true);
    });

    it('should allow minimal person details', () => {
      const minimal = {
        personId: 'person-123',
        givenName: 'John',
        displayName: 'John',
      };
      expect(PersonDetailsSchema.safeParse(minimal).success).toBe(true);
    });
  });

  describe('NoteSourceSchema', () => {
    it('should validate note with citation info', () => {
      const valid = {
        noteId: 'note-123',
        title: 'Early Life',
        content: 'John was born on a farm in rural England...',
        createdAt: new Date().toISOString(),
      };
      expect(NoteSourceSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('EventSourceSchema', () => {
    it('should validate event with citation info', () => {
      const valid = {
        eventId: 'event-123',
        title: 'Marriage',
        description: 'Married Mary Jones at St. Paul Church',
        date: { type: 'exact', year: 1945, month: 6, day: 15 },
        location: { name: 'London, UK' },
      };
      expect(EventSourceSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('SourceMaterialSchema (INV-AI007)', () => {
    const validPersonDetails = {
      personId: 'person-123',
      givenName: 'John',
      displayName: 'John',
    };

    it('should reject when both notes AND events are empty', () => {
      const invalid = {
        personDetails: validPersonDetails,
        notes: [],
        events: [],
      };
      const result = SourceMaterialSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept with at least one note', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [{
          noteId: 'note-1',
          title: 'Note',
          content: 'Some content',
          createdAt: new Date().toISOString(),
        }],
        events: [],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept with at least one event', () => {
      const valid = {
        personDetails: validPersonDetails,
        notes: [],
        events: [{
          eventId: 'event-1',
          title: 'Birth',
          date: { type: 'exact', year: 1920 },
        }],
      };
      expect(SourceMaterialSchema.safeParse(valid).success).toBe(true);
    });
  });
});
```

### Step 1.2: Implement Schemas (GREEN)

Create `src/ai/schemas/biography-v2.ts`:

```typescript
/**
 * Biography V2 Schemas
 *
 * Comprehensive Zod schemas for the agentic biography generation flow.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-AI007: Biography Requires Source Material
 */
import { z } from 'zod';
import { FuzzyDateSchema, PlaceSchema } from './biography';

/**
 * Person details for biography generation
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
});

export type PersonDetails = z.infer<typeof PersonDetailsSchema>;

/**
 * Note as source material with citation info
 */
export const NoteSourceSchema = z.object({
  noteId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(1),
  createdAt: z.string(), // ISO date string
});

export type NoteSource = z.infer<typeof NoteSourceSchema>;

/**
 * Event as source material with citation info
 */
export const EventSourceSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  date: FuzzyDateSchema.optional(),
  location: PlaceSchema.optional(),
  participants: z.array(z.object({
    personId: z.string(),
    displayName: z.string(),
  })).optional(),
});

export type EventSource = z.infer<typeof EventSourceSchema>;

/**
 * Complete source material bundle
 *
 * Enforces INV-AI007: At least one note OR one event required
 */
export const SourceMaterialSchema = z.object({
  personDetails: PersonDetailsSchema,
  notes: z.array(NoteSourceSchema),
  events: z.array(EventSourceSchema),
}).refine(
  (data) => data.notes.length > 0 || data.events.length > 0,
  {
    message: 'Biography generation requires at least one note or event (INV-AI007)',
    path: ['notes', 'events'],
  }
);

export type SourceMaterial = z.infer<typeof SourceMaterialSchema>;
```

### Step 1.3: Write Failing Tests for Eligibility Check (RED)

Create `src/ai/flows/biography/eligibility.test.ts`:

**Test Cases**:

1. `it('should return eligible=true when person has notes')` - Notes make person eligible
2. `it('should return eligible=true when person has events')` - Events make person eligible
3. `it('should return eligible=true when person has both notes and events')` - Both work
4. `it('should return eligible=false when person has no notes or events')` - Empty = ineligible
5. `it('should return helpful error message when ineligible')` - Guides user
6. `it('should throw when person not found')` - Handles missing person

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkBiographyEligibility } from './eligibility';

// Mock Prisma
const mockPrisma = {
  person: {
    findFirst: vi.fn(),
  },
  note: {
    count: vi.fn(),
  },
  event: {
    count: vi.fn(),
  },
};

vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('checkBiographyEligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.person.findFirst.mockResolvedValue({
      id: 'person-123',
      givenName: 'John',
      displayName: 'John Smith',
    });
  });

  it('should return eligible=true when person has notes', async () => {
    mockPrisma.note.count.mockResolvedValue(3);
    mockPrisma.event.count.mockResolvedValue(0);

    const result = await checkBiographyEligibility('person-123', 'user-123');

    expect(result.eligible).toBe(true);
    expect(result.noteCount).toBe(3);
    expect(result.eventCount).toBe(0);
  });

  it('should return eligible=true when person has events', async () => {
    mockPrisma.note.count.mockResolvedValue(0);
    mockPrisma.event.count.mockResolvedValue(5);

    const result = await checkBiographyEligibility('person-123', 'user-123');

    expect(result.eligible).toBe(true);
    expect(result.noteCount).toBe(0);
    expect(result.eventCount).toBe(5);
  });

  it('should return eligible=true when person has both', async () => {
    mockPrisma.note.count.mockResolvedValue(2);
    mockPrisma.event.count.mockResolvedValue(4);

    const result = await checkBiographyEligibility('person-123', 'user-123');

    expect(result.eligible).toBe(true);
  });

  it('should return eligible=false when person has no notes or events', async () => {
    mockPrisma.note.count.mockResolvedValue(0);
    mockPrisma.event.count.mockResolvedValue(0);

    const result = await checkBiographyEligibility('person-123', 'user-123');

    expect(result.eligible).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('note');
    expect(result.reason).toContain('event');
  });

  it('should return helpful guidance when ineligible', async () => {
    mockPrisma.note.count.mockResolvedValue(0);
    mockPrisma.event.count.mockResolvedValue(0);

    const result = await checkBiographyEligibility('person-123', 'user-123');

    expect(result.guidance).toBeDefined();
    expect(result.guidance).toContain('Add');
  });

  it('should throw when person not found', async () => {
    mockPrisma.person.findFirst.mockResolvedValue(null);

    await expect(
      checkBiographyEligibility('nonexistent', 'user-123')
    ).rejects.toThrow(/not found/i);
  });
});
```

### Step 1.4: Implement Eligibility Check (GREEN)

Create `src/ai/flows/biography/eligibility.ts`:

```typescript
/**
 * Biography Eligibility Check
 *
 * Verifies a person has sufficient source material for biography generation.
 *
 * Invariants:
 * - INV-AI007: Biography Requires Source Material
 * - INV-S002: Constellation Isolation
 */
import { prisma } from '../../../lib/prisma';

export interface EligibilityResult {
  eligible: boolean;
  personId: string;
  noteCount: number;
  eventCount: number;
  reason?: string;
  guidance?: string;
}

/**
 * Check if a person is eligible for biography generation.
 *
 * @param personId - ID of the person to check
 * @param userId - ID of the requesting user (for constellation access)
 * @returns Eligibility result with counts and guidance
 */
export async function checkBiographyEligibility(
  personId: string,
  userId: string
): Promise<EligibilityResult> {
  // Verify person exists and user has access (INV-S002)
  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      constellation: {
        ownerId: userId,
      },
      deletedAt: null,
    },
  });

  if (!person) {
    throw new Error('Person not found or access denied');
  }

  // Count notes and events
  const [noteCount, eventCount] = await Promise.all([
    prisma.note.count({
      where: {
        personId,
        deletedAt: null,
      },
    }),
    prisma.event.count({
      where: {
        OR: [
          { primaryPersonId: personId },
          { participants: { some: { personId } } },
        ],
        deletedAt: null,
      },
    }),
  ]);

  const eligible = noteCount > 0 || eventCount > 0;

  if (eligible) {
    return {
      eligible: true,
      personId,
      noteCount,
      eventCount,
    };
  }

  return {
    eligible: false,
    personId,
    noteCount: 0,
    eventCount: 0,
    reason: 'Biography generation requires at least one note or event.',
    guidance: `Add notes about ${person.displayName}'s life, memories, or stories. ` +
      `You can also add events like births, marriages, or achievements. ` +
      `These will be used to create an accurate, factual biography.`,
  };
}
```

### Step 1.5: Write Failing Tests for Source Assembly (RED)

Create `src/ai/flows/biography/source-assembly.test.ts`:

**Test Cases**:

1. `it('should assemble person details')` - Gathers basic info
2. `it('should assemble all notes')` - Gathers notes with citation info
3. `it('should assemble all events')` - Gathers events with citation info
4. `it('should include event participants')` - Gets participant names
5. `it('should validate against SourceMaterialSchema')` - Output is valid
6. `it('should exclude deleted notes')` - Respects soft delete
7. `it('should exclude deleted events')` - Respects soft delete

### Step 1.6: Implement Source Assembly (GREEN)

Create `src/ai/flows/biography/source-assembly.ts`:

```typescript
/**
 * Source Material Assembly
 *
 * Gathers all source material for biography generation.
 *
 * Invariants:
 * - INV-AI005: Output validated with Zod
 * - INV-S002: Constellation Isolation
 */
import { prisma } from '../../../lib/prisma';
import {
  SourceMaterial,
  SourceMaterialSchema,
  PersonDetails,
  NoteSource,
  EventSource,
} from '../../schemas/biography-v2';

/**
 * Assemble all source material for a person.
 *
 * @param personId - ID of the person
 * @param userId - ID of the requesting user
 * @returns Validated SourceMaterial
 */
export async function assembleSourceMaterial(
  personId: string,
  userId: string
): Promise<SourceMaterial> {
  // Fetch person with notes and events (INV-S002)
  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      constellation: { ownerId: userId },
      deletedAt: null,
    },
    include: {
      notes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!person) {
    throw new Error('Person not found or access denied');
  }

  // Fetch events where person is primary or participant
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { primaryPersonId: personId },
        { participants: { some: { personId } } },
      ],
      deletedAt: null,
    },
    include: {
      participants: {
        include: {
          person: {
            select: { id: true, displayName: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build person details
  const personDetails: PersonDetails = {
    personId: person.id,
    givenName: person.givenName,
    surname: person.surname ?? undefined,
    displayName: person.displayName,
    gender: person.gender ?? undefined,
    birthDate: person.birthDate as PersonDetails['birthDate'],
    deathDate: person.deathDate as PersonDetails['deathDate'],
    birthPlace: person.birthPlace as PersonDetails['birthPlace'],
    deathPlace: person.deathPlace as PersonDetails['deathPlace'],
  };

  // Build note sources
  const notes: NoteSource[] = person.notes.map((note) => ({
    noteId: note.id,
    title: note.title ?? undefined,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  }));

  // Build event sources
  const eventSources: EventSource[] = events.map((event) => ({
    eventId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    date: event.date as EventSource['date'],
    location: event.location as EventSource['location'],
    participants: event.participants.map((p) => ({
      personId: p.person.id,
      displayName: p.person.displayName,
    })),
  }));

  const sourceMaterial = {
    personDetails,
    notes,
    events: eventSources,
  };

  // Validate output (INV-AI005)
  return SourceMaterialSchema.parse(sourceMaterial);
}
```

### Step 1.7: Refactor

- Ensure complete type annotations
- Add JSDoc comments
- Extract any helper functions
- Ensure consistent error handling

---

## Implementation Details

### Edge Cases to Handle

- Person with notes but no events
- Person with events but no notes
- Person as event participant (not primary)
- Deleted notes/events should be excluded
- Notes/events with minimal fields

### Error Handling

- Person not found: Throw descriptive error
- Access denied: Same error as not found (security)
- Invalid data from DB: Should be handled by Prisma types

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/ai/schemas/biography-v2.ts` | CREATE | New comprehensive schemas |
| `src/ai/schemas/biography-v2.test.ts` | CREATE | Schema validation tests |
| `src/ai/flows/biography/eligibility.ts` | CREATE | Eligibility checking |
| `src/ai/flows/biography/eligibility.test.ts` | CREATE | Eligibility tests |
| `src/ai/flows/biography/source-assembly.ts` | CREATE | Source material gathering |
| `src/ai/flows/biography/source-assembly.test.ts` | CREATE | Source assembly tests |

---

## Verification

```bash
# Run specific tests
npx vitest src/ai/schemas/biography-v2.test.ts
npx vitest src/ai/flows/biography/eligibility.test.ts
npx vitest src/ai/flows/biography/source-assembly.test.ts

# Run all Phase 1 tests
npx vitest --run src/ai/schemas/biography-v2 src/ai/flows/biography/eligibility src/ai/flows/biography/source-assembly

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All test cases pass (~15 tests)
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Eligibility correctly identifies people without source material
- [ ] Source assembly gathers all notes and events
- [ ] SourceMaterial schema enforces INV-AI007
