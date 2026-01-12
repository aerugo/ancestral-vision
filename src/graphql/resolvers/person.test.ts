/**
 * Person Resolver Tests
 *
 * Tests for GraphQL person queries and mutations.
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

describe("Person Resolvers", () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.stop();
  });

  describe("Mutation: createPerson", () => {
    it("should create person in user constellation", async () => {
      const { user, constellation } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);

      const newPerson = {
        id: "new-person-id",
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
        createdBy: user.id,
      };

      mockPrisma.person.create.mockResolvedValueOnce(newPerson);

      const result = await server.executeOperation(
        {
          query: `
            mutation CreatePerson($input: CreatePersonInput!) {
              createPerson(input: $input) {
                id
                givenName
                surname
              }
            }
          `,
          variables: {
            input: {
              givenName: "John",
              surname: "Doe",
            },
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["createPerson"]).toEqual({
        id: "new-person-id",
        givenName: "John",
        surname: "Doe",
      });
    });

    it("should reject creating person without constellation", async () => {
      const context = createTestContext({
        authenticated: true,
        userId: "user-without-constellation",
      });

      mockPrisma.constellation.findUnique.mockResolvedValueOnce(null);

      const result = await server.executeOperation(
        {
          query: `
            mutation CreatePerson($input: CreatePersonInput!) {
              createPerson(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { givenName: "Test" },
          },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("constellation");
    });

    it("should require authentication", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            mutation CreatePerson($input: CreatePersonInput!) {
              createPerson(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { givenName: "Test" },
          },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("Authentication required");
    });
  });

  describe("Query: person", () => {
    it("should return person by id", async () => {
      const { user, constellation, people } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.person.findUnique.mockResolvedValueOnce(people[0]);
      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);

      const result = await server.executeOperation(
        {
          query: `
            query Person($id: ID!) {
              person(id: $id) {
                id
                givenName
                surname
              }
            }
          `,
          variables: { id: people[0]?.id },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["person"]).toEqual({
        id: people[0]?.id,
        givenName: people[0]?.givenName,
        surname: people[0]?.surname,
      });
    });

    it("should reject access to person in other constellation", async () => {
      const { people: otherUserPeople, constellation: otherConstellation } =
        seedTestUser("other-user");
      const { user: myUser } = seedTestUser("my-user-id");

      const context = createTestContext({
        authenticated: true,
        userId: myUser.id,
      });

      // Mock person lookup returning other user's person
      mockPrisma.person.findUnique.mockResolvedValueOnce(otherUserPeople[0]);

      // Mock constellation lookup to show it belongs to different user
      mockPrisma.constellation.findUnique.mockResolvedValueOnce({
        ...otherConstellation,
        ownerId: "other-user",
      });

      const result = await server.executeOperation(
        {
          query: `
            query Person($id: ID!) {
              person(id: $id) {
                id
              }
            }
          `,
          variables: { id: otherUserPeople[0]?.id },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("access");
    });

    it("should require authentication", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            query Person($id: ID!) {
              person(id: $id) {
                id
              }
            }
          `,
          variables: { id: "person-1" },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("Authentication required");
    });
  });

  describe("Query: people", () => {
    it("should list people in constellation", async () => {
      const { user, constellation, people } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);
      mockPrisma.person.findMany.mockResolvedValueOnce(people);

      const result = await server.executeOperation(
        {
          query: `
            query People($constellationId: ID!) {
              people(constellationId: $constellationId) {
                id
                givenName
                surname
              }
            }
          `,
          variables: { constellationId: constellation.id },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      const resultPeople = result.data?.["people"] as unknown[];
      expect(resultPeople).toHaveLength(people.length);
      expect(resultPeople[0]).toEqual({
        id: people[0]?.id,
        givenName: people[0]?.givenName,
        surname: people[0]?.surname,
      });
    });

    it("should require authentication", async () => {
      const context = createTestContext({ authenticated: false });

      const result = await server.executeOperation(
        {
          query: `
            query People($constellationId: ID!) {
              people(constellationId: $constellationId) {
                id
              }
            }
          `,
          variables: { constellationId: "constellation-1" },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain("Authentication required");
    });
  });

  describe("Mutation: updatePerson", () => {
    it("should update person in user constellation", async () => {
      const { user, constellation, people } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.person.findUnique.mockResolvedValueOnce(people[0]);
      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);

      const updatedPerson = {
        ...people[0],
        givenName: "Jane",
        surname: "Smith",
        displayName: "Jane Smith",
      };

      mockPrisma.person.update.mockResolvedValueOnce(updatedPerson);

      const result = await server.executeOperation(
        {
          query: `
            mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {
              updatePerson(id: $id, input: $input) {
                id
                givenName
                surname
              }
            }
          `,
          variables: {
            id: people[0]?.id,
            input: {
              givenName: "Jane",
              surname: "Smith",
            },
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.["updatePerson"]).toEqual({
        id: people[0]?.id,
        givenName: "Jane",
        surname: "Smith",
      });
    });
  });

  describe("Mutation: deletePerson", () => {
    it("should soft delete person in user constellation", async () => {
      const { user, constellation, people } = seedTestUser();
      const context = createTestContext({
        authenticated: true,
        userId: user.id,
      });

      mockPrisma.person.findUnique.mockResolvedValueOnce(people[0]);
      mockPrisma.constellation.findUnique.mockResolvedValueOnce(constellation);

      const deletedPerson = {
        ...people[0],
        deletedAt: new Date(),
        deletedBy: user.id,
      };

      mockPrisma.person.update.mockResolvedValueOnce(deletedPerson);

      const result = await server.executeOperation(
        {
          query: `
            mutation DeletePerson($id: ID!) {
              deletePerson(id: $id) {
                id
                deletedAt
              }
            }
          `,
          variables: {
            id: people[0]?.id,
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      const deletedResult = result.data?.["deletePerson"] as { id: string; deletedAt: unknown };
      expect(deletedResult).toMatchObject({
        id: people[0]?.id,
      });
      expect(deletedResult.deletedAt).toBeTruthy();
    });
  });
});
