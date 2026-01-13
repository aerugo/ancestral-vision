/**
 * Note Resolvers
 *
 * Handles all note queries and mutations including version history.
 */
import { prisma } from '@/lib/prisma';
import type { Note } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
  type GraphQLContext,
  requireAuth,
  getUserConstellation,
  verifyPersonOwnership,
  type CreateNoteInput,
  type UpdateNoteInput,
  type NoteVersion,
  MAX_CONTENT_LENGTH,
  MAX_VERSIONS,
} from './utils';

export const noteQueries = {
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
};

export const noteMutations = {
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

    const previousVersions = [currentVersion, ...existingVersions].slice(
      0,
      MAX_VERSIONS
    ) as unknown as object;

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
};
