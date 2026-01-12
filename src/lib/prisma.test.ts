/**
 * Phase 0.2: Prisma Schema Tests
 *
 * TDD tests for database schema validation.
 * Integration tests require DATABASE_URL to be set.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

// Check if DATABASE_URL is valid before importing Prisma
const hasValidDatabaseUrl = (() => {
  const url = process.env["DATABASE_URL"];
  return url?.startsWith("postgresql://") || url?.startsWith("postgres://");
})();

describe("Prisma Client", () => {
  it("should export prisma module", async () => {
    if (!hasValidDatabaseUrl) {
      // Without valid DATABASE_URL, we can only test that the module exports something
      const prismaModule = await import("./prisma");
      expect(prismaModule).toBeDefined();
      expect(prismaModule.default).toBeDefined();
      expect(prismaModule.prisma).toBeDefined();
      return;
    }

    const { default: prisma, prisma: namedPrisma } = await import("./prisma");
    expect(prisma).toBeDefined();
    expect(namedPrisma).toBeDefined();
    expect(prisma).toBe(namedPrisma);
  });

  it("should return the same instance on multiple imports", async () => {
    if (!hasValidDatabaseUrl) {
      // Skip if no database URL
      return;
    }

    const { default: prisma1 } = await import("./prisma");
    const { default: prisma2 } = await import("./prisma");
    expect(prisma1).toBe(prisma2);
  });
});

describe("Prisma Schema Integration", () => {
  // Only run integration tests if DATABASE_URL is set and valid
  const shouldRunIntegrationTests = hasValidDatabaseUrl;

  // Dynamic import to avoid initialization errors when DATABASE_URL is invalid
  let prisma: Awaited<typeof import("./prisma")>["prisma"] | null = null;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) return;
    const module = await import("./prisma");
    prisma = module.prisma;
    await prisma.$connect();
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests || !prisma) return;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests || !prisma) return;
    // Clean up test data in reverse dependency order
    await prisma.match.deleteMany();
    await prisma.connection.deleteMany();
    await prisma.shareLink.deleteMany();
    await prisma.mediaPerson.deleteMany();
    await prisma.media.deleteMany();
    await prisma.note.deleteMany();
    await prisma.eventParticipant.deleteMany();
    await prisma.event.deleteMany();
    await prisma.source.deleteMany();
    await prisma.spouseRelationship.deleteMany();
    await prisma.parentChildRelationship.deleteMany();
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.usageTracking.deleteMany();
    await prisma.onboardingProgress.deleteMany();
    await prisma.user.deleteMany();
  });

  describe("Database Connection", () => {
    it.skipIf(!shouldRunIntegrationTests)(
      "should connect to the database",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const result = await prisma.$queryRaw<{ connected: number }[]>`SELECT 1 as connected`;
        expect(result).toBeDefined();
        expect(result[0]?.connected).toBe(1);
      }
    );
  });

  describe("User Model", () => {
    it.skipIf(!shouldRunIntegrationTests)(
      "should create a user with Firebase UID as primary key",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const firebaseUid = "firebase-test-uid-123";
        const user = await prisma.user.create({
          data: {
            id: firebaseUid,
            email: "test@example.com",
            displayName: "Test User",
          },
        });

        expect(user.id).toBe(firebaseUid);
        expect(user.email).toBe("test@example.com");
        expect(user.displayName).toBe("Test User");
      }
    );

    it.skipIf(!shouldRunIntegrationTests)(
      "should enforce unique email constraint",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        await prisma.user.create({
          data: {
            id: "firebase-uid-1",
            email: "same@example.com",
            displayName: "User 1",
          },
        });

        await expect(
          prisma.user.create({
            data: {
              id: "firebase-uid-2",
              email: "same@example.com",
              displayName: "User 2",
            },
          })
        ).rejects.toThrow();
      }
    );
  });

  describe("Constellation Model", () => {
    it.skipIf(!shouldRunIntegrationTests)(
      "should create a constellation with UUID primary key",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-constellation",
            email: "constellation@example.com",
            displayName: "Constellation User",
          },
        });

        const constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "Test Family",
          },
        });

        // UUID format validation
        expect(constellation.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(constellation.ownerId).toBe(user.id);
        expect(constellation.title).toBe("Test Family");
      }
    );

    it.skipIf(!shouldRunIntegrationTests)(
      "should enforce one-to-one User-Constellation relationship",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-unique",
            email: "unique@example.com",
            displayName: "Unique User",
          },
        });

        await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "First Constellation",
          },
        });

        // Second constellation for same user should fail due to unique constraint
        await expect(
          prisma.constellation.create({
            data: {
              ownerId: user.id,
              title: "Second Constellation",
            },
          })
        ).rejects.toThrow();
      }
    );
  });

  describe("Person Model", () => {
    it.skipIf(!shouldRunIntegrationTests)(
      "should create a person with UUID primary key",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-person",
            email: "person@example.com",
            displayName: "Person User",
          },
        });

        const constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "Person Family",
          },
        });

        const person = await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "John",
            surname: "Doe",
            displayName: "John Doe",
            createdBy: user.id,
          },
        });

        // UUID format validation
        expect(person.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(person.constellationId).toBe(constellation.id);
        expect(person.givenName).toBe("John");
      }
    );

    it.skipIf(!shouldRunIntegrationTests)(
      "should support soft delete with deletedAt",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-softdelete",
            email: "softdelete@example.com",
            displayName: "Soft Delete User",
          },
        });

        const constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "Soft Delete Family",
          },
        });

        const person = await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "Jane",
            displayName: "Jane",
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
      }
    );

    it.skipIf(!shouldRunIntegrationTests)(
      "should cascade delete when constellation is deleted",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-cascade",
            email: "cascade@example.com",
            displayName: "Cascade User",
          },
        });

        const constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "Cascade Family",
          },
        });

        await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "CascadePerson",
            displayName: "CascadePerson",
            createdBy: user.id,
          },
        });

        // Delete constellation
        await prisma.constellation.delete({
          where: { id: constellation.id },
        });

        // Person should be cascade deleted
        const persons = await prisma.person.findMany({
          where: { constellationId: constellation.id },
        });
        expect(persons).toHaveLength(0);
      }
    );
  });

  describe("Relationship Models", () => {
    it.skipIf(!shouldRunIntegrationTests)(
      "should create parent-child relationship",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-relationship",
            email: "relationship@example.com",
            displayName: "Relationship User",
          },
        });

        const constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "Relationship Family",
          },
        });

        const parent = await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "Parent",
            displayName: "Parent",
            createdBy: user.id,
          },
        });

        const child = await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "Child",
            displayName: "Child",
            createdBy: user.id,
          },
        });

        const relationship = await prisma.parentChildRelationship.create({
          data: {
            parentId: parent.id,
            childId: child.id,
            constellationId: constellation.id,
            relationshipType: "BIOLOGICAL",
            createdBy: user.id,
          },
        });

        expect(relationship.parentId).toBe(parent.id);
        expect(relationship.childId).toBe(child.id);
        expect(relationship.relationshipType).toBe("BIOLOGICAL");
      }
    );

    it.skipIf(!shouldRunIntegrationTests)(
      "should prevent duplicate parent-child relationships",
      async () => {
        if (!prisma) throw new Error("Prisma not initialized");
        const user = await prisma.user.create({
          data: {
            id: "firebase-uid-duplicate-rel",
            email: "duplicaterel@example.com",
            displayName: "Duplicate Rel User",
          },
        });

        const constellation = await prisma.constellation.create({
          data: {
            ownerId: user.id,
            title: "Duplicate Rel Family",
          },
        });

        const parent = await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "DupParent",
            displayName: "DupParent",
            createdBy: user.id,
          },
        });

        const child = await prisma.person.create({
          data: {
            constellationId: constellation.id,
            givenName: "DupChild",
            displayName: "DupChild",
            createdBy: user.id,
          },
        });

        await prisma.parentChildRelationship.create({
          data: {
            parentId: parent.id,
            childId: child.id,
            constellationId: constellation.id,
            createdBy: user.id,
          },
        });

        // Duplicate should fail
        await expect(
          prisma.parentChildRelationship.create({
            data: {
              parentId: parent.id,
              childId: child.id,
              constellationId: constellation.id,
              createdBy: user.id,
            },
          })
        ).rejects.toThrow();
      }
    );
  });
});
