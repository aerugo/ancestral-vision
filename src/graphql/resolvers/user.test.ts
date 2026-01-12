/**
 * User Resolver Tests
 *
 * Tests for GraphQL user queries.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Prisma - MUST be before any imports that use prisma
vi.mock("@/lib/prisma");

import {
  createTestServer,
  createTestContext,
  mockPrisma,
} from "@/lib/graphql-test-utils";

describe("User Resolvers", () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.stop();
  });

  describe("Query: me", () => {
    it("should return current user for authenticated request", async () => {
      const context = createTestContext({
        authenticated: true,
        userId: "test-user-id",
        email: "test@example.com",
        displayName: "Test User",
      });

      const result = await server.executeOperation(
        {
          query: `
            query Me {
              me {
                id
                email
                displayName
              }
            }
          `,
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["me"]).toEqual({
        id: "test-user-id",
        email: "test@example.com",
        displayName: "Test User",
      });
    });

    it("should return null for unauthenticated request", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            query Me {
              me {
                id
                email
              }
            }
          `,
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["me"]).toBeNull();
    });

    it("should include constellation if user has one", async () => {
      const context = createTestContext({
        authenticated: true,
        userId: "user-with-constellation",
        email: "test@example.com",
      });

      // Mock constellation lookup
      mockPrisma.constellation.findUnique.mockResolvedValueOnce({
        id: "constellation-1",
        ownerId: "user-with-constellation",
        title: "My Family",
        description: null,
        centeredPersonId: null,
        personCount: 5,
        generationSpan: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await server.executeOperation(
        {
          query: `
            query Me {
              me {
                id
                constellation {
                  id
                  title
                  personCount
                }
              }
            }
          `,
        },
        context
      );

      expect(result.errors).toBeUndefined();
      const me = result.data?.["me"] as { constellation?: unknown } | null;
      expect(me?.constellation).toEqual({
        id: "constellation-1",
        title: "My Family",
        personCount: 5,
      });
    });
  });
});
