/**
 * Animation Event Bus
 *
 * Typed pub/sub event system for animation coordination.
 * Enables loose coupling between animation systems.
 */
import type { AnimationEvent, AnimationEventHandler, Unsubscribe } from '../types';

/**
 * AnimationEventBus - Typed pub/sub for animation events
 */
export class AnimationEventBus {
  private _subscribers: Set<AnimationEventHandler> = new Set();

  /**
   * Subscribe to animation events
   * @param handler - Function called when events are emitted
   * @returns Unsubscribe function
   */
  public subscribe(handler: AnimationEventHandler): Unsubscribe {
    this._subscribers.add(handler);
    return () => {
      this._subscribers.delete(handler);
    };
  }

  /**
   * Emit an animation event to all subscribers
   * @param event - The event to emit
   */
  public emit(event: AnimationEvent): void {
    // Copy to array to handle subscription changes during emit
    const handlers = Array.from(this._subscribers);
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Animation event handler error:', error);
      }
    }
  }

  /**
   * Remove all subscribers
   */
  public clear(): void {
    this._subscribers.clear();
  }

  /**
   * Get current subscriber count (for testing/debugging)
   */
  public get subscriberCount(): number {
    return this._subscribers.size;
  }
}
