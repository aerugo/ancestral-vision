/**
 * useAutoSave Hook (INV-A010)
 *
 * Provides debounced auto-save functionality for inline editing.
 * Default debounce time is 2 seconds per INV-A010.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Result type for useAutoSave hook
 */
export interface UseAutoSaveResult<T> {
  /** Trigger a debounced save with the provided data */
  triggerSave: (data: T) => void;
  /** Force an immediate save without debounce */
  forceSave: (data: T) => Promise<void>;
  /** Whether a save is pending (queued or in progress) */
  isPending: boolean;
  /** Error message from last failed save, or null */
  error: string | null;
  /** Timestamp of last successful save, or null */
  lastSavedAt: Date | null;
}

/**
 * Hook for auto-saving data with debounce
 *
 * @param saveFn - Async function to save data
 * @param debounceMs - Debounce time in milliseconds (default: 2000ms per INV-A010)
 * @returns Auto-save controls and state
 *
 * @example
 * ```tsx
 * const { triggerSave, isPending, error, lastSavedAt } = useAutoSave(
 *   async (data) => {
 *     await updatePerson({ id: personId, input: data });
 *   },
 *   2000
 * );
 *
 * // On form change
 * const handleChange = (data: PersonFormData) => {
 *   triggerSave(data);
 * };
 * ```
 */
export function useAutoSave<T>(
  saveFn: (data: T) => Promise<void>,
  debounceMs: number = 2000
): UseAutoSaveResult<T> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<T | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Cancel any pending debounced save
   */
  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Execute the save operation
   */
  const executeSave = useCallback(
    async (data: T) => {
      try {
        await saveFn(data);
        if (isMountedRef.current) {
          setLastSavedAt(new Date());
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Save failed');
        }
      } finally {
        if (isMountedRef.current) {
          setIsPending(false);
        }
      }
    },
    [saveFn]
  );

  /**
   * Trigger a debounced save
   */
  const triggerSave = useCallback(
    (data: T) => {
      latestDataRef.current = data;
      setIsPending(true);
      setError(null);

      // Cancel existing timeout
      cancelPending();

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && latestDataRef.current !== null) {
          executeSave(latestDataRef.current);
        }
      }, debounceMs);
    },
    [debounceMs, cancelPending, executeSave]
  );

  /**
   * Force an immediate save without debounce
   */
  const forceSave = useCallback(
    async (data: T) => {
      // Cancel any pending debounced save
      cancelPending();

      setIsPending(true);
      setError(null);

      await executeSave(data);
    },
    [cancelPending, executeSave]
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cancelPending();
    };
  }, [cancelPending]);

  return {
    triggerSave,
    forceSave,
    isPending,
    error,
    lastSavedAt,
  };
}
