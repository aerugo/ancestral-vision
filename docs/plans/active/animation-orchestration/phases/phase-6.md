# Phase 6: Multi-Phase (Metamorphosis)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create a PhaseAnimator for complex multi-phase sequences like the metamorphosis particle animation. This enables the 7-phase particle burst effect to be defined declaratively and driven through the AnimationSystem.

---

## Invariants Enforced in This Phase

- **NEW INV-A010**: Animation Timing Single Source of Truth - All phase timing defined in PhaseAnimator
- **INV-A009**: Scene Cleanup on Unmount - PhaseAnimator disposes properly

---

## Current Implementation Analysis

### Metamorphosis Particle Phases

The metamorphosis particles have 7 distinct phases:

```typescript
// Current phase definitions in metamorphosis-particles.ts
const PHASES = {
  BURST: { start: 0.0, end: 0.15 },
  EXPAND: { start: 0.15, end: 0.35 },
  HOVER: { start: 0.35, end: 0.50 },
  SPIRAL: { start: 0.50, end: 0.70 },
  CONVERGE: { start: 0.70, end: 0.85 },
  SETTLE: { start: 0.85, end: 0.95 },
  FADE: { start: 0.95, end: 1.0 },
};
```

Each phase updates `uProgress` and `uTime` uniforms to drive GPU animations.

---

## TDD Steps

### Step 6.1: Write Failing Tests for PhaseAnimator (RED)

Create `src/visualization/animation/phases/phase-animator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhaseAnimator } from './phase-animator';
import type { AnimationDefinition } from '../types';

const testDefinition: AnimationDefinition = {
  name: 'metamorphosis',
  duration: 2.0,
  phases: [
    { name: 'burst', start: 0.0, end: 0.15 },
    { name: 'expand', start: 0.15, end: 0.35 },
    { name: 'hover', start: 0.35, end: 0.50 },
    { name: 'spiral', start: 0.50, end: 0.70 },
    { name: 'converge', start: 0.70, end: 0.85 },
    { name: 'settle', start: 0.85, end: 0.95 },
    { name: 'fade', start: 0.95, end: 1.0 },
  ],
  tracks: [],
};

describe('PhaseAnimator', () => {
  let animator: PhaseAnimator;
  let onPhaseEnter: ReturnType<typeof vi.fn>;
  let onPhaseExit: ReturnType<typeof vi.fn>;
  let onPhaseProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPhaseEnter = vi.fn();
    onPhaseExit = vi.fn();
    onPhaseProgress = vi.fn();

    animator = new PhaseAnimator(testDefinition, {
      onPhaseEnter,
      onPhaseExit,
      onPhaseProgress,
    });
  });

  describe('start', () => {
    it('should start the animation', () => {
      animator.start();
      expect(animator.isAnimating()).toBe(true);
    });

    it('should emit phase enter for first phase', () => {
      animator.start();
      animator.update(0.01);

      expect(onPhaseEnter).toHaveBeenCalledWith('burst', expect.any(Number));
    });
  });

  describe('update', () => {
    it('should advance progress', () => {
      animator.start();
      animator.update(1.0); // Half of 2s duration

      expect(animator.progress).toBeCloseTo(0.5);
    });

    it('should emit phase progress', () => {
      animator.start();
      animator.update(0.1);

      expect(onPhaseProgress).toHaveBeenCalled();
    });

    it('should emit phase exit when leaving phase', () => {
      animator.start();
      animator.update(0.5); // Past burst phase (ends at 0.15)

      expect(onPhaseExit).toHaveBeenCalledWith('burst', expect.any(Number));
    });

    it('should emit phase enter for subsequent phases', () => {
      animator.start();
      animator.update(0.5); // Into expand phase

      expect(onPhaseEnter).toHaveBeenCalledWith('expand', expect.any(Number));
    });

    it('should complete when progress reaches 1', () => {
      animator.start();
      animator.update(3.0); // Past full duration

      expect(animator.isAnimating()).toBe(false);
      expect(animator.isComplete()).toBe(true);
    });
  });

  describe('getCurrentPhase', () => {
    it('should return null when not started', () => {
      expect(animator.getCurrentPhase()).toBeNull();
    });

    it('should return current phase name', () => {
      animator.start();
      animator.update(0.1); // Progress ~0.05, in burst

      expect(animator.getCurrentPhase()).toBe('burst');
    });

    it('should return correct phase as animation progresses', () => {
      animator.start();
      animator.update(1.0); // Progress 0.5, in spiral

      expect(animator.getCurrentPhase()).toBe('spiral');
    });
  });

  describe('getPhaseProgress', () => {
    it('should return progress within current phase', () => {
      animator.start();
      animator.update(0.15); // End of burst phase

      const phaseProgress = animator.getPhaseProgress('burst');
      expect(phaseProgress).toBeCloseTo(0.5, 1); // Mid-burst
    });

    it('should return null for inactive phase', () => {
      animator.start();
      animator.update(0.1);

      expect(animator.getPhaseProgress('fade')).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should stop the animation', () => {
      animator.start();
      animator.update(0.5);
      animator.cancel();

      expect(animator.isAnimating()).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      animator.start();
      animator.dispose();

      expect(animator.isAnimating()).toBe(false);
    });
  });
});
```

### Step 6.2: Implement PhaseAnimator (GREEN)

Create `src/visualization/animation/phases/phase-animator.ts`:

```typescript
/**
 * PhaseAnimator - Multi-phase animation coordinator
 *
 * Manages complex animations with multiple sequential/overlapping phases.
 * Designed for particle effects and other multi-stage GPU animations.
 */
import type { AnimationDefinition, PhaseDefinition } from '../types';

/**
 * Callbacks for phase events
 */
export interface PhaseAnimatorCallbacks {
  onPhaseEnter?: (phase: string, progress: number) => void;
  onPhaseExit?: (phase: string, progress: number) => void;
  onPhaseProgress?: (phase: string, progress: number, phaseProgress: number) => void;
  onComplete?: () => void;
}

/**
 * PhaseAnimator - Coordinates multi-phase animations
 */
export class PhaseAnimator {
  private readonly _definition: AnimationDefinition;
  private readonly _callbacks: PhaseAnimatorCallbacks;

  private _progress: number = 0;
  private _isAnimating: boolean = false;
  private _isComplete: boolean = false;
  private _activePhases: Set<string> = new Set();

  public constructor(definition: AnimationDefinition, callbacks: PhaseAnimatorCallbacks = {}) {
    this._definition = definition;
    this._callbacks = callbacks;
  }

  /**
   * Start the animation
   */
  public start(): void {
    this._progress = 0;
    this._isAnimating = true;
    this._isComplete = false;
    this._activePhases.clear();
  }

  /**
   * Update the animation
   * @param deltaTime - Time elapsed in seconds
   */
  public update(deltaTime: number): void {
    if (!this._isAnimating) {
      return;
    }

    const previousProgress = this._progress;
    this._progress = Math.min(1, this._progress + deltaTime / this._definition.duration);

    this._detectPhaseTransitions(previousProgress, this._progress);
    this._emitPhaseProgress();

    if (this._progress >= 1) {
      this._isAnimating = false;
      this._isComplete = true;
      this._callbacks.onComplete?.();
    }
  }

  /**
   * Get overall animation progress (0-1)
   */
  public get progress(): number {
    return this._progress;
  }

  /**
   * Whether animation is currently running
   */
  public isAnimating(): boolean {
    return this._isAnimating;
  }

  /**
   * Whether animation has completed
   */
  public isComplete(): boolean {
    return this._isComplete;
  }

  /**
   * Get the name of the current primary phase
   */
  public getCurrentPhase(): string | null {
    if (!this._isAnimating && !this._isComplete) {
      return null;
    }

    for (const phase of this._definition.phases) {
      if (this._isInPhase(phase, this._progress)) {
        return phase.name;
      }
    }

    return null;
  }

  /**
   * Get progress within a specific phase (0-1)
   */
  public getPhaseProgress(phaseName: string): number | null {
    const phase = this._definition.phases.find((p) => p.name === phaseName);
    if (!phase || !this._isInPhase(phase, this._progress)) {
      return null;
    }

    const phaseRange = phase.end - phase.start;
    if (phaseRange <= 0) return 1;

    return (this._progress - phase.start) / phaseRange;
  }

  /**
   * Get all currently active phases
   */
  public getActivePhases(): string[] {
    return Array.from(this._activePhases);
  }

  /**
   * Cancel the animation
   */
  public cancel(): void {
    this._isAnimating = false;
  }

  /**
   * Dispose and clean up
   */
  public dispose(): void {
    this._isAnimating = false;
    this._isComplete = false;
    this._activePhases.clear();
    this._progress = 0;
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
        this._callbacks.onPhaseEnter?.(phase.name, currProgress);
      } else if (wasActive && !isActive) {
        this._activePhases.delete(phase.name);
        this._callbacks.onPhaseExit?.(phase.name, currProgress);
      }
    }
  }

  private _emitPhaseProgress(): void {
    for (const phaseName of this._activePhases) {
      const phaseProgress = this.getPhaseProgress(phaseName);
      if (phaseProgress !== null) {
        this._callbacks.onPhaseProgress?.(phaseName, this._progress, phaseProgress);
      }
    }
  }
}
```

### Step 6.3: Create Metamorphosis Definition

Create `src/visualization/animation/phases/metamorphosis.ts`:

```typescript
/**
 * Metamorphosis Particle Phase Definitions
 *
 * Declarative definition for the ghost-to-biography particle burst effect.
 * Used with PhaseAnimator to drive GPU uniforms.
 */
import type { AnimationDefinition } from '../types';

/**
 * Metamorphosis particle animation phases
 *
 * Timeline:
 * - Burst (0-15%): Particles explode outward from node
 * - Expand (15-35%): Particles continue expanding, slow down
 * - Hover (35-50%): Particles drift randomly at max radius
 * - Spiral (50-70%): Particles begin spiral pattern toward target
 * - Converge (70-85%): Particles accelerate toward target
 * - Settle (85-95%): Particles settle into final position
 * - Fade (95-100%): Particles fade out
 */
export const metamorphosisDefinition: AnimationDefinition = {
  name: 'metamorphosis-particles',
  duration: 2.5, // Total particle animation duration

  phases: [
    { name: 'burst', start: 0.0, end: 0.15 },
    { name: 'expand', start: 0.15, end: 0.35 },
    { name: 'hover', start: 0.35, end: 0.50 },
    { name: 'spiral', start: 0.50, end: 0.70 },
    { name: 'converge', start: 0.70, end: 0.85 },
    { name: 'settle', start: 0.85, end: 0.95 },
    { name: 'fade', start: 0.95, end: 1.0 },
  ],

  tracks: [
    // Particle expansion radius
    {
      name: 'radius',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.15, value: 1.0 }, // Max at burst end
        { time: 0.35, value: 1.2 }, // Slight overshoot
        { time: 0.50, value: 1.0 }, // Settle to max
        { time: 0.85, value: 0.2 }, // Converge
        { time: 1.0, value: 0 }, // At target
      ],
    },

    // Particle opacity
    {
      name: 'opacity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.05, value: 1 }, // Quick fade in
        { time: 0.85, value: 1 }, // Hold
        { time: 1.0, value: 0 }, // Fade out
      ],
    },

    // Spiral intensity
    {
      name: 'spiralIntensity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.50, value: 0 }, // No spiral until hover ends
        { time: 0.60, value: 0.5 },
        { time: 0.70, value: 1.0 },
        { time: 0.85, value: 0.5 },
        { time: 1.0, value: 0 },
      ],
    },

    // Random drift intensity
    {
      name: 'driftIntensity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.15, value: 0.3 },
        { time: 0.50, value: 1.0 }, // Max during hover
        { time: 0.70, value: 0.3 },
        { time: 1.0, value: 0 },
      ],
    },
  ],
};

/**
 * Get metamorphosis phase by progress
 */
export function getMetamorphosisPhase(progress: number): string | null {
  for (const phase of metamorphosisDefinition.phases) {
    if (progress >= phase.start && progress < phase.end) {
      return phase.name;
    }
  }
  return null;
}
```

### Step 6.4: Create Index Exports

Create `src/visualization/animation/phases/index.ts`:

```typescript
/**
 * Phases Module
 *
 * Multi-phase animation coordination for complex effects.
 */
export { PhaseAnimator } from './phase-animator';
export type { PhaseAnimatorCallbacks } from './phase-animator';
export { metamorphosisDefinition, getMetamorphosisPhase } from './metamorphosis';
```

---

## Migration Plan

### Update MetamorphosisParticles

Replace inline phase logic with PhaseAnimator:

```typescript
// Before: Inline phase checks
if (progress < 0.15) {
  // Burst phase
} else if (progress < 0.35) {
  // Expand phase
}

// After: Use PhaseAnimator
const phaseAnimator = new PhaseAnimator(metamorphosisDefinition, {
  onPhaseProgress: (phase, progress, phaseProgress) => {
    uniforms.uProgress.value = progress;
    uniforms.uPhaseProgress.value = phaseProgress;
    uniforms.uCurrentPhase.value = getPhaseIndex(phase);
  },
});
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/phases/phase-animator.ts` | CREATE | PhaseAnimator class |
| `src/visualization/animation/phases/phase-animator.test.ts` | CREATE | Unit tests |
| `src/visualization/animation/phases/metamorphosis.ts` | CREATE | Metamorphosis definition |
| `src/visualization/animation/phases/index.ts` | CREATE | Module exports |

---

## Verification

```bash
# Run tests
npx vitest src/visualization/animation/phases/

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Visual Verification

1. Run `npm run dev:template -- --reset`
2. Select a ghost node
3. Trigger biography addition
4. Verify particle burst phases:
   - Particles explode outward
   - Particles drift at max radius
   - Particles spiral inward
   - Particles converge on target
   - Particles fade out

---

## Completion Criteria

- [ ] All 15 phase animator tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Phase enter/exit callbacks work
- [ ] Phase progress callbacks work
- [ ] Metamorphosis definition matches current behavior
- [ ] Visual output IDENTICAL to current particles
