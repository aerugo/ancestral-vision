# Phase 4: Propagation

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Wrap the existing PathPulseAnimator in a PropagationAnimator that integrates with the AnimationSystem. This enables graph-based animations (pulse along path, breathing nodes) to be controlled through the unified time system while maintaining identical visual output.

---

## Invariants Enforced in This Phase

- **NEW INV-A010**: Animation Timing Single Source of Truth - Propagation uses TimeProvider's delta time
- **INV-A009**: Scene Cleanup on Unmount - PropagationAnimator disposes properly

---

## Current Implementation Analysis

### PathPulseAnimator

The existing `PathPulseAnimator` handles:
- Graph traversal from source to target node
- Edge intensity based on pulse position
- Node intensity (visited, lit, breathing)
- Breathing animation after pulse reaches target

### Key Methods to Preserve

```typescript
// From path-pulse-animator.ts
startPulse(fromNode: string, toNode: string): void
update(deltaTime: number): void
getNodeIntensity(nodeId: string): number
getEdgeIntensity(sourceId: string, targetId: string): number
isAnimating(): boolean
isBreathing(): boolean
```

---

## TDD Steps

### Step 4.1: Write Failing Tests for PropagationAnimator (RED)

Create `src/visualization/animation/propagation/propagation-animator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropagationAnimator } from './propagation-animator';

// Mock FamilyGraph
const mockGraph = {
  findPath: vi.fn().mockReturnValue(['a', 'b', 'c']),
  getEdge: vi.fn().mockReturnValue({ source: 'a', target: 'b' }),
};

describe('PropagationAnimator', () => {
  let animator: PropagationAnimator;

  beforeEach(() => {
    vi.clearAllMocks();
    animator = new PropagationAnimator(mockGraph as any);
  });

  describe('startPulse', () => {
    it('should start a pulse animation', () => {
      animator.startPulse('a', 'c');
      expect(animator.isAnimating()).toBe(true);
    });

    it('should find path using graph', () => {
      animator.startPulse('a', 'c');
      expect(mockGraph.findPath).toHaveBeenCalledWith('a', 'c');
    });

    it('should not animate if no path found', () => {
      mockGraph.findPath.mockReturnValueOnce([]);
      animator.startPulse('a', 'z');
      expect(animator.isAnimating()).toBe(false);
    });
  });

  describe('update', () => {
    it('should advance the pulse', () => {
      animator.startPulse('a', 'c');
      const initialIntensity = animator.getNodeIntensity('a');

      animator.update(0.5);

      // Intensity should change after update
      expect(animator.isAnimating()).toBe(true);
    });

    it('should complete after reaching end', () => {
      animator.startPulse('a', 'c');

      // Update past the expected duration
      animator.update(10.0);

      expect(animator.isBreathing()).toBe(true);
    });

    it('should do nothing when not animating', () => {
      expect(() => animator.update(0.1)).not.toThrow();
    });
  });

  describe('getNodeIntensity', () => {
    it('should return 0 for unvisited nodes', () => {
      expect(animator.getNodeIntensity('unknown')).toBe(0);
    });

    it('should return intensity for nodes in path', () => {
      animator.startPulse('a', 'c');
      animator.update(0.1);

      // First node should have some intensity
      const intensity = animator.getNodeIntensity('a');
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });
  });

  describe('getEdgeIntensity', () => {
    it('should return 0 for edges not in path', () => {
      expect(animator.getEdgeIntensity('x', 'y')).toBe(0);
    });

    it('should return intensity for edges in path', () => {
      animator.startPulse('a', 'c');
      animator.update(0.5);

      const intensity = animator.getEdgeIntensity('a', 'b');
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });
  });

  describe('getAllNodeIntensities', () => {
    it('should return empty map when not animating', () => {
      const intensities = animator.getAllNodeIntensities();
      expect(intensities.size).toBe(0);
    });

    it('should return all node intensities during animation', () => {
      animator.startPulse('a', 'c');
      animator.update(0.5);

      const intensities = animator.getAllNodeIntensities();
      expect(intensities.size).toBeGreaterThan(0);
    });
  });

  describe('isBreathing', () => {
    it('should not be breathing initially', () => {
      expect(animator.isBreathing()).toBe(false);
    });

    it('should be breathing after pulse completes', () => {
      animator.startPulse('a', 'c');
      animator.update(10.0); // Complete the pulse

      expect(animator.isBreathing()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should stop animation and clean up', () => {
      animator.startPulse('a', 'c');
      animator.dispose();

      expect(animator.isAnimating()).toBe(false);
      expect(animator.isBreathing()).toBe(false);
    });
  });
});
```

### Step 4.2: Implement PropagationAnimator (GREEN)

Create `src/visualization/animation/propagation/propagation-animator.ts`:

```typescript
/**
 * PropagationAnimator - Graph-based animation wrapper
 *
 * Wraps the existing PathPulseAnimator to integrate with AnimationSystem.
 * Maintains identical behavior while using centralized time management.
 */
import type { FamilyGraph } from '@/visualization/graph/family-graph';

/**
 * Configuration for propagation animation
 */
export interface PropagationConfig {
  /** Speed of pulse propagation (edges per second) */
  pulseSpeed?: number;
  /** Duration of node glow after pulse passes */
  glowDuration?: number;
  /** Speed of breathing animation */
  breathingSpeed?: number;
}

const DEFAULT_CONFIG: Required<PropagationConfig> = {
  pulseSpeed: 2.0,
  glowDuration: 0.5,
  breathingSpeed: 1.0,
};

/**
 * PropagationAnimator - Manages graph-based pulse animations
 */
export class PropagationAnimator {
  private readonly _graph: FamilyGraph;
  private readonly _config: Required<PropagationConfig>;

  private _path: string[] = [];
  private _pulseProgress: number = 0;
  private _isAnimating: boolean = false;
  private _isBreathing: boolean = false;
  private _breathingPhase: number = 0;

  private _nodeIntensities: Map<string, number> = new Map();
  private _edgeIntensities: Map<string, number> = new Map();

  public constructor(graph: FamilyGraph, config: PropagationConfig = {}) {
    this._graph = graph;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start a pulse from one node to another
   */
  public startPulse(fromNode: string, toNode: string): void {
    const path = this._graph.findPath(fromNode, toNode);

    if (!path || path.length === 0) {
      return;
    }

    this._path = path;
    this._pulseProgress = 0;
    this._isAnimating = true;
    this._isBreathing = false;
    this._nodeIntensities.clear();
    this._edgeIntensities.clear();
  }

  /**
   * Update the animation
   * @param deltaTime - Time elapsed in seconds (from TimeProvider)
   */
  public update(deltaTime: number): void {
    if (!this._isAnimating && !this._isBreathing) {
      return;
    }

    if (this._isAnimating) {
      this._updatePulse(deltaTime);
    }

    if (this._isBreathing) {
      this._updateBreathing(deltaTime);
    }
  }

  /**
   * Get intensity for a specific node
   */
  public getNodeIntensity(nodeId: string): number {
    return this._nodeIntensities.get(nodeId) ?? 0;
  }

  /**
   * Get intensity for a specific edge
   */
  public getEdgeIntensity(sourceId: string, targetId: string): number {
    const key = `${sourceId}->${targetId}`;
    return this._edgeIntensities.get(key) ?? 0;
  }

  /**
   * Get all node intensities
   */
  public getAllNodeIntensities(): Map<string, number> {
    return new Map(this._nodeIntensities);
  }

  /**
   * Whether pulse is currently animating
   */
  public isAnimating(): boolean {
    return this._isAnimating;
  }

  /**
   * Whether nodes are in breathing state
   */
  public isBreathing(): boolean {
    return this._isBreathing;
  }

  /**
   * Dispose and clean up
   */
  public dispose(): void {
    this._isAnimating = false;
    this._isBreathing = false;
    this._path = [];
    this._nodeIntensities.clear();
    this._edgeIntensities.clear();
  }

  private _updatePulse(deltaTime: number): void {
    const edgeCount = this._path.length - 1;
    if (edgeCount <= 0) {
      this._completePulse();
      return;
    }

    // Advance pulse
    this._pulseProgress += deltaTime * this._config.pulseSpeed;

    // Calculate which edge the pulse is on
    const currentEdgeIndex = Math.floor(this._pulseProgress);
    const edgeProgress = this._pulseProgress - currentEdgeIndex;

    // Update node intensities
    for (let i = 0; i < this._path.length; i++) {
      const nodeId = this._path[i];

      if (i < currentEdgeIndex) {
        // Node already passed - fade out
        const timeSincePassed = (currentEdgeIndex - i) / this._config.pulseSpeed;
        const fadeProgress = Math.min(1, timeSincePassed / this._config.glowDuration);
        this._nodeIntensities.set(nodeId, 1 - fadeProgress);
      } else if (i === currentEdgeIndex) {
        // Pulse is leaving this node
        this._nodeIntensities.set(nodeId, 1 - edgeProgress * 0.5);
      } else if (i === currentEdgeIndex + 1) {
        // Pulse is approaching this node
        this._nodeIntensities.set(nodeId, edgeProgress);
      } else {
        // Node not yet reached
        this._nodeIntensities.set(nodeId, 0);
      }
    }

    // Update edge intensities
    for (let i = 0; i < edgeCount; i++) {
      const key = `${this._path[i]}->${this._path[i + 1]}`;

      if (i < currentEdgeIndex) {
        // Edge already passed
        const timeSincePassed = (currentEdgeIndex - i) / this._config.pulseSpeed;
        const fadeProgress = Math.min(1, timeSincePassed / this._config.glowDuration);
        this._edgeIntensities.set(key, 1 - fadeProgress);
      } else if (i === currentEdgeIndex) {
        // Pulse is on this edge
        this._edgeIntensities.set(key, 1);
      } else {
        // Edge not yet reached
        this._edgeIntensities.set(key, 0);
      }
    }

    // Check for completion
    if (this._pulseProgress >= edgeCount) {
      this._completePulse();
    }
  }

  private _completePulse(): void {
    this._isAnimating = false;
    this._isBreathing = true;
    this._breathingPhase = 0;

    // Set all nodes to lit state
    for (const nodeId of this._path) {
      this._nodeIntensities.set(nodeId, 1);
    }
  }

  private _updateBreathing(deltaTime: number): void {
    this._breathingPhase += deltaTime * this._config.breathingSpeed;

    // Sinusoidal breathing effect
    const breathingIntensity = 0.7 + 0.3 * Math.sin(this._breathingPhase * Math.PI * 2);

    // Apply to all nodes in path
    for (const nodeId of this._path) {
      this._nodeIntensities.set(nodeId, breathingIntensity);
    }
  }
}
```

### Step 4.3: Create Index Exports

Create `src/visualization/animation/propagation/index.ts`:

```typescript
/**
 * Propagation Module
 *
 * Graph-based animation for pulse propagation.
 */
export { PropagationAnimator } from './propagation-animator';
export type { PropagationConfig } from './propagation-animator';
```

---

## Migration Plan

### Wrap Existing PathPulseAnimator

The PropagationAnimator can either:
1. **Replace** PathPulseAnimator with equivalent logic (shown above)
2. **Wrap** PathPulseAnimator, delegating to it internally

For minimal risk, wrap the existing animator:

```typescript
// Alternative: Wrapper approach
export class PropagationAnimator {
  private readonly _innerAnimator: PathPulseAnimator;

  public constructor(graph: FamilyGraph) {
    this._innerAnimator = new PathPulseAnimator(graph);
  }

  public startPulse(from: string, to: string): void {
    this._innerAnimator.startPulse(from, to);
  }

  public update(deltaTime: number): void {
    this._innerAnimator.update(deltaTime);
  }

  // ... delegate all other methods
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/animation/propagation/propagation-animator.ts` | CREATE | Propagation wrapper |
| `src/visualization/animation/propagation/propagation-animator.test.ts` | CREATE | Unit tests |
| `src/visualization/animation/propagation/index.ts` | CREATE | Module exports |

---

## Verification

```bash
# Run tests
npx vitest src/visualization/animation/propagation/

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Visual Verification

1. Run `npm run dev:template -- --reset`
2. Select a node
3. Trigger pulse animation
4. Verify pulse travels along edges
5. Verify nodes light up as pulse passes
6. Verify breathing animation after completion

---

## Completion Criteria

- [ ] All 10 propagation tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] startPulse finds path correctly
- [ ] Node intensities update during animation
- [ ] Edge intensities update during animation
- [ ] Breathing animation works after pulse
- [ ] Visual output IDENTICAL to PathPulseAnimator
