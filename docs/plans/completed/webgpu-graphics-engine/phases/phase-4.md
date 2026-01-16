# Phase 4: Graphics Engine Class

**Goal**: Create unified GraphicsEngine API encapsulating all rendering with TSL post-processing
**Status**: Complete
**Parent Plan**: [../development-plan.md](../development-plan.md)

## Critical Invariants

- **INV-A001**: WebGPURenderer Init - Must `await renderer.init()` before use
- **INV-A002**: Animation Loop - Use `setAnimationLoop()` not `requestAnimationFrame()`
- **INV-A008**: WebGPU Imports - Use `three/webgpu` and `three/tsl` import paths
- **INV-A009**: Resource Disposal - Dispose all resources on cleanup

## Overview

This phase creates a unified `GraphicsEngine` class that:
1. Encapsulates renderer creation (WebGPU with WebGL fallback)
2. Uses the new TSL post-processing pipeline from Phases 1-3
3. Provides clean lifecycle management (init, start, stop, dispose)
4. Exposes runtime effect control via uniforms

### Key Difference from Existing engine.ts

The existing `src/visualization/engine.ts` uses the legacy post-processing systems:
- `./effects/post-processing.ts` (WebGL EffectComposer)
- `./effects/webgpu-post-processing.ts` (broken TSL attempt)

The new GraphicsEngine will exclusively use:
- `./tsl-pipeline/post-processing-pipeline.ts` (unified TSL pipeline from Phase 1-3)

## Deliverables

1. `src/visualization/graphics-engine.ts` - Main GraphicsEngine class
2. `src/visualization/graphics-engine.test.ts` - Unit tests (12+ tests)
3. Updated exports in `src/visualization/index.ts`

## TDD Test Cases

### Tests to Implement (12+ tests)

| Test | Description |
|------|-------------|
| should export GraphicsEngine class | Class is properly exported |
| should create renderer from container | Async renderer creation |
| should create scene with correct background | Scene setup |
| should create camera with correct FOV | Camera setup |
| should create TSL post-processing pipeline | Uses new pipeline |
| should start animation loop | start() begins rendering |
| should stop animation loop | stop() halts rendering |
| should resize renderer and post-processing | resize() updates all |
| should expose effect uniforms for runtime control | Uniforms accessible |
| should dispose all resources (INV-A009) | Clean disposal |
| should prevent operations after dispose | Safety checks |
| should return isRunning state | State tracking |

## API Design

### GraphicsEngine Class

```typescript
export interface GraphicsEngineConfig {
  // Renderer options
  antialias?: boolean;
  pixelRatio?: number;

  // Post-processing options (from Phase 1-3)
  bloom?: BloomConfig;
  vignette?: VignetteConfig;
  dof?: DepthOfFieldConfig;
  chromaticAberration?: ChromaticAberrationConfig;
  filmGrain?: FilmGrainConfig;
}

export interface GraphicsEngineResult {
  engine: GraphicsEngine;
  uniforms: PostProcessingPipelineUniforms;
}

export class GraphicsEngine {
  // Core properties
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  // Lifecycle methods
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  dispose(): void;

  // State
  isRunning(): boolean;
  isDisposed(): boolean;

  // Post-processing access
  getPostProcessingResult(): PostProcessingPipelineResult;
}

// Factory function (async for WebGPU init)
export async function createGraphicsEngine(
  container: HTMLElement,
  config?: GraphicsEngineConfig
): Promise<GraphicsEngineResult>;
```

### Usage Example

```typescript
const { engine, uniforms } = await createGraphicsEngine(container, {
  bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
  vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
});

// Start rendering
engine.start();

// Runtime effect control
uniforms.bloomStrength.value = 2.0;
uniforms.vignetteDarkness.value = 0.6;

// Cleanup
engine.dispose();
```

## Implementation Notes

### Renderer Creation

Uses existing `createRenderer` from `./renderer.ts` which handles WebGPU/WebGL detection.

### Post-Processing Integration

```typescript
import {
  createPostProcessingPipeline,
  disposePostProcessingPipeline,
  updatePostProcessingSize,
  renderWithPostProcessing,
} from './tsl-pipeline/post-processing-pipeline';
```

### Animation Loop Pattern

```typescript
start(): void {
  if (this._disposed || this._running) return;
  this._running = true;
  this.renderer.setAnimationLoop(() => {
    renderWithPostProcessing(this._postProcessingResult);
  });
}

stop(): void {
  if (!this._running) return;
  this._running = false;
  this.renderer.setAnimationLoop(null);
}
```

### Dispose Pattern (INV-A009)

```typescript
dispose(): void {
  if (this._disposed) return;
  this._disposed = true;

  this.stop();
  disposePostProcessingPipeline(this._postProcessingResult);
  this.renderer.dispose();
}
```

## Verification Steps

1. **Write tests first**: `npm test -- src/visualization/graphics-engine.test.ts`
2. **Implement until tests pass**
3. **Type check**: `npx tsc --noEmit`
4. **Visual test**: Replace constellation-canvas usage with new engine

## Success Criteria

- [x] All 12+ tests pass (TDD) - 28 tests pass
- [x] Type check passes - No type errors in graphics-engine
- [x] GraphicsEngine uses TSL pipeline from Phases 1-3
- [x] All resources disposed on cleanup (INV-A009)
- [x] Animation loop uses setAnimationLoop (INV-A002)
- [x] WebGPU renderer properly initialized (INV-A001)

## Notes

- This replaces the scattered post-processing logic in the existing engine.ts
- The existing engine.ts can be deprecated once GraphicsEngine is integrated
- ConstellationCanvas can be updated to use GraphicsEngine in a follow-up task

---

*Phase template version: 1.0*
