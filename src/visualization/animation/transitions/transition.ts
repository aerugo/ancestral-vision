/**
 * Transition - One-shot animation with events
 *
 * Coordinates timeline, tracks, and event emission.
 * Main entry point for one-shot animation playback.
 */
import type {
  AnimationDefinition,
  AnimationEvent,
  AnimationEventHandler,
  Unsubscribe,
} from '../types';
import { AnimationEventBus } from '../core/event-bus';
import { AnimationTimeline } from './timeline';
import { AnimationTrack } from './track';

export class Transition {
  private readonly _eventBus: AnimationEventBus;
  private _timeline: AnimationTimeline | null = null;
  private _tracks: AnimationTrack[] = [];
  private _isPlaying: boolean = false;
  private _definition: AnimationDefinition | null = null;

  public constructor(definition?: AnimationDefinition) {
    this._eventBus = new AnimationEventBus();
    if (definition) {
      this._definition = definition;
    }
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public get progress(): number {
    return this._timeline?.progress ?? 0;
  }

  public get animationName(): string | null {
    return this._definition?.name ?? null;
  }

  public subscribe(handler: AnimationEventHandler): Unsubscribe {
    return this._eventBus.subscribe(handler);
  }

  public play(definition?: AnimationDefinition): void {
    const def = definition ?? this._definition;
    if (!def) {
      throw new Error('No animation definition provided');
    }

    if (this._isPlaying) {
      this._emitCancel();
    }

    this._definition = def;
    this._timeline = new AnimationTimeline(def);
    this._tracks = def.tracks.map((t) => new AnimationTrack(t));
    this._isPlaying = true;

    this._timeline.onPhaseEnter = (phase, progress) => {
      this._eventBus.emit({ type: 'phase:enter', phase, progress });
    };

    this._timeline.onPhaseExit = (phase, progress) => {
      this._eventBus.emit({ type: 'phase:exit', phase, progress });
    };

    this._eventBus.emit({
      type: 'animation:start',
      animationName: def.name,
    });
  }

  public update(deltaTime: number): void {
    if (!this._isPlaying || !this._timeline) {
      return;
    }

    this._timeline.update(deltaTime);

    const progress = this._timeline.progress;
    for (const track of this._tracks) {
      const value = track.getValue(progress);
      this._eventBus.emit({
        type: 'track:update',
        track: track.name,
        value,
      });
    }

    for (const phaseName of this._timeline.getCurrentPhases()) {
      const phaseProgress = this._timeline.getPhaseProgress(phaseName);
      if (phaseProgress !== null) {
        this._eventBus.emit({
          type: 'phase:progress',
          phase: phaseName,
          progress,
          phaseProgress,
        });
      }
    }

    if (this._timeline.isComplete) {
      this._isPlaying = false;
      this._eventBus.emit({ type: 'animation:complete' });
    }
  }

  public cancel(): void {
    if (this._isPlaying) {
      this._emitCancel();
    }
  }

  public dispose(): void {
    this.cancel();
    this._eventBus.clear();
    this._timeline = null;
    this._tracks = [];
    this._definition = null;
  }

  private _emitCancel(): void {
    this._isPlaying = false;
    this._eventBus.emit({ type: 'animation:cancel' });
  }
}
