/**
 * Pending Biography Events
 *
 * Event emitter for communicating biography generation state from React components
 * to the Three.js visualization layer. Enables pulse animation during generation
 * (subtle) and when pending acceptance (intense).
 */

/**
 * State of a node's biography generation
 * - 'generating': Biography is being generated (subtle pulse)
 * - 'pending': Biography generated, waiting for user acceptance (intense pulse)
 */
export type BiographyPulseState = 'generating' | 'pending';

/**
 * State snapshot for all nodes
 */
export interface BiographyPulseSnapshot {
  generating: Set<string>;
  pending: Set<string>;
}

/**
 * Callback type for biography pulse listeners
 */
export type BiographyPulseListener = (snapshot: BiographyPulseSnapshot) => void;

/**
 * Biography pulse event emitter
 *
 * Used to notify the constellation visualization about biography generation
 * and pending acceptance states. Triggers attention-drawing pulse animations
 * with different intensities for each state.
 */
class BiographyPulseEventEmitter {
  private _listeners: Set<BiographyPulseListener> = new Set();
  private _generatingIds: Set<string> = new Set();
  private _pendingIds: Set<string> = new Set();

  /**
   * Subscribe to biography pulse state changes
   * @param listener Callback to invoke when state changes
   * @returns Unsubscribe function
   */
  public subscribe(listener: BiographyPulseListener): () => void {
    this._listeners.add(listener);
    // Immediately notify with current state
    listener(this._getSnapshot());
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Mark a person as generating a biography
   * @param personId The ID of the person
   */
  public setGenerating(personId: string): void {
    if (!this._generatingIds.has(personId)) {
      this._generatingIds.add(personId);
      this._notifyListeners();
    }
  }

  /**
   * Mark a person as having a pending generated biography
   * (Automatically removes from generating state)
   * @param personId The ID of the person
   */
  public setPending(personId: string): void {
    const changed = this._generatingIds.delete(personId) || !this._pendingIds.has(personId);
    this._pendingIds.add(personId);
    if (changed) {
      this._notifyListeners();
    }
  }

  /**
   * Remove a person from all states
   * (Called when biography is accepted, discarded, or generation cancelled)
   * @param personId The ID of the person to remove
   */
  public remove(personId: string): void {
    const wasGenerating = this._generatingIds.delete(personId);
    const wasPending = this._pendingIds.delete(personId);
    if (wasGenerating || wasPending) {
      this._notifyListeners();
    }
  }

  /**
   * Get the state of a person
   */
  public getState(personId: string): BiographyPulseState | null {
    if (this._pendingIds.has(personId)) return 'pending';
    if (this._generatingIds.has(personId)) return 'generating';
    return null;
  }

  /**
   * Clear all state
   */
  public clearAll(): void {
    if (this._generatingIds.size > 0 || this._pendingIds.size > 0) {
      this._generatingIds.clear();
      this._pendingIds.clear();
      this._notifyListeners();
    }
  }

  /**
   * Get the current number of subscribers (for testing)
   */
  public get listenerCount(): number {
    return this._listeners.size;
  }

  /**
   * Remove all listeners and state (for cleanup/testing)
   */
  public clear(): void {
    this._listeners.clear();
    this._generatingIds.clear();
    this._pendingIds.clear();
  }

  private _getSnapshot(): BiographyPulseSnapshot {
    return {
      generating: new Set(this._generatingIds),
      pending: new Set(this._pendingIds),
    };
  }

  private _notifyListeners(): void {
    const snapshot = this._getSnapshot();
    for (const listener of this._listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[BiographyPulseEvents] Error in listener:', error);
      }
    }
  }
}

/**
 * Singleton instance of the biography pulse event emitter
 */
export const biographyPulseEvents = new BiographyPulseEventEmitter();

// Legacy alias for backwards compatibility
export const pendingBiographyEvents = {
  addPending: (personId: string) => biographyPulseEvents.setPending(personId),
  removePending: (personId: string) => biographyPulseEvents.remove(personId),
};
