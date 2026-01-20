# Phase 2: Shader Loops

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create a ShaderLoop system that wraps all continuous shader animations (ghost mandala, biography cloud, edge flow, background particles, event fireflies) and drives their `uTime` uniforms through the TimeProvider. This enables pause/resume and time scale to affect all shader animations uniformly.

---

## Invariants Enforced in This Phase

- **INV-A002**: Use `renderer.setAnimationLoop()` - ShaderLoop updates happen within existing render loop
- **NEW INV-A010**: Animation Timing Single Source of Truth - All uTime uniforms driven by TimeProvider

---

## Current Implementation Analysis

### Materials with `uTime` Uniforms

| Material | File | Animation |
|----------|------|-----------|
| Ghost Node Material | `ghost-node-material.ts` | Mandala rotation, glow pulse |
| Biography Cloud Material | `biography-cloud-material.ts` | Cloud turbulence |
| Edge Material | `edge-material.ts` | Flow along edges |
| Background Particles | `background-particles-material.ts` | Particle drift |
| Firefly Material | `firefly-material.ts` | Firefly movement |

### Current Pattern

Each material has its own `uTime` uniform updated in the render loop:

```typescript
// Current: Scattered updates
ghostMaterial.uniforms.uTime.value = clock.getElapsedTime();
edgeMaterial.uniforms.uTime.value = clock.getElapsedTime();
// ... repeated for each material
```

### Target Pattern

```typescript
// New: Centralized through ShaderLoopRegistry
shaderLoopRegistry.update(timeProvider.getElapsedTime());
// Registry updates all registered uTime uniforms
```

---

## TDD Steps

### Step 2.1: Write Failing Tests for ShaderLoop (RED)

Create `src/visualization/animation/loops/shader-loop.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShaderLoop } from './shader-loop';
import type { ShaderUniforms } from '../types';

describe('ShaderLoop', () => {
  let uniforms: ShaderUniforms;
  let shaderLoop: ShaderLoop;

  beforeEach(() => {
    uniforms = {
      uTime: { value: 0 },
    };
    shaderLoop = new ShaderLoop(uniforms);
  });

  describe('update', () => {
    it('should update uTime uniform with elapsed time', () => {
      shaderLoop.update(1.5);
      expect(uniforms.uTime.value).toBe(1.5);
    });

    it('should track elapsed time correctly across multiple updates', () => {
      shaderLoop.update(0.5);
      expect(uniforms.uTime.value).toBe(0.5);

      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });
  });

  describe('frequency multiplier', () => {
    it('should default to frequency multiplier 1.0', () => {
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });

    it('should apply frequency multiplier to time', () => {
      shaderLoop.setFrequencyMultiplier(2.0); // Double speed
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(2.0);
    });

    it('should allow frequency multiplier less than 1', () => {
      shaderLoop.setFrequencyMultiplier(0.5); // Half speed
      shaderLoop.update(2.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });
  });

  describe('phase offset', () => {
    it('should default to phase offset 0', () => {
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });

    it('should add phase offset to time', () => {
      shaderLoop.setPhaseOffset(0.5);
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.5);
    });

    it('should allow negative phase offset', () => {
      shaderLoop.setPhaseOffset(-0.5);
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(0.5);
    });
  });

  describe('combined modifiers', () => {
    it('should apply frequency multiplier before phase offset', () => {
      shaderLoop.setFrequencyMultiplier(2.0);
      shaderLoop.setPhaseOffset(0.5);
      shaderLoop.update(1.0);
      // (1.0 * 2.0) + 0.5 = 2.5
      expect(uniforms.uTime.value).toBe(2.5);
    });
  });

  describe('dispose', () => {
    it('should be disposable', () => {
      expect(() => shaderLoop.dispose()).not.toThrow();
    });
  });
});
```

### Step 2.2: Implement ShaderLoop (GREEN)

Create `src/visualization/animation/loops/shader-loop.ts`:

```typescript
/**
 * ShaderLoop - Wrapper for continuous shader animations
 *
 * Manages a shader's uTime uniform with optional frequency and phase modifiers.
 * Integrates with TimeProvider for centralized time control.
 */
import type { ShaderUniforms } from '../types';

/**
 * ShaderLoop - Drives a shader's uTime uniform
 */
export class ShaderLoop {
  private readonly _uniforms: ShaderUniforms;
  private _frequencyMultiplier: number = 1.0;
  private _phaseOffset: number = 0;

  /**
   * Create a new ShaderLoop for the given uniforms
   * @param uniforms - Shader uniforms containing uTime
   */
  public constructor(uniforms: ShaderUniforms) {
    this._uniforms = uniforms;
  }

  /**
   * Update the shader's uTime uniform
   * @param elapsedTime - Total elapsed time from TimeProvider
   */
  public update(elapsedTime: number): void {
    const modifiedTime = elapsedTime * this._frequencyMultiplier + this._phaseOffset;
    this._uniforms.uTime.value = modifiedTime;
  }

  /**
   * Set frequency multiplier (speed up or slow down the animation)
   * @param multiplier - 2.0 = double speed, 0.5 = half speed
   */
  public setFrequencyMultiplier(multiplier: number): void {
    this._frequencyMultiplier = multiplier;
  }

  /**
   * Get current frequency multiplier
   */
  public getFrequencyMultiplier(): number {
    return this._frequencyMultiplier;
  }

  /**
   * Set phase offset (shift the animation timing)
   * @param offset - Time offset in seconds
   */
  public setPhaseOffset(offset: number): void {
    this._phaseOffset = offset;
  }

  /**
   * Get current phase offset
   */
  public getPhaseOffset(): number {
    return this._phaseOffset;
  }

  /**
   * Dispose of the shader loop
   */
  public dispose(): void {
    // Currently no resources to clean up, but here for future use
  }
}
```

### Step 2.3: Write Failing Tests for ShaderLoopRegistry (RED)

Create `src/visualization/animation/loops/shader-loop-registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ShaderLoopRegistry } from './shader-loop-registry';
import type { ShaderUniforms } from '../types';

describe('ShaderLoopRegistry', () => {
  let registry: ShaderLoopRegistry;
  let uniforms1: ShaderUniforms;
  let uniforms2: ShaderUniforms;

  beforeEach(() => {
    registry = new ShaderLoopRegistry();
    uniforms1 = { uTime: { value: 0 } };
    uniforms2 = { uTime: { value: 0 } };
  });

  describe('register', () => {
    it('should register a shader loop', () => {
      const loop = registry.register('ghost', uniforms1);
      expect(loop).toBeDefined();
    });

    it('should return the same loop for the same name', () => {
      const loop1 = registry.register('ghost', uniforms1);
      const loop2 = registry.register('ghost', uniforms1);
      expect(loop1).toBe(loop2);
    });

    it('should register multiple loops', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);
      expect(registry.count).toBe(2);
    });
  });

  describe('update', () => {
    it('should update all registered loops', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);

      registry.update(1.5);

      expect(uniforms1.uTime.value).toBe(1.5);
      expect(uniforms2.uTime.value).toBe(1.5);
    });

    it('should do nothing when no loops registered', () => {
      expect(() => registry.update(1.0)).not.toThrow();
    });
  });

  describe('unregister', () => {
    it('should unregister a loop by name', () => {
      registry.register('ghost', uniforms1);
      registry.unregister('ghost');

      expect(registry.count).toBe(0);
    });

    it('should not throw for unknown name', () => {
      expect(() => registry.unregister('unknown')).not.toThrow();
    });

    it('should not update unregistered loops', () => {
      registry.register('ghost', uniforms1);
      registry.unregister('ghost');

      uniforms1.uTime.value = 0;
      registry.update(1.0);

      expect(uniforms1.uTime.value).toBe(0);
    });
  });

  describe('get', () => {
    it('should get a registered loop by name', () => {
      const registered = registry.register('ghost', uniforms1);
      const retrieved = registry.get('ghost');
      expect(retrieved).toBe(registered);
    });

    it('should return undefined for unknown name', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all registered loops', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);

      registry.clear();

      expect(registry.count).toBe(0);
    });
  });

  describe('count', () => {
    it('should return the number of registered loops', () => {
      expect(registry.count).toBe(0);

      registry.register('ghost', uniforms1);
      expect(registry.count).toBe(1);

      registry.register('cloud', uniforms2);
      expect(registry.count).toBe(2);
    });
  });
});
```

### Step 2.4: Implement ShaderLoopRegistry (GREEN)

Create `src/visualization/animation/loops/shader-loop-registry.ts`:

```typescript
/**
 * ShaderLoopRegistry - Manages all shader loop instances
 *
 * Provides centralized registration and updating of all shader animations.
 * Ensures all uTime uniforms are updated through TimeProvider.
 */
import { ShaderLoop } from './shader-loop';
import type { ShaderUniforms } from '../types';

/**
 * ShaderLoopRegistry - Central registry for shader loops
 */
export class ShaderLoopRegistry {
  private readonly _loops: Map<string, ShaderLoop> = new Map();

  /**
   * Register a shader loop
   * @param name - Unique identifier for the loop
   * @param uniforms - Shader uniforms containing uTime
   * @returns The registered ShaderLoop (or existing one if name already registered)
   */
  public register(name: string, uniforms: ShaderUniforms): ShaderLoop {
    const existing = this._loops.get(name);
    if (existing) {
      return existing;
    }

    const loop = new ShaderLoop(uniforms);
    this._loops.set(name, loop);
    return loop;
  }

  /**
   * Unregister a shader loop by name
   * @param name - The loop name to unregister
   */
  public unregister(name: string): void {
    const loop = this._loops.get(name);
    if (loop) {
      loop.dispose();
      this._loops.delete(name);
    }
  }

  /**
   * Get a registered loop by name
   * @param name - The loop name
   * @returns The ShaderLoop or undefined if not found
   */
  public get(name: string): ShaderLoop | undefined {
    return this._loops.get(name);
  }

  /**
   * Update all registered shader loops
   * @param elapsedTime - Total elapsed time from TimeProvider
   */
  public update(elapsedTime: number): void {
    for (const loop of this._loops.values()) {
      loop.update(elapsedTime);
    }
  }

  /**
   * Clear all registered loops
   */
  public clear(): void {
    for (const loop of this._loops.values()) {
      loop.dispose();
    }
    this._loops.clear();
  }

  /**
   * Get the number of registered loops
   */
  public get count(): number {
    return this._loops.size;
  }

  /**
   * Get all registered loop names
   */
  public get names(): string[] {
    return Array.from(this._loops.keys());
  }
}
```

### Step 2.5: Create Index Exports

Create `src/visualization/animation/loops/index.ts`:

```typescript
/**
 * Shader Loop Module
 *
 * Manages continuous shader animations through TimeProvider.
 */
export { ShaderLoop } from './shader-loop';
export { ShaderLoopRegistry } from './shader-loop-registry';
```

---

## Migration Plan

### Step 1: Register Existing Shaders

When creating materials, register their uniforms with the registry:

```typescript
// In constellation-canvas.tsx or material factory
const ghostMaterial = createGhostNodeMaterial();
shaderLoopRegistry.register('ghost-mandala', ghostMaterial.uniforms);

const cloudMaterial = createBiographyCloudMaterial();
shaderLoopRegistry.register('biography-cloud', cloudMaterial.uniforms);

// ... etc for each material
```

### Step 2: Update Render Loop

Replace scattered `uTime` updates with single registry update:

```typescript
// Before: Scattered updates
ghostMaterial.uniforms.uTime.value = clock.getElapsedTime();
edgeMaterial.uniforms.uTime.value = clock.getElapsedTime();

// After: Single registry update
shaderLoopRegistry.update(timeProvider.getElapsedTime());
```

### Step 3: Cleanup on Unmount

Unregister loops when materials are disposed:

```typescript
// In cleanup
shaderLoopRegistry.unregister('ghost-mandala');
shaderLoopRegistry.clear(); // Or clear all
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/loops/shader-loop.ts` | CREATE | ShaderLoop class |
| `src/visualization/animation/loops/shader-loop.test.ts` | CREATE | ShaderLoop unit tests |
| `src/visualization/animation/loops/shader-loop-registry.ts` | CREATE | Registry class |
| `src/visualization/animation/loops/shader-loop-registry.test.ts` | CREATE | Registry unit tests |
| `src/visualization/animation/loops/index.ts` | CREATE | Module exports |

---

## Verification

```bash
# Run specific tests
npx vitest src/visualization/animation/loops/

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Visual Verification

1. Run `npm run dev:template -- --reset`
2. Observe all shader animations (mandala, cloud, particles, etc.)
3. Verify they animate at the same rate as before
4. Verify pause/resume affects all shader animations (after Phase 7)

---

## Completion Criteria

- [x] All 12 shader loop tests pass (26 tests actually)
- [x] Type check passes
- [x] Lint passes
- [x] No `any` types introduced
- [x] JSDoc comments on public APIs
- [x] ShaderLoop updates uTime correctly
- [x] ShaderLoop applies frequency multiplier
- [x] ShaderLoop applies phase offset
- [x] ShaderLoopRegistry manages multiple loops
- [ ] Visual animations identical to before (verified in Phase 7)
