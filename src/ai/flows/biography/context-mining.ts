/**
 * Context Mining
 *
 * Finds relatives and extracts relevant context for biography generation.
 * Supports parent, child, sibling, spouse, and co-parent relationships.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-S002: Constellation Isolation
 */
import pLimit from 'p-limit';
import { prisma } from '@/lib/prisma';
import { getAI, getModel, getRetryMiddleware } from '@/ai/genkit';

/** Maximum concurrent AI calls for context extraction */
const MAX_CONCURRENT_AI_CALLS = 5;
import {
  RelatedContextSchema,
  type RelativeInfo,
  type NoteSource,
  type EventSource,
  type PersonDetails,
  type RelatedContext,
} from '@/ai/schemas/biography-v2';

// Reusable include for person with content
const personInclude = {
  notes: { where: { deletedAt: null } },
  primaryEvents: { where: { deletedAt: null } },
} as const;

/**
 * Find all relatives of a person within the same constellation.
 *
 * Identifies five relationship types:
 * - Parents: People who are parents of the person
 * - Children: People who are children of the person
 * - Siblings: People who share at least one parent
 * - Spouses: People in a spouse relationship
 * - Co-parents: Other parents of the person's children (not already spouse)
 *
 * @param personId - ID of the person to find relatives for
 * @param constellationId - ID of the constellation (for INV-S002)
 * @returns Array of RelativeInfo with their content
 *
 * @invariant INV-S002 - Only returns relatives in the same constellation
 */
export async function findRelatives(
  personId: string,
  constellationId: string
): Promise<RelativeInfo[]> {
  const relatives: RelativeInfo[] = [];
  const seenPersonIds = new Set<string>();

  // Helper to add a relative if not already seen
  const addRelative = (
    type: RelativeInfo['relationshipType'],
    person: PersonWithContent
  ): void => {
    // Skip if already seen or wrong constellation or deleted
    if (
      seenPersonIds.has(person.id) ||
      person.constellationId !== constellationId ||
      person.deletedAt !== null
    ) {
      return;
    }
    seenPersonIds.add(person.id);

    relatives.push({
      relationshipType: type,
      personId: person.id,
      personName: person.displayName,
      biography: person.biography ?? undefined,
      notes: mapNotes(person.notes ?? []),
      events: mapEvents(person.primaryEvents ?? []),
    });
  };

  // 1. Find parents (ParentChildRelationship where child = person)
  const parentRelationships = await prisma.parentChildRelationship.findMany({
    where: { childId: personId },
    include: {
      parent: {
        include: personInclude,
      },
    },
  });

  for (const rel of parentRelationships) {
    addRelative('parent', rel.parent as unknown as PersonWithContent);
  }

  // 2. Find children (ParentChildRelationship where parent = person)
  const childRelationships = await prisma.parentChildRelationship.findMany({
    where: { parentId: personId },
    include: {
      child: {
        include: personInclude,
      },
    },
  });

  const childIds: string[] = [];
  for (const rel of childRelationships) {
    childIds.push(rel.childId);
    addRelative('child', rel.child as unknown as PersonWithContent);
  }

  // 3. Find siblings (other children of the same parents)
  const parentIds = parentRelationships.map((r) => r.parentId);
  if (parentIds.length > 0) {
    const siblingRelationships = await prisma.parentChildRelationship.findMany({
      where: {
        parentId: { in: parentIds },
        childId: { not: personId },
      },
      include: {
        child: {
          include: personInclude,
        },
      },
    });

    for (const rel of siblingRelationships) {
      addRelative('sibling', rel.child as unknown as PersonWithContent);
    }
  }

  // 4. Find spouses
  const spouseRelationships = await prisma.spouseRelationship.findMany({
    where: {
      OR: [{ person1Id: personId }, { person2Id: personId }],
    },
    include: {
      person1: {
        include: personInclude,
      },
      person2: {
        include: personInclude,
      },
    },
  });

  for (const rel of spouseRelationships) {
    // Add the other person (not self)
    const spouse =
      rel.person1Id === personId ? rel.person2 : rel.person1;
    addRelative('spouse', spouse as unknown as PersonWithContent);
  }

  // 5. Find co-parents (other parents of person's children, not already spouse)
  if (childIds.length > 0) {
    const coparentRelationships = await prisma.parentChildRelationship.findMany(
      {
        where: {
          childId: { in: childIds },
          parentId: { not: personId },
        },
        include: {
          parent: {
            include: personInclude,
          },
        },
      }
    );

    for (const rel of coparentRelationships) {
      // Only add if not already seen (e.g., not already added as spouse)
      addRelative('coparent', rel.parent as unknown as PersonWithContent);
    }
  }

  return relatives;
}

// Internal types for database results
interface PersonWithContent {
  id: string;
  displayName: string;
  biography: string | null;
  constellationId: string;
  deletedAt: Date | null;
  notes?: Array<{
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
  }>;
  primaryEvents?: Array<{
    id: string;
    title: string;
    description: string | null;
    date: unknown;
    location: unknown;
    participants?: Array<{
      person: { id: string; displayName: string };
    }>;
  }>;
}

function mapNotes(
  notes: Array<{
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
  }>
): NoteSource[] {
  return notes.map((note) => ({
    noteId: note.id,
    title: note.title ?? undefined,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  }));
}

function mapEvents(
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    date: unknown;
    location: unknown;
    participants?: Array<{
      person: { id: string; displayName: string };
    }>;
  }>
): EventSource[] {
  return events.map((event) => ({
    eventId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    date: (event.date as EventSource['date']) ?? undefined,
    location: (event.location as EventSource['location']) ?? undefined,
    participants: event.participants?.map((p) => ({
      personId: p.person.id,
      displayName: p.person.displayName,
    })),
  }));
}

/**
 * Extract relevant context from relatives' information for biography generation.
 *
 * Uses AI to analyze each relative's biography, notes, and events to find
 * facts that are directly relevant to the target person. Filters out marginal
 * information and requires relevance reasoning for each extracted fact.
 *
 * All relatives are processed in parallel for efficiency.
 *
 * @param personDetails - Details of the person whose biography is being generated
 * @param relatives - Array of relatives with their content
 * @returns Array of RelatedContext with relevant facts and source attribution
 *
 * @invariant INV-AI005 - Output validated with Zod schema
 */
export async function extractRelatedContext(
  personDetails: PersonDetails,
  relatives: RelativeInfo[]
): Promise<RelatedContext[]> {
  const ai = getAI();
  const model = getModel('fast'); // Use Flash for bulk context extraction
  const limit = pLimit(MAX_CONCURRENT_AI_CALLS);
  const retryMiddleware = getRetryMiddleware();

  // Filter to relatives with content to analyze
  const relativesWithContent = relatives.filter(
    (relative) =>
      relative.biography ||
      relative.notes.length > 0 ||
      relative.events.length > 0
  );

  // Process relatives in parallel with concurrency limit
  const contextPromises = relativesWithContent.map((relative) =>
    limit(async () => {
      const prompt = buildContextMiningPrompt(personDetails, relative);

      try {
        const response = await ai.generate({
          model,
          prompt,
          config: { temperature: 0.3 }, // Low temperature for factual extraction
          use: [retryMiddleware], // Exponential backoff for transient failures
        });

        // Parse the JSON response and validate with Zod
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = RelatedContextSchema.parse(parsed);

          // Only include if there are relevant facts
          if (validated.relevantFacts.length > 0) {
            return validated;
          }
        }
      } catch {
        // Skip this relative if response can't be parsed/validated
      }
      return null;
    })
  );

  const results = await Promise.all(contextPromises);

  // Filter out null results
  return results.filter((r): r is RelatedContext => r !== null);
}

/**
 * Build the AI prompt for context mining from a relative's information.
 */
function buildContextMiningPrompt(
  person: PersonDetails,
  relative: RelativeInfo
): string {
  const biographySection = relative.biography
    ? `Biography: ${relative.biography}`
    : '';

  const notesSection = relative.notes
    .map((n) => `Note "${n.title ?? 'Untitled'}" (ID: ${n.noteId}): ${n.content}`)
    .join('\n');

  const eventsSection = relative.events
    .map(
      (e) =>
        `Event "${e.title}" (ID: ${e.eventId}): ${e.description ?? 'No description'}`
    )
    .join('\n');

  return `
You are analyzing family history information to find facts relevant to a specific person.

TARGET PERSON: ${person.displayName} (ID: ${person.personId})
RELATIONSHIP: ${relative.relationshipType}
RELATIVE: ${relative.personName} (ID: ${relative.personId})

RELATIVE'S INFORMATION:
${biographySection}
${notesSection}
${eventsSection}

INSTRUCTIONS:
1. Extract ONLY facts that are directly relevant to ${person.displayName}
2. Include facts that ${person.displayName} likely experienced or was affected by
3. Exclude facts that are only about ${relative.personName} and not ${person.displayName}
4. For each fact, explain WHY it's relevant to ${person.displayName}
5. Cite the source (biography, specific note with ID, or specific event with ID)

IMPORTANT: Only include highly relevant facts. If a fact is marginally relevant, exclude it.
If nothing is highly relevant, return an empty relevantFacts array.

Return ONLY valid JSON in the following structure:
{
  "relationshipType": "${relative.relationshipType}",
  "personId": "${relative.personId}",
  "personName": "${relative.personName}",
  "relevantFacts": [
    {
      "fact": "The extracted fact",
      "source": "biography",
      "sourceId": "ID if note or event",
      "relevanceReason": "Why this is relevant to ${person.displayName}"
    }
  ]
}
`.trim();
}
