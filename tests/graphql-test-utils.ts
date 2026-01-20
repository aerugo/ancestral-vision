/**
 * GraphQL Test Utilities
 *
 * Provides helper functions for testing GraphQL resolvers with
 * database seeding, context creation, and cleanup.
 */
import { PrismaClient, type User, type Constellation, type Person } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test context for GraphQL resolvers
 */
export interface TestContext {
  user: User | null;
}

/**
 * Options for creating test context
 */
export interface TestContextOptions {
  authenticated?: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
}

/**
 * Create a test context with optional authenticated user
 */
export async function createTestContext(options: TestContextOptions): Promise<TestContext> {
  if (!options.authenticated) {
    return { user: null };
  }

  const userId = options.userId ?? 'test-user-id';
  const email = options.email ?? 'test@example.com';
  const displayName = options.displayName ?? 'Test User';

  // Ensure user exists in database
  let user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    user = await prisma.user.create({
      data: { id: userId, email, displayName },
    });
  }

  return { user };
}

/**
 * Result from seeding a test user
 */
export interface SeedResult {
  user: User;
  constellation: Constellation;
  people: Person[];
}

/**
 * Seed a test user with constellation and people
 */
export async function seedTestUser(userId = 'seed-test-user'): Promise<SeedResult> {
  // Clean up any existing data for this user
  await prisma.person.deleteMany({
    where: { constellation: { ownerId: userId } },
  });
  await prisma.constellation.deleteMany({ where: { ownerId: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test.com`,
      displayName: `User ${userId}`,
    },
  });

  const constellation = await prisma.constellation.create({
    data: {
      ownerId: user.id,
      title: `${userId}'s Family`,
    },
  });

  const people = await Promise.all([
    prisma.person.create({
      data: {
        constellationId: constellation.id,
        givenName: 'Person',
        surname: 'One',
        displayName: 'Person One',
        createdBy: user.id,
      },
    }),
    prisma.person.create({
      data: {
        constellationId: constellation.id,
        givenName: 'Person',
        surname: 'Two',
        displayName: 'Person Two',
        createdBy: user.id,
      },
    }),
  ]);

  return { user, constellation, people };
}

/**
 * Clean up test data from the database.
 * Only deletes records with test-specific prefixes to avoid interfering
 * with parallel tests.
 */
export async function cleanupTestData(): Promise<void> {
  // Test prefixes used across test files
  const testPrefixes = ['ai-', 'test-', 'seed-'];

  // Build OR conditions for each prefix
  const userConditions = testPrefixes.map(prefix => ({ id: { startsWith: prefix } }));

  // Clean up in correct order (respecting foreign keys)
  // First delete AI suggestions (new table from Phase 2.2)
  await prisma.aISuggestion.deleteMany({
    where: { OR: [
      ...testPrefixes.map(prefix => ({ userId: { startsWith: prefix } })),
      ...testPrefixes.map(prefix => ({ person: { createdBy: { startsWith: prefix } } })),
    ]},
  });

  await prisma.parentChildRelationship.deleteMany({
    where: { OR: testPrefixes.map(prefix => ({ createdBy: { startsWith: prefix } })) },
  });
  await prisma.spouseRelationship.deleteMany({
    where: { OR: testPrefixes.map(prefix => ({ createdBy: { startsWith: prefix } })) },
  });
  await prisma.person.deleteMany({
    where: { OR: testPrefixes.map(prefix => ({ createdBy: { startsWith: prefix } })) },
  });
  await prisma.constellation.deleteMany({
    where: { OR: userConditions },
  });
  await prisma.usageTracking.deleteMany({
    where: { OR: userConditions.map(c => ({ userId: c.id })) },
  });
  await prisma.user.deleteMany({
    where: { OR: userConditions },
  });
}

/**
 * Seed a test user with constellation and multiple people for relationship testing
 */
export async function seedTestUserWithPeople(
  userId = 'seed-relationship-user'
): Promise<SeedResult & { person3: Person }> {
  const result = await seedTestUser(userId);

  // Add a third person for spouse testing
  const person3 = await prisma.person.create({
    data: {
      constellationId: result.constellation.id,
      givenName: 'Person',
      surname: 'Three',
      displayName: 'Person Three',
      createdBy: result.user.id,
    },
  });

  return { ...result, person3 };
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { prisma as testPrisma };
