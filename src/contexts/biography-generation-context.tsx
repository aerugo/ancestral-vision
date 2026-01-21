/**
 * Biography Generation Context
 *
 * Provides persistent state for biography generation that survives
 * component unmounts. When a user navigates away from a person during
 * generation, the process continues in the background.
 *
 * Pending biographies are persisted to the database (AISuggestion table)
 * and restored via the restorePendingSuggestions method on app load.
 */
'use client';

import * as React from 'react';
import type { BiographyProgressEvent, RelativeProgressInfo } from '@/types/biography-progress';
import type { BiographyGenerationResult } from '@/hooks/use-biography-stream';
import { biographyPulseEvents } from '@/visualization/pending-biography-events';

/**
 * Source stats from source-assembly step
 */
export interface SourceStats {
  noteCount: number;
  eventCount: number;
}

/**
 * State for a single biography generation
 */
export interface GenerationState {
  personId: string;
  isGenerating: boolean;
  progress: BiographyProgressEvent | null;
  result: BiographyGenerationResult | null;
  error: string | null;
  eventSource: EventSource | null;
  startedAt: number;
  /** Accumulated relatives seen during context-mining (in order received) */
  seenRelatives: RelativeProgressInfo[];
  /** Source stats from source-assembly step */
  sourceStats: SourceStats | null;
}

/**
 * Pending suggestion data from the database
 */
export interface PendingSuggestionData {
  suggestionId: string;
  personId: string;
  biography: string;
  wordCount: number;
  confidence: number;
  sourcesUsed: string[];
}

/**
 * Context value shape
 */
interface BiographyGenerationContextValue {
  /** Get state for a specific person */
  getState: (personId: string) => GenerationState | null;
  /** Start generation for a person */
  startGeneration: (personId: string, token: string) => void;
  /** Cancel generation for a person */
  cancelGeneration: (personId: string) => void;
  /** Clear completed/errored state for a person */
  clearState: (personId: string) => void;
  /** Subscribe to state changes for a person */
  subscribe: (personId: string, callback: (state: GenerationState | null) => void) => () => void;
  /** Restore pending suggestions from database on app load */
  restorePendingSuggestions: (suggestions: PendingSuggestionData[]) => void;
}

const BiographyGenerationContext = React.createContext<BiographyGenerationContextValue | null>(null);

/**
 * Provider component for biography generation context
 */
export function BiographyGenerationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Store generation states by personId
  const statesRef = React.useRef<Map<string, GenerationState>>(new Map());
  // Store subscribers by personId
  const subscribersRef = React.useRef<Map<string, Set<(state: GenerationState | null) => void>>>(new Map());
  // Track if we've already restored suggestions (to avoid re-restoring)
  const hasRestoredRef = React.useRef(false);

  // Notify subscribers when state changes
  const notifySubscribers = React.useCallback((personId: string) => {
    const subscribers = subscribersRef.current.get(personId);
    const state = statesRef.current.get(personId) || null;
    if (subscribers) {
      subscribers.forEach((callback) => callback(state));
    }
  }, []);

  // Update state for a person
  const updateState = React.useCallback((personId: string, updates: Partial<GenerationState>) => {
    const current = statesRef.current.get(personId);
    if (current) {
      statesRef.current.set(personId, { ...current, ...updates });
      notifySubscribers(personId);
    }
  }, [notifySubscribers]);

  // Get state for a person
  const getState = React.useCallback((personId: string): GenerationState | null => {
    return statesRef.current.get(personId) || null;
  }, []);

  // Start generation for a person
  const startGeneration = React.useCallback((personId: string, token: string) => {
    // Cancel any existing generation for this person
    const existing = statesRef.current.get(personId);
    if (existing?.eventSource) {
      existing.eventSource.close();
    }

    // Build SSE URL
    const url = new URL('/api/ai/biography/stream', window.location.origin);
    url.searchParams.set('personId', personId);
    url.searchParams.set('token', token);

    // Create EventSource
    const eventSource = new EventSource(url.toString());

    // Initialize state
    const initialState: GenerationState = {
      personId,
      isGenerating: true,
      progress: null,
      result: null,
      error: null,
      eventSource,
      startedAt: Date.now(),
      seenRelatives: [],
      sourceStats: null,
    };
    statesRef.current.set(personId, initialState);
    // Notify visualization layer to start subtle generating pulse
    biographyPulseEvents.setGenerating(personId);
    notifySubscribers(personId);

    // Handle messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BiographyProgressEvent;

        if (data.step === 'complete' && data.details?.result) {
          // Generation complete - mark as pending (waiting for user to accept)
          // Note: The suggestion is already saved to DB by the server
          const result = data.details.result;
          updateState(personId, {
            isGenerating: false,
            progress: data,
            result,
          });
          // Notify visualization layer to switch to intense pending pulse
          biographyPulseEvents.setPending(personId);
          eventSource.close();
        } else if (data.step === 'error') {
          // Generation error
          updateState(personId, {
            isGenerating: false,
            progress: data,
            error: data.details?.error || 'An error occurred',
          });
          eventSource.close();
        } else {
          // Progress update - capture source stats during source-assembly
          if (data.step === 'source-assembly' && data.details) {
            const { noteCount, eventCount } = data.details;
            if (noteCount !== undefined && eventCount !== undefined) {
              updateState(personId, {
                progress: data,
                sourceStats: { noteCount, eventCount },
              });
            } else {
              updateState(personId, { progress: data });
            }
          // Accumulate relatives during context-mining
          } else if (data.step === 'context-mining' && data.details?.currentRelative) {
            const rel = data.details.currentRelative;
            const current = statesRef.current.get(personId);
            const seenRelatives = current?.seenRelatives ?? [];
            // Only add if not already seen (dedupe by index)
            const alreadySeen = seenRelatives.some((r) => r.index === rel.index);
            if (!alreadySeen) {
              // Sort by index to maintain order regardless of arrival order
              const newRelatives = [...seenRelatives, rel].sort((a, b) => a.index - b.index);
              updateState(personId, { progress: data, seenRelatives: newRelatives });
            } else {
              updateState(personId, { progress: data });
            }
          } else {
            updateState(personId, { progress: data });
          }
        }
      } catch (err) {
        console.error('[BiographyContext] Failed to parse SSE message:', err);
      }
    };

    // Handle errors
    eventSource.onerror = (err) => {
      console.error('[BiographyContext] SSE error:', err);
      const state = statesRef.current.get(personId);
      // Only set error if we haven't completed successfully
      if (state?.isGenerating) {
        updateState(personId, {
          isGenerating: false,
          error: 'Connection lost. Please try again.',
        });
      }
      eventSource.close();
    };
  }, [notifySubscribers, updateState]);

  // Cancel generation for a person
  const cancelGeneration = React.useCallback((personId: string) => {
    const state = statesRef.current.get(personId);
    if (state?.eventSource) {
      state.eventSource.close();
      updateState(personId, {
        isGenerating: false,
        error: 'Generation cancelled',
      });
      // Stop pulse animation when cancelled
      biographyPulseEvents.remove(personId);
    }
  }, [updateState]);

  // Clear state for a person
  // Note: The caller is responsible for updating the DB (reject/accept mutation)
  const clearState = React.useCallback((personId: string) => {
    const state = statesRef.current.get(personId);
    if (state?.eventSource) {
      state.eventSource.close();
    }
    statesRef.current.delete(personId);
    // Remove from all pulse states (stops pulse animation)
    biographyPulseEvents.remove(personId);
    notifySubscribers(personId);
  }, [notifySubscribers]);

  // Subscribe to state changes
  const subscribe = React.useCallback((
    personId: string,
    callback: (state: GenerationState | null) => void
  ): (() => void) => {
    if (!subscribersRef.current.has(personId)) {
      subscribersRef.current.set(personId, new Set());
    }
    subscribersRef.current.get(personId)!.add(callback);

    // Immediately call with current state
    callback(statesRef.current.get(personId) || null);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.get(personId)?.delete(callback);
    };
  }, []);

  // Restore pending suggestions from database on app load
  const restorePendingSuggestions = React.useCallback(
    (suggestions: PendingSuggestionData[]) => {
      // Only restore once
      if (hasRestoredRef.current) return;
      hasRestoredRef.current = true;

      for (const suggestion of suggestions) {
        const { personId, suggestionId, biography, wordCount, confidence, sourcesUsed } = suggestion;

        // Skip if we already have state for this person (e.g., generation in progress)
        if (statesRef.current.has(personId)) continue;

        // Create a "pending" state for this person
        const result: BiographyGenerationResult = {
          suggestionId,
          biography,
          wordCount,
          confidence,
          sourcesUsed,
        };

        const state: GenerationState = {
          personId,
          isGenerating: false,
          progress: null,
          result,
          error: null,
          eventSource: null,
          startedAt: Date.now(),
          seenRelatives: [],
          sourceStats: null,
        };

        statesRef.current.set(personId, state);
        // Notify visualization layer to show pending pulse
        biographyPulseEvents.setPending(personId);
        // Notify subscribers
        notifySubscribers(personId);
      }
    },
    [notifySubscribers]
  );

  const value = React.useMemo((): BiographyGenerationContextValue => ({
    getState,
    startGeneration,
    cancelGeneration,
    clearState,
    subscribe,
    restorePendingSuggestions,
  }), [getState, startGeneration, cancelGeneration, clearState, subscribe, restorePendingSuggestions]);

  return (
    <BiographyGenerationContext.Provider value={value}>
      {children}
    </BiographyGenerationContext.Provider>
  );
}

/**
 * Hook to access the biography generation context
 */
export function useBiographyGenerationContext(): BiographyGenerationContextValue {
  const context = React.useContext(BiographyGenerationContext);
  if (!context) {
    throw new Error('useBiographyGenerationContext must be used within BiographyGenerationProvider');
  }
  return context;
}

/**
 * Hook to get and subscribe to generation state for a specific person
 */
export function usePersonGenerationState(personId: string): GenerationState | null {
  const context = useBiographyGenerationContext();
  const [state, setState] = React.useState<GenerationState | null>(() => context.getState(personId));

  React.useEffect(() => {
    return context.subscribe(personId, setState);
  }, [context, personId]);

  return state;
}
