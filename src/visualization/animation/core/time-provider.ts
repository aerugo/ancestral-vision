/**
 * TimeProvider - Unified time management for animations
 *
 * Provides a single source of truth for elapsed time, with support for:
 * - Pause/resume
 * - Time scale (slow motion, fast forward)
 * - Delta capping (prevents catch-up after sleep/tab switch)
 */
export class TimeProvider {
  private _elapsedTime: number = 0;
  private _deltaTime: number = 0;
  private _timeScale: number = 1.0;
  private _maxDeltaTime: number = Infinity;
  private _isPaused: boolean = false;

  /**
   * Update the time provider with raw delta time from the animation loop
   * @param rawDeltaTime - Time elapsed since last frame in seconds
   */
  public update(rawDeltaTime: number): void {
    if (this._isPaused) {
      this._deltaTime = 0;
      return;
    }

    // Cap delta time to prevent catch-up after sleep
    const cappedDelta = Math.min(rawDeltaTime, this._maxDeltaTime);

    // Apply time scale
    this._deltaTime = cappedDelta * this._timeScale;
    this._elapsedTime += this._deltaTime;
  }

  /**
   * Get total elapsed time (affected by time scale)
   */
  public getElapsedTime(): number {
    return this._elapsedTime;
  }

  /**
   * Get delta time from last update (affected by time scale and capping)
   */
  public getDeltaTime(): number {
    return this._deltaTime;
  }

  /**
   * Set time scale (0.5 = half speed, 2.0 = double speed)
   */
  public setTimeScale(scale: number): void {
    this._timeScale = Math.max(0, scale);
  }

  /**
   * Get current time scale
   */
  public getTimeScale(): number {
    return this._timeScale;
  }

  /**
   * Set maximum delta time to prevent animation catch-up after sleep
   * @param maxSeconds - Maximum delta time in seconds
   */
  public setMaxDeltaTime(maxSeconds: number): void {
    this._maxDeltaTime = maxSeconds;
  }

  /**
   * Pause time accumulation
   */
  public pause(): void {
    this._isPaused = true;
  }

  /**
   * Resume time accumulation
   */
  public resume(): void {
    this._isPaused = false;
  }

  /**
   * Check if time is paused
   */
  public isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Reset elapsed time to 0 (preserves settings)
   */
  public reset(): void {
    this._elapsedTime = 0;
    this._deltaTime = 0;
  }
}
