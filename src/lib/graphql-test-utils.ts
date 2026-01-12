/**
 * GraphQL Test Utilities
 *
 * Provides test server and context creation for GraphQL resolver tests.
 * Uses mocks for Prisma - no database required.
 *
 * IMPORTANT: Import this module AFTER calling vi.mock("@/lib/prisma")
 */
import { vi } from "vitest";
import type { GraphQLContext } from "@/graphql/context";
import type { User, Constellation, Person } from "@prisma/client";
import { createYoga, type YogaInitialContext } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";

// Import the mock for test assertions
// This will be the actual mock from __mocks__/prisma.ts when vi.mock is active
import { prisma } from "@/lib/prisma";
import type { Mock } from "vitest";

interface MockPrismaModel {
  findUnique: Mock;
  findFirst: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
}

interface MockPrismaClient {
  user: MockPrismaModel;
  constellation: MockPrismaModel;
  person: MockPrismaModel;
  relationship: MockPrismaModel;
  $connect: Mock;
  $disconnect: Mock;
  $transaction: Mock;
}

// Cast to mock type for test access
export const mockPrisma = prisma as unknown as MockPrismaClient;

// Test data store
const testDataStore = new Map<string, unknown>();

/**
 * Reset test data store
 */
export function resetTestData(): void {
  testDataStore.clear();
}

/**
 * Create a test context for GraphQL execution
 */
export function createTestContext(options?: {
  authenticated?: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
}): GraphQLContext {
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

interface TestResult {
  data?: Record<string, unknown> | null;
  errors?: Array<{ message: string; [key: string]: unknown }>;
}

/**
 * Create a test server for executing GraphQL operations
 */
export function createTestServer() {
  // Dynamically import schema and resolvers to ensure mocks are in place
  let yogaInstance: ReturnType<typeof createYoga> | null = null;

  async function getYoga() {
    if (!yogaInstance) {
      const { typeDefs } = await import("@/graphql/schema");
      const { resolvers } = await import("@/graphql/resolvers");

      const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
      });

      yogaInstance = createYoga({
        schema,
        // Provide context from our test context
        context: (yogaCtx: YogaInitialContext) => {
          // The context will be set per-request via headers
          const contextHeader = yogaCtx.request.headers.get("x-test-context");
          if (contextHeader) {
            return JSON.parse(contextHeader);
          }
          return { user: null };
        },
        // Expose full error messages in tests (don't mask)
        maskedErrors: false,
      });
    }
    return yogaInstance;
  }

  return {
    async executeOperation(
      operation: { query: string; variables?: Record<string, unknown> },
      context: GraphQLContext
    ): Promise<TestResult> {
      const yoga = await getYoga();

      const response = await yoga.fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-context": JSON.stringify(context),
        },
        body: JSON.stringify({
          query: operation.query,
          variables: operation.variables,
        }),
      });

      const result = await response.json() as TestResult;
      return result;
    },

    stop() {
      // Cleanup
      testDataStore.clear();
      yogaInstance = null;
      vi.clearAllMocks();
    },
  };
}

/**
 * Seed test data for a user
 */
export function seedTestUser(userId = "test-user-id") {
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

  return { user, constellation, people };
}

/**
 * Setup mock implementations for common test scenarios
 */
export function setupMockImplementations(mockPrismaClient: MockPrismaClient) {
  // User mocks
  mockPrismaClient.user.findUnique.mockImplementation((args: { where: { id: string } }) => {
    return Promise.resolve(testDataStore.get(`user-${args.where.id}`) ?? null);
  });

  // Constellation mocks
  mockPrismaClient.constellation.findFirst.mockImplementation(
    (args: { where: { ownerId: string } }) => {
      return Promise.resolve(
        testDataStore.get(`constellation-constellation-${args.where.ownerId}`) ?? null
      );
    }
  );

  mockPrismaClient.constellation.findUnique.mockImplementation(
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

  // Person mocks
  mockPrismaClient.person.findUnique.mockImplementation((args: { where: { id: string } }) => {
    return Promise.resolve(testDataStore.get(`person-${args.where.id}`) ?? null);
  });

  mockPrismaClient.person.findMany.mockImplementation(
    (args?: { where?: { constellationId?: string } }) => {
      const allPeople: Person[] = [];
      testDataStore.forEach((value, key) => {
        if (key.startsWith("person-") && value) {
          allPeople.push(value as Person);
        }
      });

      if (!args?.where?.constellationId) {
        return Promise.resolve(allPeople);
      }
      return Promise.resolve(
        allPeople.filter((p) => p.constellationId === args.where?.constellationId)
      );
    }
  );
}
