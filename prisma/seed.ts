/**
 * Database Seed Script
 *
 * Creates test data for development:
 * - 1 test user (simulating Firebase UID)
 * - 1 constellation
 * - 4 people (3 generations)
 *
 * Run with: npx prisma db seed
 */
import { PrismaClient, Gender, NameOrder } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clean existing test data (if any)
  console.log('Cleaning existing test data...');
  await prisma.person.deleteMany({
    where: { constellation: { ownerId: 'test-firebase-uid' } },
  });
  await prisma.constellation.deleteMany({
    where: { ownerId: 'test-firebase-uid' },
  });
  await prisma.user.deleteMany({
    where: { id: 'test-firebase-uid' },
  });

  // Create test user (simulating Firebase UID)
  console.log('Creating test user...');
  const testUser = await prisma.user.create({
    data: {
      id: 'test-firebase-uid',
      email: 'test@ancestralvision.dev',
      displayName: 'Test User',
    },
  });
  console.log(`  Created user: ${testUser.id}`);

  // Create constellation
  console.log('Creating constellation...');
  const constellation = await prisma.constellation.create({
    data: {
      ownerId: testUser.id,
      title: "Test User's Family",
      description: 'A test constellation for development',
    },
  });
  console.log(`  Created constellation: ${constellation.id}`);

  // Create test people (3 generations)
  console.log('Creating people...');

  const self = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Alex',
      surname: 'Smith',
      displayName: 'Alex Smith',
      gender: Gender.OTHER,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'exact', year: 1990, month: 6, day: 15 },
      createdBy: testUser.id,
    },
  });
  console.log(`  Created person: ${self.givenName} ${self.surname}`);

  const mother = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Maria',
      surname: 'Smith',
      maidenName: 'Johnson',
      displayName: 'Maria Smith',
      gender: Gender.FEMALE,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'exact', year: 1965, month: 3, day: 22 },
      createdBy: testUser.id,
    },
  });
  console.log(`  Created person: ${mother.givenName} ${mother.surname}`);

  const father = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Robert',
      surname: 'Smith',
      displayName: 'Robert Smith',
      gender: Gender.MALE,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'exact', year: 1962, month: 8, day: 10 },
      createdBy: testUser.id,
    },
  });
  console.log(`  Created person: ${father.givenName} ${father.surname}`);

  const grandmother = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Eleanor',
      surname: 'Johnson',
      displayName: 'Eleanor Johnson',
      gender: Gender.FEMALE,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'approximate', year: 1940, isApproximate: true },
      deathDate: { type: 'exact', year: 2015, month: 12, day: 1 },
      createdBy: testUser.id,
    },
  });
  console.log(`  Created person: ${grandmother.givenName} ${grandmother.surname}`);

  // Update constellation with centered person and stats
  await prisma.constellation.update({
    where: { id: constellation.id },
    data: {
      centeredPersonId: self.id,
      personCount: 4,
      generationSpan: 3,
    },
  });

  console.log('\nSeed Summary:');
  console.log('  User ID:', testUser.id);
  console.log('  Constellation ID:', constellation.id);
  console.log('  People created: 4');
  console.log('    - Self (centered):', self.id);
  console.log('    - Mother:', mother.id);
  console.log('    - Father:', father.id);
  console.log('    - Grandmother:', grandmother.id);
  console.log('\nSeeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
