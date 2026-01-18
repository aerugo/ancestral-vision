/**
 * Biography Transition Events
 *
 * Event emitter for communicating biography transition events from React components
 * to the Three.js visualization layer. Enables the metamorphosis animation when
 * a biography is added to or removed from a node.
 */

/**
 * Direction of the biography transition
 * - 'add': Ghost node transforms into biography node
 * - 'remove': Biography node transforms back into ghost node
 */
export type TransitionDirection = 'add' | 'remove';

/**
 * Callback type for biography transition listeners
 */
export type BiographyTransitionListener = (personId: string, direction: TransitionDirection) => void;

/**
 * Track whether a biography transition animation is currently in progress.
 * Used to delay constellation graph invalidation until animation completes.
 */
let _transitionInProgress = false;
let _pendingInvalidationCallback: (() => void) | null = null;

/**
 * Check if a transition animation is currently in progress
 */
export function isTransitionInProgress(): boolean {
  return _transitionInProgress;
}

/**
 * Mark that a transition animation has started
 */
export function setTransitionStarted(): void {
  _transitionInProgress = true;
}

/**
 * Mark that a transition animation has completed.
 * If there's a pending invalidation callback, execute it now.
 */
export function setTransitionCompleted(): void {
  _transitionInProgress = false;
  if (_pendingInvalidationCallback) {
    const callback = _pendingInvalidationCallback;
    _pendingInvalidationCallback = null;
    // Longer delay to ensure animation visuals have fully settled
    // before triggering scene rebuild
    setTimeout(callback, 500);
  }
}

/**
 * Schedule an invalidation callback to run when transition completes.
 * If no transition is in progress, runs immediately.
 */
export function scheduleInvalidation(callback: () => void): void {
  if (_transitionInProgress) {
    _pendingInvalidationCallback = callback;
  } else {
    callback();
  }
}

/**
 * Biography transition event emitter
 *
 * Used to notify the constellation visualization when a biography has been
 * added to or removed from a person, triggering the metamorphosis animation.
 */
class BiographyTransitionEventEmitter {
  private _listeners: Set<BiographyTransitionListener> = new Set();

  /**
   * Subscribe to biography transition events
   * @param listener Callback to invoke when a biography transition occurs
   * @returns Unsubscribe function
   */
  public subscribe(listener: BiographyTransitionListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Emit a biography transition event
   * @param personId The ID of the person whose biography status is changing
   * @param direction 'add' for ghost→biography, 'remove' for biography→ghost
   */
  public emit(personId: string, direction: TransitionDirection = 'add'): void {
    for (const listener of this._listeners) {
      try {
        listener(personId, direction);
      } catch (error) {
        console.error('[BiographyTransitionEvents] Error in listener:', error);
      }
    }
  }

  /**
   * Get the current number of subscribers (for testing)
   */
  public get listenerCount(): number {
    return this._listeners.size;
  }

  /**
   * Remove all listeners (for cleanup/testing)
   */
  public clear(): void {
    this._listeners.clear();
  }
}

/**
 * Singleton instance of the biography transition event emitter
 */
export const biographyTransitionEvents = new BiographyTransitionEventEmitter();
