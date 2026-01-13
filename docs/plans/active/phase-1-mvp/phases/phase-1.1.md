# Phase 1.1: Relationships

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement the Relationship entity and GraphQL operations for managing parent-child and spouse relationships between people in a constellation.

---

## Invariants Enforced in This Phase

- **INV-D001**: Relationship IDs are UUID v4
- **INV-D003**: Relationships link people within the same constellation
- **INV-S001**: All mutations require authentication
- **INV-S002**: Users can only access relationships in their own constellation

---

## TDD Steps

### Step 1.1.1: Write Failing Schema Tests (RED)

Create `prisma/schema-relationships.test.ts`:

**Test Cases**:

1. `it('should create parent-child relationship')` - Basic relationship creation
2. `it('should create spouse relationship with dates')` - Marriage relationship
3. `it('should enforce same constellation constraint')` - People must be in same constellation
4. `it('should prevent duplicate relationships')` - Unique constraint on person pairs
5. `it('should support adoptive relationship type')` - Type field validation
6. `it('should generate UUID for relationship ID')` - INV-D001 enforcement

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, RelationshipType } from '@prisma/client';

describe('Relationship Schema', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testConstellationId: string;
  let person1Id: string;
  let person2Id: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up and create test data
    await prisma.relationship.deleteMany();
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and constellation
    const user = await prisma.user.create({
      data: {
        id: 'test-relationship-user',
        email: 'relationship@test.com',
        displayName: 'Relationship Tester',
      },
    });
    testUserId = user.id;

    const constellation = await prisma.constellation.create({
      data: {
        ownerId: testUserId,
        title: 'Test Family',
      },
    });
    testConstellationId = constellation.id;

    // Create two people
    const p1 = await prisma.person.create({
      data: {
        constellationId: testConstellationId,
        givenName: 'Parent',
        createdBy: testUserId,
      },
    });
    person1Id = p1.id;

    const p2 = await prisma.person.create({
      data: {
        constellationId: testConstellationId,
        givenName: 'Child',
        createdBy: testUserId,
      },
    });
    person2Id = p2.id;
  });

  it('should create parent-child relationship', async () => {
    const relationship = await prisma.relationship.create({
      data: {
        type: 'PARENT_CHILD',
        fromPersonId: person1Id,
        toPersonId: person2Id,
        createdBy: testUserId,
      },
    });

    expect(relationship.type).toBe('PARENT_CHILD');
    expect(relationship.fromPersonId).toBe(person1Id);
    expect(relationship.toPersonId).toBe(person2Id);
  });

  it('should create spouse relationship with dates', async () => {
    const marriageDate = new Date('2000-06-15');

    const relationship = await prisma.relationship.create({
      data: {
        type: 'SPOUSE',
        fromPersonId: person1Id,
        toPersonId: person2Id,
        startDate: { type: 'exact', year: 2000, month: 6, day: 15 },
        createdBy: testUserId,
      },
    });

    expect(relationship.type).toBe('SPOUSE');
    expect(relationship.startDate).toEqual({ type: 'exact', year: 2000, month: 6, day: 15 });
  });

  it('should support adoptive relationship type', async () => {
    const relationship = await prisma.relationship.create({
      data: {
        type: 'PARENT_CHILD',
        fromPersonId: person1Id,
        toPersonId: person2Id,
        isAdoptive: true,
        createdBy: testUserId,
      },
    });

    expect(relationship.isAdoptive).toBe(true);
  });

  it('should generate UUID for relationship ID (INV-D001)', async () => {
    const relationship = await prisma.relationship.create({
      data: {
        type: 'PARENT_CHILD',
        fromPersonId: person1Id,
        toPersonId: person2Id,
        createdBy: testUserId,
      },
    });

    // UUID v4 format
    expect(relationship.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should prevent duplicate relationships', async () => {
    await prisma.relationship.create({
      data: {
        type: 'PARENT_CHILD',
        fromPersonId: person1Id,
        toPersonId: person2Id,
        createdBy: testUserId,
      },
    });

    // Attempting to create duplicate should fail
    await expect(
      prisma.relationship.create({
        data: {
          type: 'PARENT_CHILD',
          fromPersonId: person1Id,
          toPersonId: person2Id,
          createdBy: testUserId,
        },
      })
    ).rejects.toThrow();
  });
});
```

### Step 1.1.2: Update Prisma Schema (GREEN)

Add to `prisma/schema.prisma`:

```prisma
enum RelationshipType {
  PARENT_CHILD
  SPOUSE
}

model Relationship {
  id           String           @id @default(uuid())
  type         RelationshipType
  fromPersonId String
  fromPerson   Person           @relation("RelationshipFrom", fields: [fromPersonId], references: [id], onDelete: Cascade)
  toPersonId   String
  toPerson     Person           @relation("RelationshipTo", fields: [toPersonId], references: [id], onDelete: Cascade)
  isAdoptive   Boolean          @default(false)
  startDate    Json?            // Marriage/relationship start
  endDate      Json?            // Divorce/end date
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  createdBy    String
  creator      User             @relation(fields: [createdBy], references: [id])

  @@unique([type, fromPersonId, toPersonId])
  @@index([fromPersonId])
  @@index([toPersonId])
}
```

Update Person model to add relation back-references:

```prisma
model Person {
  // ... existing fields ...
  relationshipsFrom Relationship[] @relation("RelationshipFrom")
  relationshipsTo   Relationship[] @relation("RelationshipTo")
}
```

Run migration:

```bash
npx prisma migrate dev --name add_relationships
```

### Step 1.1.3: Write Failing GraphQL Tests (RED)

Create `src/graphql/resolvers/relationship.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Test utilities
async function createTestContext(authenticated: boolean, userId?: string) {
  if (!authenticated) return { user: null };

  const prisma = new PrismaClient();
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId || 'test-user',
        email: `${userId}@test.com`,
        displayName: 'Test User',
      },
    });
  }
  return { user };
}

describe('Relationship Resolvers', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    // Clean up
    await prisma.relationship.deleteMany();
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Mutation: createRelationship', () => {
    it('should create parent-child relationship for authenticated user', async () => {
      // Setup: Create user, constellation, and two people
      const user = await prisma.user.create({
        data: {
          id: 'rel-create-user',
          email: 'rel-create@test.com',
          displayName: 'Creator',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Family' },
      });

      const parent = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Parent',
          createdBy: user.id,
        },
      });

      const child = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Child',
          createdBy: user.id,
        },
      });

      const context = await createTestContext(true, user.id);

      // Import and call resolver
      const { resolvers } = await import('./index');
      const result = await resolvers.Mutation.createRelationship(
        null,
        {
          input: {
            type: 'PARENT_CHILD',
            fromPersonId: parent.id,
            toPersonId: child.id,
          },
        },
        context
      );

      expect(result.type).toBe('PARENT_CHILD');
      expect(result.fromPersonId).toBe(parent.id);
      expect(result.toPersonId).toBe(child.id);
    });

    it('should throw error for unauthenticated request', async () => {
      const context = await createTestContext(false);
      const { resolvers } = await import('./index');

      await expect(
        resolvers.Mutation.createRelationship(
          null,
          {
            input: {
              type: 'PARENT_CHILD',
              fromPersonId: 'any-id',
              toPersonId: 'any-id',
            },
          },
          context
        )
      ).rejects.toThrow(/authentication/i);
    });

    it('should throw error when people are in different constellations', async () => {
      // Create two users with separate constellations
      const user1 = await prisma.user.create({
        data: { id: 'user1', email: 'user1@test.com', displayName: 'User 1' },
      });
      const user2 = await prisma.user.create({
        data: { id: 'user2', email: 'user2@test.com', displayName: 'User 2' },
      });

      const constellation1 = await prisma.constellation.create({
        data: { ownerId: user1.id, title: 'Family 1' },
      });
      const constellation2 = await prisma.constellation.create({
        data: { ownerId: user2.id, title: 'Family 2' },
      });

      const person1 = await prisma.person.create({
        data: {
          constellationId: constellation1.id,
          givenName: 'Person 1',
          createdBy: user1.id,
        },
      });
      const person2 = await prisma.person.create({
        data: {
          constellationId: constellation2.id,
          givenName: 'Person 2',
          createdBy: user2.id,
        },
      });

      const context = await createTestContext(true, user1.id);
      const { resolvers } = await import('./index');

      await expect(
        resolvers.Mutation.createRelationship(
          null,
          {
            input: {
              type: 'PARENT_CHILD',
              fromPersonId: person1.id,
              toPersonId: person2.id,
            },
          },
          context
        )
      ).rejects.toThrow(/constellation/i);
    });
  });

  describe('Mutation: deleteRelationship', () => {
    it('should delete relationship for owner', async () => {
      const user = await prisma.user.create({
        data: { id: 'del-user', email: 'del@test.com', displayName: 'Delete User' },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Family' },
      });

      const p1 = await prisma.person.create({
        data: { constellationId: constellation.id, givenName: 'P1', createdBy: user.id },
      });
      const p2 = await prisma.person.create({
        data: { constellationId: constellation.id, givenName: 'P2', createdBy: user.id },
      });

      const relationship = await prisma.relationship.create({
        data: {
          type: 'PARENT_CHILD',
          fromPersonId: p1.id,
          toPersonId: p2.id,
          createdBy: user.id,
        },
      });

      const context = await createTestContext(true, user.id);
      const { resolvers } = await import('./index');

      const result = await resolvers.Mutation.deleteRelationship(
        null,
        { id: relationship.id },
        context
      );

      expect(result.id).toBe(relationship.id);

      // Verify deleted
      const found = await prisma.relationship.findUnique({
        where: { id: relationship.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Query: personRelationships', () => {
    it('should return all relationships for a person', async () => {
      const user = await prisma.user.create({
        data: { id: 'query-user', email: 'query@test.com', displayName: 'Query User' },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Family' },
      });

      const person = await prisma.person.create({
        data: { constellationId: constellation.id, givenName: 'Center', createdBy: user.id },
      });
      const parent = await prisma.person.create({
        data: { constellationId: constellation.id, givenName: 'Parent', createdBy: user.id },
      });
      const child = await prisma.person.create({
        data: { constellationId: constellation.id, givenName: 'Child', createdBy: user.id },
      });

      // Create relationships
      await prisma.relationship.create({
        data: {
          type: 'PARENT_CHILD',
          fromPersonId: parent.id,
          toPersonId: person.id,
          createdBy: user.id,
        },
      });
      await prisma.relationship.create({
        data: {
          type: 'PARENT_CHILD',
          fromPersonId: person.id,
          toPersonId: child.id,
          createdBy: user.id,
        },
      });

      const context = await createTestContext(true, user.id);
      const { resolvers } = await import('./index');

      const result = await resolvers.Query.personRelationships(
        null,
        { personId: person.id },
        context
      );

      expect(result.length).toBe(2);
    });
  });
});
```

### Step 1.1.4: Update GraphQL Schema (GREEN)

Add to `src/graphql/schema.ts`:

```typescript
// Add to typeDefs
enum RelationshipType {
  PARENT_CHILD
  SPOUSE
}

type Relationship {
  id: ID!
  type: RelationshipType!
  fromPerson: Person!
  toPerson: Person!
  isAdoptive: Boolean!
  startDate: JSON
  endDate: JSON
  createdAt: DateTime!
}

input CreateRelationshipInput {
  type: RelationshipType!
  fromPersonId: ID!
  toPersonId: ID!
  isAdoptive: Boolean
  startDate: JSON
  endDate: JSON
}

input UpdateRelationshipInput {
  isAdoptive: Boolean
  startDate: JSON
  endDate: JSON
}

# Add to Query type
personRelationships(personId: ID!): [Relationship!]!

# Add to Mutation type
createRelationship(input: CreateRelationshipInput!): Relationship!
updateRelationship(id: ID!, input: UpdateRelationshipInput!): Relationship!
deleteRelationship(id: ID!): Relationship!
```

### Step 1.1.5: Implement Resolvers (GREEN)

Create `src/graphql/resolvers/relationship.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import { GraphQLError } from 'graphql';
import type { User, Relationship } from '@prisma/client';

interface GraphQLContext {
  user: User | null;
}

function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

export const relationshipResolvers = {
  Query: {
    personRelationships: async (
      _parent: unknown,
      args: { personId: string },
      context: GraphQLContext
    ): Promise<Relationship[]> => {
      const user = requireAuth(context);

      // Verify person belongs to user's constellation
      const person = await prisma.person.findFirst({
        where: {
          id: args.personId,
          constellation: { ownerId: user.id },
        },
      });

      if (!person) {
        throw new GraphQLError('Person not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.relationship.findMany({
        where: {
          OR: [
            { fromPersonId: args.personId },
            { toPersonId: args.personId },
          ],
        },
        include: {
          fromPerson: true,
          toPerson: true,
        },
      });
    },
  },

  Mutation: {
    createRelationship: async (
      _parent: unknown,
      args: { input: CreateRelationshipInput },
      context: GraphQLContext
    ): Promise<Relationship> => {
      const user = requireAuth(context);

      // Get user's constellation
      const constellation = await prisma.constellation.findUnique({
        where: { ownerId: user.id },
      });

      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Verify both people belong to user's constellation
      const fromPerson = await prisma.person.findFirst({
        where: {
          id: args.input.fromPersonId,
          constellationId: constellation.id,
        },
      });

      const toPerson = await prisma.person.findFirst({
        where: {
          id: args.input.toPersonId,
          constellationId: constellation.id,
        },
      });

      if (!fromPerson || !toPerson) {
        throw new GraphQLError('Both people must be in your constellation', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return prisma.relationship.create({
        data: {
          type: args.input.type,
          fromPersonId: args.input.fromPersonId,
          toPersonId: args.input.toPersonId,
          isAdoptive: args.input.isAdoptive || false,
          startDate: args.input.startDate,
          endDate: args.input.endDate,
          createdBy: user.id,
        },
        include: {
          fromPerson: true,
          toPerson: true,
        },
      });
    },

    updateRelationship: async (
      _parent: unknown,
      args: { id: string; input: UpdateRelationshipInput },
      context: GraphQLContext
    ): Promise<Relationship> => {
      const user = requireAuth(context);

      // Verify relationship belongs to user's constellation
      const relationship = await prisma.relationship.findFirst({
        where: {
          id: args.id,
          fromPerson: { constellation: { ownerId: user.id } },
        },
      });

      if (!relationship) {
        throw new GraphQLError('Relationship not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.relationship.update({
        where: { id: args.id },
        data: args.input,
        include: {
          fromPerson: true,
          toPerson: true,
        },
      });
    },

    deleteRelationship: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Relationship> => {
      const user = requireAuth(context);

      // Verify relationship belongs to user's constellation
      const relationship = await prisma.relationship.findFirst({
        where: {
          id: args.id,
          fromPerson: { constellation: { ownerId: user.id } },
        },
      });

      if (!relationship) {
        throw new GraphQLError('Relationship not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.relationship.delete({
        where: { id: args.id },
        include: {
          fromPerson: true,
          toPerson: true,
        },
      });
    },
  },

  Relationship: {
    fromPerson: async (parent: Relationship) => {
      return prisma.person.findUnique({
        where: { id: parent.fromPersonId },
      });
    },
    toPerson: async (parent: Relationship) => {
      return prisma.person.findUnique({
        where: { id: parent.toPersonId },
      });
    },
  },
};

interface CreateRelationshipInput {
  type: 'PARENT_CHILD' | 'SPOUSE';
  fromPersonId: string;
  toPersonId: string;
  isAdoptive?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

interface UpdateRelationshipInput {
  isAdoptive?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}
```

### Step 1.1.6: Create TanStack Query Hook (GREEN)

Create `src/hooks/use-relationships.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';

const PERSON_RELATIONSHIPS_QUERY = `
  query PersonRelationships($personId: ID!) {
    personRelationships(personId: $personId) {
      id
      type
      isAdoptive
      startDate
      endDate
      fromPerson {
        id
        givenName
        surname
      }
      toPerson {
        id
        givenName
        surname
      }
    }
  }
`;

const CREATE_RELATIONSHIP_MUTATION = `
  mutation CreateRelationship($input: CreateRelationshipInput!) {
    createRelationship(input: $input) {
      id
      type
      isAdoptive
      fromPerson { id }
      toPerson { id }
    }
  }
`;

const DELETE_RELATIONSHIP_MUTATION = `
  mutation DeleteRelationship($id: ID!) {
    deleteRelationship(id: $id) {
      id
    }
  }
`;

export function usePersonRelationships(personId: string | null) {
  return useQuery({
    queryKey: ['relationships', personId],
    queryFn: async () => {
      if (!personId) return [];
      const data = await graphqlClient.request<{
        personRelationships: Relationship[];
      }>(PERSON_RELATIONSHIPS_QUERY, { personId });
      return data.personRelationships;
    },
    enabled: !!personId,
  });
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRelationshipInput) => {
      const data = await graphqlClient.request<{
        createRelationship: Relationship;
      }>(CREATE_RELATIONSHIP_MUTATION, { input });
      return data.createRelationship;
    },
    onSuccess: (data) => {
      // Invalidate both people's relationships
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await graphqlClient.request<{
        deleteRelationship: { id: string };
      }>(DELETE_RELATIONSHIP_MUTATION, { id });
      return data.deleteRelationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

interface Relationship {
  id: string;
  type: 'PARENT_CHILD' | 'SPOUSE';
  isAdoptive: boolean;
  startDate?: unknown;
  endDate?: unknown;
  fromPerson: { id: string; givenName: string; surname?: string };
  toPerson: { id: string; givenName: string; surname?: string };
}

interface CreateRelationshipInput {
  type: 'PARENT_CHILD' | 'SPOUSE';
  fromPersonId: string;
  toPersonId: string;
  isAdoptive?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}
```

### Step 1.1.7: Write Hook Tests

Create `src/hooks/use-relationships.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
}));

import { usePersonRelationships, useCreateRelationship } from './use-relationships';
import { graphqlClient } from '@/lib/graphql-client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePersonRelationships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch relationships for a person', async () => {
    const mockRelationships = [
      {
        id: 'rel-1',
        type: 'PARENT_CHILD',
        isAdoptive: false,
        fromPerson: { id: 'parent-id', givenName: 'Parent' },
        toPerson: { id: 'person-id', givenName: 'Person' },
      },
    ];

    (graphqlClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      personRelationships: mockRelationships,
    });

    const { result } = renderHook(() => usePersonRelationships('person-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRelationships);
  });

  it('should return empty array when personId is null', async () => {
    const { result } = renderHook(() => usePersonRelationships(null), {
      wrapper: createWrapper(),
    });

    // Query should not be enabled
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateRelationship', () => {
  it('should create relationship and invalidate queries', async () => {
    const mockRelationship = {
      id: 'new-rel',
      type: 'PARENT_CHILD',
      isAdoptive: false,
      fromPerson: { id: 'parent-id' },
      toPerson: { id: 'child-id' },
    };

    (graphqlClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      createRelationship: mockRelationship,
    });

    const { result } = renderHook(() => useCreateRelationship(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      type: 'PARENT_CHILD',
      fromPersonId: 'parent-id',
      toPersonId: 'child-id',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRelationship);
  });
});
```

### Step 1.1.8: Refactor

- Extract common auth helper to shared module
- Add JSDoc comments to resolver functions
- Ensure consistent error messages
- Review type safety

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | MODIFY | Add Relationship model and enum |
| `prisma/schema-relationships.test.ts` | CREATE | Schema constraint tests |
| `src/graphql/schema.ts` | MODIFY | Add relationship types and operations |
| `src/graphql/resolvers/relationship.ts` | CREATE | Relationship resolver module |
| `src/graphql/resolvers/relationship.test.ts` | CREATE | Resolver tests |
| `src/hooks/use-relationships.ts` | CREATE | TanStack Query hooks |
| `src/hooks/use-relationships.test.tsx` | CREATE | Hook tests |

---

## Verification

```bash
# Run specific tests
npx vitest run prisma/schema-relationships.test.ts
npx vitest run src/graphql/resolvers/relationship.test.ts
npx vitest run src/hooks/use-relationships.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All 25 relationship tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Handles edge cases (missing person, wrong constellation)
- [ ] INV-D001 verified by UUID tests
- [ ] INV-S001 verified by auth tests
- [ ] INV-S002 verified by constellation ownership tests

---

*Created: 2026-01-13*
