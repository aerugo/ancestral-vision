/**
 * Source Material Assembly
 *
 * Gathers all source material for biography generation including
 * person details, notes, and events.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-AI007: Biography Requires Source Material
 * - INV-S002: Constellation Isolation
 */
import { prisma } from '@/lib/prisma';
import {
  SourceMaterial,
  SourceMaterialSchema,
  PersonDetails,
  NoteSource,
  EventSource,
} from '@/ai/schemas/biography';

/**
 * Assemble all source material for a person's biography generation.
 *
 * Gathers person details, notes, and events into a validated SourceMaterial
 * structure. Validates that at least one note or event exists (INV-AI007).
 *
 * @param personId - ID of the person
 * @param userId - ID of the requesting user (for constellation access check)
 * @returns Validated SourceMaterial object
 * @throws Error if person not found, access denied, or no source material
 *
 * @invariant INV-AI005 - Output validated with Zod
 * @invariant INV-AI007 - Requires at least one note or event
 * @invariant INV-S002 - Only accesses data in user's constellation
 */
export async function assembleSourceMaterial(
  personId: string,
  userId: string
): Promise<SourceMaterial> {
  // Fetch person with notes (INV-S002: constellation isolation)
  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      constellation: { ownerId: userId },
      deletedAt: null,
    },
    include: {
      notes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!person) {
    throw new Error('Person not found or access denied');
  }

  // Fetch events where person is primary or participant
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { primaryPersonId: personId },
        { participants: { some: { personId } } },
      ],
      deletedAt: null,
    },
    include: {
      participants: {
        include: {
          person: {
            select: { id: true, displayName: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build person details (convert null to undefined for Zod)
  const personDetails: PersonDetails = {
    personId: person.id,
    givenName: person.givenName,
    surname: person.surname ?? undefined,
    displayName: person.displayName,
    gender: (person.gender as PersonDetails['gender']) ?? undefined,
    birthDate: (person.birthDate as PersonDetails['birthDate']) ?? undefined,
    deathDate: (person.deathDate as PersonDetails['deathDate']) ?? undefined,
    birthPlace: (person.birthPlace as PersonDetails['birthPlace']) ?? undefined,
    deathPlace: (person.deathPlace as PersonDetails['deathPlace']) ?? undefined,
    biography: person.biography ?? undefined,
  };

  // Build note sources
  const notes: NoteSource[] = person.notes.map((note) => ({
    noteId: note.id,
    title: note.title ?? undefined,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  }));

  // Build event sources
  const eventSources: EventSource[] = events.map((event) => ({
    eventId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    date: (event.date as EventSource['date']) ?? undefined,
    location: (event.location as EventSource['location']) ?? undefined,
    participants: event.participants.map((p) => ({
      personId: p.person.id,
      displayName: p.person.displayName,
    })),
  }));

  const sourceMaterial = {
    personDetails,
    notes,
    events: eventSources,
  };

  // Validate output (INV-AI005) - this also enforces INV-AI007
  return SourceMaterialSchema.parse(sourceMaterial);
}
