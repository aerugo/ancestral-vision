/**
 * Relationship Resolvers
 *
 * Handles all parent-child and spouse relationship queries and mutations.
 */
import { prisma } from '@/lib/prisma';
import type { ParentChildRelationship, SpouseRelationship } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
  type GraphQLContext,
  requireAuth,
  getUserConstellation,
  verifyPersonOwnership,
  type CreateParentChildRelationshipInput,
  type UpdateParentChildRelationshipInput,
  type CreateSpouseRelationshipInput,
  type UpdateSpouseRelationshipInput,
} from './utils';

export const relationshipQueries = {
  /**
   * Get all relationships for a person (both parent-child and spouse)
   */
  personRelationships: async (
    _parent: unknown,
    args: { personId: string },
    context: GraphQLContext
  ): Promise<(ParentChildRelationship | SpouseRelationship)[]> => {
    if (!context.user) return [];

    const constellation = await getUserConstellation(context.user.id);
    if (!constellation) return [];

    // Verify person belongs to user's constellation
    const person = await verifyPersonOwnership(args.personId, constellation);
    if (!person) return [];

    // Get parent-child relationships where person is parent or child
    const parentChildRelationships = await prisma.parentChildRelationship.findMany({
      where: {
        OR: [{ parentId: args.personId }, { childId: args.personId }],
      },
      include: {
        parent: true,
        child: true,
      },
    });

    // Get spouse relationships where person is either person1 or person2
    const spouseRelationships = await prisma.spouseRelationship.findMany({
      where: {
        OR: [{ person1Id: args.personId }, { person2Id: args.personId }],
      },
      include: {
        person1: true,
        person2: true,
      },
    });

    return [...parentChildRelationships, ...spouseRelationships];
  },
};

export const relationshipMutations = {
  /**
   * Create a parent-child relationship
   */
  createParentChildRelationship: async (
    _parent: unknown,
    args: { input: CreateParentChildRelationshipInput },
    context: GraphQLContext
  ): Promise<ParentChildRelationship> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify both people belong to user's constellation
    const [parent, child] = await Promise.all([
      verifyPersonOwnership(args.input.parentId, constellation),
      verifyPersonOwnership(args.input.childId, constellation),
    ]);

    if (!parent || !child) {
      throw new GraphQLError('Parent or child not found in constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check if relationship already exists
    const existing = await prisma.parentChildRelationship.findFirst({
      where: {
        parentId: args.input.parentId,
        childId: args.input.childId,
      },
    });

    if (existing) {
      throw new GraphQLError('Relationship already exists', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    return prisma.parentChildRelationship.create({
      data: {
        parentId: args.input.parentId,
        childId: args.input.childId,
        constellationId: constellation.id,
        relationshipType: args.input.relationshipType ?? 'BIOLOGICAL',
        isPreferred: args.input.isPreferred ?? false,
        startDate: args.input.startDate as object | undefined,
        endDate: args.input.endDate as object | undefined,
        createdBy: user.id,
      },
      include: {
        parent: true,
        child: true,
      },
    });
  },

  /**
   * Update a parent-child relationship
   */
  updateParentChildRelationship: async (
    _parent: unknown,
    args: { id: string; input: UpdateParentChildRelationshipInput },
    context: GraphQLContext
  ): Promise<ParentChildRelationship> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the relationship and verify it belongs to user's constellation
    const relationship = await prisma.parentChildRelationship.findUnique({
      where: { id: args.id },
      include: { parent: true },
    });

    if (!relationship) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify relationship is in user's constellation
    if (relationship.parent.constellationId !== constellation.id) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.parentChildRelationship.update({
      where: { id: args.id },
      data: {
        ...(args.input.relationshipType !== undefined && {
          relationshipType: args.input.relationshipType,
        }),
        ...(args.input.isPreferred !== undefined && {
          isPreferred: args.input.isPreferred,
        }),
        ...(args.input.startDate !== undefined && {
          startDate: args.input.startDate as object | undefined,
        }),
        ...(args.input.endDate !== undefined && {
          endDate: args.input.endDate as object | undefined,
        }),
      },
      include: {
        parent: true,
        child: true,
      },
    });
  },

  /**
   * Delete a parent-child relationship
   */
  deleteParentChildRelationship: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<ParentChildRelationship> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the relationship and verify it belongs to user's constellation
    const relationship = await prisma.parentChildRelationship.findUnique({
      where: { id: args.id },
      include: { parent: true, child: true },
    });

    if (!relationship) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify relationship is in user's constellation
    if (relationship.parent.constellationId !== constellation.id) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.parentChildRelationship.delete({
      where: { id: args.id },
      include: {
        parent: true,
        child: true,
      },
    });
  },

  /**
   * Create a spouse relationship
   */
  createSpouseRelationship: async (
    _parent: unknown,
    args: { input: CreateSpouseRelationshipInput },
    context: GraphQLContext
  ): Promise<SpouseRelationship> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify both people belong to user's constellation
    const [person1, person2] = await Promise.all([
      verifyPersonOwnership(args.input.person1Id, constellation),
      verifyPersonOwnership(args.input.person2Id, constellation),
    ]);

    if (!person1 || !person2) {
      throw new GraphQLError('One or both people not found in constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check if relationship already exists (in either direction)
    const existing = await prisma.spouseRelationship.findFirst({
      where: {
        OR: [
          { person1Id: args.input.person1Id, person2Id: args.input.person2Id },
          { person1Id: args.input.person2Id, person2Id: args.input.person1Id },
        ],
      },
    });

    if (existing) {
      throw new GraphQLError('Spouse relationship already exists', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    return prisma.spouseRelationship.create({
      data: {
        person1Id: args.input.person1Id,
        person2Id: args.input.person2Id,
        constellationId: constellation.id,
        marriageDate: args.input.marriageDate as object | undefined,
        marriagePlace: args.input.marriagePlace as object | undefined,
        divorceDate: args.input.divorceDate as object | undefined,
        description: args.input.description,
        createdBy: user.id,
      },
      include: {
        person1: true,
        person2: true,
      },
    });
  },

  /**
   * Update a spouse relationship
   */
  updateSpouseRelationship: async (
    _parent: unknown,
    args: { id: string; input: UpdateSpouseRelationshipInput },
    context: GraphQLContext
  ): Promise<SpouseRelationship> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the relationship and verify it belongs to user's constellation
    const relationship = await prisma.spouseRelationship.findUnique({
      where: { id: args.id },
      include: { person1: true },
    });

    if (!relationship) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify relationship is in user's constellation
    if (relationship.person1.constellationId !== constellation.id) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.spouseRelationship.update({
      where: { id: args.id },
      data: {
        ...(args.input.marriageDate !== undefined && {
          marriageDate: args.input.marriageDate as object | undefined,
        }),
        ...(args.input.marriagePlace !== undefined && {
          marriagePlace: args.input.marriagePlace as object | undefined,
        }),
        ...(args.input.divorceDate !== undefined && {
          divorceDate: args.input.divorceDate as object | undefined,
        }),
        ...(args.input.description !== undefined && {
          description: args.input.description,
        }),
      },
      include: {
        person1: true,
        person2: true,
      },
    });
  },

  /**
   * Delete a spouse relationship
   */
  deleteSpouseRelationship: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<SpouseRelationship> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the relationship and verify it belongs to user's constellation
    const relationship = await prisma.spouseRelationship.findUnique({
      where: { id: args.id },
      include: { person1: true, person2: true },
    });

    if (!relationship) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify relationship is in user's constellation
    if (relationship.person1.constellationId !== constellation.id) {
      throw new GraphQLError('Relationship not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.spouseRelationship.delete({
      where: { id: args.id },
      include: {
        person1: true,
        person2: true,
      },
    });
  },
};

// Union type resolver for Relationship
export const relationshipTypeResolver = {
  __resolveType(
    obj: ParentChildRelationship | SpouseRelationship
  ): 'ParentChildRelationship' | 'SpouseRelationship' {
    // SpouseRelationship has person1Id, ParentChildRelationship has parentId
    if ('parentId' in obj) {
      return 'ParentChildRelationship';
    }
    return 'SpouseRelationship';
  },
};
