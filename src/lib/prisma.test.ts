/**
 * Prisma Schema Validation Tests
 *
 * TDD Phase: Tests validate database schema constraints and invariants.
 * These tests require a running PostgreSQL database.
 *
 * Invariants tested:
 * - INV-D001: Person IDs are globally unique UUIDs (v4)
 * - INV-D002: User IDs are Firebase UIDs (string, not UUID)
 * - INV-D003: Every Person belongs to exactly one Constellation
 * - INV-D004: Every Constellation has exactly one owner User
 * - INV-D005: deletedAt soft delete pattern for Person records
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// UUID v4 regex pattern
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Prisma Schema Validation', () => {
  let prisma: PrismaClient;
  let isConnected = false;

  beforeAll(async () => {
    prisma = new PrismaClient();
    try {
      await prisma.$connect();
      // Test connection
      await prisma.$queryRaw`SELECT 1`;
      isConnected = true;
    } catch {
      console.warn('Database not available - skipping Prisma tests');
      isConnected = false;
    }
  });

  afterAll(async () => {
    if (isConnected) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    if (!isConnected) return;
    // Clean up in correct order (respecting foreign keys)
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const result = await prisma.$queryRaw<[{ connected: number }]>`SELECT 1 as connected`;
      expect(result[0]?.connected).toBe(1);
    });
  });

  describe('User Model (INV-D002)', () => {
    it('should accept Firebase UID as primary key (string, not UUID)', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const firebaseUid = 'AbCdEfGhIjKlMnOpQrStUvWxYz123456';

      const user = await prisma.user.create({
        data: {
          id: firebaseUid,
          email: 'test@example.com',
          displayName: 'Test User',
        },
      });

      expect(user.id).toBe(firebaseUid);
      // Firebase UIDs are NOT UUIDs
      expect(user.id).not.toMatch(UUID_V4_REGEX);
    });

    it('should enforce unique email constraint', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      await prisma.user.create({
        data: {
          id: 'firebase-uid-1',
          email: 'duplicate@example.com',
          displayName: 'User 1',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            id: 'firebase-uid-2',
            email: 'duplicate@example.com',
            displayName: 'User 2',
          },
        })
      ).rejects.toThrow();
    });

    it('should set createdAt automatically', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const beforeCreate = new Date();

      const user = await prisma.user.create({
        data: {
          id: 'timestamp-test-uid',
          email: 'timestamp@example.com',
          displayName: 'Timestamp User',
        },
      });

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });
  });

  describe('Constellation Model (INV-D004)', () => {
    it('should generate UUID for constellation ID (INV-D001)', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-constellation',
          email: 'constellation@test.com',
          displayName: 'Constellation User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Test Family',
        },
      });

      expect(constellation.id).toMatch(UUID_V4_REGEX);
    });

    it('should enforce one constellation per user (unique ownerId)', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-unique-owner',
          email: 'unique-owner@test.com',
          displayName: 'Unique Owner',
        },
      });

      await prisma.constellation.create({
        data: { ownerId: user.id, title: 'First Constellation' },
      });

      await expect(
        prisma.constellation.create({
          data: { ownerId: user.id, title: 'Second Constellation' },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete when user is deleted', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'cascade-delete-uid',
          email: 'cascade@test.com',
          displayName: 'Cascade User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Cascade Family' },
      });

      await prisma.user.delete({ where: { id: user.id } });

      const found = await prisma.constellation.findUnique({
        where: { id: constellation.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Person Model (INV-D001, INV-D003, INV-D005)', () => {
    it('should generate UUID for person ID (INV-D001)', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-person',
          email: 'person@test.com',
          displayName: 'Person User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Person Family' },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'John',
          createdBy: user.id,
        },
      });

      expect(person.id).toMatch(UUID_V4_REGEX);
    });

    it('should require constellationId (INV-D003)', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      // TypeScript prevents this at compile time, but test runtime behavior
      await expect(
        prisma.person.create({
          data: {
            givenName: 'Orphan',
            createdBy: 'some-user',
            // constellationId intentionally missing
          } as Parameters<typeof prisma.person.create>[0]['data'],
        })
      ).rejects.toThrow();
    });

    it('should require givenName field', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-required',
          email: 'required@test.com',
          displayName: 'Required User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Required Family' },
      });

      await expect(
        prisma.person.create({
          data: {
            constellationId: constellation.id,
            createdBy: user.id,
            // givenName intentionally missing
          } as Parameters<typeof prisma.person.create>[0]['data'],
        })
      ).rejects.toThrow();
    });

    it('should support soft delete with deletedAt (INV-D005)', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-softdelete',
          email: 'softdelete@test.com',
          displayName: 'Soft Delete User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Soft Delete Family' },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Jane',
          createdBy: user.id,
        },
      });

      // Perform soft delete
      const deleted = await prisma.person.update({
        where: { id: person.id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.id,
        },
      });

      expect(deleted.deletedAt).toBeInstanceOf(Date);
      expect(deleted.deletedBy).toBe(user.id);

      // Record still exists (soft delete, not hard delete)
      const found = await prisma.person.findUnique({ where: { id: person.id } });
      expect(found).not.toBeNull();
      expect(found?.deletedAt).not.toBeNull();
    });

    it('should default speculative to false', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-speculative',
          email: 'speculative@test.com',
          displayName: 'Speculative User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Speculative Family' },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Default',
          createdBy: user.id,
        },
      });

      expect(person.speculative).toBe(false);
    });

    it('should allow storing JSON in birthDate field', async () => {
      if (!isConnected) {
        console.log('Skipping: Database not available');
        return;
      }

      const user = await prisma.user.create({
        data: {
          id: 'test-uid-json',
          email: 'json@test.com',
          displayName: 'JSON User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'JSON Family' },
      });

      const fuzzyDate = { type: 'exact', year: 1990, month: 6, day: 15 };

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'JSON',
          createdBy: user.id,
          birthDate: fuzzyDate,
        },
      });

      expect(person.birthDate).toEqual(fuzzyDate);
    });
  });
});
