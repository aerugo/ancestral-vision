/**
 * Citation Types
 *
 * TypeScript types for parsing and displaying source citations
 * in AI-generated biographies.
 */

/**
 * Types of sources that can be cited in a biography.
 */
export type CitationType = 'Note' | 'Event' | 'Biography';

/**
 * A parsed citation extracted from biography text.
 */
export interface ParsedCitation {
  /** The type of source being cited */
  type: CitationType;
  /** The unique ID of the source (noteId, eventId, or personId) */
  id: string;
  /** Human-readable label for display */
  label: string;
  /** Relationship type (only for Biography citations from relatives) */
  relationship?: string;
  /** The original matched text including brackets */
  raw: string;
  /** Start position in the source text */
  startIndex: number;
  /** End position in the source text */
  endIndex: number;
}

/**
 * Result of parsing citations from biography text.
 */
export interface CitationParseResult {
  /** All citations found in the text */
  citations: ParsedCitation[];
}

/**
 * A segment of biography text for rendering.
 * Can be either plain text or a citation.
 */
export interface TextSegment {
  /** Type of segment */
  type: 'text' | 'citation';
  /** The text content to display */
  content: string;
  /** Citation data (only present when type is 'citation') */
  citation?: ParsedCitation;
}
