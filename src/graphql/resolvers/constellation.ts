/**
 * Constellation Resolvers
 *
 * GraphQL resolvers for constellation queries and mutations.
 */
import type { GraphQLContext } from "../context";
import type { Constellation, Person } from "@prisma/client";
import { GraphQLError } from "graphql";
import { prisma } from "@/lib/prisma";

interface CreateConstellationInput {
  title: string;
  description?: string;
}

interface UpdateConstellationInput {
  title?: string;
  description?: string;
  centeredPersonId?: string;
}

export const constellationResolvers = {
  Query: {
    /**
     * Get the current user's constellation.
     * Requires authentication.
     */
    constellation: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ): Promise<Constellation | null> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return await prisma.constellation.findUnique({
        where: { ownerId: context.user.id },
      });
    },
  },

  Mutation: {
    /**
     * Create a new constellation for the current user.
     * Requires authentication.
     */
    createConstellation: async (
      _parent: unknown,
      args: { input: CreateConstellationInput },
      context: GraphQLContext
    ): Promise<Constellation> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return await prisma.constellation.create({
        data: {
          ownerId: context.user.id,
          title: args.input.title,
          description: args.input.description,
        },
      });
    },

    /**
     * Update the current user's constellation.
     * Requires authentication.
     */
    updateConstellation: async (
      _parent: unknown,
      args: { input: UpdateConstellationInput },
      context: GraphQLContext
    ): Promise<Constellation> => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const constellation = await prisma.constellation.findUnique({
        where: { ownerId: context.user.id },
      });

      if (!constellation) {
        throw new GraphQLError("Constellation not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return await prisma.constellation.update({
        where: { id: constellation.id },
        data: {
          title: args.input.title,
          description: args.input.description,
          centeredPersonId: args.input.centeredPersonId,
        },
      });
    },
  },

  Constellation: {
    /**
     * Resolve constellation's people.
     */
    people: async (
      parent: Constellation,
      _args: unknown,
      _context: GraphQLContext
    ): Promise<Person[]> => {
      return await prisma.person.findMany({
        where: {
          constellationId: parent.id,
          deletedAt: null,
        },
      });
    },
  },
};
