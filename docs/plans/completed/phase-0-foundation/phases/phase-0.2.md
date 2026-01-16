# Phase 0.2: Database & Prisma

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Configure Prisma ORM with PostgreSQL and create the core database schema (User, Constellation, Person). Establish database migrations and seed data for development.

---

## Invariants Enforced in This Phase

- **INV-D001**: Person IDs are globally unique UUIDs (v4)
- **INV-D002**: User IDs are Firebase UIDs (string, not UUID)
- **INV-D003**: Every Person belongs to exactly one Constellation
- **INV-D004**: Every Constellation has exactly one owner User
- **INV-D005**: deletedAt soft delete pattern for Person records

---

## TDD Steps

### Step 0.2.1: Write Failing Tests (RED)

Create `src/lib/prisma.test.ts`:

**Test Cases**:

1. `it('should connect to the database')` - Verifies Prisma client connects
2. `it('should have User model with Firebase UID as primary key')` - Schema validation
3. `it('should have Constellation model with UUID primary key')` - Schema validation
4. `it('should have Person model with UUID primary key')` - Schema validation
5. `it('should enforce User-Constellation one-to-one relationship')` - Constraint test
6. `it('should enforce Person-Constellation many-to-one relationship')` - Constraint test
7. `it('should reject Person without constellation')` - Constraint test

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Prisma Schema', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(result).toBeDefined();
    });
  });

  describe('User Model', () => {
    it('should create a user with Firebase UID as primary key', async () => {
      const firebaseUid = 'firebase-test-uid-123';
      const user = await prisma.user.create({
        data: {
          id: firebaseUid,
          email: 'test@example.com',
          displayName: 'Test User',
        },
      });

      expect(user.id).toBe(firebaseUid);
      expect(user.email).toBe('test@example.com');
    });

    it('should enforce unique email constraint', async () => {
      await prisma.user.create({
        data: {
          id: 'firebase-uid-1',
          email: 'same@example.com',
          displayName: 'User 1',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            id: 'firebase-uid-2',
            email: 'same@example.com',
            displayName: 'User 2',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Constellation Model', () => {
    it('should create a constellation with UUID primary key', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'firebase-uid-constellation',
          email: 'constellation@example.com',
          displayName: 'Constellation User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Test Family',
        },
      });

      // UUID format validation
      expect(constellation.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should enforce one-to-one User-Constellation relationship', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'firebase-uid-unique',
          email: 'unique@example.com',
          displayName: 'Unique User',
        },
      });

      await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'First Constellation',
        },
      });

      // Second constellation for same user should fail
      await expect(
        prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: 'Second Constellation',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Person Model', () => {
    it('should create a person with UUID primary key', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'firebase-uid-person',
          email: 'person@example.com',
          displayName: 'Person User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Person Family',
        },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'John',
          surname: 'Doe',
          createdBy: user.id,
        },
      });

      // UUID format validation
      expect(person.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(person.constellationId).toBe(constellation.id);
    });

    it('should require givenName for Person', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'firebase-uid-required',
          email: 'required@example.com',
          displayName: 'Required User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Required Family',
        },
      });

      await expect(
        prisma.person.create({
          data: {
            constellationId: constellation.id,
            // Missing givenName
            surname: 'Doe',
            createdBy: user.id,
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should support soft delete with deletedAt', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'firebase-uid-softdelete',
          email: 'softdelete@example.com',
          displayName: 'Soft Delete User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Soft Delete Family',
        },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Jane',
          createdBy: user.id,
        },
      });

      // Soft delete
      const deleted = await prisma.person.update({
        where: { id: person.id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.id,
        },
      });

      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.deletedBy).toBe(user.id);
    });
  });
});
```

### Step 0.2.2: Implement to Pass Tests (GREEN)

Create `prisma/schema.prisma`:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

model User {
  id          String   @id // Firebase UID - NOT auto-generated
  email       String   @unique
  displayName String
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastLoginAt DateTime?

  // Account deletion (14-day grace period per Q4.16.3)
  deletionRequestedAt  DateTime?
  deletionScheduledFor DateTime?

  // Settings (stored as JSON for flexibility)
  preferences  Json @default("{\"theme\":\"dark\",\"defaultPrivacy\":\"private\",\"defaultView\":\"3d\",\"speculationEnabled\":false,\"emailNotifications\":true,\"emailDigestFrequency\":\"daily\"}")
  subscription Json @default("{\"plan\":\"free\",\"status\":\"active\"}")

  // Relations
  constellation Constellation?
  // connections Connection[]  // Added in Phase 3
  // usage UsageTracking?       // Added in Phase 1
  // onboarding OnboardingProgress?  // Added in Phase 1

  @@map("users")
}

// ============================================================================
// CONSTELLATION (Family Tree Container)
// ============================================================================

model Constellation {
  id          String   @id @default(uuid())
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId     String   @unique // One constellation per user
  title       String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Configuration
  centeredPersonId String?

  // Cached stats (updated on person changes)
  personCount    Int @default(0)
  generationSpan Int @default(0)

  // Relations
  people     Person[]
  // events     Event[]      // Added in Phase 1
  // media      Media[]      // Added in Phase 1
  // sources    Source[]     // Added in Phase 1
  // shareLinks ShareLink[]  // Added in Phase 3

  @@map("constellations")
}

// ============================================================================
// PERSON (Family Member)
// ============================================================================

model Person {
  id              String        @id @default(uuid())
  constellation   Constellation @relation(fields: [constellationId], references: [id], onDelete: Cascade)
  constellationId String

  // Names (international support - per 08_data_model.md)
  givenName  String
  surname    String?
  maidenName String?
  patronymic String?   // Icelandic, Russian, Arabic, etc.
  matronymic String?
  nickname   String?
  suffix     String?
  nameOrder  NameOrder @default(WESTERN)

  // Demographics
  gender Gender?

  // Dates (GEDCOM-style flexible - stored as JSON)
  birthDate Json? // FuzzyDate
  deathDate Json? // FuzzyDate

  // Places (stored as JSON)
  birthPlace Json? // Place
  deathPlace Json? // Place

  // Content
  biography String? // Rich text (Tiptap JSON)

  // Speculative flag (per 03_core_concepts.md)
  speculative Boolean @default(false)

  // Soft delete (30-day recovery per Q4.15.2)
  deletedAt DateTime?
  deletedBy String?

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   // Firebase UID

  // Relations (added in later phases)
  // events Event[]
  // notes Note[]
  // media Media[]
  // parentRelationships ParentChildRelationship[] @relation("ChildParents")
  // childRelationships ParentChildRelationship[] @relation("ParentChildren")
  // spouseRelationships1 SpouseRelationship[] @relation("Spouse1")
  // spouseRelationships2 SpouseRelationship[] @relation("Spouse2")

  @@index([constellationId])
  @@index([constellationId, deletedAt])
  @@map("people")
}

// ============================================================================
// ENUMS
// ============================================================================

enum NameOrder {
  WESTERN           // "John Smith" - givenName + surname
  EASTERN           // "Smith John" - surname + givenName (Chinese, Japanese, Korean)
  PATRONYMIC        // "Jón Jónsson" - givenName + patronymic (Icelandic)
  PATRONYMIC_SUFFIX // "Ivan Ivanovich Petrov" - givenName + patronymic + surname (Russian)
  MATRONYMIC        // givenName + matronymic (rare)
}

enum Gender {
  MALE
  FEMALE
  OTHER
  UNKNOWN
}
```

Create `src/lib/prisma.ts`:

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### Step 0.2.3: Refactor

1. Add seed script for development data
2. Add index comments for query optimization
3. Create type exports for schema enums

---

## Implementation Details

### Seed Script

Create `prisma/seed.ts`:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user (simulating Firebase UID)
  const testUser = await prisma.user.upsert({
    where: { id: 'test-firebase-uid' },
    update: {},
    create: {
      id: 'test-firebase-uid',
      email: 'test@ancestralvision.dev',
      displayName: 'Test User',
    },
  });

  console.log('Created test user:', testUser.id);

  // Create test constellation
  const constellation = await prisma.constellation.upsert({
    where: { ownerId: testUser.id },
    update: {},
    create: {
      ownerId: testUser.id,
      title: "Test User's Family",
      description: 'A test constellation for development',
    },
  });

  console.log('Created constellation:', constellation.id);

  // Create test people (3 generations)
  const self = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Alex',
      surname: 'Smith',
      gender: 'OTHER',
      birthDate: { type: 'exact', year: 1990, month: 6, day: 15 },
      createdBy: testUser.id,
    },
  });

  const mother = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Maria',
      surname: 'Smith',
      maidenName: 'Johnson',
      gender: 'FEMALE',
      birthDate: { type: 'exact', year: 1965, month: 3, day: 22 },
      createdBy: testUser.id,
    },
  });

  const father = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Robert',
      surname: 'Smith',
      gender: 'MALE',
      birthDate: { type: 'exact', year: 1962, month: 8, day: 10 },
      createdBy: testUser.id,
    },
  });

  const grandmother = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Eleanor',
      surname: 'Johnson',
      gender: 'FEMALE',
      birthDate: { type: 'approximate', year: 1940, isApproximate: true },
      deathDate: { type: 'exact', year: 2015, month: 12, day: 1 },
      createdBy: testUser.id,
    },
  });

  // Update constellation stats
  await prisma.constellation.update({
    where: { id: constellation.id },
    data: {
      centeredPersonId: self.id,
      personCount: 4,
      generationSpan: 3,
    },
  });

  console.log('Created 4 people:', { self: self.id, mother: mother.id, father: father.id, grandmother: grandmother.id });
  console.log('Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | CREATE | Database schema definition |
| `prisma/seed.ts` | CREATE | Development seed data |
| `src/lib/prisma.ts` | CREATE | Prisma client singleton |
| `src/lib/prisma.test.ts` | CREATE | Schema validation tests |

---

## Verification

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Run schema tests
npx vitest run src/lib/prisma.test.ts

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] `npx prisma migrate dev` runs without errors
- [ ] `npx prisma studio` shows tables: users, constellations, people
- [ ] Seed script creates test data
- [ ] Prisma client singleton avoids multiple connections
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] INV-D001 through INV-D005 enforced by tests
