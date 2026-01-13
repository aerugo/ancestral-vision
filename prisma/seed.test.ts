/**
 * Seed Script Tests
 *
 * Verifies that the seed script creates expected test data:
 * - 1 test user
 * - 1 constellation
 * - 4 people (3 generations)
 *
 * Note: These tests run against a real database, so they require
 * a running PostgreSQL instance.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Gender } from '@prisma/client';
import { execSync } from 'child_process';

const TEST_USER_ID = 'test-firebase-uid';

// Check if database is available
async function isDatabaseAvailable(): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    return true;
  } catch {
    return false;
  }
}

describe('Seed Script', () => {
  let prisma: PrismaClient;
  let dbAvailable: boolean;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.warn('Database not available, skipping seed tests');
      return;
    }

    prisma = new PrismaClient();

    // Run the seed script
    try {
      execSync('npx prisma db seed', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env },
      });
    } catch (error) {
      console.error('Failed to run seed script:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('creates test user with correct data', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
    });

    expect(user).not.toBeNull();
    expect(user!.id).toBe(TEST_USER_ID);
    expect(user!.email).toBe('test@ancestralvision.dev');
    expect(user!.displayName).toBe('Test User');
  });

  it('creates constellation owned by test user', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    expect(constellation).not.toBeNull();
    expect(constellation!.ownerId).toBe(TEST_USER_ID);
    expect(constellation!.title).toBe("Test User's Family");
    expect(constellation!.description).toBe('A test constellation for development');
    expect(constellation!.personCount).toBe(4);
    expect(constellation!.generationSpan).toBe(3);
    expect(constellation!.centeredPersonId).not.toBeNull();
  });

  it('creates exactly 4 people in the constellation', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    expect(constellation).not.toBeNull();

    const people = await prisma.person.findMany({
      where: { constellationId: constellation!.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(people).toHaveLength(4);
  });

  it('creates self (Alex Smith) as centered person', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    expect(constellation).not.toBeNull();
    expect(constellation!.centeredPersonId).not.toBeNull();

    const centeredPerson = await prisma.person.findUnique({
      where: { id: constellation!.centeredPersonId! },
    });

    expect(centeredPerson).not.toBeNull();
    expect(centeredPerson!.givenName).toBe('Alex');
    expect(centeredPerson!.surname).toBe('Smith');
    expect(centeredPerson!.gender).toBe(Gender.OTHER);
  });

  it('creates mother with maiden name', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    const mother = await prisma.person.findFirst({
      where: {
        constellationId: constellation!.id,
        givenName: 'Maria',
      },
    });

    expect(mother).not.toBeNull();
    expect(mother!.surname).toBe('Smith');
    expect(mother!.maidenName).toBe('Johnson');
    expect(mother!.gender).toBe(Gender.FEMALE);
  });

  it('creates father', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    const father = await prisma.person.findFirst({
      where: {
        constellationId: constellation!.id,
        givenName: 'Robert',
      },
    });

    expect(father).not.toBeNull();
    expect(father!.surname).toBe('Smith');
    expect(father!.gender).toBe(Gender.MALE);
  });

  it('creates grandmother with death date', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    const grandmother = await prisma.person.findFirst({
      where: {
        constellationId: constellation!.id,
        givenName: 'Eleanor',
      },
    });

    expect(grandmother).not.toBeNull();
    expect(grandmother!.surname).toBe('Johnson');
    expect(grandmother!.gender).toBe(Gender.FEMALE);
    expect(grandmother!.deathDate).not.toBeNull();
  });

  it('all people have displayName set', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    const people = await prisma.person.findMany({
      where: { constellationId: constellation!.id },
    });

    for (const person of people) {
      expect(person.displayName).not.toBeNull();
      expect(person.displayName!.length).toBeGreaterThan(0);
    }
  });

  it('all people have createdBy set to test user', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: database not available');
      return;
    }

    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: TEST_USER_ID },
    });

    const people = await prisma.person.findMany({
      where: { constellationId: constellation!.id },
    });

    for (const person of people) {
      expect(person.createdBy).toBe(TEST_USER_ID);
    }
  });
});
