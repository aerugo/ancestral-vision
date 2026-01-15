/**
 * Template Data Seed Script
 *
 * Seeds the database with data from data/example-genealogy.json
 * for visual testing in development mode.
 *
 * Run with: npx ts-node prisma/seed-template.ts
 */
import { PrismaClient, Gender, NameOrder, OnboardingStatus, OnboardingStep, Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseGenealogyMetadata,
  mapPersonFields,
  parseParentChildLinks,
  parseSpouseLinks,
  type GenealogyJson,
} from '../src/lib/genealogy-import';

export const TEMPLATE_USER_ID = 'template-user';
const TEMPLATE_EMAIL = 'template@ancestralvision.dev';
const TEMPLATE_DISPLAY_NAME = 'Template Person';
const GENEALOGY_FILE_PATH = join(__dirname, '..', 'data', 'example-genealogy.json');

/** Force reseed even if template user exists */
const FORCE_RESEED = process.env.FORCE_RESEED === 'true';

const prisma = new PrismaClient();

/**
 * Clean all template user data from the database
 *
 * Removes user, constellation, people, relationships, and onboarding in proper order.
 */
export async function cleanTemplateData(): Promise<void> {
  // Get constellation first to delete related records
  const constellation = await prisma.constellation.findFirst({
    where: { ownerId: TEMPLATE_USER_ID },
  });

  if (constellation) {
    // Delete relationships first (foreign key constraints)
    await prisma.parentChildRelationship.deleteMany({
      where: { constellationId: constellation.id },
    });
    await prisma.spouseRelationship.deleteMany({
      where: { constellationId: constellation.id },
    });
    // Delete people
    await prisma.person.deleteMany({
      where: { constellationId: constellation.id },
    });
    // Delete constellation
    await prisma.constellation.delete({
      where: { id: constellation.id },
    });
  }

  // Delete onboarding progress
  await prisma.onboardingProgress.deleteMany({
    where: { userId: TEMPLATE_USER_ID },
  });

  // Delete user
  await prisma.user.deleteMany({
    where: { id: TEMPLATE_USER_ID },
  });
}

/**
 * Seed template data from example-genealogy.json
 *
 * This function is idempotent - it will skip seeding if the template user already exists.
 * Use cleanTemplateData() first if you need to reseed.
 */
export async function seedTemplateData(): Promise<void> {
  console.log('🌱 Template Mode Seeding...');

  // Check if template user already exists
  const existingUser = await prisma.user.findUnique({
    where: { id: TEMPLATE_USER_ID },
  });

  if (existingUser && !FORCE_RESEED) {
    console.log('✅ Template user already exists. Skipping seed.');
    console.log('   Use FORCE_RESEED=true to re-seed data.');
    return;
  }

  if (existingUser && FORCE_RESEED) {
    console.log('🔄 Force reseed requested. Cleaning existing data...');
    await cleanTemplateData();
  }

  // Read and parse the genealogy JSON file
  console.log('📖 Reading genealogy file...');
  let jsonContent: string;
  try {
    jsonContent = readFileSync(GENEALOGY_FILE_PATH, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read genealogy file at ${GENEALOGY_FILE_PATH}: ${error}`);
  }

  let genealogyJson: GenealogyJson;
  try {
    genealogyJson = JSON.parse(jsonContent) as GenealogyJson;
  } catch (error) {
    throw new Error(`Failed to parse genealogy JSON: ${error}`);
  }

  // Parse metadata
  const metadata = parseGenealogyMetadata(genealogyJson);
  const persons = genealogyJson.persons ?? [];
  const childLinks = genealogyJson.child_links ?? [];
  const spouseLinks = genealogyJson.spouse_links ?? [];

  console.log(`   Centered Person ID: ${metadata.centeredPersonId}`);
  console.log(`   Persons to import: ${persons.length}`);
  console.log(`   Parent-child links: ${childLinks.length}`);
  console.log(`   Spouse links: ${spouseLinks.length}`);

  // Create template user
  console.log('👤 Creating template user...');
  const user = await prisma.user.create({
    data: {
      id: TEMPLATE_USER_ID,
      email: TEMPLATE_EMAIL,
      displayName: TEMPLATE_DISPLAY_NAME,
    },
  });
  console.log(`   User ID: ${user.id}`);

  // Create constellation
  console.log('⭐ Creating constellation...');
  const constellation = await prisma.constellation.create({
    data: {
      ownerId: user.id,
      title: 'Template Family',
      description: 'Template genealogy data for visual testing',
    },
  });
  console.log(`   Constellation ID: ${constellation.id}`);

  // Import persons
  console.log('👥 Importing persons...');
  let importedCount = 0;
  for (const rawPerson of persons) {
    const mapped = mapPersonFields(rawPerson);

    await prisma.person.create({
      data: {
        id: mapped.id,
        constellationId: constellation.id,
        givenName: mapped.givenName,
        surname: mapped.surname,
        maidenName: mapped.maidenName,
        displayName: mapped.displayName,
        gender: mapped.gender as Gender | null,
        nameOrder: NameOrder.WESTERN,
        birthDate: (mapped.birthDate ?? undefined) as Prisma.InputJsonValue | undefined,
        birthPlace: (mapped.birthPlace ?? undefined) as Prisma.InputJsonValue | undefined,
        deathDate: (mapped.deathDate ?? undefined) as Prisma.InputJsonValue | undefined,
        deathPlace: (mapped.deathPlace ?? undefined) as Prisma.InputJsonValue | undefined,
        biography: mapped.biography,
        generation: mapped.generation,
        createdBy: user.id,
      },
    });
    importedCount++;
  }
  console.log(`   Imported ${importedCount} persons`);

  // Import parent-child relationships
  console.log('🔗 Creating parent-child relationships...');
  const parsedParentChildLinks = parseParentChildLinks(genealogyJson);
  let pcRelCount = 0;
  for (const link of parsedParentChildLinks) {
    try {
      await prisma.parentChildRelationship.create({
        data: {
          constellationId: constellation.id,
          parentId: link.parentId,
          childId: link.childId,
          createdBy: user.id,
        },
      });
      pcRelCount++;
    } catch (error) {
      // Skip if person IDs don't exist (might be missing from JSON)
      console.warn(`   Warning: Could not create parent-child link ${link.parentId} -> ${link.childId}: ${error}`);
    }
  }
  console.log(`   Created ${pcRelCount} parent-child relationships`);

  // Import spouse relationships
  console.log('💑 Creating spouse relationships...');
  const parsedSpouseLinks = parseSpouseLinks(genealogyJson);
  let spouseRelCount = 0;
  for (const link of parsedSpouseLinks) {
    try {
      await prisma.spouseRelationship.create({
        data: {
          constellationId: constellation.id,
          person1Id: link.person1Id,
          person2Id: link.person2Id,
          createdBy: user.id,
        },
      });
      spouseRelCount++;
    } catch (error) {
      // Skip if person IDs don't exist
      console.warn(`   Warning: Could not create spouse link ${link.person1Id} <-> ${link.person2Id}: ${error}`);
    }
  }
  console.log(`   Created ${spouseRelCount} spouse relationships`);

  // Update constellation with metadata
  console.log('📊 Updating constellation metadata...');
  await prisma.constellation.update({
    where: { id: constellation.id },
    data: {
      centeredPersonId: metadata.centeredPersonId,
      personCount: importedCount,
    },
  });

  // Create onboarding progress (marked as completed)
  console.log('✓ Setting onboarding as completed...');
  await prisma.onboardingProgress.create({
    data: {
      userId: user.id,
      status: OnboardingStatus.COMPLETED,
      currentStep: OnboardingStep.AHA_MOMENT,
      completedSteps: [
        OnboardingStep.TOUR,
        OnboardingStep.ADD_SELF,
        OnboardingStep.ADD_PARENTS,
        OnboardingStep.ADD_GRANDPARENTS,
        OnboardingStep.AHA_MOMENT,
      ],
      hasCompletedTour: true,
      completedAt: new Date(),
    },
  });

  console.log('\n✅ Template seeding complete!');
  console.log(`   User: ${user.id}`);
  console.log(`   Constellation: ${constellation.id}`);
  console.log(`   Persons: ${importedCount}`);
  console.log(`   Parent-child relationships: ${pcRelCount}`);
  console.log(`   Spouse relationships: ${spouseRelCount}`);
  console.log(`   Centered person: ${metadata.centeredPersonId}`);
}

// Run if executed directly
if (require.main === module) {
  seedTemplateData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error('❌ Seed error:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
