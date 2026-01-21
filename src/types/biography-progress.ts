/**
 * Biography Generation Progress Types
 *
 * Types for real-time progress updates during biography generation.
 * Used by the SSE endpoint and React hook to communicate generation status.
 */

/**
 * Steps in the biography generation process.
 */
export type BiographyProgressStep =
  | 'eligibility'
  | 'source-assembly'
  | 'context-mining'
  | 'generation'
  | 'complete'
  | 'error';

/**
 * Information about the current relative being processed during context mining.
 */
export interface RelativeProgressInfo {
  name: string;
  relationship: string;
  index: number;
  total: number;
}

/**
 * Result returned when biography generation completes successfully.
 */
export interface BiographyGenerationResult {
  suggestionId: string;
  biography: string;
  wordCount: number;
  confidence: number;
  sourcesUsed: string[];
}

/**
 * Details that may accompany a progress event.
 */
export interface BiographyProgressDetails {
  /** Current relative being processed (context-mining step) */
  currentRelative?: RelativeProgressInfo;
  /** Number of notes found (source-assembly step) */
  noteCount?: number;
  /** Number of events found (source-assembly step) */
  eventCount?: number;
  /** Number of relatives found (context-mining step) */
  relativeCount?: number;
  /** Final result (complete step) */
  result?: BiographyGenerationResult;
  /** Error message (error step) */
  error?: string;
}

/**
 * A progress event emitted during biography generation.
 */
export interface BiographyProgressEvent {
  /** Current step in the generation process */
  step: BiographyProgressStep;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Additional details about the current step */
  details?: BiographyProgressDetails;
}

/**
 * Callback function for receiving progress updates.
 */
export type ProgressCallback = (event: BiographyProgressEvent) => void;
