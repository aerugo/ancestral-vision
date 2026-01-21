/**
 * Context Mining Tests
 *
 * Tests for finding relatives and extracting relevant context
 * for biography generation.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-S002: Constellation Isolation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const {
  mockParentChildFindMany,
  mockSpouseFindMany,
  mockPersonFindMany,
  mockGenerate,
} = vi.hoisted(() => ({
  mockParentChildFindMany: vi.fn(),
  mockSpouseFindMany: vi.fn(),
  mockPersonFindMany: vi.fn(),
  mockGenerate: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    parentChildRelationship: {
      findMany: mockParentChildFindMany,
    },
    spouseRelationship: {
      findMany: mockSpouseFindMany,
    },
    person: {
      findMany: mockPersonFindMany,
    },
  },
}));

// Mock Genkit
vi.mock('@/ai/genkit', () => ({
  getAI: () => ({
    generate: mockGenerate,
  }),
  getDefaultModel: () => 'googleai/gemini-3-pro-preview',
  getModel: () => 'googleai/gemini-3-flash-preview',
  getRetryMiddleware: () => ({}), // Mock retry middleware as passthrough
}));

// Import after mock setup
import { findRelatives, extractRelatedContext } from './context-mining';
import type { PersonDetails, RelativeInfo } from '@/ai/schemas/biography';

describe('findRelatives', () => {
  const PERSON_ID = 'person-123';
  const CONSTELLATION_ID = 'constellation-456';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no relationships
    mockParentChildFindMany.mockResolvedValue([]);
    mockSpouseFindMany.mockResolvedValue([]);
    mockPersonFindMany.mockResolvedValue([]);
  });

  describe('finding parents', () => {
    it('should find all parents', async () => {
      // Person has two parents
      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        // Query for parents (where child = person)
        if (where?.childId === PERSON_ID) {
          return [
            {
              parentId: 'parent-1',
              childId: PERSON_ID,
              parent: {
                id: 'parent-1',
                displayName: 'Father Smith',
                biography: 'Father biography...',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [{ id: 'note-1', title: 'Note', content: 'Content', createdAt: new Date() }],
              },
            },
            {
              parentId: 'parent-2',
              childId: PERSON_ID,
              parent: {
                id: 'parent-2',
                displayName: 'Mother Smith',
                biography: null,
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      const parents = relatives.filter((r) => r.relationshipType === 'parent');
      expect(parents).toHaveLength(2);
      expect(parents[0]!.personId).toBe('parent-1');
      expect(parents[0]!.personName).toBe('Father Smith');
      expect(parents[0]!.biography).toBe('Father biography...');
    });
  });

  describe('finding children', () => {
    it('should find all children', async () => {
      // Person has children
      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        // Query for children (where parent = person)
        if (where?.parentId === PERSON_ID) {
          return [
            {
              parentId: PERSON_ID,
              childId: 'child-1',
              child: {
                id: 'child-1',
                displayName: 'John Jr.',
                biography: 'Child biography...',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      const children = relatives.filter((r) => r.relationshipType === 'child');
      expect(children).toHaveLength(1);
      expect(children[0]!.personId).toBe('child-1');
      expect(children[0]!.personName).toBe('John Jr.');
    });
  });

  describe('finding siblings', () => {
    it('should find all siblings via shared parents', async () => {
      // Set up: person has parent, parent has another child (sibling)
      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        // Query for person's parents (childId = PERSON_ID)
        if (where?.childId === PERSON_ID) {
          return [
            {
              parentId: 'parent-1',
              childId: PERSON_ID,
              parent: {
                id: 'parent-1',
                displayName: 'Father',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
              },
            },
          ];
        }
        // Query for siblings (parentId in array, childId not PERSON_ID)
        if (where?.parentId?.in && where?.childId?.not === PERSON_ID) {
          return [
            {
              parentId: 'parent-1',
              childId: 'sibling-1',
              child: {
                id: 'sibling-1',
                displayName: 'Sister Smith',
                biography: 'Sister biography',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
                events: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      const siblings = relatives.filter((r) => r.relationshipType === 'sibling');
      expect(siblings).toHaveLength(1);
      expect(siblings[0]!.personId).toBe('sibling-1');
      expect(siblings[0]!.personName).toBe('Sister Smith');
    });
  });

  describe('finding spouses', () => {
    it('should find all spouses', async () => {
      mockSpouseFindMany.mockResolvedValue([
        {
          person1Id: PERSON_ID,
          person2Id: 'spouse-1',
          person1: {
            id: PERSON_ID,
            displayName: 'Self',
          },
          person2: {
            id: 'spouse-1',
            displayName: 'Wife Smith',
            biography: 'Wife biography',
            constellationId: CONSTELLATION_ID,
            deletedAt: null,
            notes: [],
          },
        },
      ]);

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      const spouses = relatives.filter((r) => r.relationshipType === 'spouse');
      expect(spouses).toHaveLength(1);
      expect(spouses[0]!.personId).toBe('spouse-1');
      expect(spouses[0]!.personName).toBe('Wife Smith');
    });

    it('should find spouse when person is person2', async () => {
      mockSpouseFindMany.mockResolvedValue([
        {
          person1Id: 'spouse-1',
          person2Id: PERSON_ID,
          person1: {
            id: 'spouse-1',
            displayName: 'Husband Smith',
            biography: 'Husband biography',
            constellationId: CONSTELLATION_ID,
            deletedAt: null,
            notes: [],
          },
          person2: {
            id: PERSON_ID,
            displayName: 'Self',
          },
        },
      ]);

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      const spouses = relatives.filter((r) => r.relationshipType === 'spouse');
      expect(spouses).toHaveLength(1);
      expect(spouses[0]!.personId).toBe('spouse-1');
    });
  });

  describe('finding co-parents', () => {
    it('should find co-parents (other parents of children)', async () => {
      // Person has a child with another person (co-parent)
      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        // Query for person's children (parentId = PERSON_ID)
        if (where?.parentId === PERSON_ID) {
          return [
            {
              parentId: PERSON_ID,
              childId: 'child-1',
              child: {
                id: 'child-1',
                displayName: 'Child',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
                events: [],
              },
            },
          ];
        }
        // Query for co-parents (childId in array, parentId not PERSON_ID)
        if (where?.childId?.in && where?.parentId?.not === PERSON_ID) {
          return [
            {
              parentId: 'coparent-1',
              childId: 'child-1',
              parent: {
                id: 'coparent-1',
                displayName: 'Co-Parent',
                biography: 'Co-parent bio',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
                events: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      const coparents = relatives.filter((r) => r.relationshipType === 'coparent');
      expect(coparents).toHaveLength(1);
      expect(coparents[0]!.personId).toBe('coparent-1');
      expect(coparents[0]!.personName).toBe('Co-Parent');
    });
  });

  describe('constellation isolation (INV-S002)', () => {
    it('should exclude relatives from other constellations', async () => {
      const OTHER_CONSTELLATION = 'other-constellation';

      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        if (where?.childId === PERSON_ID) {
          return [
            {
              parentId: 'parent-1',
              childId: PERSON_ID,
              parent: {
                id: 'parent-1',
                displayName: 'Parent in Same',
                constellationId: CONSTELLATION_ID, // Same constellation
                deletedAt: null,
                notes: [],
              },
            },
            {
              parentId: 'parent-2',
              childId: PERSON_ID,
              parent: {
                id: 'parent-2',
                displayName: 'Parent in Other',
                constellationId: OTHER_CONSTELLATION, // Different constellation
                deletedAt: null,
                notes: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      // Should only include parent from same constellation
      expect(relatives).toHaveLength(1);
      expect(relatives[0]!.personId).toBe('parent-1');
    });

    it('should exclude soft-deleted relatives', async () => {
      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        if (where?.childId === PERSON_ID) {
          return [
            {
              parentId: 'parent-1',
              childId: PERSON_ID,
              parent: {
                id: 'parent-1',
                displayName: 'Active Parent',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
              },
            },
            {
              parentId: 'parent-2',
              childId: PERSON_ID,
              parent: {
                id: 'parent-2',
                displayName: 'Deleted Parent',
                constellationId: CONSTELLATION_ID,
                deletedAt: new Date(), // Soft-deleted
                notes: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      expect(relatives).toHaveLength(1);
      expect(relatives[0]!.personId).toBe('parent-1');
    });
  });

  describe('edge cases', () => {
    it('should handle person with no relatives', async () => {
      // All mocks return empty arrays by default

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      expect(relatives).toEqual([]);
    });

    it('should not duplicate same person in multiple relationship types', async () => {
      // Same person is both spouse AND co-parent
      mockSpouseFindMany.mockResolvedValue([
        {
          person1Id: PERSON_ID,
          person2Id: 'spouse-1',
          person1: { id: PERSON_ID, displayName: 'Self' },
          person2: {
            id: 'spouse-1',
            displayName: 'Spouse',
            biography: 'Spouse bio',
            constellationId: CONSTELLATION_ID,
            deletedAt: null,
            notes: [],
          },
        },
      ]);

      mockParentChildFindMany.mockImplementation(async ({ where }) => {
        if (where?.parentId === PERSON_ID) {
          return [
            {
              parentId: PERSON_ID,
              childId: 'child-1',
              child: {
                id: 'child-1',
                displayName: 'Child',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
              },
            },
          ];
        }
        if (where?.childId === 'child-1') {
          return [
            {
              parentId: PERSON_ID,
              childId: 'child-1',
              parent: { id: PERSON_ID, displayName: 'Self', constellationId: CONSTELLATION_ID },
            },
            {
              parentId: 'spouse-1',
              childId: 'child-1',
              parent: {
                id: 'spouse-1',
                displayName: 'Spouse',
                biography: 'Spouse bio',
                constellationId: CONSTELLATION_ID,
                deletedAt: null,
                notes: [],
              },
            },
          ];
        }
        return [];
      });

      const relatives = await findRelatives(PERSON_ID, CONSTELLATION_ID);

      // Should have one entry for spouse (not duplicated as co-parent)
      const spouseEntries = relatives.filter(
        (r) => r.personId === 'spouse-1'
      );
      expect(spouseEntries).toHaveLength(1);
      expect(spouseEntries[0]!.relationshipType).toBe('spouse');
    });
  });
});

describe('extractRelatedContext', () => {
  const mockPersonDetails: PersonDetails = {
    personId: 'person-123',
    givenName: 'John',
    surname: 'Smith',
    displayName: 'John Smith',
    gender: 'MALE',
    birthDate: { type: 'exact', year: 1920 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extracting from biography', () => {
    it('should extract relevant facts from relative biography', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'James Smith',
          biography:
            'James was a carpenter who taught his trade to his children. He owned a workshop on Main Street.',
          notes: [],
          events: [],
        },
      ];

      mockGenerate.mockResolvedValue({
        text: JSON.stringify({
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'James Smith',
          relevantFacts: [
            {
              fact: 'James taught carpentry to his children',
              source: 'biography',
              relevanceReason: 'John likely learned carpentry from his father',
            },
          ],
        }),
      });

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      expect(context).toHaveLength(1);
      expect(context[0]!.relevantFacts).toHaveLength(1);
      expect(context[0]!.relevantFacts[0]!.fact).toContain('carpentry');
      expect(context[0]!.relevantFacts[0]!.source).toBe('biography');
    });
  });

  describe('extracting from notes', () => {
    it('should extract relevant facts from relative notes', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'James Smith',
          notes: [
            {
              noteId: 'note-1',
              title: 'Family Memories',
              content:
                'John and his father used to fish together every Sunday at Miller Lake.',
              createdAt: new Date().toISOString(),
            },
          ],
          events: [],
        },
      ];

      mockGenerate.mockResolvedValue({
        text: JSON.stringify({
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'James Smith',
          relevantFacts: [
            {
              fact: 'John and James fished together every Sunday at Miller Lake',
              source: 'note',
              sourceId: 'note-1',
              relevanceReason: 'Directly describes a shared activity with John',
            },
          ],
        }),
      });

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      expect(context).toHaveLength(1);
      expect(context[0]!.relevantFacts[0]!.source).toBe('note');
      expect(context[0]!.relevantFacts[0]!.sourceId).toBe('note-1');
    });
  });

  describe('extracting from events', () => {
    it('should extract relevant facts from shared events', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'spouse',
          personId: 'spouse-1',
          personName: 'Mary Jones',
          notes: [],
          events: [
            {
              eventId: 'event-1',
              title: 'Wedding',
              description: 'John and Mary married at St. Paul Church',
              date: { type: 'exact', year: 1945, month: 6, day: 15 },
              location: { name: 'St. Paul Church, London' },
            },
          ],
        },
      ];

      mockGenerate.mockResolvedValue({
        text: JSON.stringify({
          relationshipType: 'spouse',
          personId: 'spouse-1',
          personName: 'Mary Jones',
          relevantFacts: [
            {
              fact: 'Married at St. Paul Church in June 1945',
              source: 'event',
              sourceId: 'event-1',
              relevanceReason: 'Wedding event directly involves John',
            },
          ],
        }),
      });

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      expect(context).toHaveLength(1);
      expect(context[0]!.relevantFacts[0]!.source).toBe('event');
      expect(context[0]!.relevantFacts[0]!.sourceId).toBe('event-1');
    });
  });

  describe('relevance reasoning', () => {
    it('should include relevance reason for each fact', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'sibling',
          personId: 'sibling-1',
          personName: 'Sarah Smith',
          biography: 'Sarah grew up on the family farm in rural England.',
          notes: [],
          events: [],
        },
      ];

      mockGenerate.mockResolvedValue({
        text: JSON.stringify({
          relationshipType: 'sibling',
          personId: 'sibling-1',
          personName: 'Sarah Smith',
          relevantFacts: [
            {
              fact: 'Grew up on a family farm in rural England',
              source: 'biography',
              relevanceReason:
                'John likely shared this childhood environment as a sibling',
            },
          ],
        }),
      });

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      expect(context[0]!.relevantFacts[0]!.relevanceReason).toBeDefined();
      expect(context[0]!.relevantFacts[0]!.relevanceReason.length).toBeGreaterThan(
        0
      );
    });
  });

  describe('filtering marginal information', () => {
    it('should filter out marginal information', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'James Smith',
          biography:
            'James had brown eyes and liked to read newspapers in the morning.',
          notes: [],
          events: [],
        },
      ];

      // AI returns empty facts when nothing is highly relevant
      mockGenerate.mockResolvedValue({
        text: JSON.stringify({
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'James Smith',
          relevantFacts: [], // Nothing highly relevant to John
        }),
      });

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      // No context should be returned when facts are empty
      expect(context).toHaveLength(0);
    });
  });

  describe('handling empty content', () => {
    it('should handle relative with no content', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'child',
          personId: 'child-1',
          personName: 'John Jr.',
          // No biography, notes, or events
          notes: [],
          events: [],
        },
      ];

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      // Should skip relatives with no content - no AI call made
      expect(mockGenerate).not.toHaveBeenCalled();
      expect(context).toHaveLength(0);
    });
  });

  describe('processing multiple relatives', () => {
    it('should process multiple relatives', async () => {
      const relatives: RelativeInfo[] = [
        {
          relationshipType: 'parent',
          personId: 'parent-1',
          personName: 'Father',
          biography: 'Father was a teacher.',
          notes: [],
          events: [],
        },
        {
          relationshipType: 'spouse',
          personId: 'spouse-1',
          personName: 'Wife',
          biography: 'Wife was a nurse.',
          notes: [],
          events: [],
        },
      ];

      mockGenerate
        .mockResolvedValueOnce({
          text: JSON.stringify({
            relationshipType: 'parent',
            personId: 'parent-1',
            personName: 'Father',
            relevantFacts: [
              {
                fact: 'Father was a teacher',
                source: 'biography',
                relevanceReason: 'May have influenced John education',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            relationshipType: 'spouse',
            personId: 'spouse-1',
            personName: 'Wife',
            relevantFacts: [
              {
                fact: 'Wife was a nurse',
                source: 'biography',
                relevanceReason: 'Shared profession context',
              },
            ],
          }),
        });

      const context = await extractRelatedContext(mockPersonDetails, relatives);

      expect(context).toHaveLength(2);
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });
  });
});
