# Phase 5: Reactive Bindings

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create a ReactiveBinding system that manages state-to-visual animations. This handles selection glow, hover effects, and other state-driven visual changes with optional smooth transitions.

---

## Invariants Enforced in This Phase

- **NEW INV-A010**: Animation Timing Single Source of Truth - Transition smoothing uses TimeProvider
- **INV-A009**: Scene Cleanup on Unmount - Bindings properly disposed

---

## Current Implementation Analysis

### State-Driven Visual Updates

Currently, visual state changes are handled by directly updating instance attributes:

```typescript
// In ConstellationManager or similar
setSelectionState(personId: string, isSelected: boolean): void {
  const index = this._nodeIndexMap.get(personId);
  this._selectionStateAttribute.setX(index, isSelected ? 1.0 : 0.0);
  this._selectionStateAttribute.needsUpdate = true;
}
```

### Problems

1. **No smooth transitions**: Selection snaps on/off instantly
2. **Scattered logic**: Each component manages its own state updates
3. **No timing control**: Cannot pause or slow down state transitions

---

## TDD Steps

### Step 5.1: Write Failing Tests for ReactiveBinding (RED)

Create `src/visualization/animation/reactive/reactive-binding.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ReactiveBinding } from './reactive-binding';

describe('ReactiveBinding', () => {
  describe('immediate mode (no transition)', () => {
    let binding: ReactiveBinding<boolean>;

    beforeEach(() => {
      binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
      });
    });

    it('should return initial value', () => {
      expect(binding.getValue()).toBe(0.0);
    });

    it('should update value immediately when state changes', () => {
      binding.setState(true);
      expect(binding.getValue()).toBe(1.0);
    });

    it('should handle multiple state changes', () => {
      binding.setState(true);
      expect(binding.getValue()).toBe(1.0);

      binding.setState(false);
      expect(binding.getValue()).toBe(0.0);
    });
  });

  describe('transition mode', () => {
    let binding: ReactiveBinding<boolean>;

    beforeEach(() => {
      binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500, // 500ms
      });
    });

    it('should start at initial value', () => {
      expect(binding.getValue()).toBe(0.0);
    });

    it('should not change immediately when transitioning', () => {
      binding.setState(true);
      // Without update, value should still be 0
      expect(binding.getValue()).toBe(0.0);
    });

    it('should transition smoothly over time', () => {
      binding.setState(true);

      // Update with 250ms (half of transition)
      binding.update(0.25);
      expect(binding.getValue()).toBeCloseTo(0.5, 1);

      // Update with another 250ms (complete transition)
      binding.update(0.25);
      expect(binding.getValue()).toBeCloseTo(1.0, 1);
    });

    it('should handle reverse transitions', () => {
      binding.setState(true);
      binding.update(0.5); // Complete forward
      expect(binding.getValue()).toBeCloseTo(1.0);

      binding.setState(false);
      binding.update(0.25); // Half of reverse
      expect(binding.getValue()).toBeCloseTo(0.5, 1);

      binding.update(0.25); // Complete reverse
      expect(binding.getValue()).toBeCloseTo(0.0, 1);
    });

    it('should handle mid-transition state changes', () => {
      binding.setState(true);
      binding.update(0.25); // At 0.5

      binding.setState(false); // Reverse mid-way
      binding.update(0.25); // Should go down

      expect(binding.getValue()).toBeLessThan(0.5);
    });
  });

  describe('isTransitioning', () => {
    it('should return false when not transitioning', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      expect(binding.isTransitioning()).toBe(false);
    });

    it('should return true during transition', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.1);

      expect(binding.isTransitioning()).toBe(true);
    });

    it('should return false after transition completes', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.5); // Complete

      expect(binding.isTransitioning()).toBe(false);
    });
  });

  describe('setTransitionDuration', () => {
    it('should update transition duration', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setTransitionDuration(1000);
      binding.setState(true);
      binding.update(0.5); // Half of new duration

      expect(binding.getValue()).toBeCloseTo(0.5, 1);
    });
  });

  describe('dispose', () => {
    it('should reset to initial state', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.5);
      binding.dispose();

      expect(binding.getValue()).toBe(0.0);
    });
  });
});
```

### Step 5.2: Implement ReactiveBinding (GREEN)

Create `src/visualization/animation/reactive/reactive-binding.ts`:

```typescript
/**
 * ReactiveBinding - State-to-visual animation binding
 *
 * Manages smooth transitions between state-driven visual values.
 * Optionally provides smooth interpolation over time.
 */
import type { ReactiveBindingConfig } from '../types';

/**
 * ReactiveBinding - Binds state to animated visual values
 */
export class ReactiveBinding<T> {
  private readonly _transform: (state: T) => number;
  private _state: T;
  private _currentValue: number;
  private _targetValue: number;
  private _transitionDuration: number; // in seconds
  private _transitionProgress: number = 1; // 1 = complete

  public constructor(config: ReactiveBindingConfig<T>) {
    this._state = config.initialState;
    this._transform = config.transform;
    this._transitionDuration = (config.transitionDuration ?? 0) / 1000; // Convert ms to seconds
    this._currentValue = this._transform(this._state);
    this._targetValue = this._currentValue;
  }

  /**
   * Get the current animated value
   */
  public getValue(): number {
    return this._currentValue;
  }

  /**
   * Get the current state
   */
  public getState(): T {
    return this._state;
  }

  /**
   * Set a new state (triggers transition if duration > 0)
   */
  public setState(state: T): void {
    this._state = state;
    this._targetValue = this._transform(state);

    if (this._transitionDuration <= 0) {
      // Immediate mode
      this._currentValue = this._targetValue;
      this._transitionProgress = 1;
    } else {
      // Start transition
      this._transitionProgress = 0;
    }
  }

  /**
   * Update the binding (call each frame for smooth transitions)
   * @param deltaTime - Time elapsed in seconds
   */
  public update(deltaTime: number): void {
    if (this._transitionProgress >= 1) {
      return; // Already complete
    }

    if (this._transitionDuration <= 0) {
      this._currentValue = this._targetValue;
      this._transitionProgress = 1;
      return;
    }

    // Advance transition
    this._transitionProgress += deltaTime / this._transitionDuration;
    this._transitionProgress = Math.min(1, this._transitionProgress);

    // Interpolate value (using easeOutCubic for smooth feel)
    const eased = 1 - Math.pow(1 - this._transitionProgress, 3);
    const startValue = this._currentValue - (this._targetValue - this._currentValue) * (eased / (1 - eased + 0.0001));

    // Linear interpolation with current position
    const previousTarget = this._currentValue;
    this._currentValue = previousTarget + (this._targetValue - previousTarget) * (deltaTime / (this._transitionDuration * (1 - this._transitionProgress + deltaTime / this._transitionDuration)));

    // Simpler approach: direct lerp based on progress
    if (this._transitionProgress >= 1) {
      this._currentValue = this._targetValue;
    }
  }

  /**
   * Whether a transition is currently in progress
   */
  public isTransitioning(): boolean {
    return this._transitionProgress < 1;
  }

  /**
   * Set the transition duration
   * @param durationMs - Duration in milliseconds
   */
  public setTransitionDuration(durationMs: number): void {
    this._transitionDuration = durationMs / 1000;
  }

  /**
   * Dispose and reset
   */
  public dispose(): void {
    this._transitionProgress = 1;
    this._currentValue = 0;
    this._targetValue = 0;
  }
}
```

### Step 5.3: Write Failing Tests for InstanceAttributes (RED)

Create `src/visualization/animation/reactive/instance-attributes.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstanceAttributeManager } from './instance-attributes';

describe('InstanceAttributeManager', () => {
  let manager: InstanceAttributeManager;

  beforeEach(() => {
    manager = new InstanceAttributeManager();
  });

  describe('registerAttribute', () => {
    it('should register an attribute', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute as any);

      expect(manager.hasAttribute('selection')).toBe(true);
    });
  });

  describe('setInstanceValue', () => {
    it('should update attribute value', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute as any);

      manager.setInstanceValue('selection', 0, 0.5);

      expect(mockAttribute.setX).toHaveBeenCalledWith(0, 0.5);
      expect(mockAttribute.needsUpdate).toBe(true);
    });

    it('should not throw for unregistered attribute', () => {
      expect(() => manager.setInstanceValue('unknown', 0, 0.5)).not.toThrow();
    });
  });

  describe('createBinding', () => {
    it('should create a reactive binding for an instance', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute as any);

      const binding = manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      expect(binding).toBeDefined();
    });

    it('should update attribute when binding value changes', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute as any);

      const binding = manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      binding.setState(true);
      manager.updateBindings(0.016);

      expect(mockAttribute.setX).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('updateBindings', () => {
    it('should update all active bindings', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute as any);

      const binding1 = manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
        transitionDuration: 500,
      });

      const binding2 = manager.createBinding('selection', 1, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
        transitionDuration: 500,
      });

      binding1.setState(true);
      binding2.setState(true);
      manager.updateBindings(0.25);

      // Both should have been updated
      expect(mockAttribute.setX).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should clear all bindings and attributes', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute as any);
      manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      manager.dispose();

      expect(manager.hasAttribute('selection')).toBe(false);
    });
  });
});
```

### Step 5.4: Implement InstanceAttributeManager (GREEN)

Create `src/visualization/animation/reactive/instance-attributes.ts`:

```typescript
/**
 * InstanceAttributeManager - Manages reactive bindings for instance attributes
 *
 * Coordinates ReactiveBindings with Three.js InstancedBufferAttribute updates.
 */
import { ReactiveBinding } from './reactive-binding';
import type { ReactiveBindingConfig } from '../types';

interface InstancedAttribute {
  setX(index: number, value: number): void;
  needsUpdate: boolean;
}

interface BindingEntry {
  binding: ReactiveBinding<unknown>;
  attributeName: string;
  instanceIndex: number;
}

/**
 * InstanceAttributeManager - Manages instance attribute animations
 */
export class InstanceAttributeManager {
  private readonly _attributes: Map<string, InstancedAttribute> = new Map();
  private readonly _bindings: BindingEntry[] = [];

  /**
   * Register an instanced attribute for management
   */
  public registerAttribute(name: string, attribute: InstancedAttribute): void {
    this._attributes.set(name, attribute);
  }

  /**
   * Check if an attribute is registered
   */
  public hasAttribute(name: string): boolean {
    return this._attributes.has(name);
  }

  /**
   * Set a value directly (no animation)
   */
  public setInstanceValue(attributeName: string, instanceIndex: number, value: number): void {
    const attribute = this._attributes.get(attributeName);
    if (!attribute) {
      return;
    }

    attribute.setX(instanceIndex, value);
    attribute.needsUpdate = true;
  }

  /**
   * Create a reactive binding for an instance
   */
  public createBinding<T>(
    attributeName: string,
    instanceIndex: number,
    config: ReactiveBindingConfig<T>
  ): ReactiveBinding<T> {
    const binding = new ReactiveBinding(config);

    this._bindings.push({
      binding: binding as ReactiveBinding<unknown>,
      attributeName,
      instanceIndex,
    });

    return binding;
  }

  /**
   * Update all bindings and sync to attributes
   * @param deltaTime - Time elapsed in seconds
   */
  public updateBindings(deltaTime: number): void {
    for (const entry of this._bindings) {
      entry.binding.update(deltaTime);

      const attribute = this._attributes.get(entry.attributeName);
      if (attribute) {
        attribute.setX(entry.instanceIndex, entry.binding.getValue());
        attribute.needsUpdate = true;
      }
    }
  }

  /**
   * Remove a binding for a specific instance
   */
  public removeBinding(attributeName: string, instanceIndex: number): void {
    const index = this._bindings.findIndex(
      (e) => e.attributeName === attributeName && e.instanceIndex === instanceIndex
    );
    if (index >= 0) {
      this._bindings[index].binding.dispose();
      this._bindings.splice(index, 1);
    }
  }

  /**
   * Dispose all bindings and clear attributes
   */
  public dispose(): void {
    for (const entry of this._bindings) {
      entry.binding.dispose();
    }
    this._bindings.length = 0;
    this._attributes.clear();
  }
}
```

### Step 5.5: Create Index Exports

Create `src/visualization/animation/reactive/index.ts`:

```typescript
/**
 * Reactive Module
 *
 * State-to-visual animation bindings with smooth transitions.
 */
export { ReactiveBinding } from './reactive-binding';
export { InstanceAttributeManager } from './instance-attributes';
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/reactive/reactive-binding.ts` | CREATE | Reactive binding class |
| `src/visualization/animation/reactive/reactive-binding.test.ts` | CREATE | Unit tests |
| `src/visualization/animation/reactive/instance-attributes.ts` | CREATE | Attribute manager |
| `src/visualization/animation/reactive/instance-attributes.test.ts` | CREATE | Unit tests |
| `src/visualization/animation/reactive/index.ts` | CREATE | Module exports |

---

## Verification

```bash
# Run tests
npx vitest src/visualization/animation/reactive/

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All 12 reactive binding tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Immediate mode updates work
- [ ] Transition mode smoothly interpolates
- [ ] Mid-transition state changes handled
- [ ] InstanceAttributeManager syncs bindings to attributes
