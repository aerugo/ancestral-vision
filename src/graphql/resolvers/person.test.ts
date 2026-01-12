/**
 * Person Resolver Tests
 *
 * Tests for GraphQL person queries and mutations.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createTestServer,
  createTestContext,
  seedTestUser,
  mockPrisma,
} from "@/lib/graphql-test-utils";

// Mock Prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("Person Resolvers", () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("Mutation: createPerson", () => {
    it("should create person in user constellation", async () => {
      const { user, constellation } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

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
      expect(result.data?.createPerson).toEqual({
        id: "new-person-id",
        givenName: "John",
        surname: "Doe",
      });
    });

    it("should reject creating person without constellation", async () => {
      const context = await createTestContext({
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
      expect(result.errors?.[0].message).toContain("constellation");
    });

    it("should require authentication", async () => {
      const context = await createTestContext({ authenticated: false });

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
      expect(result.errors?.[0].message).toContain("Authentication required");
    });
  });

  describe("Query: person", () => {
    it("should return person by id", async () => {
      const { user, people } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

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
          variables: { id: people[0].id },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.person).toEqual({
        id: people[0].id,
        givenName: people[0].givenName,
        surname: people[0].surname,
      });
    });

    it("should reject access to person in other constellation", async () => {
      const { people: otherUserPeople } = await seedTestUser("other-user");
      const { user: myUser } = await seedTestUser("my-user-id");
      
      const context = await createTestContext({
        authenticated: true,
        userId: myUser.id,
      });

      // Mock person lookup returning other user's person
      mockPrisma.person.findUnique.mockResolvedValueOnce(otherUserPeople[0]);
      
      // Mock constellation lookup to show it belongs to different user
      mockPrisma.constellation.findUnique.mockResolvedValueOnce({
        id: otherUserPeople[0].constellationId,
        ownerId: "other-user",
        title: "Other Family",
        description: null,
        centeredPersonId: null,
        personCount: 1,
        generationSpan: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
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
          variables: { id: otherUserPeople[0].id },
        },
        context
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain("access");
    });

    it("should require authentication", async () => {
      const context = await createTestContext({ authenticated: false });

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
      expect(result.errors?.[0].message).toContain("Authentication required");
    });
  });

  describe("Query: people", () => {
    it("should list people in constellation", async () => {
      const { user, constellation, people } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

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
      expect(result.data?.people).toHaveLength(people.length);
      expect(result.data?.people[0]).toEqual({
        id: people[0].id,
        givenName: people[0].givenName,
        surname: people[0].surname,
      });
    });

    it("should require authentication", async () => {
      const context = await createTestContext({ authenticated: false });

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
      expect(result.errors?.[0].message).toContain("Authentication required");
    });
  });

  describe("Mutation: updatePerson", () => {
    it("should update person in user constellation", async () => {
      const { user, people } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

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
            id: people[0].id,
            input: {
              givenName: "Jane",
              surname: "Smith",
            },
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.updatePerson).toEqual({
        id: people[0].id,
        givenName: "Jane",
        surname: "Smith",
      });
    });
  });

  describe("Mutation: deletePerson", () => {
    it("should soft delete person in user constellation", async () => {
      const { user, people } = await seedTestUser();
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

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
            id: people[0].id,
          },
        },
        context
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.deletePerson).toMatchObject({
        id: people[0].id,
      });
      expect(result.data?.deletePerson.deletedAt).toBeTruthy();
    });
  });
});
