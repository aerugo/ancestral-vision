/**
 * Citation Parser
 *
 * Parses source citations from AI-generated biography text.
 * Citation format: [Type:ID:Label] or [Biography:ID:Relationship:Label]
 *
 * @example
 * ```typescript
 * const result = parseCitations('Born in [Note:abc123:Birth cert] Ohio.');
 * // result.citations[0] = { type: 'Note', id: 'abc123', label: 'Birth cert', ... }
 *
 * const segments = segmentBiography('Born in [Note:abc:Birth] Ohio.');
 * // segments = [
 * //   { type: 'text', content: 'Born in ' },
 * //   { type: 'citation', content: 'Birth', citation: {...} },
 * //   { type: 'text', content: ' Ohio.' }
 * // ]
 * ```
 */
import type {
  CitationType,
  ParsedCitation,
  CitationParseResult,
  TextSegment,
} from '@/types/citation';

/**
 * Valid citation types.
 */
const VALID_TYPES: CitationType[] = ['Note', 'Event', 'Biography'];

/**
 * Regex pattern for citation format.
 * Matches: [Type:ID:Label] or [Biography:ID:Relationship:Label]
 *
 * Groups:
 * - type: Note, Event, or Biography
 * - id: The source ID (no colons or brackets)
 * - rest: Everything after the ID (label or relationship:label)
 */
const CITATION_REGEX =
  /\[(Note|Event|Biography):([^:\]]+):([^\]]+)\]/g;

/**
 * Parse all citations from biography text.
 *
 * @param text - The biography text containing citations
 * @returns Parse result with array of citations
 */
export function parseCitations(text: string): CitationParseResult {
  const citations: ParsedCitation[] = [];

  // Reset regex state
  CITATION_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CITATION_REGEX.exec(text)) !== null) {
    const [raw, typeStr, id, rest] = match;
    const type = typeStr as CitationType;

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      continue;
    }

    // Validate ID is not empty
    if (!id || id.trim() === '') {
      continue;
    }

    // Validate rest (label) is not empty
    if (!rest || rest.trim() === '') {
      continue;
    }

    // For Biography type, parse relationship:label
    let label: string;
    let relationship: string | undefined;

    if (type === 'Biography') {
      const colonIndex = rest.indexOf(':');
      if (colonIndex > 0) {
        relationship = rest.substring(0, colonIndex);
        label = rest.substring(colonIndex + 1);
      } else {
        // No relationship found, use rest as label
        label = rest;
      }
    } else {
      label = rest;
    }

    // Validate label is not empty after parsing
    if (!label || label.trim() === '') {
      continue;
    }

    const citation: ParsedCitation = {
      type,
      id: id.trim(),
      label: label.trim(),
      raw,
      startIndex: match.index,
      endIndex: match.index + raw.length,
    };

    if (relationship) {
      citation.relationship = relationship.trim();
    }

    citations.push(citation);
  }

  return { citations };
}

/**
 * Segment biography text into text and citation parts for rendering.
 *
 * @param text - The biography text containing citations
 * @returns Array of segments (text or citation)
 */
export function segmentBiography(text: string): TextSegment[] {
  const { citations } = parseCitations(text);
  const segments: TextSegment[] = [];

  if (citations.length === 0) {
    // No citations, return single text segment
    return [{ type: 'text', content: text }];
  }

  let lastIndex = 0;

  for (const citation of citations) {
    // Add text before this citation (if any)
    if (citation.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, citation.startIndex),
      });
    }

    // Add the citation segment
    segments.push({
      type: 'citation',
      content: citation.label,
      citation,
    });

    lastIndex = citation.endIndex;
  }

  // Add remaining text after last citation (if any)
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Validate that a citation ID is in a valid format.
 * Valid IDs are non-empty strings without colons or brackets.
 *
 * @param id - The ID to validate
 * @returns True if the ID is valid
 */
export function isValidCitationId(id: string): boolean {
  if (!id || id.trim() === '') {
    return false;
  }

  // ID should not contain colons or brackets
  if (id.includes(':') || id.includes('[') || id.includes(']')) {
    return false;
  }

  // ID should have actual content (not just whitespace)
  return id.trim().length > 0;
}
