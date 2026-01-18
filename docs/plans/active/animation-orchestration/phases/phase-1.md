# Phase 1: Foundation

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create the foundational components for the animation system: TimeProvider for unified time management, Easing functions for smooth interpolation, core Types for type safety, and EventBus for event-driven coordination.

---

## Invariants Enforced in This Phase

- **INV-A009**: Scene Cleanup on Unmount - TimeProvider and EventBus support proper cleanup
- **NEW INV-A010**: Animation Timing Single Source of Truth - TimeProvider is the only source of elapsed time

---

## TDD Steps

### Step 1.1: Write Failing Tests for Types (RED)

Create `src/visualization/animation/types.ts` with type definitions.

No tests needed for types (compile-time only), but verify with `tsc --noEmit`.

### Step 1.2: Write Failing Tests for TimeProvider (RED)

Create `src/visualization/animation/core/time-provider.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TimeProvider } from './time-provider';

describe('TimeProvider', () => {
  let timeProvider: TimeProvider;

  beforeEach(() => {
    timeProvider = new TimeProvider();
  });

  describe('basic time tracking', () => {
    it('should initialize with elapsed time 0', () => {
      expect(timeProvider.getElapsedTime()).toBe(0);
    });

    it('should accumulate elapsed time on update', () => {
      timeProvider.update(0.016); // ~60fps
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.016);

      timeProvider.update(0.016);
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.032);
    });

    it('should return correct delta time', () => {
      timeProvider.update(0.016);
      expect(timeProvider.getDeltaTime()).toBeCloseTo(0.016);
    });
  });

  describe('time scale', () => {
    it('should default to time scale 1.0', () => {
      expect(timeProvider.getTimeScale()).toBe(1.0);
    });

    it('should apply time scale to elapsed time', () => {
      timeProvider.setTimeScale(2.0); // Double speed
      timeProvider.update(0.016);
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.032);
    });

    it('should apply time scale to delta time', () => {
      timeProvider.setTimeScale(0.5); // Half speed
      timeProvider.update(0.016);
      expect(timeProvider.getDeltaTime()).toBeCloseTo(0.008);
    });

    it('should clamp time scale to non-negative', () => {
      timeProvider.setTimeScale(-1.0);
      expect(timeProvider.getTimeScale()).toBe(0);
    });
  });

  describe('pause/resume', () => {
    it('should not be paused by default', () => {
      expect(timeProvider.isPaused()).toBe(false);
    });

    it('should stop accumulating time when paused', () => {
      timeProvider.update(0.016);
      const elapsed = timeProvider.getElapsedTime();

      timeProvider.pause();
      timeProvider.update(0.016);

      expect(timeProvider.getElapsedTime()).toBe(elapsed);
    });

    it('should return 0 delta time when paused', () => {
      timeProvider.pause();
      timeProvider.update(0.016);
      expect(timeProvider.getDeltaTime()).toBe(0);
    });

    it('should resume time accumulation', () => {
      timeProvider.pause();
      timeProvider.update(0.016);
      timeProvider.resume();
      timeProvider.update(0.016);

      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.016);
    });
  });

  describe('delta capping', () => {
    it('should cap large delta times to prevent catch-up', () => {
      timeProvider.setMaxDeltaTime(0.1); // 100ms max
      timeProvider.update(5.0); // 5 second delta (after sleep/tab switch)

      expect(timeProvider.getDeltaTime()).toBe(0.1);
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.1);
    });

    it('should not cap normal delta times', () => {
      timeProvider.setMaxDeltaTime(0.1);
      timeProvider.update(0.016);

      expect(timeProvider.getDeltaTime()).toBeCloseTo(0.016);
    });
  });

  describe('reset', () => {
    it('should reset elapsed time to 0', () => {
      timeProvider.update(1.0);
      timeProvider.reset();

      expect(timeProvider.getElapsedTime()).toBe(0);
    });

    it('should preserve settings after reset', () => {
      timeProvider.setTimeScale(2.0);
      timeProvider.setMaxDeltaTime(0.1);
      timeProvider.reset();

      expect(timeProvider.getTimeScale()).toBe(2.0);
    });
  });
});
```

### Step 1.3: Implement TimeProvider (GREEN)

Create `src/visualization/animation/core/time-provider.ts`:

```typescript
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
   * @param maxMs - Maximum delta time in seconds
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
```

### Step 1.4: Write Failing Tests for Easing Functions (RED)

Create `src/visualization/animation/core/easing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { easings, getEasing } from './easing';

describe('easing functions', () => {
  describe('linear', () => {
    it('should return t unchanged', () => {
      expect(easings.linear(0)).toBe(0);
      expect(easings.linear(0.5)).toBe(0.5);
      expect(easings.linear(1)).toBe(1);
    });
  });

  describe('easeInCubic', () => {
    it('should start slow (t^3)', () => {
      expect(easings.easeInCubic(0.5)).toBeCloseTo(0.125);
    });
  });

  describe('easeOutCubic', () => {
    it('should end slow', () => {
      expect(easings.easeOutCubic(0.5)).toBeCloseTo(0.875);
    });
  });

  describe('easeInOutCubic', () => {
    it('should be symmetric', () => {
      expect(easings.easeInOutCubic(0.5)).toBeCloseTo(0.5);
      const sum = easings.easeInOutCubic(0.25) + easings.easeInOutCubic(0.75);
      expect(sum).toBeCloseTo(1);
    });
  });

  describe('easeInQuart', () => {
    it('should start very slow (t^4)', () => {
      expect(easings.easeInQuart(0.5)).toBeCloseTo(0.0625);
    });
  });

  describe('easeOutQuart', () => {
    it('should end very slow', () => {
      expect(easings.easeOutQuart(0.5)).toBeCloseTo(0.9375);
    });
  });

  describe('boundary conditions', () => {
    const allEasings = Object.entries(easings);

    it('all easings should return 0 at t=0', () => {
      for (const [name, fn] of allEasings) {
        expect(fn(0), `${name} at t=0`).toBe(0);
      }
    });

    it('all easings should return 1 at t=1', () => {
      for (const [name, fn] of allEasings) {
        expect(fn(1), `${name} at t=1`).toBe(1);
      }
    });
  });

  describe('getEasing', () => {
    it('should return the correct easing function by name', () => {
      expect(getEasing('linear')).toBe(easings.linear);
      expect(getEasing('easeInCubic')).toBe(easings.easeInCubic);
    });
  });
});
```

### Step 1.5: Implement Easing Functions (GREEN)

Create `src/visualization/animation/core/easing.ts`:

```typescript
/**
 * Easing Functions
 *
 * Standard Robert Penner easing equations for animation interpolation.
 */
import type { EasingName } from '../types';

/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;

/**
 * Collection of easing functions
 */
export const easings: Record<EasingName, EasingFunction> = {
  linear: (t) => t,

  easeInCubic: (t) => t * t * t,

  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),

  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  easeInQuart: (t) => t * t * t * t,

  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
};

/**
 * Get an easing function by name
 */
export function getEasing(name: EasingName): EasingFunction {
  return easings[name];
}
```

### Step 1.6: Write Failing Tests for Event Bus (RED)

Create `src/visualization/animation/core/event-bus.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationEventBus } from './event-bus';
import type { AnimationEvent } from '../types';

describe('AnimationEventBus', () => {
  let bus: AnimationEventBus;

  beforeEach(() => {
    bus = new AnimationEventBus();
  });

  describe('subscribe', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();
      const unsubscribe = bus.subscribe(handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      bus.subscribe(handler);

      const event: AnimationEvent = { type: 'animation:start', animationName: 'test' };
      bus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.subscribe(handler1);
      bus.subscribe(handler2);

      const event: AnimationEvent = { type: 'animation:complete' };
      bus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe correctly', () => {
      const handler = vi.fn();
      const unsubscribe = bus.subscribe(handler);

      unsubscribe();
      bus.emit({ type: 'animation:complete' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not emit to unsubscribed handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = bus.subscribe(handler1);
      bus.subscribe(handler2);

      unsubscribe1();
      bus.emit({ type: 'animation:complete' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('emit order', () => {
    it('should emit events in subscription order', () => {
      const order: number[] = [];
      bus.subscribe(() => order.push(1));
      bus.subscribe(() => order.push(2));
      bus.subscribe(() => order.push(3));

      bus.emit({ type: 'animation:complete' });

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('type narrowing', () => {
    it('should allow type narrowing by event type', () => {
      bus.subscribe((event) => {
        if (event.type === 'phase:enter') {
          expect(event.phase).toBeDefined();
          expect(event.progress).toBeDefined();
        }
      });

      bus.emit({ type: 'phase:enter', phase: 'test', progress: 0.5 });
    });
  });

  describe('clear', () => {
    it('should remove all subscribers', () => {
      const handler = vi.fn();
      bus.subscribe(handler);

      bus.clear();
      bus.emit({ type: 'animation:complete' });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
```

### Step 1.7: Implement Event Bus (GREEN)

Create `src/visualization/animation/core/event-bus.ts`:

```typescript
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
```

### Step 1.8: Implement Types (GREEN)

Create `src/visualization/animation/types.ts`:

```typescript
/**
 * Animation System Types
 *
 * Shared types for the unified animation system.
 */

// ============================================================================
// Easing
// ============================================================================

/**
 * Easing function names
 */
export type EasingName =
  | 'linear'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart';

// ============================================================================
// Animation Definitions
// ============================================================================

/**
 * A keyframe in an animation track
 */
export interface Keyframe {
  /** Normalized time (0-1) */
  time: number;
  /** Value at this keyframe (scalar or array) */
  value: number | number[];
}

/**
 * An animation track that interpolates values over time
 */
export interface TrackDefinition {
  /** Track name for identification */
  name: string;
  /** Keyframes defining the animation curve */
  keyframes: Keyframe[];
  /** Easing function (default: linear) */
  easing?: EasingName;
}

/**
 * A phase within an animation timeline
 */
export interface PhaseDefinition {
  /** Phase name for event emission */
  name: string;
  /** Start time (0-1 normalized) */
  start: number;
  /** End time (0-1 normalized) */
  end: number;
}

/**
 * Complete animation definition
 */
export interface AnimationDefinition {
  /** Animation name for identification */
  name: string;
  /** Total duration in seconds */
  duration: number;
  /** Phases for event emission */
  phases: PhaseDefinition[];
  /** Tracks for value interpolation */
  tracks: TrackDefinition[];
}

// ============================================================================
// Events
// ============================================================================

/**
 * Animation events emitted during playback
 */
export type AnimationEvent =
  | { type: 'animation:start'; animationName: string }
  | { type: 'animation:complete' }
  | { type: 'animation:cancel' }
  | { type: 'phase:enter'; phase: string; progress: number }
  | { type: 'phase:progress'; phase: string; progress: number; phaseProgress: number }
  | { type: 'phase:exit'; phase: string; progress: number }
  | { type: 'track:update'; track: string; value: number | number[] };

/**
 * Event handler function type
 */
export type AnimationEventHandler = (event: AnimationEvent) => void;

/**
 * Unsubscribe function returned by subscribe
 */
export type Unsubscribe = () => void;

// ============================================================================
// Shader Loop
// ============================================================================

/**
 * Shader uniforms that include a time uniform
 */
export interface ShaderUniforms {
  uTime: { value: number };
  [key: string]: { value: unknown };
}

// ============================================================================
// Reactive Binding
// ============================================================================

/**
 * Configuration for a reactive binding
 */
export interface ReactiveBindingConfig<T> {
  /** Initial state value */
  initialState: T;
  /** Transform state to animation value */
  transform: (state: T) => number;
  /** Optional transition duration in ms */
  transitionDuration?: number;
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/types.ts` | CREATE | Shared TypeScript types |
| `src/visualization/animation/core/time-provider.ts` | CREATE | Unified time management |
| `src/visualization/animation/core/time-provider.test.ts` | CREATE | TimeProvider unit tests |
| `src/visualization/animation/core/easing.ts` | CREATE | Easing functions |
| `src/visualization/animation/core/easing.test.ts` | CREATE | Easing unit tests |
| `src/visualization/animation/core/event-bus.ts` | CREATE | Event bus implementation |
| `src/visualization/animation/core/event-bus.test.ts` | CREATE | Event bus unit tests |

---

## Verification

```bash
# Run specific tests
npx vitest src/visualization/animation/core/

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [x] All 20 test cases pass (32 tests actually)
- [x] Type check passes
- [x] Lint passes
- [x] No `any` types introduced
- [x] JSDoc comments on public APIs
- [x] TimeProvider handles pause/resume
- [x] TimeProvider applies time scale correctly
- [x] TimeProvider caps delta time
- [x] Easing functions match standard curves
- [x] EventBus supports subscribe/emit/unsubscribe
- [x] EventBus handles handler errors gracefully
