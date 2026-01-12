/**
 * GraphQL Test Utilities
 *
 * Provides test server and context creation for GraphQL resolver tests.
 * Uses mocks for Prisma - no database required.
 */
import { vi } from "vitest";
import type { GraphQLContext } from "@/graphql/context";
import type { User, Constellation, Person } from "@prisma/client";
import { execute, GraphQLSchema } from "graphql";
import type { ExecutionResult } from "graphql";

// Mock Prisma client
export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  constellation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  person: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

// Test data store
const testDataStore = new Map<string, unknown>();

/**
 * Create a test context for GraphQL execution
 */
export async function createTestContext(options?: {
  authenticated?: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
}): Promise<GraphQLContext> {
  const { authenticated = false, userId, email, displayName } = options ?? {};

  let user: User | null = null;

  if (authenticated && userId) {
    user = {
      id: userId,
      email: email ?? `${userId}@example.com`,
      displayName: displayName ?? "Test User",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      preferences: {},
      subscription: {},
    };
  }

  return {
    user,
  };
}

/**
 * Create a test server for executing GraphQL operations
 */
export function createTestServer() {
  let schema: GraphQLSchema | null = null;

  return {
    async executeOperation(
      operation: { query: string; variables?: Record<string, unknown> },
      context: GraphQLContext
    ): Promise<ExecutionResult> {
      if (!schema) {
        // Lazy load schema to avoid circular dependencies
        const { makeExecutableSchema } = await import("@graphql-tools/schema");
        const { typeDefs } = await import("@/graphql/schema");
        const { resolvers } = await import("@/graphql/resolvers");

        schema = makeExecutableSchema({
          typeDefs,
          resolvers,
        });
      }

      return execute({
        schema,
        document: typeof operation.query === "string" 
          ? (await import("graphql")).parse(operation.query)
          : operation.query,
        variableValues: operation.variables,
        contextValue: context,
      });
    },

    async stop() {
      // Cleanup if needed
      schema = null;
      testDataStore.clear();
      vi.clearAllMocks();
    },
  };
}

/**
 * Seed test data for a user
 */
export async function seedTestUser(userId = "test-user-id") {
  const user: User = {
    id: userId,
    email: `${userId}@example.com`,
    displayName: "Test User",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    deletionRequestedAt: null,
    deletionScheduledFor: null,
    preferences: {},
    subscription: {},
  };

  const constellation: Constellation = {
    id: `constellation-${userId}`,
    ownerId: userId,
    title: "My Family Tree",
    description: null,
    centeredPersonId: null,
    personCount: 1,
    generationSpan: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const people: Person[] = [
    {
      id: `person-${userId}-1`,
      constellationId: constellation.id,
      givenName: "John",
      surname: "Doe",
      maidenName: null,
      patronymic: null,
      matronymic: null,
      nickname: null,
      suffix: null,
      nameOrder: "WESTERN",
      displayName: "John Doe",
      gender: "MALE",
      birthDate: null,
      deathDate: null,
      birthPlace: null,
      deathPlace: null,
      biography: null,
      speculative: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    },
  ];

  // Store in test data store
  testDataStore.set(`user-${userId}`, user);
  testDataStore.set(`constellation-${constellation.id}`, constellation);
  people.forEach((person) => {
    testDataStore.set(`person-${person.id}`, person);
  });

  // Mock Prisma responses
  mockPrisma.user.findUnique.mockImplementation((args: { where: { id: string } }) => {
    return Promise.resolve(testDataStore.get(`user-${args.where.id}`) ?? null);
  });

  mockPrisma.constellation.findFirst.mockImplementation(
    (args: { where: { ownerId: string } }) => {
      return Promise.resolve(
        testDataStore.get(`constellation-constellation-${args.where.ownerId}`) ?? null
      );
    }
  );

  mockPrisma.constellation.findUnique.mockImplementation(
    (args: { where: { id?: string; ownerId?: string } }) => {
      if (args.where.id) {
        return Promise.resolve(testDataStore.get(`constellation-${args.where.id}`) ?? null);
      }
      if (args.where.ownerId) {
        return Promise.resolve(
          testDataStore.get(`constellation-constellation-${args.where.ownerId}`) ?? null
        );
      }
      return Promise.resolve(null);
    }
  );

  mockPrisma.person.findUnique.mockImplementation((args: { where: { id: string } }) => {
    return Promise.resolve(testDataStore.get(`person-${args.where.id}`) ?? null);
  });

  mockPrisma.person.findMany.mockImplementation(
    (args?: { where?: { constellationId?: string } }) => {
      if (!args?.where?.constellationId) {
        return Promise.resolve(people);
      }
      return Promise.resolve(
        people.filter((p) => p.constellationId === args.where?.constellationId)
      );
    }
  );

  return { user, constellation, people };
}
