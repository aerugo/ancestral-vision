/**
 * Biography Streaming Hook
 *
 * React hook for streaming biography generation with real-time progress updates.
 * Uses Server-Sent Events (SSE) to receive progress events from the server.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { getFreshAuthToken } from '@/lib/graphql-client';
import type {
  BiographyProgressEvent,
  BiographyGenerationResult,
} from '@/types/biography-progress';

/**
 * Options for the useBiographyStream hook
 */
export interface UseBiographyStreamOptions {
  /** Callback fired when generation completes successfully */
  onComplete?: (result: BiographyGenerationResult) => void;
  /** Callback fired when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Return value of the useBiographyStream hook
 */
export interface UseBiographyStreamReturn {
  /** Current progress event from the server */
  progress: BiographyProgressEvent | null;
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Start generating a biography for a person */
  startGeneration: (personId: string, maxLength?: number) => Promise<void>;
  /** Cancel an in-progress generation */
  cancelGeneration: () => void;
  /** The final result if generation completed successfully */
  result: BiographyGenerationResult | null;
  /** Error message if generation failed */
  error: string | null;
}

/**
 * Hook for streaming biography generation with real-time progress.
 *
 * Uses Server-Sent Events to receive progress updates from the server
 * as the generation proceeds through each step.
 *
 * @example
 * ```tsx
 * const { progress, isGenerating, startGeneration, result } = useBiographyStream({
 *   onComplete: (result) => console.log('Done!', result.wordCount, 'words'),
 *   onError: (error) => console.error('Failed:', error),
 * });
 *
 * return (
 *   <div>
 *     {isGenerating && <Progress value={progress?.progress ?? 0} />}
 *     {progress?.message}
 *     <button onClick={() => startGeneration(personId)}>Generate</button>
 *   </div>
 * );
 * ```
 */
export function useBiographyStream(
  options: UseBiographyStreamOptions = {}
): UseBiographyStreamReturn {
  const { onComplete, onError } = options;

  const [progress, setProgress] = useState<BiographyProgressEvent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<BiographyGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store EventSource in a ref so we can close it
  const eventSourceRef = useRef<EventSource | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  /**
   * Cancel an in-progress generation
   */
  const cancelGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsGenerating(false);
    setProgress(null);
  }, []);

  /**
   * Start generating a biography for a person
   */
  const startGeneration = useCallback(
    async (personId: string, maxLength?: number) => {
      // Reset state
      setProgress(null);
      setResult(null);
      setError(null);
      setIsGenerating(true);

      // Close any existing connection
      eventSourceRef.current?.close();

      // Get fresh auth token
      const token = await getFreshAuthToken();
      if (!token) {
        setError('Not authenticated');
        setIsGenerating(false);
        onErrorRef.current?.('Not authenticated');
        return;
      }

      // Build SSE URL with query parameters
      const url = new URL('/api/ai/biography/stream', window.location.origin);
      url.searchParams.set('personId', personId);
      url.searchParams.set('token', token);
      if (maxLength) {
        url.searchParams.set('maxLength', maxLength.toString());
      }

      // Create EventSource connection
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: BiographyProgressEvent = JSON.parse(event.data);
          setProgress(data);

          // Handle completion
          if (data.step === 'complete' && data.details?.result) {
            setResult(data.details.result);
            setIsGenerating(false);
            onCompleteRef.current?.(data.details.result);
            eventSource.close();
            eventSourceRef.current = null;
          }

          // Handle errors
          if (data.step === 'error') {
            const errorMessage = data.details?.error || data.message;
            setError(errorMessage);
            setIsGenerating(false);
            onErrorRef.current?.(errorMessage);
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch (parseError) {
          console.error('[BiographyStream] Failed to parse event:', parseError);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[BiographyStream] EventSource error:', err);

        // Only set error if we're still generating (not if we closed intentionally)
        if (eventSourceRef.current) {
          const errorMessage = 'Connection lost. Please try again.';
          setError(errorMessage);
          setIsGenerating(false);
          onErrorRef.current?.(errorMessage);
          eventSource.close();
          eventSourceRef.current = null;
        }
      };
    },
    []
  );

  return {
    progress,
    isGenerating,
    startGeneration,
    cancelGeneration,
    result,
    error,
  };
}
