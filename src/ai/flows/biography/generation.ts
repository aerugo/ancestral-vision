/**
 * Biography Generation
 *
 * Generates a biographical narrative from assembled source material and
 * related context. Uses AI to synthesize notes, events, and context from
 * relatives into a coherent, factual biography with citations.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-AI007: Biography Requires Source Material
 */
import { z } from 'zod';
import { getAI, getModel, getRetryMiddleware } from '@/ai/genkit';
import type {
  SourceMaterial,
  RelatedContext,
  NoteSource,
  EventSource,
  PersonDetails,
} from '@/ai/schemas/biography';

/**
 * Valid source IDs for citation validation
 */
interface ValidSourceIds {
  noteIds: Set<string>;
  eventIds: Set<string>;
  personIds: Set<string>;
}

/** Default maximum word count for biographies */
const DEFAULT_MAX_LENGTH = 500;

/**
 * Output schema for generated biography.
 * Validated with Zod per INV-AI005.
 */
export const GeneratedBiographySchema = z.object({
  biography: z.string().min(1, 'Biography cannot be empty'),
  wordCount: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  sourcesUsed: z.array(z.string()),
});

export type GeneratedBiography = z.infer<typeof GeneratedBiographySchema>;

/**
 * Generate a biography from source material and related context.
 *
 * Synthesizes person details, notes, events, and context from relatives
 * into a coherent biographical narrative with citations.
 *
 * @param sourceMaterial - Assembled source material (person, notes, events)
 * @param relatedContext - Context mined from relatives
 * @param maxLength - Maximum word count (default 500)
 * @returns Generated biography with metadata
 *
 * @invariant INV-AI005 - Output validated with Zod schema
 * @invariant INV-AI007 - Requires source material (enforced by SourceMaterial schema)
 */
export async function generateBiographyFromSources(
  sourceMaterial: SourceMaterial,
  relatedContext: RelatedContext[],
  maxLength: number = DEFAULT_MAX_LENGTH
): Promise<GeneratedBiography> {
  const ai = getAI();
  const model = getModel('quality'); // Use Pro for high-quality biography output
  const retryMiddleware = getRetryMiddleware();

  const { personDetails, notes, events } = sourceMaterial;

  // Build the prompt
  const prompt = buildGenerationPrompt(
    personDetails,
    notes,
    events,
    relatedContext,
    maxLength
  );

  console.log('[Biography] Generating for:', personDetails.displayName);
  console.log('[Biography] Source material:', JSON.stringify({
    noteCount: notes.length,
    eventCount: events.length,
    relatedContextCount: relatedContext.length,
  }));
  console.log('[Biography] Prompt length:', prompt.length);
  console.log('[Biography] Prompt preview (first 1000 chars):', prompt.substring(0, 1000));

  let response;
  try {
    response = await ai.generate({
      model,
      prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Generous limit for biography generation
        // Safety settings - allow all categories since genealogical data is safe
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      },
      use: [retryMiddleware],
    });
  } catch (error) {
    console.error('[Biography] Generation error:', error);
    throw error;
  }

  console.log('[Biography] Response received, length:', response.text?.length ?? 0);

  // Debug: Log response details when empty
  if (!response.text || response.text.length === 0) {
    console.log('[Biography] Empty response - debugging info:');
    console.log('[Biography] Response keys:', Object.keys(response));
    console.log('[Biography] Full response:', JSON.stringify(response, null, 2).substring(0, 2000));
    // Check if there's a candidates array with finish reasons
    if ('candidates' in response && Array.isArray((response as unknown as { candidates: unknown[] }).candidates)) {
      const candidates = (response as unknown as { candidates: Array<{ finishReason?: string; safetyRatings?: unknown }> }).candidates;
      console.log('[Biography] Candidates:', JSON.stringify(candidates, null, 2));
    }
    // Check for message content
    if ('message' in response) {
      console.log('[Biography] Message:', JSON.stringify((response as unknown as { message: unknown }).message, null, 2));
    }
  }

  const rawBiography = response.text.trim();

  if (!rawBiography) {
    throw new Error(
      'AI returned an empty biography. This may be due to a temporary issue with the AI service.'
    );
  }

  // Debug: Show first 500 chars of raw biography
  console.log('[Biography] Raw AI output (first 500 chars):', rawBiography.substring(0, 500));

  // Post-process citations: validate and convert invalid ones to parenthetical references
  const validIds = buildValidSourceIds(notes, events, relatedContext);
  console.log('[Biography] Valid source IDs:', {
    noteIds: Array.from(validIds.noteIds).slice(0, 3),
    eventIds: Array.from(validIds.eventIds).slice(0, 3),
    personIds: Array.from(validIds.personIds).slice(0, 3),
    totalNotes: validIds.noteIds.size,
    totalEvents: validIds.eventIds.size,
    totalPersons: validIds.personIds.size,
  });

  // Debug: Show raw citations before processing
  const rawCitations = rawBiography.match(/\[[^\]]+\]/g) || [];
  console.log('[Biography] Raw citations found:', rawCitations.length);
  console.log('[Biography] Sample raw citations:', rawCitations.slice(0, 5));

  const biography = postProcessCitations(rawBiography, validIds);

  // Debug: Show citations after processing
  const processedCitations = biography.match(/\[[^\]]+\]/g) || [];
  const parentheticalRefs = biography.match(/\([^)]+\)/g) || [];
  console.log('[Biography] Remaining bracket citations:', processedCitations.length);
  console.log('[Biography] Parenthetical references:', parentheticalRefs.length);
  console.log('[Biography] Sample processed citations:', processedCitations.slice(0, 5));

  console.log('[Biography] Post-processed citations complete');

  const wordCount = biography.split(/\s+/).length;
  const sourcesUsed = determineSources(notes, events, relatedContext);
  const confidence = calculateConfidence(sourceMaterial, relatedContext);

  const output = {
    biography,
    wordCount,
    confidence,
    sourcesUsed,
  };

  // Validate output (INV-AI005)
  return GeneratedBiographySchema.parse(output);
}

/**
 * Build the AI prompt for biography generation.
 */
function buildGenerationPrompt(
  personDetails: PersonDetails,
  notes: NoteSource[],
  events: EventSource[],
  relatedContext: RelatedContext[],
  maxLength: number
): string {
  // Format notes section with IDs for citation tracking
  const notesSection = notes.length > 0
    ? notes
        .slice(0, 15) // Limit to 15 most relevant notes
        .map((n) => `- [Note:${n.noteId}:${n.title ?? 'Untitled'}] ${n.content}`)
        .join('\n')
    : 'No notes available';

  // Format events section with IDs for citation tracking
  const eventsSection = events.length > 0
    ? events
        .slice(0, 15) // Limit to 15 most relevant events
        .map((e) => `- [Event:${e.eventId}:${e.title}] ${e.description ?? 'No description'}${formatEventDate(e)}`)
        .join('\n')
    : 'No events available';

  // Format related context section with person IDs for citation tracking
  const relatedContextSection = relatedContext.length > 0
    ? relatedContext
        .map((ctx) => {
          const facts = ctx.relevantFacts
            .map((f) => `  - [Biography:${ctx.personId}:${ctx.relationshipType}:${f.fact}]`)
            .join('\n');
          return `From ${ctx.relationshipType} ${ctx.personName} (ID: ${ctx.personId}):\n${facts}`;
        })
        .join('\n\n')
    : 'No context from relatives available';

  return `
Generate a biographical narrative for the following person based ONLY on the provided source material.

PERSON: ${personDetails.displayName}
Gender: ${personDetails.gender ?? 'Unknown'}
Birth: ${formatFuzzyDate(personDetails.birthDate)} at ${personDetails.birthPlace?.name ?? 'Unknown'}
Death: ${formatFuzzyDate(personDetails.deathDate)} at ${personDetails.deathPlace?.name ?? 'Unknown'}

NOTES ABOUT THIS PERSON:
${notesSection}

EVENTS IN THIS PERSON'S LIFE:
${eventsSection}

CONTEXT FROM RELATIVES:
${relatedContextSection}

INSTRUCTIONS:
1. Write a warm, engaging biographical narrative (${Math.floor(maxLength * 0.6)}-${maxLength} words)
2. Only include facts that are directly supported by the source material above
3. CRITICAL - CITATION FORMAT: When citing a source, you MUST copy the COMPLETE citation tag verbatim from the source material above. Do NOT abbreviate or simplify citations.

   CORRECT examples (copy the whole tag including the ID):
   - [Note:5a50cfbe-cf4b-4705-8729-7c77efbcff3c:Biography]
   - [Event:abc12345-6789-def0-1234-567890abcdef:Marriage]
   - [Biography:person-id-here:parent:occupation detail]

   WRONG examples (do NOT do this):
   - [Biography] ← missing ID, WRONG
   - [Birth] ← missing type and ID, WRONG
   - [Note:Biography] ← missing ID, WRONG

4. Do NOT invent or speculate about details not in the sources
5. Focus on the person's life story, relationships, and experiences
6. Write in third person, past tense
7. If a section has limited information, acknowledge it briefly rather than padding

Generate the biography:
`.trim();
}

/**
 * Format a fuzzy date for display in the prompt.
 */
function formatFuzzyDate(
  date?: PersonDetails['birthDate']
): string {
  if (!date || !date.year) return 'Unknown';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  let prefix = '';
  if (date.type === 'approximate') prefix = 'around ';
  else if (date.type === 'before') prefix = 'before ';
  else if (date.type === 'after') prefix = 'after ';

  if (date.month && date.day) {
    return `${prefix}${months[date.month - 1]} ${date.day}, ${date.year}`;
  } else if (date.month) {
    return `${prefix}${months[date.month - 1]} ${date.year}`;
  }
  return `${prefix}${date.year}`;
}

/**
 * Format event date for display.
 */
function formatEventDate(event: EventSource): string {
  if (!event.date) return '';
  const dateStr = formatFuzzyDate(event.date);
  return dateStr !== 'Unknown' ? ` (${dateStr})` : '';
}

/**
 * Determine which data sources were used in the biography.
 */
function determineSources(
  notes: NoteSource[],
  events: EventSource[],
  relatedContext: RelatedContext[]
): string[] {
  const sources: string[] = [];

  if (notes.length > 0) sources.push('notes');
  if (events.length > 0) sources.push('events');
  if (relatedContext.length > 0) {
    const relTypes = new Set(relatedContext.map((c) => c.relationshipType));
    for (const type of relTypes) {
      sources.push(`${type}Context`);
    }
  }

  return sources;
}

/**
 * Calculate confidence based on available data.
 */
function calculateConfidence(
  sourceMaterial: SourceMaterial,
  relatedContext: RelatedContext[]
): number {
  let score = 0.3; // Base confidence

  const { personDetails, notes, events } = sourceMaterial;

  // Person details contribute to confidence
  if (personDetails.birthDate?.year) score += 0.05;
  if (personDetails.deathDate?.year) score += 0.05;
  if (personDetails.birthPlace?.name) score += 0.03;
  if (personDetails.deathPlace?.name) score += 0.02;
  if (personDetails.gender) score += 0.02;

  // Notes are strong evidence
  score += Math.min(notes.length * 0.08, 0.25); // Up to 0.25 from notes

  // Events are strong evidence
  score += Math.min(events.length * 0.06, 0.15); // Up to 0.15 from events

  // Related context adds supporting evidence
  const totalFacts = relatedContext.reduce(
    (sum, ctx) => sum + ctx.relevantFacts.length,
    0
  );
  score += Math.min(totalFacts * 0.03, 0.13); // Up to 0.13 from related context

  return Math.min(score, 1.0);
}

/**
 * Build a set of valid source IDs from the source material.
 */
function buildValidSourceIds(
  notes: NoteSource[],
  events: EventSource[],
  relatedContext: RelatedContext[]
): ValidSourceIds {
  return {
    noteIds: new Set(notes.map((n) => n.noteId)),
    eventIds: new Set(events.map((e) => e.eventId)),
    personIds: new Set(relatedContext.map((ctx) => ctx.personId)),
  };
}

/**
 * Post-process the generated biography to validate citations.
 *
 * - Valid citations (correct format with existing ID) are kept as-is
 * - Invalid citations are converted to parenthetical references
 *
 * This handles cases where the AI doesn't follow the citation format instructions.
 */
function postProcessCitations(
  biography: string,
  validIds: ValidSourceIds
): string {
  // Pattern to match any bracketed content that looks like it might be a citation
  // This catches both valid [Type:ID:Label] and invalid [Label] formats
  const bracketPattern = /\[([^\]]+)\]/g;

  return biography.replace(bracketPattern, (match, content: string) => {
    // Check if it's a valid citation format [Type:ID:Label] or [Biography:ID:Rel:Label]
    const validCitationPattern = /^(Note|Event|Biography):([^:]+):(.+)$/;
    const citationMatch = content.match(validCitationPattern);

    if (citationMatch) {
      const type = citationMatch[1]!;
      const id = citationMatch[2]!;
      const rest = citationMatch[3]!;

      // Check if the ID exists in our source material
      let isValidId = false;
      if (type === 'Note') {
        isValidId = validIds.noteIds.has(id);
      } else if (type === 'Event') {
        isValidId = validIds.eventIds.has(id);
      } else if (type === 'Biography') {
        isValidId = validIds.personIds.has(id);
      }

      if (isValidId) {
        // Valid citation - keep it as-is
        return match;
      }

      // Invalid ID - convert to parenthetical reference
      // For Biography type, rest is "relationship:label", extract the label part
      const label = type === 'Biography' && rest.includes(':')
        ? rest.split(':').slice(1).join(':')
        : rest;
      return `(${type}: ${label})`;
    }

    // Not a valid citation format - check if it looks like an abbreviated citation
    // Common patterns: [Biography], [Birth], [Marriage], [Note title], etc.
    const looksLikeCitation = /^(Note|Event|Biography|Birth|Death|Marriage|Residence|Occupation|Education|Military|Immigration|Census|Baptism|Burial|Will|Probate)$/i.test(content) ||
      content.length < 50; // Short bracketed text is likely an attempted citation

    if (looksLikeCitation) {
      // Convert to parenthetical reference
      return `(${content})`;
    }

    // Long bracketed text might be intentional (like a quote) - keep as-is
    return match;
  });
}
