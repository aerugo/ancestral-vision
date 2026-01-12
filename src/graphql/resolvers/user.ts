/**
 * User Resolvers
 *
 * GraphQL resolvers for user queries.
 */
import type { GraphQLContext } from "../context";
import type { User, Constellation } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const userResolvers = {
  Query: {
    /**
     * Get the currently authenticated user.
     * Returns null if not authenticated.
     */
    me: (_parent: unknown, _args: unknown, context: GraphQLContext): User | null => {
      return context.user;
    },
  },

  User: {
    /**
     * Resolve user's constellation.
     */
    constellation: async (
      parent: User,
      _args: unknown,
      _context: GraphQLContext
    ): Promise<Constellation | null> => {
      return await prisma.constellation.findUnique({
        where: { ownerId: parent.id },
      });
    },
  },
};
