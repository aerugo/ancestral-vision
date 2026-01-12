/**
 * Phase 0.3: Auth Utilities Tests
 *
 * Tests for server-side authentication functions.
 * Uses mocks for Firebase Admin and Prisma.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create mock functions
const mockVerifyIdToken = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

// Mock firebase-admin module
vi.mock("./firebase-admin", () => ({
  getFirebaseAdmin: vi.fn(() => ({
    auth: {
      verifyIdToken: mockVerifyIdToken,
    },
  })),
  isFirebaseAdminConfigured: vi.fn(() => true),
}));

// Mock prisma module
vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Import after mocks are set up
import {
  verifyAuthToken,
  getOrCreateUser,
  getCurrentUser,
  requireAuth,
  type DecodedToken,
} from "./auth";

describe("Auth Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("verifyAuthToken", () => {
    it("should validate a valid Firebase token", async () => {
      const mockDecodedToken = {
        uid: "test-firebase-uid",
        email: "test@example.com",
        name: "Test User",
      };

      mockVerifyIdToken.mockResolvedValueOnce(mockDecodedToken);

      const result = await verifyAuthToken("valid-token");

      expect(result).toEqual({
        uid: "test-firebase-uid",
        email: "test@example.com",
        name: "Test User",
      });
      expect(mockVerifyIdToken).toHaveBeenCalledWith("valid-token");
    });

    it("should reject an invalid Firebase token", async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

      await expect(verifyAuthToken("invalid-token")).rejects.toThrow("Invalid token");
    });

    it("should reject an expired Firebase token", async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error("Token expired"));

      await expect(verifyAuthToken("expired-token")).rejects.toThrow("Token expired");
    });

    it("should handle tokens without optional fields", async () => {
      const mockDecodedToken = {
        uid: "test-uid-only",
      };

      mockVerifyIdToken.mockResolvedValueOnce(mockDecodedToken);

      const result = await verifyAuthToken("minimal-token");

      expect(result).toEqual({
        uid: "test-uid-only",
        email: undefined,
        name: undefined,
      });
    });
  });

  describe("getOrCreateUser", () => {
    it("should return existing user if found", async () => {
      const existingUser = {
        id: "test-firebase-uid",
        email: "existing@example.com",
        displayName: "Existing User",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const updatedUser = {
        ...existingUser,
        lastLoginAt: new Date(),
      };

      mockFindUnique.mockResolvedValueOnce(existingUser);
      mockUpdate.mockResolvedValueOnce(updatedUser);

      const tokenData: DecodedToken = {
        uid: "test-firebase-uid",
        email: "existing@example.com",
        name: "Existing User",
      };

      const result = await getOrCreateUser(tokenData);

      expect(result.id).toBe("test-firebase-uid");
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "test-firebase-uid" } });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should create new user if not found", async () => {
      const newUser = {
        id: "new-firebase-uid",
        email: "new@example.com",
        displayName: "New User",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(newUser);

      const tokenData: DecodedToken = {
        uid: "new-firebase-uid",
        email: "new@example.com",
        name: "New User",
      };

      const result = await getOrCreateUser(tokenData);

      expect(result.id).toBe("new-firebase-uid");
      expect(result.email).toBe("new@example.com");
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          id: "new-firebase-uid",
          email: "new@example.com",
          displayName: "New User",
        },
      });
    });

    it("should handle missing email in token data", async () => {
      const newUser = {
        id: "uid-no-email",
        email: "uid-no-email@placeholder.ancestralvision.com",
        displayName: "No Email User",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(newUser);

      const tokenData: DecodedToken = {
        uid: "uid-no-email",
        name: "No Email User",
      };

      const result = await getOrCreateUser(tokenData);

      expect(result.email).toBe("uid-no-email@placeholder.ancestralvision.com");
    });

    it("should handle missing name in token data", async () => {
      const newUser = {
        id: "uid-no-name",
        email: "noname@example.com",
        displayName: "New User",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(newUser);

      const tokenData: DecodedToken = {
        uid: "uid-no-name",
        email: "noname@example.com",
      };

      await getOrCreateUser(tokenData);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          displayName: "New User",
        }),
      });
    });
  });

  describe("getCurrentUser", () => {
    it("should return null for missing auth header", async () => {
      const result = await getCurrentUser(null);
      expect(result).toBeNull();
    });

    it("should return null for invalid auth header format", async () => {
      const result = await getCurrentUser("InvalidHeader token");
      expect(result).toBeNull();
    });

    it("should return user for valid Bearer token", async () => {
      const mockDecodedToken = {
        uid: "valid-uid",
        email: "valid@example.com",
        name: "Valid User",
      };

      const mockUser = {
        id: "valid-uid",
        email: "valid@example.com",
        displayName: "Valid User",
      };

      mockVerifyIdToken.mockResolvedValueOnce(mockDecodedToken);
      mockFindUnique.mockResolvedValueOnce(mockUser);
      mockUpdate.mockResolvedValueOnce(mockUser);

      const result = await getCurrentUser("Bearer valid-token");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("valid-uid");
    });

    it("should return null when token verification fails", async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

      const result = await getCurrentUser("Bearer invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("should throw when not authenticated", async () => {
      await expect(requireAuth(null)).rejects.toThrow("Authentication required");
    });

    it("should return user when authenticated", async () => {
      const mockDecodedToken = {
        uid: "auth-uid",
        email: "auth@example.com",
        name: "Auth User",
      };

      const mockUser = {
        id: "auth-uid",
        email: "auth@example.com",
        displayName: "Auth User",
      };

      mockVerifyIdToken.mockResolvedValueOnce(mockDecodedToken);
      mockFindUnique.mockResolvedValueOnce(mockUser);
      mockUpdate.mockResolvedValueOnce(mockUser);

      const result = await requireAuth("Bearer auth-token");

      expect(result.id).toBe("auth-uid");
    });
  });
});
