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

  const biography = response.text.trim();

  if (!biography) {
    throw new Error(
      'AI returned an empty biography. This may be due to a temporary issue with the AI service.'
    );
  }

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
  // Format notes section
  const notesSection = notes.length > 0
    ? notes
        .slice(0, 15) // Limit to 15 most relevant notes
        .map((n) => `- [Note: ${n.title ?? 'Untitled'}] ${n.content}`)
        .join('\n')
    : 'No notes available';

  // Format events section
  const eventsSection = events.length > 0
    ? events
        .slice(0, 15) // Limit to 15 most relevant events
        .map((e) => `- [Event: ${e.title}] ${e.description ?? 'No description'}${formatEventDate(e)}`)
        .join('\n')
    : 'No events available';

  // Format related context section
  const relatedContextSection = relatedContext.length > 0
    ? relatedContext
        .map((ctx) => {
          const facts = ctx.relevantFacts
            .map((f) => `  - ${f.fact} (from ${f.source}${f.sourceId ? `: ${f.sourceId}` : ''})`)
            .join('\n');
          return `From ${ctx.relationshipType} ${ctx.personName}:\n${facts}`;
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
3. Include citations in brackets like [Note: title], [Event: title], or [From parent: fact]
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
