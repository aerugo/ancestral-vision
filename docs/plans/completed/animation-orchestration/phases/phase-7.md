# Phase 7: Integration

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create the central AnimationSystem that coordinates all animation subsystems (ShaderLoops, Transitions, Propagation, Reactive, Phases). Integrate with constellation-canvas and ConstellationManager to replace scattered timing logic with unified event-driven coordination.

---

## Invariants Enforced in This Phase

- **NEW INV-A010**: Animation Timing Single Source of Truth - AnimationSystem is the single entry point
- **INV-A002**: Use `renderer.setAnimationLoop()` - AnimationSystem.update() called from loop
- **INV-A009**: Scene Cleanup on Unmount - AnimationSystem.dispose() on cleanup

---

## TDD Steps

### Step 7.1: Write Failing Tests for AnimationSystem (RED)

Create `src/visualization/animation/core/animation-system.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationSystem } from './animation-system';
import type { ShaderUniforms } from '../types';

describe('AnimationSystem', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    system = new AnimationSystem();
  });

  describe('TimeProvider integration', () => {
    it('should provide elapsed time', () => {
      system.update(1.0);
      expect(system.getElapsedTime()).toBeCloseTo(1.0);
    });

    it('should provide delta time', () => {
      system.update(0.016);
      expect(system.getDeltaTime()).toBeCloseTo(0.016);
    });
  });

  describe('pause/resume', () => {
    it('should pause all animations', () => {
      system.update(1.0);
      const elapsed = system.getElapsedTime();

      system.pause();
      system.update(1.0);

      expect(system.getElapsedTime()).toBe(elapsed);
      expect(system.isPaused()).toBe(true);
    });

    it('should resume all animations', () => {
      system.pause();
      system.resume();
      system.update(1.0);

      expect(system.getElapsedTime()).toBeCloseTo(1.0);
      expect(system.isPaused()).toBe(false);
    });
  });

  describe('time scale', () => {
    it('should apply time scale to all animations', () => {
      system.setTimeScale(2.0);
      system.update(1.0);

      expect(system.getElapsedTime()).toBeCloseTo(2.0);
    });

    it('should get current time scale', () => {
      system.setTimeScale(0.5);
      expect(system.getTimeScale()).toBe(0.5);
    });
  });

  describe('ShaderLoop registration', () => {
    it('should register and update shader loops', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.update(1.5);

      expect(uniforms.uTime.value).toBe(1.5);
    });

    it('should unregister shader loops', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.unregisterShaderLoop('test');
      uniforms.uTime.value = 0;
      system.update(1.0);

      expect(uniforms.uTime.value).toBe(0);
    });
  });

  describe('isAnyAnimating', () => {
    it('should return false when no animations', () => {
      expect(system.isAnyAnimating()).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const info = system.getDebugInfo();

      expect(info).toHaveProperty('elapsedTime');
      expect(info).toHaveProperty('isPaused');
      expect(info).toHaveProperty('timeScale');
      expect(info).toHaveProperty('shaderLoopCount');
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.dispose();

      expect(system.getDebugInfo().shaderLoopCount).toBe(0);
    });
  });
});
```

### Step 7.2: Implement AnimationSystem (GREEN)

Create `src/visualization/animation/core/animation-system.ts`:

```typescript
/**
 * AnimationSystem - Central animation coordinator
 *
 * Provides a single entry point for all animation timing and control.
 * Coordinates TimeProvider, ShaderLoops, Transitions, Propagation, etc.
 */
import { TimeProvider } from './time-provider';
import { ShaderLoopRegistry } from '../loops/shader-loop-registry';
import type { ShaderUniforms } from '../types';

/**
 * Debug information for animation system
 */
export interface AnimationDebugInfo {
  elapsedTime: number;
  deltaTime: number;
  isPaused: boolean;
  timeScale: number;
  shaderLoopCount: number;
  shaderLoopNames: string[];
}

/**
 * AnimationSystem - Central coordinator for all animations
 */
export class AnimationSystem {
  private readonly _timeProvider: TimeProvider;
  private readonly _shaderLoops: ShaderLoopRegistry;

  public constructor() {
    this._timeProvider = new TimeProvider();
    this._shaderLoops = new ShaderLoopRegistry();

    // Set default max delta time to prevent catch-up after sleep
    this._timeProvider.setMaxDeltaTime(0.1); // 100ms max
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Update all animations
   * @param rawDeltaTime - Raw delta time in seconds from render loop
   */
  public update(rawDeltaTime: number): void {
    // Update time provider
    this._timeProvider.update(rawDeltaTime);

    // Update shader loops with elapsed time
    this._shaderLoops.update(this._timeProvider.getElapsedTime());
  }

  /**
   * Dispose all animation resources
   */
  public dispose(): void {
    this._shaderLoops.clear();
    this._timeProvider.reset();
  }

  // ============================================================================
  // Time Control
  // ============================================================================

  /**
   * Pause all animations
   */
  public pause(): void {
    this._timeProvider.pause();
  }

  /**
   * Resume all animations
   */
  public resume(): void {
    this._timeProvider.resume();
  }

  /**
   * Check if animations are paused
   */
  public isPaused(): boolean {
    return this._timeProvider.isPaused();
  }

  /**
   * Set global time scale
   * @param scale - 0.5 = half speed, 2.0 = double speed
   */
  public setTimeScale(scale: number): void {
    this._timeProvider.setTimeScale(scale);
  }

  /**
   * Get current time scale
   */
  public getTimeScale(): number {
    return this._timeProvider.getTimeScale();
  }

  /**
   * Get total elapsed time
   */
  public getElapsedTime(): number {
    return this._timeProvider.getElapsedTime();
  }

  /**
   * Get delta time from last update
   */
  public getDeltaTime(): number {
    return this._timeProvider.getDeltaTime();
  }

  // ============================================================================
  // Shader Loop Registration
  // ============================================================================

  /**
   * Register a shader's uTime uniform for automatic updates
   * @param name - Unique identifier for the loop
   * @param uniforms - Shader uniforms containing uTime
   */
  public registerShaderLoop(name: string, uniforms: ShaderUniforms): void {
    this._shaderLoops.register(name, uniforms);
  }

  /**
   * Unregister a shader loop
   * @param name - The loop name to unregister
   */
  public unregisterShaderLoop(name: string): void {
    this._shaderLoops.unregister(name);
  }

  // ============================================================================
  // Query
  // ============================================================================

  /**
   * Check if any animation is currently active
   */
  public isAnyAnimating(): boolean {
    // Currently only shader loops are tracked
    // Add checks for transitions, propagation, etc. when integrated
    return false;
  }

  /**
   * Get debug information about the animation system
   */
  public getDebugInfo(): AnimationDebugInfo {
    return {
      elapsedTime: this._timeProvider.getElapsedTime(),
      deltaTime: this._timeProvider.getDeltaTime(),
      isPaused: this._timeProvider.isPaused(),
      timeScale: this._timeProvider.getTimeScale(),
      shaderLoopCount: this._shaderLoops.count,
      shaderLoopNames: this._shaderLoops.names,
    };
  }
}
```

### Step 7.3: Create Animation Inspector

Create `src/visualization/animation/debug/animation-inspector.ts`:

```typescript
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
      };
      console.log(`[AnimationInspector] Exposed as window.${name}`);
    }
  }
}
```

### Step 7.4: Create Public Exports

Create `src/visualization/animation/index.ts`:

```typescript
/**
 * Animation System
 *
 * Unified animation management for the constellation visualization.
 * Provides centralized control for all animation types.
 */

// Types
export type {
  AnimationDefinition,
  AnimationEvent,
  AnimationEventHandler,
  PhaseDefinition,
  TrackDefinition,
  Keyframe,
  EasingName,
  Unsubscribe,
  ShaderUniforms,
  ReactiveBindingConfig,
} from './types';

// Core
export { AnimationSystem } from './core/animation-system';
export type { AnimationDebugInfo } from './core/animation-system';
export { TimeProvider } from './core/time-provider';
export { AnimationEventBus } from './core/event-bus';
export { easings, getEasing, type EasingFunction } from './core/easing';

// Shader Loops
export { ShaderLoop, ShaderLoopRegistry } from './loops';

// Transitions
export { AnimationTimeline, AnimationTrack, Transition } from './transitions';
export type { PhaseEnterCallback, PhaseExitCallback } from './transitions';

// Propagation
export { PropagationAnimator } from './propagation';
export type { PropagationConfig } from './propagation';

// Reactive
export { ReactiveBinding, InstanceAttributeManager } from './reactive';

// Phases
export { PhaseAnimator } from './phases';
export type { PhaseAnimatorCallbacks } from './phases';
export { metamorphosisDefinition, getMetamorphosisPhase } from './phases';

// Definitions
export { biographyTransitionDefinition } from './definitions';

// Debug
export { AnimationInspector } from './debug/animation-inspector';
```

### Step 7.5: Integration with constellation-canvas

Modify `src/components/constellation-canvas.tsx` to use AnimationSystem:

```typescript
// Add imports
import { AnimationSystem, AnimationInspector } from '@/visualization/animation';

// Add refs
const animationSystemRef = useRef<AnimationSystem | null>(null);
const animationInspectorRef = useRef<AnimationInspector | null>(null);

// In initScene
animationSystemRef.current = new AnimationSystem();
animationInspectorRef.current = new AnimationInspector(animationSystemRef.current);

// Development only: expose to console
if (process.env.NODE_ENV === 'development') {
  animationInspectorRef.current.exposeGlobally();
}

// Register shader loops when materials are created
animationSystemRef.current.registerShaderLoop('ghost-mandala', ghostMaterial.uniforms);
animationSystemRef.current.registerShaderLoop('biography-cloud', cloudMaterial.uniforms);
// ... etc

// In animation loop (replace clock.getElapsedTime())
animationSystemRef.current.update(deltaTime);
// Shader loops are automatically updated

// In cleanup
animationSystemRef.current?.dispose();
```

---

## Migration Checklist

### Replace Timing Sources

- [ ] Replace `clock.getElapsedTime()` with `animationSystem.getElapsedTime()`
- [ ] Replace manual `uTime` updates with `registerShaderLoop()`
- [ ] Replace BiographyTransitionAnimator with Transition
- [ ] Wrap PathPulseAnimator in PropagationAnimator

### Add Controls

- [ ] Add pause/resume keyboard shortcut (P key)
- [ ] Add time scale controls (development only)
- [ ] Add debug inspector (development only)

### Verify Visual Output

- [ ] Ghost mandala rotates correctly
- [ ] Biography cloud animates correctly
- [ ] Edge flow animates correctly
- [ ] Background particles drift correctly
- [ ] Event fireflies animate correctly
- [ ] Camera zoom works correctly
- [ ] Biography transition works correctly
- [ ] Pulse propagation works correctly
- [ ] Selection glow works correctly
- [ ] Metamorphosis particles work correctly

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/core/animation-system.ts` | CREATE | Central coordinator |
| `src/visualization/animation/core/animation-system.test.ts` | CREATE | Unit tests |
| `src/visualization/animation/debug/animation-inspector.ts` | CREATE | Debug tools |
| `src/visualization/animation/index.ts` | CREATE | Public exports |
| `src/components/constellation-canvas.tsx` | MODIFY | Integration |

---

## Verification

```bash
# Run all animation tests
npx vitest src/visualization/animation/

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

### Manual Testing

1. Run `npm run dev:template -- --reset`
2. Verify all animations work as before
3. Open browser console, run `window.__animationSystem.pause()`
4. Verify all animations stop
5. Run `window.__animationSystem.resume()`
6. Verify all animations resume
7. Run `window.__animationSystem.setTimeScale(0.5)`
8. Verify animations run at half speed
9. Verify no console errors

---

## Completion Criteria

- [ ] All 10 integration tests pass
- [ ] All existing tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Single entry point for pause/resume
- [ ] Global time scale works
- [ ] Debug API exposes animation state
- [ ] No timing logic in constellation-canvas (only event handlers)
- [ ] Visual output IDENTICAL to before integration
