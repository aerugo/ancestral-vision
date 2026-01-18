/**
 * Animation Timeline
 *
 * Tracks playback progress and detects phase transitions.
 * Reads timing from AnimationDefinition (single source of truth).
 */
import type { AnimationDefinition, PhaseDefinition } from '../types';

export type PhaseEnterCallback = (phase: string, progress: number) => void;
export type PhaseExitCallback = (phase: string, progress: number) => void;

export class AnimationTimeline {
  private readonly _definition: AnimationDefinition;
  private _progress: number = 0;
  private _activePhases: Set<string> = new Set();

  public onPhaseEnter: PhaseEnterCallback | null = null;
  public onPhaseExit: PhaseExitCallback | null = null;

  public constructor(definition: AnimationDefinition) {
    this._definition = definition;
  }

  public get progress(): number {
    return this._progress;
  }

  public get isComplete(): boolean {
    return this._progress >= 1;
  }

  public get duration(): number {
    return this._definition.duration;
  }

  public get name(): string {
    return this._definition.name;
  }

  public update(deltaTime: number): void {
    const previousProgress = this._progress;
    this._progress = Math.min(1, this._progress + deltaTime / this._definition.duration);
    this._detectPhaseTransitions(previousProgress, this._progress);
  }

  public reset(): void {
    for (const phase of this._activePhases) {
      this.onPhaseExit?.(phase, this._progress);
    }
    this._progress = 0;
    this._activePhases.clear();
  }

  public getCurrentPhases(): string[] {
    return this._definition.phases
      .filter((p) => this._isInPhase(p, this._progress))
      .map((p) => p.name);
  }

  public getPhaseProgress(phaseName: string): number | null {
    const phase = this._definition.phases.find((p) => p.name === phaseName);
    if (!phase || !this._isInPhase(phase, this._progress)) {
      return null;
    }

    const phaseRange = phase.end - phase.start;
    if (phaseRange <= 0) return 1;

    return (this._progress - phase.start) / phaseRange;
  }

  private _isInPhase(phase: PhaseDefinition, progress: number): boolean {
    return progress >= phase.start && progress < phase.end;
  }

  private _detectPhaseTransitions(prevProgress: number, currProgress: number): void {
    for (const phase of this._definition.phases) {
      const wasInPhase = this._isInPhase(phase, prevProgress);
      const isInPhase = this._isInPhase(phase, currProgress);

      // Check if we crossed into the phase (or started at 0 inside it)
      if (!this._activePhases.has(phase.name) && (isInPhase || wasInPhase)) {
        this._activePhases.add(phase.name);
        this.onPhaseEnter?.(phase.name, Math.max(phase.start, prevProgress));
      }

      // Check if we crossed out of the phase
      if (this._activePhases.has(phase.name) && !isInPhase) {
        this._activePhases.delete(phase.name);
        this.onPhaseExit?.(phase.name, currProgress);
      }
    }
  }
}
