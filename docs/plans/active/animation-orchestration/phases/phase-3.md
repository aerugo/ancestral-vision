# Phase 3: Transitions

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create a timeline-based transition system for one-shot animations (camera zoom, biography transition). This includes the AnimationTimeline for progress tracking, AnimationTrack for keyframe interpolation, Transition class for one-shot animations, and declarative definitions for the biography and camera transitions.

---

## Invariants Enforced in This Phase

- **NEW INV-A010**: Animation Timing Single Source of Truth - All phase timing defined in AnimationDefinition
- **INV-A009**: Scene Cleanup on Unmount - Transitions properly disposed

---

## Components

### 1. AnimationTimeline
Tracks playback progress (0-1) and detects phase transitions. Emits callbacks when phases are entered/exited.

### 2. AnimationTrack
Interpolates keyframe values over time with configurable easing functions.

### 3. Transition
Main class that coordinates timeline and tracks, emitting events during playback.

### 4. TransitionBuilder
Fluent API for constructing transitions programmatically.

### 5. Animation Definitions
Declarative JSON-serializable definitions for biography and camera transitions.

---

## TDD Steps

### Step 3.1: Write Failing Tests for AnimationTimeline (RED)

Create `src/visualization/animation/transitions/timeline.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationTimeline } from './timeline';
import type { AnimationDefinition } from '../types';

const testDefinition: AnimationDefinition = {
  name: 'test',
  duration: 2.0,
  phases: [
    { name: 'phase1', start: 0, end: 0.5 },
    { name: 'phase2', start: 0.5, end: 1.0 },
  ],
  tracks: [],
};

describe('AnimationTimeline', () => {
  let timeline: AnimationTimeline;

  beforeEach(() => {
    timeline = new AnimationTimeline(testDefinition);
  });

  describe('progress', () => {
    it('should initialize with progress 0', () => {
      expect(timeline.progress).toBe(0);
    });

    it('should advance progress on update', () => {
      timeline.update(0.5); // 0.5 / 2.0 = 0.25
      expect(timeline.progress).toBeCloseTo(0.25);
    });

    it('should clamp progress to 0-1', () => {
      timeline.update(5.0);
      expect(timeline.progress).toBe(1);
    });

    it('should report isComplete when progress >= 1', () => {
      expect(timeline.isComplete).toBe(false);
      timeline.update(2.0);
      expect(timeline.isComplete).toBe(true);
    });

    it('should reset progress on reset()', () => {
      timeline.update(1.0);
      timeline.reset();
      expect(timeline.progress).toBe(0);
      expect(timeline.isComplete).toBe(false);
    });

    it('should calculate correct progress from deltaTime and duration', () => {
      timeline.update(0.2); // 0.2 / 2.0 = 0.1
      expect(timeline.progress).toBeCloseTo(0.1);

      timeline.update(0.3); // +0.15, total 0.25
      expect(timeline.progress).toBeCloseTo(0.25);
    });
  });

  describe('getCurrentPhases', () => {
    it('should return phases that contain current progress', () => {
      timeline.update(0.5); // progress = 0.25, in phase1
      const phases = timeline.getCurrentPhases();
      expect(phases).toContain('phase1');
      expect(phases).not.toContain('phase2');
    });

    it('should return multiple phases when overlapping', () => {
      const overlappingDef: AnimationDefinition = {
        name: 'test',
        duration: 1.0,
        phases: [
          { name: 'long', start: 0, end: 1.0 },
          { name: 'short', start: 0.25, end: 0.75 },
        ],
        tracks: [],
      };
      const tl = new AnimationTimeline(overlappingDef);
      tl.update(0.5);
      const phases = tl.getCurrentPhases();
      expect(phases).toContain('long');
      expect(phases).toContain('short');
    });
  });

  describe('getPhaseProgress', () => {
    it('should return 0-1 progress within a phase', () => {
      timeline.update(0.5); // progress = 0.25, phase1 is 0-0.5
      expect(timeline.getPhaseProgress('phase1')).toBeCloseTo(0.5);
    });

    it('should return null for inactive phase', () => {
      timeline.update(0.5); // progress = 0.25, phase2 not started
      expect(timeline.getPhaseProgress('phase2')).toBeNull();
    });
  });

  describe('phase events', () => {
    it('should call onPhaseEnter when entering a phase', () => {
      const onEnter = vi.fn();
      timeline.onPhaseEnter = onEnter;

      timeline.update(0.1);
      expect(onEnter).toHaveBeenCalledWith('phase1', expect.any(Number));
    });

    it('should call onPhaseExit when leaving a phase', () => {
      const onExit = vi.fn();
      timeline.onPhaseExit = onExit;

      timeline.update(1.0); // Enter phase1
      timeline.update(0.1); // Exit phase1
      expect(onExit).toHaveBeenCalledWith('phase1', expect.any(Number));
    });

    it('should not call onPhaseEnter twice for same phase', () => {
      const onEnter = vi.fn();
      timeline.onPhaseEnter = onEnter;

      timeline.update(0.1);
      timeline.update(0.1);
      timeline.update(0.1);

      expect(onEnter).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Step 3.2: Implement AnimationTimeline (GREEN)

Create `src/visualization/animation/transitions/timeline.ts`:

```typescript
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
      const wasActive = this._activePhases.has(phase.name);
      const isActive = this._isInPhase(phase, currProgress);

      if (!wasActive && isActive) {
        this._activePhases.add(phase.name);
        this.onPhaseEnter?.(phase.name, currProgress);
      } else if (wasActive && !isActive) {
        this._activePhases.delete(phase.name);
        this.onPhaseExit?.(phase.name, currProgress);
      }
    }
  }
}
```

### Step 3.3: Write Failing Tests for AnimationTrack (RED)

Create `src/visualization/animation/transitions/track.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationTrack } from './track';
import type { TrackDefinition } from '../types';

describe('AnimationTrack', () => {
  describe('scalar interpolation', () => {
    const scalarTrack: TrackDefinition = {
      name: 'scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.5, value: 1 },
        { time: 1, value: 0.5 },
      ],
    };

    let track: AnimationTrack;

    beforeEach(() => {
      track = new AnimationTrack(scalarTrack);
    });

    it('should return first keyframe value at t=0', () => {
      expect(track.getValue(0)).toBe(0);
    });

    it('should return last keyframe value at t=1', () => {
      expect(track.getValue(1)).toBe(0.5);
    });

    it('should interpolate between keyframes', () => {
      // At t=0.25: lerp from 0 to 1, local progress = 0.5
      expect(track.getValue(0.25)).toBeCloseTo(0.5);
    });

    it('should handle exact keyframe times', () => {
      expect(track.getValue(0.5)).toBe(1);
    });
  });

  describe('array interpolation', () => {
    const vectorTrack: TrackDefinition = {
      name: 'position',
      keyframes: [
        { time: 0, value: [0, 0, 0] },
        { time: 1, value: [10, 20, 30] },
      ],
    };

    it('should interpolate array values component-wise', () => {
      const track = new AnimationTrack(vectorTrack);
      const value = track.getValue(0.5) as number[];
      expect(value[0]).toBeCloseTo(5);
      expect(value[1]).toBeCloseTo(10);
      expect(value[2]).toBeCloseTo(15);
    });
  });

  describe('easing', () => {
    const easedTrack: TrackDefinition = {
      name: 'scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ],
      easing: 'easeInCubic',
    };

    it('should apply easing function', () => {
      const track = new AnimationTrack(easedTrack);
      // easeInCubic(0.5) = 0.125
      expect(track.getValue(0.5)).toBeCloseTo(0.125);
    });
  });

  describe('edge cases', () => {
    it('should clamp time below 0', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [
          { time: 0, value: 10 },
          { time: 1, value: 20 },
        ],
      });
      expect(track.getValue(-0.5)).toBe(10);
    });

    it('should clamp time above 1', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [
          { time: 0, value: 10 },
          { time: 1, value: 20 },
        ],
      });
      expect(track.getValue(1.5)).toBe(20);
    });

    it('should handle single keyframe', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [{ time: 0.5, value: 42 }],
      });
      expect(track.getValue(0)).toBe(42);
      expect(track.getValue(1)).toBe(42);
    });
  });
});
```

### Step 3.4: Implement AnimationTrack (GREEN)

Create `src/visualization/animation/transitions/track.ts`:

```typescript
/**
 * Animation Track
 *
 * Interpolates keyframe values over time with configurable easing.
 */
import type { TrackDefinition, Keyframe, EasingName } from '../types';
import { getEasing, type EasingFunction } from '../core/easing';

export class AnimationTrack {
  private readonly _name: string;
  private readonly _keyframes: Keyframe[];
  private readonly _easing: EasingFunction;

  public constructor(definition: TrackDefinition) {
    this._name = definition.name;
    this._keyframes = [...definition.keyframes].sort((a, b) => a.time - b.time);
    this._easing = getEasing(definition.easing ?? 'linear');
  }

  public get name(): string {
    return this._name;
  }

  public getValue(time: number): number | number[] {
    if (this._keyframes.length === 0) {
      return 0;
    }

    if (this._keyframes.length === 1) {
      return this._keyframes[0].value;
    }

    const t = Math.max(0, Math.min(1, time));

    let prevKeyframe = this._keyframes[0];
    let nextKeyframe = this._keyframes[this._keyframes.length - 1];

    for (let i = 0; i < this._keyframes.length - 1; i++) {
      if (t >= this._keyframes[i].time && t <= this._keyframes[i + 1].time) {
        prevKeyframe = this._keyframes[i];
        nextKeyframe = this._keyframes[i + 1];
        break;
      }
    }

    if (t <= prevKeyframe.time) return prevKeyframe.value;
    if (t >= nextKeyframe.time) return nextKeyframe.value;

    const keyframeRange = nextKeyframe.time - prevKeyframe.time;
    const localProgress = (t - prevKeyframe.time) / keyframeRange;
    const easedProgress = this._easing(localProgress);

    return this._interpolate(prevKeyframe.value, nextKeyframe.value, easedProgress);
  }

  private _interpolate(
    a: number | number[],
    b: number | number[],
    t: number
  ): number | number[] {
    if (typeof a === 'number' && typeof b === 'number') {
      return a + (b - a) * t;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((av, i) => av + ((b[i] ?? av) - av) * t);
    }

    return a;
  }
}
```

### Step 3.5: Write Failing Tests for Transition (RED)

Create `src/visualization/animation/transitions/transition.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transition } from './transition';
import type { AnimationDefinition, AnimationEvent } from '../types';

const testDefinition: AnimationDefinition = {
  name: 'test-animation',
  duration: 1.0,
  phases: [
    { name: 'phase1', start: 0, end: 0.5 },
    { name: 'phase2', start: 0.5, end: 1.0 },
  ],
  tracks: [
    {
      name: 'scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ],
    },
  ],
};

describe('Transition', () => {
  let transition: Transition;

  beforeEach(() => {
    transition = new Transition(testDefinition);
  });

  describe('play', () => {
    it('should start playing', () => {
      transition.play();
      expect(transition.isPlaying).toBe(true);
    });

    it('should emit animation:start event', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();

      expect(events[0]).toEqual({
        type: 'animation:start',
        animationName: 'test-animation',
      });
    });
  });

  describe('update', () => {
    it('should advance progress', () => {
      transition.play();
      transition.update(0.5);

      expect(transition.progress).toBeCloseTo(0.5);
    });

    it('should emit phase:enter when entering a phase', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(0.1);

      const enterEvents = events.filter((e) => e.type === 'phase:enter');
      expect(enterEvents.length).toBe(1);
      expect(enterEvents[0]).toMatchObject({
        type: 'phase:enter',
        phase: 'phase1',
      });
    });

    it('should emit track:update with interpolated values', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(0.5);

      const trackEvents = events.filter((e) => e.type === 'track:update');
      expect(trackEvents.length).toBeGreaterThan(0);
      expect(trackEvents[trackEvents.length - 1]).toMatchObject({
        type: 'track:update',
        track: 'scale',
        value: 0.5,
      });
    });

    it('should emit animation:complete when finished', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(2.0);

      const completeEvents = events.filter((e) => e.type === 'animation:complete');
      expect(completeEvents.length).toBe(1);
      expect(transition.isPlaying).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should stop the animation', () => {
      transition.play();
      transition.cancel();

      expect(transition.isPlaying).toBe(false);
    });

    it('should emit animation:cancel event', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.cancel();

      const cancelEvents = events.filter((e) => e.type === 'animation:cancel');
      expect(cancelEvents.length).toBe(1);
    });
  });

  describe('dispose', () => {
    it('should cancel animation and clear subscribers', () => {
      const handler = vi.fn();
      transition.subscribe(handler);
      transition.play();

      transition.dispose();
      transition.update(0.1);

      // Handler called for start and cancel, then cleared
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Step 3.6: Implement Transition (GREEN)

Create `src/visualization/animation/transitions/transition.ts`:

```typescript
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
```

### Step 3.7: Create Biography Transition Definition

Create `src/visualization/animation/definitions/biography-transition.ts`:

```typescript
/**
 * Biography Transition Animation Definition
 *
 * Declarative definition for the ghost-to-biography metamorphosis animation.
 * This is the SINGLE SOURCE OF TRUTH for all timing in this animation.
 *
 * Timeline:
 * - 0-30%: Camera zoom (ghost appears normal)
 * - 30-40%: Glow intensify (ghost swells slightly)
 * - 40-70%: Shrink + particles (ghost shrinks rapidly)
 * - 55-85%: Reconvene (biography node emerges, overlaps with shrink)
 * - 70-90%: Particle fade (ghost fully fades out)
 * - 90-100%: Hold (animation complete)
 */
import type { AnimationDefinition } from '../types';

export const biographyTransitionDefinition: AnimationDefinition = {
  name: 'biography-transition',
  duration: 3.5,

  phases: [
    { name: 'cameraZoom', start: 0, end: 0.30 },
    { name: 'glowIntensify', start: 0.30, end: 0.40 },
    { name: 'shrink', start: 0.40, end: 0.70 },
    { name: 'reconvene', start: 0.55, end: 0.85 },
    { name: 'particleFade', start: 0.70, end: 0.90 },
    { name: 'hold', start: 0.90, end: 1.0 },
  ],

  tracks: [
    {
      name: 'ghost.scale',
      keyframes: [
        { time: 0, value: 0.7 },
        { time: 0.30, value: 0.7 },
        { time: 0.40, value: 0.77 },
        { time: 0.70, value: 0.14 },
        { time: 0.90, value: 0 },
        { time: 1.0, value: 0 },
      ],
      easing: 'easeInCubic',
    },
    {
      name: 'ghost.glow',
      keyframes: [
        { time: 0, value: 1 },
        { time: 0.30, value: 1 },
        { time: 0.40, value: 5 },
        { time: 0.70, value: 2 },
        { time: 0.90, value: 0 },
        { time: 1.0, value: 0 },
      ],
    },
    {
      name: 'ghost.transition',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.40, value: 0 },
        { time: 0.70, value: 1 },
        { time: 1.0, value: 1 },
      ],
    },
    {
      name: 'biography.scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.55, value: 0 },
        { time: 0.85, value: 1 },
        { time: 1.0, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
    {
      name: 'particles.intensity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.40, value: 0 },
        { time: 0.55, value: 1 },
        { time: 0.90, value: 0 },
        { time: 1.0, value: 0 },
      ],
    },
    {
      name: 'camera.zoom',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.30, value: 1 },
        { time: 1.0, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
  ],
};
```

### Step 3.8: Create Index Exports

Create `src/visualization/animation/transitions/index.ts`:

```typescript
/**
 * Transition Module
 *
 * Timeline-based one-shot animations with phase and track events.
 */
export { AnimationTimeline } from './timeline';
export type { PhaseEnterCallback, PhaseExitCallback } from './timeline';
export { AnimationTrack } from './track';
export { Transition } from './transition';
```

Create `src/visualization/animation/definitions/index.ts`:

```typescript
/**
 * Animation Definitions
 *
 * Declarative animation definitions for the application.
 */
export { biographyTransitionDefinition } from './biography-transition';
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/transitions/timeline.ts` | CREATE | Timeline class |
| `src/visualization/animation/transitions/timeline.test.ts` | CREATE | Timeline unit tests |
| `src/visualization/animation/transitions/track.ts` | CREATE | Track class |
| `src/visualization/animation/transitions/track.test.ts` | CREATE | Track unit tests |
| `src/visualization/animation/transitions/transition.ts` | CREATE | Transition class |
| `src/visualization/animation/transitions/transition.test.ts` | CREATE | Transition unit tests |
| `src/visualization/animation/transitions/index.ts` | CREATE | Module exports |
| `src/visualization/animation/definitions/biography-transition.ts` | CREATE | Biography animation |
| `src/visualization/animation/definitions/index.ts` | CREATE | Definition exports |

---

## Verification

```bash
# Run tests
npx vitest src/visualization/animation/transitions/

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All 35 transition tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Timeline tracks progress correctly
- [ ] Timeline emits phase enter/exit events
- [ ] Track interpolates keyframes with easing
- [ ] Transition coordinates timeline and tracks
- [ ] Biography transition definition matches current behavior
