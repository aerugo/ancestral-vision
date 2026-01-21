/**
 * Biography Streaming Hook
 *
 * React hook for streaming biography generation with real-time progress updates.
 * Uses Server-Sent Events (SSE) to receive progress events from the server.
 *
 * Generation continues in the background when the user navigates away,
 * using a context-based state that persists across component mounts.
 */
import { useCallback, useRef, useEffect } from 'react';
import { getFreshAuthToken } from '@/lib/graphql-client';
import {
  useBiographyGenerationContext,
  usePersonGenerationState,
} from '@/contexts/biography-generation-context';
import type { BiographyProgressEvent, RelativeProgressInfo } from '@/types/biography-progress';

// Re-export the type for consumers
export type { BiographyGenerationResult, RelativeProgressInfo } from '@/types/biography-progress';
export type { SourceStats } from '@/contexts/biography-generation-context';

/**
 * Options for the useBiographyStream hook
 */
export interface UseBiographyStreamOptions {
  /** The person ID to track generation for */
  personId: string;
  /** Callback fired when generation completes successfully */
  onComplete?: (result: BiographyGenerationResult) => void;
  /** Callback fired when an error occurs */
  onError?: (error: string) => void;
}

// Import the type locally for use in the hook
import type { BiographyGenerationResult } from '@/types/biography-progress';
import type { SourceStats } from '@/contexts/biography-generation-context';

/**
 * Return value of the useBiographyStream hook
 */
export interface UseBiographyStreamReturn {
  /** Current progress event from the server */
  progress: BiographyProgressEvent | null;
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Start generating a biography for the person */
  startGeneration: (maxLength?: number) => Promise<void>;
  /** Cancel an in-progress generation */
  cancelGeneration: () => void;
  /** The final result if generation completed successfully */
  result: BiographyGenerationResult | null;
  /** Error message if generation failed */
  error: string | null;
  /** Clear the state (result or error) for this person */
  clearState: () => void;
  /** Accumulated relatives seen during context-mining (sorted by index) */
  seenRelatives: RelativeProgressInfo[];
  /** Source stats from source-assembly step (noteCount, eventCount) */
  sourceStats: SourceStats | null;
}

/**
 * Hook for streaming biography generation with real-time progress.
 *
 * Generation persists across component unmounts - if the user navigates
 * away and back, they'll see the current progress or completed result.
 *
 * Uses Server-Sent Events to receive progress updates from the server
 * as the generation proceeds through each step.
 *
 * @example
 * ```tsx
 * const { progress, isGenerating, startGeneration, result } = useBiographyStream({
 *   personId: 'person-123',
 *   onComplete: (result) => console.log('Done!', result.wordCount, 'words'),
 *   onError: (error) => console.error('Failed:', error),
 * });
 *
 * return (
 *   <div>
 *     {isGenerating && <Progress value={progress?.progress ?? 0} />}
 *     {progress?.message}
 *     <button onClick={() => startGeneration()}>Generate</button>
 *   </div>
 * );
 * ```
 */
export function useBiographyStream(
  options: UseBiographyStreamOptions
): UseBiographyStreamReturn {
  const { personId, onComplete, onError } = options;

  // Get context and state
  const context = useBiographyGenerationContext();
  const state = usePersonGenerationState(personId);

  // Store callbacks in refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  // Fire callbacks when state changes
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (!prev && !state) return;

    // If we just got a result (wasn't there before)
    if (state?.result && !prev?.result) {
      onCompleteRef.current?.(state.result);
    }

    // If we just got an error (wasn't there before)
    if (state?.error && !prev?.error) {
      onErrorRef.current?.(state.error);
    }
  }, [state]);

  /**
   * Cancel an in-progress generation
   */
  const cancelGeneration = useCallback(() => {
    context.cancelGeneration(personId);
  }, [context, personId]);

  /**
   * Clear the state for this person
   */
  const clearState = useCallback(() => {
    context.clearState(personId);
  }, [context, personId]);

  /**
   * Start generating a biography for the person
   */
  const startGeneration = useCallback(
    async (maxLength?: number) => {
      // Get fresh auth token
      const token = await getFreshAuthToken();
      if (!token) {
        onErrorRef.current?.('Not authenticated');
        return;
      }

      // Build the URL with maxLength if provided
      // The context will handle the actual SSE connection
      let url = '/api/ai/biography/stream';
      if (maxLength) {
        // We need to pass this to context - for now, embed in token param
        // Actually, let's modify the context to support this
      }

      // Start generation via context
      context.startGeneration(personId, token);
    },
    [context, personId]
  );

  return {
    progress: state?.progress ?? null,
    isGenerating: state?.isGenerating ?? false,
    startGeneration,
    cancelGeneration,
    result: state?.result ?? null,
    error: state?.error ?? null,
    clearState,
    seenRelatives: state?.seenRelatives ?? [],
    sourceStats: state?.sourceStats ?? null,
  };
}
