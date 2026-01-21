/**
 * Source Content Resolvers
 *
 * Resolvers for fetching source content (notes, events, biographies)
 * for display in citation modals.
 *
 * @invariant INV-S002: Constellation-Scoped Access - All queries verify
 *   the source belongs to the user's constellation
 */
import { prisma } from '@/lib/prisma';
import { type GraphQLContext, getUserConstellation } from './utils';

/**
 * Source content types returned by the resolver
 */
export type SourceType = 'Note' | 'Event' | 'Biography';

/**
 * Note content for modal display
 */
export interface NoteContent {
  __typename: 'NoteContent';
  id: string;
  title: string;
  content: string;
  privacy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event participant for modal display
 */
export interface EventParticipant {
  id: string;
  displayName: string;
}

/**
 * Event content for modal display
 */
export interface EventContent {
  __typename: 'EventContent';
  id: string;
  title: string;
  description: string | null;
  date: unknown | null;
  location: unknown | null;
  participants: EventParticipant[];
  createdAt: Date;
}

/**
 * Biography content for modal display
 */
export interface BiographyContent {
  __typename: 'BiographyContent';
  id: string;
  personName: string;
  biography: string | null;
}

/**
 * Union type for source content
 */
export type SourceContent = NoteContent | EventContent | BiographyContent;

export const sourceContentQueries = {
  /**
   * Get source content by type and ID
   *
   * @param type - The type of source (Note, Event, Biography)
   * @param id - The ID of the source
   * @returns The source content or null if not found/not accessible
   */
  sourceContent: async (
    _parent: unknown,
    args: { type: SourceType; id: string },
    context: GraphQLContext
  ): Promise<SourceContent | null> => {
    console.log('[SourceContent] Query received:', { type: args.type, id: args.id });

    // Require authentication
    if (!context.user) {
      console.log('[SourceContent] No user in context');
      return null;
    }

    console.log('[SourceContent] User:', context.user.id);

    // Get user's constellation for access control
    const constellation = await getUserConstellation(context.user.id);
    if (!constellation) {
      console.log('[SourceContent] No constellation found for user');
      return null;
    }

    console.log('[SourceContent] Constellation:', constellation.id);

    let result: SourceContent | null = null;
    switch (args.type) {
      case 'Note':
        result = await fetchNoteContent(args.id, constellation.id);
        break;
      case 'Event':
        result = await fetchEventContent(args.id, constellation.id);
        break;
      case 'Biography':
        result = await fetchBiographyContent(args.id, constellation.id);
        break;
      default:
        result = null;
    }

    console.log('[SourceContent] Result:', result ? result.__typename : 'null');
    return result;
  },
};

/**
 * Fetch note content by ID with constellation-scoped access
 */
async function fetchNoteContent(
  id: string,
  constellationId: string
): Promise<NoteContent | null> {
  const note = await prisma.note.findFirst({
    where: {
      id,
      constellationId,
      deletedAt: null,
    },
  });

  if (!note) return null;

  return {
    __typename: 'NoteContent',
    id: note.id,
    title: note.title ?? 'Untitled',
    content: note.content,
    privacy: note.privacy,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Fetch event content by ID with constellation-scoped access
 */
async function fetchEventContent(
  id: string,
  constellationId: string
): Promise<EventContent | null> {
  const event = await prisma.event.findFirst({
    where: {
      id,
      constellationId,
      deletedAt: null,
    },
    include: {
      participants: {
        include: { person: true },
      },
    },
  });

  if (!event) return null;

  // Format participants with display names
  const participants: EventParticipant[] = event.participants.map((p) => ({
    id: p.person.id,
    displayName: [p.person.givenName, p.person.surname]
      .filter(Boolean)
      .join(' '),
  }));

  return {
    __typename: 'EventContent',
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    location: event.location,
    participants,
    createdAt: event.createdAt,
  };
}

/**
 * Fetch biography content by person ID with constellation-scoped access
 */
async function fetchBiographyContent(
  id: string,
  constellationId: string
): Promise<BiographyContent | null> {
  const person = await prisma.person.findFirst({
    where: {
      id,
      constellationId,
      deletedAt: null,
    },
  });

  if (!person) return null;

  // Format display name
  const personName = [person.givenName, person.surname]
    .filter(Boolean)
    .join(' ');

  return {
    __typename: 'BiographyContent',
    id: person.id,
    personName,
    biography: person.biography,
  };
}
