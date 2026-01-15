/**
 * Template Seed Script Tests
 *
 * Integration tests for seeding template data from example-genealogy.json.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { seedTemplateData, cleanTemplateData, TEMPLATE_USER_ID } from './seed-template';

const prisma = new PrismaClient();

describe('seed-template', () => {
  beforeEach(async () => {
    // Clean up template user data before each test
    await cleanTemplateData();
  });

  afterAll(async () => {
    // Clean up and disconnect after all tests
    await cleanTemplateData();
    await prisma.$disconnect();
  });

  describe('seedTemplateData', () => {
    it('should create template user if not exists', async () => {
      await seedTemplateData();

      const user = await prisma.user.findUnique({
        where: { id: TEMPLATE_USER_ID },
      });

      expect(user).not.toBeNull();
      expect(user!.displayName).toBe('Template Person');
      expect(user!.email).toBe('template@ancestralvision.dev');
    });

    it('should skip user creation if already exists (idempotent)', async () => {
      // First seed
      await seedTemplateData();
      const firstUser = await prisma.user.findUnique({
        where: { id: TEMPLATE_USER_ID },
      });

      // Second seed - should not throw
      await seedTemplateData();
      const secondUser = await prisma.user.findUnique({
        where: { id: TEMPLATE_USER_ID },
      });

      expect(secondUser!.id).toBe(firstUser!.id);
      expect(secondUser!.email).toBe(firstUser!.email);
    });

    it('should create constellation for template user', async () => {
      await seedTemplateData();

      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
      });

      expect(constellation).not.toBeNull();
      expect(constellation!.title).toBe('Template Family');
    });

    it('should import all persons from JSON (119+ expected)', async () => {
      await seedTemplateData();

      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
        include: { people: true },
      });

      expect(constellation).not.toBeNull();
      // The example-genealogy.json has 119 persons
      expect(constellation!.people.length).toBeGreaterThanOrEqual(100);
    });

    it('should set centeredPersonId from JSON metadata', async () => {
      await seedTemplateData();

      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
      });

      expect(constellation!.centeredPersonId).not.toBeNull();
      // The centeredPersonId from example-genealogy.json
      expect(constellation!.centeredPersonId).toBe('2fdbb99d-9324-4c8c-b8f1-cd3aba32d58b');
    });

    it('should create parent-child relationships (50+ expected)', async () => {
      await seedTemplateData();

      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
      });

      const relationships = await prisma.parentChildRelationship.findMany({
        where: { constellationId: constellation!.id },
      });

      expect(relationships.length).toBeGreaterThanOrEqual(50);
    });

    it('should create spouse relationships (10+ expected)', async () => {
      await seedTemplateData();

      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
      });

      const relationships = await prisma.spouseRelationship.findMany({
        where: { constellationId: constellation!.id },
      });

      expect(relationships.length).toBeGreaterThanOrEqual(10);
    });

    it('should set onboarding status to COMPLETED', async () => {
      await seedTemplateData();

      const onboarding = await prisma.onboardingProgress.findFirst({
        where: { userId: TEMPLATE_USER_ID },
      });

      expect(onboarding).not.toBeNull();
      expect(onboarding!.status).toBe('COMPLETED');
    });

    it('should correctly map person fields', async () => {
      await seedTemplateData();

      // Find a known person from the genealogy (Sarah Elizabeth Martin)
      const person = await prisma.person.findFirst({
        where: {
          givenName: 'Sarah Elizabeth',
          surname: 'Martin',
          constellation: { ownerId: TEMPLATE_USER_ID },
        },
      });

      expect(person).not.toBeNull();
      expect(person!.givenName).toBe('Sarah Elizabeth');
      expect(person!.surname).toBe('Martin');
      expect(person!.gender).toBe('FEMALE');
      expect(person!.biography).not.toBeNull();
      expect(person!.biography!.length).toBeGreaterThan(100);
    });

    it('should update personCount on constellation', async () => {
      await seedTemplateData();

      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
      });

      expect(constellation!.personCount).toBeGreaterThanOrEqual(100);
    });
  });

  describe('cleanTemplateData', () => {
    it('should remove all template user data', async () => {
      // First seed
      await seedTemplateData();

      // Verify data exists
      const userBefore = await prisma.user.findUnique({
        where: { id: TEMPLATE_USER_ID },
      });
      expect(userBefore).not.toBeNull();

      // Clean
      await cleanTemplateData();

      // Verify data is gone
      const userAfter = await prisma.user.findUnique({
        where: { id: TEMPLATE_USER_ID },
      });
      expect(userAfter).toBeNull();

      const constellationAfter = await prisma.constellation.findFirst({
        where: { ownerId: TEMPLATE_USER_ID },
      });
      expect(constellationAfter).toBeNull();
    });
  });
});
