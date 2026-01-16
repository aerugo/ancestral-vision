# WebGPU Graphics Engine - Development Plan

**Status**: Complete
**Created**: 2026-01-16
**Completed**: 2026-01-16
**Branch**: `feature/webgpu-graphics-engine`
**Spec**: [spec.md](spec.md)

## Summary

Implement a comprehensive WebGPU graphics engine using Three.js TSL for the Ancestral Vision constellation visualization, featuring proper bloom post-processing, enhanced node materials, and particle effects that achieve visual parity with the prototype.

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md` by their canonical IDs:

- **INV-A001**: WebGPURenderer Init - Must `await renderer.init()` before use
- **INV-A002**: Animation Loop - Use `setAnimationLoop()` not `requestAnimationFrame()`
- **INV-A008**: WebGPU Imports - Use `three/webgpu` and `three/tsl` import paths
- **INV-A009**: Resource Disposal - Dispose geometry, materials, textures on cleanup

**New invariants introduced** (to be added to INVARIANTS.md after implementation):

- **NEW INV-A012**: TSL Bloom Import - Import bloom from `three/addons/tsl/display/BloomNode.js`
- **NEW INV-A013**: PostProcessing Unified - Use TSL PostProcessing for both WebGPU and WebGL renderers
- **NEW INV-A014**: Effect Composition - Post-processing effects are composed via node addition, not chaining

## Current State Analysis

The current visualization has two separate rendering paths that produce different visual results:

1. **WebGL path** (`constellation-canvas.tsx`):
   - Uses EffectComposer with UnrealBloomPass
   - Produces visible bloom halos
   - Works but is legacy approach

2. **WebGPU path**:
   - Attempted TSL PostProcessing but failed due to incorrect imports
   - Falls back to direct rendering with additive blending only
   - Missing bloom and other post-processing effects

3. **Node material** (`node-material.ts`):
   - Uses MeshStandardNodeMaterial with TSL
   - Has enhanced mode with inner glow, SSS, mandala patterns
   - Relies on bloom post-processing for full effect

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `src/visualization/effects/webgpu-post-processing.ts` | Non-functional TSL post-processing | Complete rewrite with proper bloom import |
| `src/components/constellation-canvas.tsx` | Dual-path rendering | Unified TSL post-processing for both renderers |
| `src/visualization/effects/index.ts` | Exports both systems | Clean up exports |

### Files to Create

| File | Purpose |
|------|---------|
| `src/visualization/engine/graphics-engine.ts` | Main graphics engine class |
| `src/visualization/engine/graphics-engine.test.ts` | Unit tests for graphics engine |
| `src/visualization/engine/post-processing-pipeline.ts` | TSL post-processing pipeline |
| `src/visualization/engine/post-processing-pipeline.test.ts` | Post-processing tests |
| `src/visualization/engine/index.ts` | Module exports |

## Solution Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     GraphicsEngine                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   Renderer      │  │  Scene Manager  │  │ Camera Manager │  │
│  │  (WebGPU/GL)    │  │                 │  │                │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              PostProcessingPipeline                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ScenePass │──│ Bloom    │──│ Vignette │──│ Output   │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Material Systems                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │NodeMaterial│  │EdgeMaterial│  │ParticleMaterial    │ │   │
│  │  │(enhanced)  │  │(flow anim) │  │(glow/stars)        │ │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Unified PostProcessing**: Use TSL `PostProcessing` class for both WebGPU and WebGL, eliminating the need for separate EffectComposer path
2. **Correct Bloom Import**: Import from `three/addons/tsl/display/BloomNode.js` not `three/tsl`
3. **Composition via Addition**: Combine scene color with bloom via `scenePassColor.add(bloomPass)` not chaining
4. **Effect Uniforms**: Expose all effect parameters as TSL uniforms for runtime control

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 1 | TSL Post-Processing Pipeline | Bloom, vignette setup | 8 tests |
| 2 | Integrate with ConstellationCanvas | Replace dual-path rendering | 5 tests |
| 3 | Enhanced Visual Effects | DOF, chromatic aberration, film grain | 10 tests |
| 4 | Graphics Engine Class | Unified API, dispose pattern | 12 tests |
| 5 | Performance Optimization | Mip levels, resolution scaling | 6 tests |

---

## Phase 1: TSL Post-Processing Pipeline

**Goal**: Create a working TSL post-processing pipeline with bloom and vignette effects
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `src/visualization/engine/post-processing-pipeline.ts` - New TSL pipeline
2. `src/visualization/engine/post-processing-pipeline.test.ts` - Unit tests

### TDD Approach

1. Write failing tests for pipeline creation with bloom
2. Implement correct bloom import from `three/addons/tsl/display/BloomNode.js`
3. Write tests for vignette effect
4. Implement vignette using TSL `smoothstep` and `screenUV`
5. Write tests for effect composition
6. Implement proper node composition via addition

### Key Implementation

```typescript
// Correct bloom import (INV-A012)
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PostProcessing } from 'three/webgpu';
import { pass, screenUV, smoothstep, length, sub, vec2, mul, add, float } from 'three/tsl';

export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer | THREE.Renderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: PostProcessingConfig
): PostProcessingPipelineResult {
  const postProcessing = new PostProcessing(renderer);

  // Scene render pass
  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode('output');

  // Bloom effect (INV-A014: compose via addition)
  const bloomPass = bloom(
    scenePassColor,
    config.bloom.strength,
    config.bloom.radius,
    config.bloom.threshold
  );

  // Vignette effect
  const center = vec2(float(0.5), float(0.5));
  const dist = length(sub(screenUV, center));
  const vignette = smoothstep(float(0.8), float(config.vignette.offset), dist);

  // Compose effects
  let outputNode = scenePassColor.add(bloomPass);
  outputNode = mul(outputNode, vignette);

  postProcessing.outputNode = outputNode;

  return { postProcessing, bloomPass, ... };
}
```

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Bloom renders with visible glow halos
- [ ] Vignette darkens edges appropriately

---

## Phase 2: Integrate with ConstellationCanvas

**Goal**: Replace dual-path rendering with unified TSL post-processing
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. Updated `constellation-canvas.tsx` with unified rendering
2. Removed legacy EffectComposer code

### TDD Approach

1. Write integration tests for canvas rendering
2. Replace EffectComposer imports with TSL PostProcessing
3. Update render loop to use `postProcessing.render()`
4. Verify cleanup disposes all TSL resources

### Success Criteria

- [ ] All tests pass
- [ ] Visual parity with prototype achieved
- [ ] Both WebGPU and WebGL produce identical bloom effects
- [ ] No console errors or warnings

---

## Phase 3: Enhanced Visual Effects ✓

**Goal**: Add optional effects: DOF, chromatic aberration, film grain
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)
**Status**: Complete

### Deliverables

1. Extended post-processing config with optional effects
2. Composable effect chain

### Success Criteria

- [x] All tests pass (14 new tests, 33 total)
- [x] Effects can be enabled/disabled at runtime
- [ ] Performance remains above 60fps with all effects (visual test pending)

---

## Phase 4: Graphics Engine Class ✓

**Goal**: Create unified GraphicsEngine API encapsulating all rendering
**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)
**Status**: Complete

### Deliverables

1. `src/visualization/graphics-engine.ts` - GraphicsEngine class
2. `src/visualization/graphics-engine.test.ts` - Full test coverage (28 tests)
3. Dispose pattern implementation (INV-A009)

### Success Criteria

- [x] All tests pass (28 tests)
- [x] Clean API for ConstellationCanvas
- [x] All resources disposed on cleanup (INV-A009)

---

## Phase 5: Performance Optimization ✓

**Goal**: Optimize bloom quality and performance for various devices
**Detailed Plan**: [phases/phase-5.md](phases/phase-5.md)
**Status**: Complete

### Deliverables

1. `src/visualization/tsl-pipeline/performance-config.ts` - Performance configuration module
2. `src/visualization/tsl-pipeline/performance-config.test.ts` - Unit tests (20 tests)
3. Performance presets (LOW, MEDIUM, HIGH, ULTRA)
4. Resolution scaling support
5. Effect enable/disable configuration
6. GraphicsEngine integration - `performancePreset` and `performanceConfig` options (5 tests)

### Success Criteria

- [x] All tests pass (20 + 5 integration = 25 tests)
- [x] Performance presets correctly configure effects
- [x] Resolution scaling works with post-processing
- [x] GraphicsEngine integration complete
- [ ] 60fps maintained with 100+ nodes on M1 Mac (visual test pending)
- [ ] Graceful degradation on lower-end devices (visual test pending)

---

## Testing Strategy

### Unit Tests (co-located with source)

- `src/visualization/engine/post-processing-pipeline.test.ts`: Pipeline creation, effect composition
- `src/visualization/engine/graphics-engine.test.ts`: Engine lifecycle, API methods

### Integration Tests

- `tests/integration/constellation-rendering.test.ts`: Full rendering pipeline

### Invariant Tests

- `tests/invariants/visualization.test.ts`: INV-A001, INV-A002, INV-A008, INV-A009, INV-A012-A014

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-A012, INV-A013, INV-A014
- [ ] Update CLAUDE.md with WebGPU graphics engine patterns
- [ ] Add WebGPU troubleshooting guide

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Complete | 2026-01-16 | 2026-01-16 | TSL Post-Processing Pipeline (19 tests) |
| Phase 2 | Complete | 2026-01-16 | 2026-01-16 | Canvas Integration - unified TSL pipeline |
| Phase 3 | Complete | 2026-01-16 | 2026-01-16 | Enhanced Effects - DOF, CA, Film Grain (14 new tests, 33 total) |
| Phase 4 | Complete | 2026-01-16 | 2026-01-16 | GraphicsEngine class with TSL pipeline (28 tests) |
| Phase 5 | Complete | 2026-01-16 | 2026-01-16 | Performance Configuration (25 tests, integrated with GraphicsEngine) |

---

*Template version: 1.0*
