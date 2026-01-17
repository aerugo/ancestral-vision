/**
 * Person Resolvers
 *
 * Handles all person queries, mutations, and field resolvers.
 */
import { prisma } from '@/lib/prisma';
import type { Person } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
  type GraphQLContext,
  requireAuth,
  getUserConstellation,
  type CreatePersonInput,
  type UpdatePersonInput,
} from './utils';

export const personQueries = {
  /**
   * Get a person by ID (must be in user's constellation)
   */
  person: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Person | null> => {
    if (!context.user) return null;

    const constellation = await getUserConstellation(context.user.id);
    if (!constellation) return null;

    return prisma.person.findFirst({
      where: {
        id: args.id,
        constellationId: constellation.id,
      },
    });
  },

  /**
   * List all people in user's constellation
   */
  people: async (
    _parent: unknown,
    args: { includeDeleted?: boolean },
    context: GraphQLContext
  ): Promise<Person[]> => {
    if (!context.user) return [];

    const constellation = await getUserConstellation(context.user.id);
    if (!constellation) return [];

    return prisma.person.findMany({
      where: {
        constellationId: constellation.id,
        ...(args.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};

export const personMutations = {
  /**
   * Create a new person in the user's constellation
   */
  createPerson: async (
    _parent: unknown,
    args: { input: CreatePersonInput },
    context: GraphQLContext
  ): Promise<Person> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User must have a constellation to create people', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Generate displayName from name components
    const displayName =
      [args.input.givenName, args.input.surname].filter(Boolean).join(' ') ||
      args.input.givenName;

    const person = await prisma.person.create({
      data: {
        constellationId: constellation.id,
        givenName: args.input.givenName,
        surname: args.input.surname,
        maidenName: args.input.maidenName,
        patronymic: args.input.patronymic,
        matronymic: args.input.matronymic,
        nickname: args.input.nickname,
        suffix: args.input.suffix,
        displayName,
        nameOrder: args.input.nameOrder ?? 'WESTERN',
        gender: args.input.gender,
        birthDate: args.input.birthDate as object | undefined,
        deathDate: args.input.deathDate as object | undefined,
        birthPlace: args.input.birthPlace as object | undefined,
        deathPlace: args.input.deathPlace as object | undefined,
        biography: args.input.biography,
        speculative: args.input.speculative ?? false,
        createdBy: user.id,
      },
    });

    // Update constellation person count
    await prisma.constellation.update({
      where: { id: constellation.id },
      data: { personCount: { increment: 1 } },
    });

    return person;
  },

  /**
   * Update a person in the user's constellation
   */
  updatePerson: async (
    _parent: unknown,
    args: { id: string; input: UpdatePersonInput },
    context: GraphQLContext
  ): Promise<Person> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify person belongs to user's constellation
    const person = await prisma.person.findFirst({
      where: {
        id: args.id,
        constellationId: constellation.id,
      },
    });

    if (!person) {
      throw new GraphQLError('Person not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.person.update({
      where: { id: args.id },
      data: {
        ...(args.input.givenName !== undefined && { givenName: args.input.givenName }),
        ...(args.input.surname !== undefined && { surname: args.input.surname }),
        ...(args.input.maidenName !== undefined && { maidenName: args.input.maidenName }),
        ...(args.input.patronymic !== undefined && { patronymic: args.input.patronymic }),
        ...(args.input.matronymic !== undefined && { matronymic: args.input.matronymic }),
        ...(args.input.nickname !== undefined && { nickname: args.input.nickname }),
        ...(args.input.suffix !== undefined && { suffix: args.input.suffix }),
        ...(args.input.nameOrder !== undefined && { nameOrder: args.input.nameOrder }),
        ...(args.input.gender !== undefined && { gender: args.input.gender }),
        ...(args.input.birthDate !== undefined && {
          birthDate: args.input.birthDate as object | undefined,
        }),
        ...(args.input.deathDate !== undefined && {
          deathDate: args.input.deathDate as object | undefined,
        }),
        ...(args.input.birthPlace !== undefined && {
          birthPlace: args.input.birthPlace as object | undefined,
        }),
        ...(args.input.deathPlace !== undefined && {
          deathPlace: args.input.deathPlace as object | undefined,
        }),
        ...(args.input.biography !== undefined && { biography: args.input.biography }),
        ...(args.input.speculative !== undefined && { speculative: args.input.speculative }),
      },
    });
  },

  /**
   * Soft delete a person (sets deletedAt timestamp)
   */
  deletePerson: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Person> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const person = await prisma.person.findFirst({
      where: {
        id: args.id,
        constellationId: constellation.id,
      },
    });

    if (!person) {
      throw new GraphQLError('Person not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Soft delete
    const deleted = await prisma.person.update({
      where: { id: args.id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    });

    // Update constellation person count
    await prisma.constellation.update({
      where: { id: constellation.id },
      data: { personCount: { decrement: 1 } },
    });

    return deleted;
  },
};

// Field resolvers for Person type
export const personFieldResolvers = {
  /**
   * Resolve parents field on Person type
   */
  parents: async (parent: Person): Promise<Person[]> => {
    const relationships = await prisma.parentChildRelationship.findMany({
      where: { childId: parent.id },
      include: { parent: true },
    });
    return relationships.map((r) => r.parent);
  },

  /**
   * Resolve children field on Person type
   */
  children: async (parent: Person): Promise<Person[]> => {
    const relationships = await prisma.parentChildRelationship.findMany({
      where: { parentId: parent.id },
      include: { child: true },
    });
    return relationships.map((r) => r.child);
  },

  /**
   * Resolve spouses field on Person type
   */
  spouses: async (parent: Person): Promise<Person[]> => {
    const relationships = await prisma.spouseRelationship.findMany({
      where: {
        OR: [{ person1Id: parent.id }, { person2Id: parent.id }],
      },
      include: { person1: true, person2: true },
    });
    return relationships.map((r) => (r.person1Id === parent.id ? r.person2 : r.person1));
  },

  /**
   * Resolve eventCount field on Person type
   * Counts events where person is primary or a participant (non-deleted only)
   */
  eventCount: async (parent: Person): Promise<number> => {
    // Count events where person is primary
    const primaryCount = await prisma.event.count({
      where: {
        primaryPersonId: parent.id,
        deletedAt: null,
      },
    });

    // Count events where person is a participant (but not primary, to avoid double counting)
    const participantCount = await prisma.eventParticipant.count({
      where: {
        personId: parent.id,
        event: {
          deletedAt: null,
          primaryPersonId: { not: parent.id },
        },
      },
    });

    return primaryCount + participantCount;
  },
};
