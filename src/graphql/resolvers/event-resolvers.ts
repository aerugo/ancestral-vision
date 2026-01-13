/**
 * Event Resolvers
 *
 * Handles all event queries and mutations with GEDCOM-style flexible dates.
 */
import { prisma } from '@/lib/prisma';
import type { Event, EventParticipant, Person, PrivacyLevel } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
  type GraphQLContext,
  requireAuth,
  getUserConstellation,
  verifyPersonOwnership,
} from './utils';
import { validateFuzzyDate } from '@/lib/date-utils';

/**
 * Input type for creating an event
 */
interface CreateEventInput {
  primaryPersonId: string;
  title: string;
  description?: string;
  icon?: string;
  date?: unknown;
  location?: unknown;
  participantIds?: string[];
  privacy?: PrivacyLevel;
}

/**
 * Input type for updating an event
 */
interface UpdateEventInput {
  title?: string;
  description?: string;
  icon?: string;
  date?: unknown;
  location?: unknown;
  privacy?: PrivacyLevel;
}

export const eventQueries = {
  /**
   * Get events for a person (as primary or participant)
   */
  personEvents: async (
    _parent: unknown,
    args: { personId: string },
    context: GraphQLContext
  ): Promise<Event[]> => {
    if (!context.user) return [];

    const constellation = await getUserConstellation(context.user.id);
    if (!constellation) return [];

    // Verify person belongs to user's constellation
    const person = await verifyPersonOwnership(args.personId, constellation);
    if (!person) return [];

    // Get events where person is primary or participant
    return prisma.event.findMany({
      where: {
        OR: [
          { primaryPersonId: args.personId },
          { participants: { some: { personId: args.personId } } },
        ],
        deletedAt: null,
      },
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get a single event by ID
   */
  event: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Event | null> => {
    if (!context.user) return null;

    const constellation = await getUserConstellation(context.user.id);
    if (!constellation) return null;

    return prisma.event.findFirst({
      where: {
        id: args.id,
        constellationId: constellation.id,
        deletedAt: null,
      },
      include: { participants: true },
    });
  },
};

export const eventMutations = {
  /**
   * Create an event for a person
   */
  createEvent: async (
    _parent: unknown,
    args: { input: CreateEventInput },
    context: GraphQLContext
  ): Promise<Event> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Validate date if provided
    if (args.input.date) {
      try {
        validateFuzzyDate(args.input.date);
      } catch (error) {
        throw new GraphQLError('Invalid date format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    // Verify primary person belongs to user's constellation
    const person = await verifyPersonOwnership(args.input.primaryPersonId, constellation);
    if (!person) {
      throw new GraphQLError('Person not found in constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify all participants belong to constellation
    if (args.input.participantIds && args.input.participantIds.length > 0) {
      const participants = await prisma.person.findMany({
        where: {
          id: { in: args.input.participantIds },
          constellationId: constellation.id,
        },
      });

      if (participants.length !== args.input.participantIds.length) {
        throw new GraphQLError('One or more participants not found in constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
    }

    // Create event with participants
    return prisma.event.create({
      data: {
        constellationId: constellation.id,
        primaryPersonId: args.input.primaryPersonId,
        title: args.input.title,
        description: args.input.description,
        icon: args.input.icon,
        date: args.input.date as object | undefined,
        location: args.input.location as object | undefined,
        privacy: args.input.privacy || 'PRIVATE',
        createdBy: user.id,
        participants: args.input.participantIds
          ? {
              create: args.input.participantIds.map((personId) => ({ personId })),
            }
          : undefined,
      },
      include: { participants: true },
    });
  },

  /**
   * Update an event
   */
  updateEvent: async (
    _parent: unknown,
    args: { id: string; input: UpdateEventInput },
    context: GraphQLContext
  ): Promise<Event> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the event and verify it belongs to user's constellation
    const event = await prisma.event.findFirst({
      where: {
        id: args.id,
        constellationId: constellation.id,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Validate date if provided
    if (args.input.date) {
      try {
        validateFuzzyDate(args.input.date);
      } catch (error) {
        throw new GraphQLError('Invalid date format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    return prisma.event.update({
      where: { id: args.id },
      data: {
        ...(args.input.title !== undefined && { title: args.input.title }),
        ...(args.input.description !== undefined && { description: args.input.description }),
        ...(args.input.icon !== undefined && { icon: args.input.icon }),
        ...(args.input.date !== undefined && { date: args.input.date as object | undefined }),
        ...(args.input.location !== undefined && {
          location: args.input.location as object | undefined,
        }),
        ...(args.input.privacy !== undefined && { privacy: args.input.privacy }),
      },
      include: { participants: true },
    });
  },

  /**
   * Soft delete an event (INV-D005)
   */
  deleteEvent: async (
    _parent: unknown,
    args: { id: string },
    context: GraphQLContext
  ): Promise<Event> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const event = await prisma.event.findFirst({
      where: {
        id: args.id,
        constellationId: constellation.id,
      },
    });

    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return prisma.event.update({
      where: { id: args.id },
      data: { deletedAt: new Date() },
      include: { participants: true },
    });
  },

  /**
   * Add a participant to an event
   */
  addEventParticipant: async (
    _parent: unknown,
    args: { eventId: string; personId: string },
    context: GraphQLContext
  ): Promise<Event> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the event
    const event = await prisma.event.findFirst({
      where: {
        id: args.eventId,
        constellationId: constellation.id,
      },
    });

    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Verify person belongs to constellation
    const person = await verifyPersonOwnership(args.personId, constellation);
    if (!person) {
      throw new GraphQLError('Person not found in constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check if already a participant
    const existingParticipant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_personId: {
          eventId: args.eventId,
          personId: args.personId,
        },
      },
    });

    if (existingParticipant) {
      throw new GraphQLError('Person is already a participant', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Add participant
    await prisma.eventParticipant.create({
      data: {
        eventId: args.eventId,
        personId: args.personId,
      },
    });

    return prisma.event.findUnique({
      where: { id: args.eventId },
      include: { participants: true },
    }) as Promise<Event>;
  },

  /**
   * Remove a participant from an event
   */
  removeEventParticipant: async (
    _parent: unknown,
    args: { eventId: string; personId: string },
    context: GraphQLContext
  ): Promise<Event> => {
    const user = requireAuth(context);

    const constellation = await getUserConstellation(user.id);
    if (!constellation) {
      throw new GraphQLError('User has no constellation', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Find the event
    const event = await prisma.event.findFirst({
      where: {
        id: args.eventId,
        constellationId: constellation.id,
      },
    });

    if (!event) {
      throw new GraphQLError('Event not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Remove participant
    await prisma.eventParticipant.delete({
      where: {
        eventId_personId: {
          eventId: args.eventId,
          personId: args.personId,
        },
      },
    });

    return prisma.event.findUnique({
      where: { id: args.eventId },
      include: { participants: true },
    }) as Promise<Event>;
  },
};

// Field resolvers for Event type
export const eventFieldResolvers = {
  /**
   * Resolve primaryPerson field on Event type
   */
  primaryPerson: async (parent: Event): Promise<Person | null> => {
    return prisma.person.findUnique({
      where: { id: parent.primaryPersonId },
    });
  },
};

// Field resolvers for EventParticipant type
export const eventParticipantFieldResolvers = {
  /**
   * Resolve person field on EventParticipant type
   */
  person: async (parent: EventParticipant): Promise<Person | null> => {
    return prisma.person.findUnique({
      where: { id: parent.personId },
    });
  },
};
