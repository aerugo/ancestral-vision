/**
 * User Resolvers
 *
 * Handles user queries and field resolvers.
 */
import { prisma } from '@/lib/prisma';
import type { User, Constellation } from '@prisma/client';
import { type GraphQLContext } from './utils';

export const userQueries = {
  /**
   * Get the currently authenticated user
   */
  me: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<User | null> => {
    return context.user;
  },
};

// Field resolvers for User type
export const userFieldResolvers = {
  /**
   * Resolve constellation field on User type
   */
  constellation: async (parent: User): Promise<Constellation | null> => {
    return prisma.constellation.findUnique({
      where: { ownerId: parent.id },
    });
  },
};
