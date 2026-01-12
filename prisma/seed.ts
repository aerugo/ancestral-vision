/**
 * Prisma Database Seed Script
 *
 * Creates development test data for local development.
 * Run with: npx prisma db seed
 */
import { PrismaClient, NameOrder, Gender } from "@prisma/client";
import { computeDisplayName } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database...");

  // Create test user (simulating Firebase UID)
  const testUser = await prisma.user.upsert({
    where: { id: "test-firebase-uid" },
    update: {},
    create: {
      id: "test-firebase-uid",
      email: "test@ancestralvision.dev",
      displayName: "Test User",
    },
  });

  console.log("Created test user:", testUser.id);

  // Check if constellation already exists
  const existingConstellation = await prisma.constellation.findUnique({
    where: { ownerId: testUser.id },
  });

  let constellation;
  if (existingConstellation) {
    constellation = existingConstellation;
    console.log("Using existing constellation:", constellation.id);
  } else {
    constellation = await prisma.constellation.create({
      data: {
        ownerId: testUser.id,
        title: "Test User's Family",
        description: "A test constellation for development",
      },
    });
    console.log("Created constellation:", constellation.id);
  }

  // Create test people (3 generations) only if they don't exist
  const existingPeople = await prisma.person.findMany({
    where: { constellationId: constellation.id },
  });

  if (existingPeople.length > 0) {
    console.log("Seed data already exists, skipping person creation.");
    console.log("Existing people:", existingPeople.length);
  } else {
    // Create self
    const selfData = {
      givenName: "Alex",
      surname: "Smith",
      nameOrder: NameOrder.WESTERN,
    };
    const self = await prisma.person.create({
      data: {
        constellationId: constellation.id,
        ...selfData,
        displayName: computeDisplayName(selfData),
        gender: Gender.OTHER,
        birthDate: { type: "exact", year: 1990, month: 6, day: 15 },
        createdBy: testUser.id,
      },
    });

    // Create mother
    const motherData = {
      givenName: "Maria",
      surname: "Smith",
      nameOrder: NameOrder.WESTERN,
    };
    const mother = await prisma.person.create({
      data: {
        constellationId: constellation.id,
        ...motherData,
        maidenName: "Johnson",
        displayName: computeDisplayName(motherData),
        gender: Gender.FEMALE,
        birthDate: { type: "exact", year: 1965, month: 3, day: 22 },
        createdBy: testUser.id,
      },
    });

    // Create father
    const fatherData = {
      givenName: "Robert",
      surname: "Smith",
      nameOrder: NameOrder.WESTERN,
    };
    const father = await prisma.person.create({
      data: {
        constellationId: constellation.id,
        ...fatherData,
        displayName: computeDisplayName(fatherData),
        gender: Gender.MALE,
        birthDate: { type: "exact", year: 1962, month: 8, day: 10 },
        createdBy: testUser.id,
      },
    });

    // Create grandmother
    const grandmotherData = {
      givenName: "Eleanor",
      surname: "Johnson",
      nameOrder: NameOrder.WESTERN,
    };
    const grandmother = await prisma.person.create({
      data: {
        constellationId: constellation.id,
        ...grandmotherData,
        displayName: computeDisplayName(grandmotherData),
        gender: Gender.FEMALE,
        birthDate: { type: "approximate", year: 1940, isApproximate: true },
        deathDate: { type: "exact", year: 2015, month: 12, day: 1 },
        createdBy: testUser.id,
      },
    });

    // Create parent-child relationships
    await prisma.parentChildRelationship.createMany({
      data: [
        {
          parentId: mother.id,
          childId: self.id,
          constellationId: constellation.id,
          relationshipType: "BIOLOGICAL",
          createdBy: testUser.id,
        },
        {
          parentId: father.id,
          childId: self.id,
          constellationId: constellation.id,
          relationshipType: "BIOLOGICAL",
          createdBy: testUser.id,
        },
        {
          parentId: grandmother.id,
          childId: mother.id,
          constellationId: constellation.id,
          relationshipType: "BIOLOGICAL",
          createdBy: testUser.id,
        },
      ],
    });

    // Create spouse relationship
    await prisma.spouseRelationship.create({
      data: {
        person1Id: father.id,
        person2Id: mother.id,
        constellationId: constellation.id,
        marriageDate: { type: "exact", year: 1988, month: 6, day: 15 },
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

    console.log("Created 4 people:", {
      self: self.id,
      mother: mother.id,
      father: father.id,
      grandmother: grandmother.id,
    });
  }

  console.log("Seeding complete!");
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
