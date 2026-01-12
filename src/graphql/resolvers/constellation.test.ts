/**
 * Constellation Resolver Tests
 *
 * Tests for GraphQL constellation queries and mutations.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Prisma - MUST be before any imports that use prisma
vi.mock("@/lib/prisma");

import {
  createTestServer,
  createTestContext,
  seedTestUser,
  mockPrisma,
} from "@/lib/graphql-test-utils";

describe("Constellation Resolvers", () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.stop();
  });

  describe("Query: constellation", () => {
    it("should return user constellation", async () => {
      const { user, constellation } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);

      const result = await server.executeOperation(
        {
          query: `
            query Constellation {
              constellation {
                id
                title
                personCount
              }
            }
          `,
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["constellation"]).toEqual({
        id: constellation.id,
        title: constellation.title,
        personCount: constellation.personCount,
      });
    });

    it("should return null if user has no constellation", async () => {
      const context = createTestContext({
        authenticated: true,
        userId: "user-without-constellation",
      });

      mockPrisma.constellation.findUnique.mockResolvedValueOnce(null);

      const result = await server.executeOperation(
        {
          query: `
            query Constellation {
              constellation {
                id
              }
            }
          `,
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["constellation"]).toBeNull();
    });

    it("should require authentication", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            query Constellation {
              constellation {
                id
              }
            }
          `,
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("Authentication required");
    });
  });

  describe("Mutation: createConstellation", () => {
    it("should create constellation for authenticated user", async () => {
      const context = createTestContext({
        authenticated: true,
        userId: "new-user-id",
        email: "new@example.com",
      });

      const newConstellation = {
        id: "new-constellation-id",
        ownerId: "new-user-id",
        title: "My Family Tree",
        description: null,
        centeredPersonId: null,
        personCount: 0,
        generationSpan: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.constellation.create.mockResolvedValueOnce(newConstellation);

      const result = await server.executeOperation(
        {
          query: `
            mutation CreateConstellation($input: CreateConstellationInput!) {
              createConstellation(input: $input) {
                id
                title
              }
            }
          `,
          variables: {
            input: {
              title: "My Family Tree",
            },
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["createConstellation"]).toEqual({
        id: "new-constellation-id",
        title: "My Family Tree",
      });
      expect(mockPrisma.constellation.create).toHaveBeenCalledWith({
        data: {
          ownerId: "new-user-id",
          title: "My Family Tree",
          description: undefined,
        },
      });
    });

    it("should reject mutation without authentication", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            mutation CreateConstellation($input: CreateConstellationInput!) {
              createConstellation(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { title: "Test" },
          },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("Authentication required");
    });
  });

  describe("Mutation: updateConstellation", () => {
    it("should update user constellation", async () => {
      const { user, constellation } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);

      const updatedConstellation = {
        ...constellation,
        title: "Updated Title",
        description: "New description",
      };

      mockPrisma.constellation.update.mockResolvedValueOnce(updatedConstellation);

      const result = await server.executeOperation(
        {
          query: `
            mutation UpdateConstellation($input: UpdateConstellationInput!) {
              updateConstellation(input: $input) {
                id
                title
                description
              }
            }
          `,
          variables: {
            input: {
              title: "Updated Title",
              description: "New description",
            },
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["updateConstellation"]).toEqual({
        id: constellation.id,
        title: "Updated Title",
        description: "New description",
      });
    });

    it("should require authentication", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            mutation UpdateConstellation($input: UpdateConstellationInput!) {
              updateConstellation(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { title: "Test" },
          },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("Authentication required");
    });
  });
});
