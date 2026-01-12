/**
 * Person Resolvers
 *
 * GraphQL resolvers for person queries and mutations.
 */
import type { GraphQLContext } from "../context";
import type { Person } from "@prisma/client";
import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";

interface CreatePersonInput {
  givenName: string;
  surname?: string;
  maidenName?: string;
  patronymic?: string;
  matronymic?: string;
  nickname?: string;
  suffix?: string;
  nameOrder?: string;
  gender?: string;
  birthDate?: unknown;
  deathDate?: unknown;
  birthPlace?: unknown;
  deathPlace?: unknown;
  biography?: string;
  speculative?: boolean;
}

interface UpdatePersonInput {
  givenName?: string;
  surname?: string;
  maidenName?: string;
  patronymic?: string;
  matronymic?: string;
  nickname?: string;
  suffix?: string;
  nameOrder?: string;
  gender?: string;
  birthDate?: unknown;
  deathDate?: unknown;
  birthPlace?: unknown;
  deathPlace?: unknown;
  biography?: string;
  speculative?: boolean;
}

/**
 * Generate display name from person's name components.
 */
function generateDisplayName(input: { givenName: string; surname?: string }): string {
  return input.surname ? `${input.givenName} ${input.surname}` : input.givenName;
}

export const personResolvers = {
  Query: {
    /**
     * Get a person by ID.
     * Requires authentication and authorization.
     */
    person: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Person | null> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const person = await prisma.person.findUnique({
        where: { id: args.id },
      });

      if (!person) {
        return null;
      }

      // Verify the person belongs to the user's constellation
      const constellation = await prisma.constellation.findUnique({
        where: { id: person.constellationId },
      });

      if (!constellation || constellation.ownerId !== context.user.id) {
        throw new GraphQLError("You do not have access to this person", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return person;
    },

    /**
     * List people in a constellation.
     * Requires authentication and authorization.
     */
    people: async (
      _parent: unknown,
      args: { constellationId: string; includeDeleted?: boolean },
      context: GraphQLContext
    ): Promise<Person[]> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Verify the constellation belongs to the user
      const constellation = await prisma.constellation.findUnique({
        where: { id: args.constellationId },
      });

      if (!constellation || constellation.ownerId !== context.user.id) {
        throw new GraphQLError("You do not have access to this constellation", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return await prisma.person.findMany({
        where: {
          constellationId: args.constellationId,
          deletedAt: args.includeDeleted ? undefined : null,
        },
      });
    },
  },

  Mutation: {
    /**
     * Create a new person in the user's constellation.
     * Requires authentication.
     */
    createPerson: async (
      _parent: unknown,
      args: { input: CreatePersonInput },
      context: GraphQLContext
    ): Promise<Person> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Get user's constellation
      const constellation = await prisma.constellation.findUnique({
        where: { ownerId: context.user.id },
      });

      if (!constellation) {
        throw new GraphQLError("You must create a constellation first", {
          extensions: { code: "PRECONDITION_FAILED" },
        });
      }

      const displayName = generateDisplayName(args.input);

      return await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: args.input.givenName,
          surname: args.input.surname,
          maidenName: args.input.maidenName,
          patronymic: args.input.patronymic,
          matronymic: args.input.matronymic,
          nickname: args.input.nickname,
          suffix: args.input.suffix,
          nameOrder: (args.input.nameOrder as never) ?? "WESTERN",
          displayName,
          gender: args.input.gender as never,
          birthDate: args.input.birthDate as never,
          deathDate: args.input.deathDate as never,
          birthPlace: args.input.birthPlace as never,
          deathPlace: args.input.deathPlace as never,
          biography: args.input.biography,
          speculative: args.input.speculative ?? false,
          createdBy: context.user.id,
        },
      });
    },

    /**
     * Update a person in the user's constellation.
     * Requires authentication and authorization.
     */
    updatePerson: async (
      _parent: unknown,
      args: { id: string; input: UpdatePersonInput },
      context: GraphQLContext
    ): Promise<Person> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const person = await prisma.person.findUnique({
        where: { id: args.id },
      });

      if (!person) {
        throw new GraphQLError("Person not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Verify the person belongs to the user's constellation
      const constellation = await prisma.constellation.findUnique({
        where: { id: person.constellationId },
      });

      if (!constellation || constellation.ownerId !== context.user.id) {
        throw new GraphQLError("You do not have access to this person", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Generate new display name if name fields are being updated
      const displayName =
        args.input.givenName || args.input.surname
          ? generateDisplayName({
              givenName: args.input.givenName ?? person.givenName,
              surname: args.input.surname ?? person.surname ?? undefined,
            })
          : undefined;

      return await prisma.person.update({
        where: { id: args.id },
        data: {
          givenName: args.input.givenName,
          surname: args.input.surname,
          maidenName: args.input.maidenName,
          patronymic: args.input.patronymic,
          matronymic: args.input.matronymic,
          nickname: args.input.nickname,
          suffix: args.input.suffix,
          nameOrder: args.input.nameOrder as never,
          displayName,
          gender: args.input.gender as never,
          birthDate: args.input.birthDate as never,
          deathDate: args.input.deathDate as never,
          birthPlace: args.input.birthPlace as never,
          deathPlace: args.input.deathPlace as never,
          biography: args.input.biography,
          speculative: args.input.speculative,
        },
      });
    },

    /**
     * Soft delete a person in the user's constellation.
     * Requires authentication and authorization.
     */
    deletePerson: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Person> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const person = await prisma.person.findUnique({
        where: { id: args.id },
      });

      if (!person) {
        throw new GraphQLError("Person not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Verify the person belongs to the user's constellation
      const constellation = await prisma.constellation.findUnique({
        where: { id: person.constellationId },
      });

      if (!constellation || constellation.ownerId !== context.user.id) {
        throw new GraphQLError("You do not have access to this person", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return await prisma.person.update({
        where: { id: args.id },
        data: {
          deletedAt: new Date(),
          deletedBy: context.user.id,
        },
      });
    },
  },
};
