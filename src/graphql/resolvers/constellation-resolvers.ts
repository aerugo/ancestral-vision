/**
 * Constellation Resolvers
 *
 * Handles all constellation queries, mutations, and field resolvers.
 */
import { prisma } from '@/lib/prisma';
import type { Constellation, Person } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
  type GraphQLContext,
  requireAuth,
  getUserConstellation,
  type CreateConstellationInput,
  type UpdateConstellationInput,
} from './utils';

export const constellationQueries = {
  /**
   * Get the current user's constellation
   */
  constellation: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<Constellation | null> => {
    if (!context.user) return null;
    return getUserConstellation(context.user.id);
  },
};

export const constellationMutations = {
  /**
   * Create a new constellation for the authenticated user
   */
  createConstellation: async (
    _parent: unknown,
    args: { input: CreateConstellationInput },
    context: GraphQLContext
  ): Promise<Constellation> => {
    const user = requireAuth(context);

    const existing = await getUserConstellation(user.id);
    if (existing) {
      throw new GraphQLError('User already has a constellation', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    return prisma.constellation.create({
      data: {
        ownerId: user.id,
        title: args.input.title,
        description: args.input.description,
      },
    });
  },

  /**
   * Update the user's constellation
   */
  updateConstellation: async (
    _parent: unknown,
    args: { input: UpdateConstellationInput },
    context: GraphQLContext
  ): Promise<Constellation> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.constellation.update({
      where: { id: constellation.id },
      data: {
        ...(args.input.title && { title: args.input.title }),
        ...(args.input.description !== undefined && {
          description: args.input.description,
        }),
        ...(args.input.centeredPersonId !== undefined && {
          centeredPersonId: args.input.centeredPersonId,
        }),
      },
    });
  },
};

// Field resolvers for Constellation type
export const constellationFieldResolvers = {
  /**
   * Resolve people field on Constellation type
   */
  people: async (parent: Constellation): Promise<Person[]> => {
    return prisma.person.findMany({
      where: {
        constellationId: parent.id,
        deletedAt: null,
      },
    });
  },
};
