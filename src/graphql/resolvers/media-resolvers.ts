/**
 * Media Resolvers (INV-D008: Cloud Storage with signed URLs)
 *
 * GraphQL resolvers for media operations including upload, download, and management.
 */
import { GraphQLError } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import type { GraphQLContext } from '../types';
import {
  generateStoragePath,
  generateUploadUrl,
  generateDownloadUrl,
  validateMediaFile,
  getMediaTypeFromMime,
  checkDuplicate,
  generateThumbnails,
} from '@/lib/storage';

// Helper to require authentication
function requireAuth(ctx: GraphQLContext): void {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

// Input types
interface PrepareMediaUploadInput {
  filename: string;
  mimeType: string;
  fileSize: number;
  hash: string;
  personIds: string[];
}

interface ConfirmMediaUploadInput {
  mediaId: string;
  title?: string;
  description?: string;
  dateTaken?: unknown;
  privacy?: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
}

// Media type from Prisma
interface MediaRecord {
  id: string;
  storagePath: string;
  mimeType: string;
}

/**
 * Media Query Resolvers
 */
export const mediaQueries = {
  personMedia: async (
    _: unknown,
    { personId }: { personId: string },
    ctx: GraphQLContext
  ) => {
    if (!ctx.user) return [];

    // Check person belongs to user's constellation
    const person = await ctx.prisma.person.findFirst({
      where: { id: personId, constellation: { ownerId: ctx.user.uid } },
    });
    if (!person) return [];

    // Get media associated with this person
    const mediaPersons = await ctx.prisma.mediaPerson.findMany({
      where: { personId },
      include: { media: true },
    });

    return mediaPersons.map((mp) => mp.media).filter((m) => !m.deletedAt);
  },

  media: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    if (!ctx.user) return null;

    const media = await ctx.prisma.media.findFirst({
      where: { id, constellation: { ownerId: ctx.user.uid }, deletedAt: null },
    });

    return media;
  },
};

/**
 * Media Mutation Resolvers
 */
export const mediaMutations = {
  prepareMediaUpload: async (
    _: unknown,
    { input }: { input: PrepareMediaUploadInput },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    // Validate file
    validateMediaFile({ mimeType: input.mimeType, size: input.fileSize });

    // Get constellation
    const constellation = await ctx.prisma.constellation.findFirst({
      where: { ownerId: ctx.user!.uid },
    });
    if (!constellation) {
      throw new GraphQLError('Constellation not found');
    }

    // Verify all persons exist in constellation
    for (const personId of input.personIds) {
      const person = await ctx.prisma.person.findFirst({
        where: { id: personId, constellationId: constellation.id },
      });
      if (!person) {
        throw new GraphQLError(`Person ${personId} not found in constellation`);
      }
    }

    // Check for duplicate
    const { isDuplicate, mediaId: duplicateMediaId } = await checkDuplicate(
      ctx.prisma,
      constellation.id,
      input.hash
    );

    // Create media record
    const mediaType = getMediaTypeFromMime(input.mimeType)!;
    const extension = input.filename.split('.').pop() || 'bin';
    const mediaId = uuidv4();

    const storagePath = generateStoragePath({
      userId: ctx.user!.uid,
      mediaType,
      mediaId,
      extension,
    });

    // Create pending media record with people associations
    await ctx.prisma.media.create({
      data: {
        id: mediaId,
        constellationId: constellation.id,
        type: mediaType,
        filename: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storagePath,
        hash: input.hash,
        createdBy: ctx.user!.uid,
        people: {
          create: input.personIds.map((personId) => ({ personId })),
        },
      },
    });

    const uploadUrl = await generateUploadUrl(storagePath);

    return {
      mediaId,
      uploadUrl,
      isDuplicate,
      duplicateMediaId,
    };
  },

  confirmMediaUpload: async (
    _: unknown,
    { input }: { input: ConfirmMediaUploadInput },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const media = await ctx.prisma.media.findFirst({
      where: { id: input.mediaId, constellation: { ownerId: ctx.user!.uid } },
    });

    if (!media) {
      throw new GraphQLError('Media not found');
    }

    // Generate thumbnails for images
    const thumbnails = await generateThumbnails(media.storagePath, media.mimeType);

    return ctx.prisma.media.update({
      where: { id: input.mediaId },
      data: {
        title: input.title,
        description: input.description,
        dateTaken: input.dateTaken as object | undefined,
        privacy: input.privacy || 'PRIVATE',
        thumbnails,
        confirmed: true,
      },
      include: { people: { include: { person: true } } },
    });
  },

  deleteMedia: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requireAuth(ctx);

    const media = await ctx.prisma.media.findFirst({
      where: { id, constellation: { ownerId: ctx.user!.uid } },
    });

    if (!media) {
      throw new GraphQLError('Media not found');
    }

    return ctx.prisma.media.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  associateMediaWithPerson: async (
    _: unknown,
    { mediaId, personId }: { mediaId: string; personId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const media = await ctx.prisma.media.findFirst({
      where: { id: mediaId, constellation: { ownerId: ctx.user!.uid } },
    });

    if (!media) {
      throw new GraphQLError('Media not found');
    }

    // Verify person is in same constellation
    const person = await ctx.prisma.person.findFirst({
      where: { id: personId, constellationId: media.constellationId },
    });

    if (!person) {
      throw new GraphQLError('Person not found in constellation');
    }

    // Create association (ignore if already exists)
    await ctx.prisma.mediaPerson.upsert({
      where: {
        mediaId_personId: { mediaId, personId },
      },
      create: { mediaId, personId },
      update: {},
    });

    return ctx.prisma.media.findUnique({
      where: { id: mediaId },
      include: { people: { include: { person: true } } },
    });
  },

  removeMediaFromPerson: async (
    _: unknown,
    { mediaId, personId }: { mediaId: string; personId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const media = await ctx.prisma.media.findFirst({
      where: { id: mediaId, constellation: { ownerId: ctx.user!.uid } },
    });

    if (!media) {
      throw new GraphQLError('Media not found');
    }

    await ctx.prisma.mediaPerson.delete({
      where: {
        mediaId_personId: { mediaId, personId },
      },
    });

    return ctx.prisma.media.findUnique({
      where: { id: mediaId },
      include: { people: { include: { person: true } } },
    });
  },
};

/**
 * Media Field Resolvers
 */
export const mediaFieldResolvers = {
  url: async (media: MediaRecord) => {
    return generateDownloadUrl(media.storagePath);
  },

  people: async (media: MediaRecord, _: unknown, ctx: GraphQLContext) => {
    const mediaPersons = await ctx.prisma.mediaPerson.findMany({
      where: { mediaId: media.id },
      include: { person: true },
    });
    return mediaPersons.map((mp) => mp.person);
  },
};
