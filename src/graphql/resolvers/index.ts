/**
 * GraphQL Resolvers
 *
 * Implements all queries and mutations for the Ancestral Vision API.
 * All mutations require authentication and respect constellation ownership.
 */
import { prisma } from '@/lib/prisma';
import type { User, Constellation, Person } from '@prisma/client';
import { GraphQLError } from 'graphql';

/**
 * GraphQL context containing authenticated user
 */
export interface GraphQLContext {
  user: User | null;
}

/**
 * Require authentication and return user
 * @throws GraphQLError if user is not authenticated
 */
function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

/**
 * Get the constellation owned by a user
 */
async function getUserConstellation(userId: string): Promise<Constellation | null> {
  return prisma.constellation.findUnique({
    where: { ownerId: userId },
  });
}

/**
 * Input type for creating a person
 */
interface CreatePersonInput {
  givenName: string;
  surname?: string;
  maidenName?: string;
  patronymic?: string;
  matronymic?: string;
  nickname?: string;
  suffix?: string;
  nameOrder?: 'WESTERN' | 'EASTERN' | 'PATRONYMIC' | 'PATRONYMIC_SUFFIX' | 'MATRONYMIC';
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  birthDate?: unknown;
  deathDate?: unknown;
  birthPlace?: unknown;
  deathPlace?: unknown;
  biography?: string;
  speculative?: boolean;
}

/**
 * Input type for updating a person
 */
type UpdatePersonInput = Partial<CreatePersonInput>;

/**
 * Input type for creating a constellation
 */
interface CreateConstellationInput {
  title: string;
  description?: string;
}

/**
 * Input type for updating a constellation
 */
interface UpdateConstellationInput {
  title?: string;
  description?: string;
  centeredPersonId?: string;
}

export const resolvers = {
  Query: {
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
  },

  Mutation: {
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
      const displayName = [args.input.givenName, args.input.surname]
        .filter(Boolean)
        .join(' ') || args.input.givenName;

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
  },

  // Field resolvers
  User: {
    /**
     * Resolve constellation field on User type
     */
    constellation: async (parent: User): Promise<Constellation | null> => {
      return prisma.constellation.findUnique({
        where: { ownerId: parent.id },
      });
    },
  },

  Constellation: {
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
  },
};
