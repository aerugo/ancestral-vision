/**
 * Auth Utilities Tests
 *
 * Tests for server-side authentication utilities including:
 * - Token verification
 * - User creation/retrieval
 * - Authorization header parsing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Create persistent mock for verifyIdToken
const mockVerifyIdToken = vi.fn();

// Mock Firebase Admin before importing auth module
vi.mock('./firebase-admin', () => ({
  getFirebaseAdmin: () => ({
    auth: {
      verifyIdToken: mockVerifyIdToken,
    },
  }),
}));

describe('Auth Utilities', () => {
  let testPrisma: PrismaClient;
  let isDatabaseAvailable = false;

  beforeEach(async () => {
    vi.clearAllMocks();

    testPrisma = new PrismaClient();
    try {
      await testPrisma.$connect();
      isDatabaseAvailable = true;
      // Clean up test data
      await testPrisma.person.deleteMany({});
      await testPrisma.constellation.deleteMany({});
      await testPrisma.user.deleteMany({});
    } catch {
      isDatabaseAvailable = false;
      console.log('Database not available - some tests will be skipped');
    }
  });

  afterEach(async () => {
    if (isDatabaseAvailable) {
      await testPrisma.$disconnect();
    }
  });

  describe('verifyAuthToken', () => {
    it('should return decoded token for valid Firebase token', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
      });

      const { verifyAuthToken } = await import('./auth');
      const result = await verifyAuthToken('valid-token');

      expect(result).toEqual({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should throw error for invalid Firebase token', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const { verifyAuthToken } = await import('./auth');

      await expect(verifyAuthToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired Firebase token', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Token has expired'));

      const { verifyAuthToken } = await import('./auth');

      await expect(verifyAuthToken('expired-token')).rejects.toThrow('expired');
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user if found', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create user directly in database
      await testPrisma.user.create({
        data: {
          id: 'existing-uid',
          email: 'existing@example.com',
          displayName: 'Existing User',
        },
      });

      // Re-mock prisma with test instance
      vi.doMock('./prisma', () => ({
        prisma: testPrisma,
      }));
      vi.resetModules();

      const { getOrCreateUser } = await import('./auth');
      const result = await getOrCreateUser({
        uid: 'existing-uid',
        email: 'existing@example.com',
        name: 'Existing User',
      });

      expect(result.id).toBe('existing-uid');
    });

    it('should create new user if not found', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      vi.doMock('./prisma', () => ({
        prisma: testPrisma,
      }));
      vi.resetModules();

      const { getOrCreateUser } = await import('./auth');
      const result = await getOrCreateUser({
        uid: 'new-uid',
        email: 'new@example.com',
        name: 'New User',
      });

      expect(result.id).toBe('new-uid');
      expect(result.email).toBe('new@example.com');

      // Verify user was created in database
      const dbUser = await testPrisma.user.findUnique({ where: { id: 'new-uid' } });
      expect(dbUser).not.toBeNull();
    });

    it('should update lastLoginAt for existing user', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const oldDate = new Date('2020-01-01');
      await testPrisma.user.create({
        data: {
          id: 'login-update-uid',
          email: 'login@example.com',
          displayName: 'Login User',
          lastLoginAt: oldDate,
        },
      });

      vi.doMock('./prisma', () => ({
        prisma: testPrisma,
      }));
      vi.resetModules();

      const { getOrCreateUser } = await import('./auth');
      const result = await getOrCreateUser({
        uid: 'login-update-uid',
        email: 'login@example.com',
        name: 'Login User',
      });

      expect(result.lastLoginAt).not.toEqual(oldDate);
      expect(result.lastLoginAt!.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('getCurrentUser', () => {
    it('should return null for missing auth header', async () => {
      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser(null);
      expect(result).toBeNull();
    });

    it('should return null for invalid auth header format', async () => {
      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser('InvalidHeader token');
      expect(result).toBeNull();
    });

    it('should return null for empty Bearer token', async () => {
      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser('Bearer ');
      expect(result).toBeNull();
    });

    it('should return user for valid Bearer token', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'bearer-test-uid',
        email: 'bearer@example.com',
        name: 'Bearer User',
      });

      vi.doMock('./prisma', () => ({
        prisma: testPrisma,
      }));
      vi.resetModules();

      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser('Bearer valid-token');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('bearer-test-uid');
    });

    it('should return null when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser('Bearer invalid-token');

      expect(result).toBeNull();
    });
  });
});
