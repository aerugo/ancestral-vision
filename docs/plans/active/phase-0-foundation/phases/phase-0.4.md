# Phase 0.4: GraphQL API

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Create GraphQL API with Yoga at `/api/graphql`. Implement schema with User, Constellation, Person types and basic CRUD operations with authentication middleware.

---

## Invariants Enforced in This Phase

- **INV-S001**: All GraphQL mutations require authenticated user
- **INV-S002**: Users can only access their own Constellation
- **INV-A003**: GraphQL context always contains user (null if unauthenticated)
- **INV-A004**: All resolvers validate authorization before data access

---

## TDD Steps

### Step 0.4.1: Write Failing Tests (RED)

Create `src/graphql/resolvers/user.test.ts`:

**Test Cases**:

1. `it('should return current user for authenticated request')` - me query
2. `it('should return null for unauthenticated request')` - auth check
3. `it('should reject mutations without authentication')` - security

Create `src/graphql/resolvers/constellation.test.ts`:

**Test Cases**:

1. `it('should return user constellation')` - basic query
2. `it('should create constellation for new user')` - mutation
3. `it('should reject access to other user constellation')` - authorization

Create `src/graphql/resolvers/person.test.ts`:

**Test Cases**:

1. `it('should create person in user constellation')` - mutation
2. `it('should list people in constellation')` - query
3. `it('should reject creating person in other user constellation')` - authorization

```typescript
// src/graphql/resolvers/user.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer, createTestContext } from '@/tests/graphql-test-utils';

describe('User Resolvers', () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Query: me', () => {
    it('should return current user for authenticated request', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'test-user-id',
        email: 'test@example.com',
      });

      const result = await server.executeOperation(
        {
          query: `
            query Me {
              me {
                id
                email
                displayName
              }
            }
          `,
        },
        context
      );

      expect(result.data?.me).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        displayName: expect.any(String),
      });
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            query Me {
              me {
                id
                email
              }
            }
          `,
        },
        context
      );

      expect(result.data?.me).toBeNull();
    });
  });
});
```

```typescript
// src/graphql/resolvers/constellation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer, createTestContext, seedTestUser } from '@/tests/graphql-test-utils';

describe('Constellation Resolvers', () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Query: constellation', () => {
    it('should return user constellation', async () => {
      const { user, constellation } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await server.executeOperation(
        {
          query: `
            query Constellation {
              constellation {
                id
                title
                personCount
              }
            }
          `,
        },
        context
      );

      expect(result.data?.constellation).toEqual({
        id: constellation.id,
        title: constellation.title,
        personCount: expect.any(Number),
      });
    });

    it('should return null if user has no constellation', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'user-without-constellation',
      });

      const result = await server.executeOperation(
        {
          query: `
            query Constellation {
              constellation {
                id
              }
            }
          `,
        },
        context
      );

      expect(result.data?.constellation).toBeNull();
    });
  });

  describe('Mutation: createConstellation', () => {
    it('should create constellation for authenticated user', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'new-user-id',
        email: 'new@example.com',
      });

      const result = await server.executeOperation(
        {
          query: `
            mutation CreateConstellation($input: CreateConstellationInput!) {
              createConstellation(input: $input) {
                id
                title
              }
            }
          `,
          variables: {
            input: {
              title: 'My Family Tree',
            },
          },
        },
        context
      );

      expect(result.data?.createConstellation).toEqual({
        id: expect.any(String),
        title: 'My Family Tree',
      });
    });

    it('should reject mutation without authentication', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            mutation CreateConstellation($input: CreateConstellationInput!) {
              createConstellation(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { title: 'Test' },
          },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('authentication');
    });
  });
});
```

```typescript
// src/graphql/resolvers/person.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer, createTestContext, seedTestUser } from '@/tests/graphql-test-utils';

describe('Person Resolvers', () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Mutation: createPerson', () => {
    it('should create person in user constellation', async () => {
      const { user, constellation } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await server.executeOperation(
        {
          query: `
            mutation CreatePerson($input: CreatePersonInput!) {
              createPerson(input: $input) {
                id
                givenName
                surname
              }
            }
          `,
          variables: {
            input: {
              givenName: 'John',
              surname: 'Doe',
            },
          },
        },
        context
      );

      expect(result.data?.createPerson).toEqual({
        id: expect.any(String),
        givenName: 'John',
        surname: 'Doe',
      });
    });

    it('should reject creating person without constellation', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'user-without-constellation',
      });

      const result = await server.executeOperation(
        {
          query: `
            mutation CreatePerson($input: CreatePersonInput!) {
              createPerson(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { givenName: 'Test' },
          },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('constellation');
    });
  });

  describe('Query: person', () => {
    it('should return person by id', async () => {
      const { user, constellation, people } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await server.executeOperation(
        {
          query: `
            query Person($id: ID!) {
              person(id: $id) {
                id
                givenName
                surname
              }
            }
          `,
          variables: { id: people[0].id },
        },
        context
      );

      expect(result.data?.person).toEqual({
        id: people[0].id,
        givenName: people[0].givenName,
        surname: people[0].surname,
      });
    });

    it('should reject access to person in other constellation', async () => {
      const { people: otherUserPeople } = await seedTestUser('other-user');
      const context = await createTestContext({
        authenticated: true,
        userId: 'my-user-id',
      });

      const result = await server.executeOperation(
        {
          query: `
            query Person($id: ID!) {
              person(id: $id) {
                id
              }
            }
          `,
          variables: { id: otherUserPeople[0].id },
        },
        context
      );

      expect(result.data?.person).toBeNull();
    });
  });
});
```

### Step 0.4.2: Implement to Pass Tests (GREEN)

**`src/graphql/schema.ts`**:

```typescript
// src/graphql/schema.ts
export const typeDefs = /* GraphQL */ `
  type Query {
    me: User
    constellation: Constellation
    person(id: ID!): Person
    people(
      constellationId: ID!
      includeDeleted: Boolean = false
    ): [Person!]!
  }

  type Mutation {
    createConstellation(input: CreateConstellationInput!): Constellation!
    updateConstellation(input: UpdateConstellationInput!): Constellation!
    createPerson(input: CreatePersonInput!): Person!
    updatePerson(id: ID!, input: UpdatePersonInput!): Person!
    deletePerson(id: ID!): Person!
  }

  type User {
    id: ID!
    email: String!
    displayName: String!
    avatarUrl: String
    createdAt: DateTime!
    constellation: Constellation
  }

  type Constellation {
    id: ID!
    title: String!
    description: String
    personCount: Int!
    generationSpan: Int!
    centeredPersonId: ID
    people: [Person!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Person {
    id: ID!
    givenName: String!
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder!
    displayName: String!
    gender: Gender
    birthDate: FuzzyDate
    deathDate: FuzzyDate
    birthPlace: Place
    deathPlace: Place
    biography: String
    speculative: Boolean!
    deletedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateConstellationInput {
    title: String!
    description: String
  }

  input UpdateConstellationInput {
    title: String
    description: String
    centeredPersonId: ID
  }

  input CreatePersonInput {
    givenName: String!
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder
    gender: Gender
    birthDate: FuzzyDateInput
    deathDate: FuzzyDateInput
    birthPlace: PlaceInput
    deathPlace: PlaceInput
    biography: String
    speculative: Boolean
  }

  input UpdatePersonInput {
    givenName: String
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder
    gender: Gender
    birthDate: FuzzyDateInput
    deathDate: FuzzyDateInput
    birthPlace: PlaceInput
    deathPlace: PlaceInput
    biography: String
    speculative: Boolean
  }

  enum NameOrder {
    WESTERN
    EASTERN
    PATRONYMIC
    PATRONYMIC_SUFFIX
    MATRONYMIC
  }

  enum Gender {
    MALE
    FEMALE
    OTHER
    UNKNOWN
  }

  scalar DateTime
  scalar FuzzyDate
  scalar Place

  input FuzzyDateInput {
    type: String!
    year: Int
    month: Int
    day: Int
    isApproximate: Boolean
    displayText: String
  }

  input PlaceInput {
    displayText: String!
    locality: String
    adminArea: String
    country: String
    countryCode: String
  }
`;
```

**`src/graphql/context.ts`**:

```typescript
// src/graphql/context.ts
import type { User } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

export interface GraphQLContext {
  user: User | null;
}

export async function createContext(request: Request): Promise<GraphQLContext> {
  const authHeader = request.headers.get('authorization');
  const user = await getCurrentUser(authHeader);
  return { user };
}
```

**`src/app/api/graphql/route.ts`**:

```typescript
// src/app/api/graphql/route.ts
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { createContext } from '@/graphql/context';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const { handleRequest } = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
});

export { handleRequest as GET, handleRequest as POST };
```

### Step 0.4.3: Refactor

1. Add input validation with Zod
2. Add error handling middleware
3. Add query complexity limiting

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/graphql/schema.ts` | CREATE | GraphQL type definitions |
| `src/graphql/context.ts` | CREATE | Context creation |
| `src/graphql/resolvers/index.ts` | CREATE | Resolver aggregation |
| `src/graphql/resolvers/user.ts` | CREATE | User resolvers |
| `src/graphql/resolvers/constellation.ts` | CREATE | Constellation resolvers |
| `src/graphql/resolvers/person.ts` | CREATE | Person resolvers |
| `src/graphql/resolvers/*.test.ts` | CREATE | Resolver tests |
| `src/app/api/graphql/route.ts` | CREATE | API endpoint |
| `tests/graphql-test-utils.ts` | CREATE | Test utilities |

---

## Verification

```bash
# Run GraphQL tests
npx vitest run src/graphql

# Start dev server
npm run dev

# Open GraphQL playground
open http://localhost:3000/api/graphql

# Test query (in playground)
query { me { id email } }

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All resolver tests pass
- [ ] GraphQL playground accessible at /api/graphql
- [ ] `me` query returns user for authenticated request
- [ ] `constellation` query returns user's constellation
- [ ] `createPerson` mutation creates person
- [ ] Mutations reject unauthenticated requests
- [ ] Authorization prevents cross-user access
- [ ] Type check passes
- [ ] Lint passes
