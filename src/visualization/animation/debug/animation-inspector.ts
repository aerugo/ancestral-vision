/**
 * AnimationInspector - Runtime debugging for animation system
 *
 * Provides inspection and control capabilities for development.
 */
import type { AnimationSystem } from '../core/animation-system';

/**
 * AnimationInspector - Debug interface for animation system
 */
export class AnimationInspector {
  private readonly _system: AnimationSystem;
  private _isLogging: boolean = false;

  public constructor(system: AnimationSystem) {
    this._system = system;
  }

  /**
   * Get snapshot of current animation state
   */
  public getSnapshot(): object {
    return this._system.getDebugInfo();
  }

  /**
   * Log animation state to console on each update
   */
  public startLogging(): void {
    this._isLogging = true;
  }

  /**
   * Stop console logging
   */
  public stopLogging(): void {
    this._isLogging = false;
  }

  /**
   * Check if logging is enabled
   */
  public isLogging(): boolean {
    return this._isLogging;
  }

  /**
   * Log current state if logging is enabled
   */
  public tick(): void {
    if (this._isLogging) {
      console.log('[AnimationSystem]', this.getSnapshot());
    }
  }

  /**
   * Expose system controls to browser console (development only)
   */
  public exposeGlobally(name: string = '__animationSystem'): void {
    if (typeof window !== 'undefined') {
      (window as Record<string, unknown>)[name] = {
        pause: () => this._system.pause(),
        resume: () => this._system.resume(),
        setTimeScale: (s: number) => this._system.setTimeScale(s),
        getInfo: () => this.getSnapshot(),
        isPaused: () => this._system.isPaused(),
        getTimeScale: () => this._system.getTimeScale(),
        getElapsedTime: () => this._system.getElapsedTime(),
      };
      console.log(`[AnimationInspector] Exposed as window.${name}`);
    }
  }

  /**
   * Remove global exposure
   */
  public removeGlobalExposure(name: string = '__animationSystem'): void {
    if (typeof window !== 'undefined') {
      delete (window as Record<string, unknown>)[name];
    }
  }
}
