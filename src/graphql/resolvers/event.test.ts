/**
 * Event Resolver Tests
 *
 * Tests for Event queries and mutations with GEDCOM-style dates.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { resolvers } from './index';
import type { GraphQLContext } from './utils';
import type { User, Constellation, Person, Event } from '@prisma/client';

// Check if database is available
let databaseAvailable = false;
let testUser: User;
let testConstellation: Constellation;
let testPerson: Person;
let testPerson2: Person;

beforeAll(async () => {
  try {
    await prisma.$connect();
    databaseAvailable = true;
    console.log('Database available - running event resolver tests');

    // Create test user
    testUser = await prisma.user.create({
      data: {
        id: `event-test-user-${Date.now()}`,
        email: `event-test-${Date.now()}@test.com`,
        displayName: 'Event Test User',
      },
    });

    // Create test constellation
    testConstellation = await prisma.constellation.create({
      data: {
        ownerId: testUser.id,
        title: 'Event Test Constellation',
      },
    });

    // Create test people
    testPerson = await prisma.person.create({
      data: {
        constellationId: testConstellation.id,
        givenName: 'John',
        surname: 'Doe',
        displayName: 'John Doe',
        createdBy: testUser.id,
      },
    });

    testPerson2 = await prisma.person.create({
      data: {
        constellationId: testConstellation.id,
        givenName: 'Jane',
        surname: 'Doe',
        displayName: 'Jane Doe',
        createdBy: testUser.id,
      },
    });
  } catch {
    console.log('Database not available - skipping event resolver tests');
    databaseAvailable = false;
  }
});

afterAll(async () => {
  if (databaseAvailable) {
    // Clean up test data
    await prisma.event.deleteMany({
      where: { constellationId: testConstellation.id },
    });
    await prisma.person.deleteMany({
      where: { constellationId: testConstellation.id },
    });
    await prisma.constellation.delete({
      where: { id: testConstellation.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  }
  await prisma.$disconnect();
});

describe('Event Resolvers', () => {
  describe('Query: personEvents', () => {
    it('should return events for a person', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create an event
      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'Birth',
          date: { type: 'exact', year: 1985, month: 6, day: 15 },
          createdBy: testUser.id,
        },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Query.personEvents(
        {},
        { personId: testPerson.id },
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((e: Event) => e.id === event.id)).toBe(true);

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });

    it('should return empty array for unauthenticated user', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: null };
      const result = await resolvers.Query.personEvents(
        {},
        { personId: testPerson.id },
        context
      );

      expect(result).toEqual([]);
    });

    it('should return empty array for person not in user constellation', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create another user with their own constellation
      const otherUser = await prisma.user.create({
        data: {
          id: `other-event-user-${Date.now()}`,
          email: `other-event-${Date.now()}@test.com`,
          displayName: 'Other User',
        },
      });

      const context: GraphQLContext = { user: otherUser };
      const result = await resolvers.Query.personEvents(
        {},
        { personId: testPerson.id },
        context
      );

      expect(result).toEqual([]);

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should exclude deleted events from queries', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create a deleted event
      const deletedEvent = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'Deleted Event',
          deletedAt: new Date(),
          createdBy: testUser.id,
        },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Query.personEvents(
        {},
        { personId: testPerson.id },
        context
      );

      expect(result.every((e: Event) => e.id !== deletedEvent.id)).toBe(true);

      // Clean up
      await prisma.event.delete({ where: { id: deletedEvent.id } });
    });

    it('should return events where person is participant', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // Create an event with testPerson2 as primary but testPerson as participant
      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson2.id,
          title: 'Shared Event',
          createdBy: testUser.id,
          participants: {
            create: { personId: testPerson.id },
          },
        },
        include: { participants: true },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Query.personEvents(
        {},
        { personId: testPerson.id },
        context
      );

      expect(result.some((e: Event) => e.id === event.id)).toBe(true);

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });
  });

  describe('Query: event', () => {
    it('should return a single event by ID', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'Single Event',
          createdBy: testUser.id,
        },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Query.event({}, { id: event.id }, context);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(event.id);
      expect(result?.title).toBe('Single Event');

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });

    it('should return null for non-existent event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Query.event(
        {},
        { id: 'non-existent-id' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('Mutation: createEvent', () => {
    it('should create an event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };
      const input = {
        primaryPersonId: testPerson.id,
        title: 'Test Event',
        description: 'A test event',
      };

      const result = await resolvers.Mutation.createEvent({}, { input }, context);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test Event');
      expect(result.primaryPersonId).toBe(testPerson.id);

      // Clean up
      await prisma.event.delete({ where: { id: result.id } });
    });

    it('should require authentication to create event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: null };
      const input = {
        primaryPersonId: testPerson.id,
        title: 'Unauthorized Event',
      };

      await expect(
        resolvers.Mutation.createEvent({}, { input }, context)
      ).rejects.toThrow();
    });

    it('should create event with flexible date', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };
      const input = {
        primaryPersonId: testPerson.id,
        title: 'Birth',
        date: { type: 'approximate', year: 1920 },
      };

      const result = await resolvers.Mutation.createEvent({}, { input }, context);

      expect(result.date).toEqual({ type: 'approximate', year: 1920 });

      // Clean up
      await prisma.event.delete({ where: { id: result.id } });
    });

    it('should create event with location', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };
      const input = {
        primaryPersonId: testPerson.id,
        title: 'Birth',
        location: { place: 'Boston', region: 'MA', country: 'USA' },
      };

      const result = await resolvers.Mutation.createEvent({}, { input }, context);

      expect(result.location).toEqual({
        place: 'Boston',
        region: 'MA',
        country: 'USA',
      });

      // Clean up
      await prisma.event.delete({ where: { id: result.id } });
    });

    it('should create event with participants', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };
      const input = {
        primaryPersonId: testPerson.id,
        title: 'Wedding',
        participantIds: [testPerson2.id],
      };

      const result = await resolvers.Mutation.createEvent({}, { input }, context);

      expect(result.participants).toBeDefined();
      expect(result.participants.length).toBe(1);
      expect(result.participants[0].personId).toBe(testPerson2.id);

      // Clean up
      await prisma.event.delete({ where: { id: result.id } });
    });

    it('should throw error for person not in constellation', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };
      const input = {
        primaryPersonId: 'non-existent-person',
        title: 'Invalid Event',
      };

      await expect(
        resolvers.Mutation.createEvent({}, { input }, context)
      ).rejects.toThrow();
    });
  });

  describe('Mutation: updateEvent', () => {
    it('should update an event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'Original Title',
          createdBy: testUser.id,
        },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Mutation.updateEvent(
        {},
        { id: event.id, input: { title: 'Updated Title' } },
        context
      );

      expect(result.title).toBe('Updated Title');

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });

    it('should throw error for non-existent event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const context: GraphQLContext = { user: testUser };

      await expect(
        resolvers.Mutation.updateEvent(
          {},
          { id: 'non-existent', input: { title: 'Updated' } },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation: deleteEvent', () => {
    it('should soft delete an event (INV-D005)', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'To Delete',
          createdBy: testUser.id,
        },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Mutation.deleteEvent(
        {},
        { id: event.id },
        context
      );

      expect(result.deletedAt).toBeDefined();

      // Verify it's soft deleted
      const deleted = await prisma.event.findUnique({
        where: { id: event.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });
  });

  describe('Mutation: addEventParticipant', () => {
    it('should add participant to event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'Event for Participant',
          createdBy: testUser.id,
        },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Mutation.addEventParticipant(
        {},
        { eventId: event.id, personId: testPerson2.id },
        context
      );

      expect(result.participants.some((p: { personId: string }) => p.personId === testPerson2.id)).toBe(true);

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });
  });

  describe('Mutation: removeEventParticipant', () => {
    it('should remove participant from event', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      const event = await prisma.event.create({
        data: {
          constellationId: testConstellation.id,
          primaryPersonId: testPerson.id,
          title: 'Event with Participant',
          createdBy: testUser.id,
          participants: {
            create: { personId: testPerson2.id },
          },
        },
        include: { participants: true },
      });

      const context: GraphQLContext = { user: testUser };
      const result = await resolvers.Mutation.removeEventParticipant(
        {},
        { eventId: event.id, personId: testPerson2.id },
        context
      );

      expect(result.participants.every((p: { personId: string }) => p.personId !== testPerson2.id)).toBe(true);

      // Clean up
      await prisma.event.delete({ where: { id: event.id } });
    });
  });
});
