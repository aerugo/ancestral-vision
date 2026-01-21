/**
 * Citation Validator
 *
 * Validates AI-generated citations against the source material that was
 * passed to the AI. Ensures citations reference actual sources.
 *
 * @invariant INV-AI008: Citation IDs Must Be Valid
 */
import { parseCitations } from '@/lib/citation-parser';
import type { ParsedCitation } from '@/types/citation';
import type { SourceMaterial, RelatedContext } from '@/ai/schemas/biography';

/**
 * A validated citation with its status.
 */
export interface ValidatedCitation {
  citation: ParsedCitation;
  reason?: string;
}

/**
 * Result of citation validation.
 */
export interface ValidationResult {
  /** True if all citations are valid */
  valid: boolean;
  /** Citations that reference valid sources */
  validCitations: ValidatedCitation[];
  /** Citations that reference invalid or non-existent sources */
  invalidCitations: ValidatedCitation[];
}

/**
 * Validate all citations in a biography against the source material.
 *
 * @param biography - The generated biography text with citations
 * @param sources - The source material that was passed to the AI
 * @param relatedContext - Context from relatives that was passed to the AI
 * @returns Validation result with valid and invalid citations
 */
export function validateCitations(
  biography: string,
  sources: SourceMaterial,
  relatedContext: RelatedContext[]
): ValidationResult {
  const { citations } = parseCitations(biography);

  const validCitations: ValidatedCitation[] = [];
  const invalidCitations: ValidatedCitation[] = [];

  // Build lookup sets for quick validation
  const noteIds = new Set(sources.notes.map((n) => n.noteId));
  const eventIds = new Set(sources.events.map((e) => e.eventId));
  const relativeIds = new Set(relatedContext.map((r) => r.personId));

  for (const citation of citations) {
    const validated = validateSingleCitation(
      citation,
      noteIds,
      eventIds,
      relativeIds
    );

    if (validated.reason) {
      invalidCitations.push(validated);
    } else {
      validCitations.push(validated);
    }
  }

  return {
    valid: invalidCitations.length === 0,
    validCitations,
    invalidCitations,
  };
}

/**
 * Validate a single citation against the available sources.
 */
function validateSingleCitation(
  citation: ParsedCitation,
  noteIds: Set<string>,
  eventIds: Set<string>,
  relativeIds: Set<string>
): ValidatedCitation {
  switch (citation.type) {
    case 'Note':
      if (!noteIds.has(citation.id)) {
        return {
          citation,
          reason: `Note ID '${citation.id}' not found in source material`,
        };
      }
      break;

    case 'Event':
      if (!eventIds.has(citation.id)) {
        return {
          citation,
          reason: `Event ID '${citation.id}' not found in source material`,
        };
      }
      break;

    case 'Biography':
      if (!relativeIds.has(citation.id)) {
        return {
          citation,
          reason: `Person ID '${citation.id}' not found in related context`,
        };
      }
      break;
  }

  return { citation };
}

/**
 * Filter a biography to remove invalid citations, replacing them with
 * just the citation label.
 *
 * @param biography - The biography text with citations
 * @param validation - The validation result
 * @returns Biography with invalid citations replaced by their labels
 */
export function stripInvalidCitations(
  biography: string,
  validation: ValidationResult
): string {
  if (validation.valid) {
    return biography;
  }

  let result = biography;

  // Process invalid citations in reverse order to preserve indices
  const sortedInvalid = [...validation.invalidCitations].sort(
    (a, b) => b.citation.startIndex - a.citation.startIndex
  );

  for (const { citation } of sortedInvalid) {
    const before = result.slice(0, citation.startIndex);
    const after = result.slice(citation.endIndex);
    // Replace the citation with just the label
    result = before + citation.label + after;
  }

  return result;
}
