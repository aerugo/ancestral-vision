/**
 * GraphQL Resolvers
 *
 * Implements all queries and mutations for the Ancestral Vision API.
 * All mutations require authentication and respect constellation ownership.
 */
import { prisma } from '@/lib/prisma';
import type {
  User,
  Constellation,
  Person,
  ParentChildRelationship,
  SpouseRelationship,
  ParentType,
  Note,
  PrivacyLevel,
} from '@prisma/client';
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

/**
 * Input type for creating a parent-child relationship
 */
interface CreateParentChildRelationshipInput {
  parentId: string;
  childId: string;
  relationshipType?: ParentType;
  isPreferred?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

/**
 * Input type for updating a parent-child relationship
 */
interface UpdateParentChildRelationshipInput {
  relationshipType?: ParentType;
  isPreferred?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

/**
 * Input type for creating a spouse relationship
 */
interface CreateSpouseRelationshipInput {
  person1Id: string;
  person2Id: string;
  marriageDate?: unknown;
  marriagePlace?: unknown;
  divorceDate?: unknown;
  description?: string;
}

/**
 * Input type for updating a spouse relationship
 */
interface UpdateSpouseRelationshipInput {
  marriageDate?: unknown;
  marriagePlace?: unknown;
  divorceDate?: unknown;
  description?: string;
}

/**
 * Input type for creating a note
 */
interface CreateNoteInput {
  personId: string;
  title?: string;
  content: string;
  privacy?: PrivacyLevel;
}

/**
 * Input type for updating a note
 */
interface UpdateNoteInput {
  title?: string;
  content?: string;
  privacy?: PrivacyLevel;
}

/**
 * Note version stored in previousVersions array
 */
interface NoteVersion {
  version: number;
  content: string;
  updatedAt: string;
}

const MAX_CONTENT_LENGTH = 50000;
const MAX_VERSIONS = 10;

/**
 * Verify a person belongs to user's constellation
 */
async function verifyPersonOwnership(
  personId: string,
  constellation: Constellation
): Promise<Person | null> {
  return prisma.person.findFirst({
    where: {
      id: personId,
      constellationId: constellation.id,
    },
  });
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
          OR: [
            { parentId: args.personId },
            { childId: args.personId },
          ],
        },
        include: {
          parent: true,
          child: true,
        },
      });

      // Get spouse relationships where person is either person1 or person2
      const spouseRelationships = await prisma.spouseRelationship.findMany({
        where: {
          OR: [
            { person1Id: args.personId },
            { person2Id: args.personId },
          ],
        },
        include: {
          person1: true,
          person2: true,
        },
      });

      return [...parentChildRelationships, ...spouseRelationships];
    },

    /**
     * Get notes for a person
     */
    personNotes: async (
      _parent: unknown,
      args: { personId: string },
      context: GraphQLContext
    ): Promise<Note[]> => {
      if (!context.user) return [];

      const constellation = await getUserConstellation(context.user.id);
      if (!constellation) return [];

      // Verify person belongs to user's constellation
      const person = await verifyPersonOwnership(args.personId, constellation);
      if (!person) return [];

      return prisma.note.findMany({
        where: {
          personId: args.personId,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
      });
    },

    /**
     * Get a single note by ID
     */
    note: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Note | null> => {
      if (!context.user) return null;

      const constellation = await getUserConstellation(context.user.id);
      if (!constellation) return null;

      return prisma.note.findFirst({
        where: {
          id: args.id,
          constellationId: constellation.id,
          deletedAt: null,
        },
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

    /**
     * Create a note for a person
     */
    createNote: async (
      _parent: unknown,
      args: { input: CreateNoteInput },
      context: GraphQLContext
    ): Promise<Note> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Validate content length
      if (args.input.content.length > MAX_CONTENT_LENGTH) {
        throw new GraphQLError('Note content exceeds 50,000 character limit', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Verify person belongs to user's constellation
      const person = await verifyPersonOwnership(args.input.personId, constellation);
      if (!person) {
        throw new GraphQLError('Person not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.note.create({
        data: {
          personId: args.input.personId,
          constellationId: constellation.id,
          title: args.input.title,
          content: args.input.content,
          privacy: args.input.privacy || 'PRIVATE',
          version: 1,
          createdBy: user.id,
        },
      });
    },

    /**
     * Update a note
     */
    updateNote: async (
      _parent: unknown,
      args: { id: string; input: UpdateNoteInput },
      context: GraphQLContext
    ): Promise<Note> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Find the note and verify it belongs to user's constellation
      const note = await prisma.note.findFirst({
        where: {
          id: args.id,
          constellationId: constellation.id,
          deletedAt: null,
        },
      });

      if (!note) {
        throw new GraphQLError('Note not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Validate content length if provided
      if (args.input.content && args.input.content.length > MAX_CONTENT_LENGTH) {
        throw new GraphQLError('Note content exceeds 50,000 character limit', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Build previous versions array (INV-D006)
      const currentVersion: NoteVersion = {
        version: note.version,
        content: note.content,
        updatedAt: note.updatedAt.toISOString(),
      };

      const existingVersions = Array.isArray(note.previousVersions)
        ? (note.previousVersions as unknown as NoteVersion[])
        : [];

      const previousVersions = [currentVersion, ...existingVersions].slice(0, MAX_VERSIONS) as unknown as object;

      return prisma.note.update({
        where: { id: args.id },
        data: {
          ...(args.input.title !== undefined && { title: args.input.title }),
          ...(args.input.content !== undefined && { content: args.input.content }),
          ...(args.input.privacy !== undefined && { privacy: args.input.privacy }),
          version: note.version + 1,
          previousVersions,
        },
      });
    },

    /**
     * Soft delete a note (INV-D005)
     */
    deleteNote: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Note> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const note = await prisma.note.findFirst({
        where: {
          id: args.id,
          constellationId: constellation.id,
        },
      });

      if (!note) {
        throw new GraphQLError('Note not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.note.update({
        where: { id: args.id },
        data: { deletedAt: new Date() },
      });
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

  Person: {
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
      return relationships.map((r) =>
        r.person1Id === parent.id ? r.person2 : r.person1
      );
    },
  },

  // Union type resolver for Relationship
  Relationship: {
    __resolveType(
      obj: ParentChildRelationship | SpouseRelationship
    ): 'ParentChildRelationship' | 'SpouseRelationship' {
      // SpouseRelationship has person1Id, ParentChildRelationship has parentId
      if ('parentId' in obj) {
        return 'ParentChildRelationship';
      }
      return 'SpouseRelationship';
    },
  },
};
