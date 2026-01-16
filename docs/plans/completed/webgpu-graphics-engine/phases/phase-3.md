# Phase 3: Enhanced Visual Effects

**Goal**: Add optional effects: DOF, chromatic aberration, film grain
**Status**: Complete
**Parent Plan**: [../development-plan.md](../development-plan.md)

## Critical Invariants

- **INV-A008**: WebGPU Imports - Use `three/webgpu` for classes, `three/tsl` for shader nodes
- **INV-A009**: Resource Disposal - Dispose all effect nodes on cleanup
- **INV-A012**: TSL Effect Imports - Import effects from `three/addons/tsl/display/`
- **INV-A014**: Effect Composition - Compose effects via node operations

## Overview

This phase extends the post-processing pipeline with optional cinematic effects that can be enabled/disabled at runtime. Each effect is imported from the TSL display nodes:

```typescript
// Effect imports (INV-A012 pattern)
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
```

## Deliverables

1. Extended `PostProcessingPipelineConfig` with optional effect configs
2. Extended `PostProcessingPipelineResult` with effect nodes
3. Runtime enable/disable for each effect
4. Updated tests (10+ new tests)

## TDD Test Cases

### New Tests to Add

| Test | Description |
|------|-------------|
| should create DOF effect when enabled | Creates DOF node with proper parameters |
| should not create DOF effect when disabled | No DOF node when dof.enabled = false |
| should return DOF uniforms for runtime control | Focus, focal length, bokeh scale accessible |
| should create chromatic aberration effect when enabled | Creates CA node with strength |
| should not create chromatic aberration effect when disabled | No CA node when disabled |
| should return chromatic aberration uniforms | Strength, center, scale accessible |
| should create film grain effect when enabled | Creates film node with intensity |
| should not create film grain effect when disabled | No film node when disabled |
| should return film grain uniforms | Intensity accessible |
| should compose all effects in correct order | Bloom -> DOF -> CA -> Film -> Vignette |

### Effect Composition Order

```
Scene → Bloom → DOF → Chromatic Aberration → Film Grain → Vignette → Output
```

This order ensures:
1. Bloom creates glow from bright areas
2. DOF blurs based on depth (works best on non-processed image)
3. Chromatic aberration adds lens fringing
4. Film grain overlays noise
5. Vignette darkens edges last

## API Design

### Extended Configuration

```typescript
export interface DepthOfFieldConfig {
  enabled: boolean;
  focusDistance: number;    // Distance to focus plane in world units
  focalLength: number;      // Depth of field range in world units
  bokehScale: number;       // Artistic bokeh size multiplier
}

export interface ChromaticAberrationConfig {
  enabled: boolean;
  strength: number;         // Aberration strength (0.0 - 0.1 typical)
  center: { x: number; y: number };  // Effect center in UV space
  scale: number;           // Radial scale factor
}

export interface FilmGrainConfig {
  enabled: boolean;
  intensity: number;        // Grain intensity (0.0 - 1.0)
}

export interface PostProcessingPipelineConfig {
  bloom: BloomConfig;
  vignette: VignetteConfig;
  dof?: DepthOfFieldConfig;              // Optional
  chromaticAberration?: ChromaticAberrationConfig;  // Optional
  filmGrain?: FilmGrainConfig;           // Optional
}
```

### Extended Result

```typescript
export interface PostProcessingPipelineResult {
  postProcessing: PostProcessing;
  config: PostProcessingPipelineConfig;
  uniforms: PostProcessingPipelineUniforms;
  bloomNode: ReturnType<typeof bloom> | null;
  dofNode: ReturnType<typeof dof> | null;
  chromaticAberrationNode: ReturnType<typeof chromaticAberration> | null;
  filmGrainNode: ReturnType<typeof film> | null;
}
```

### Extended Uniforms

```typescript
export interface PostProcessingPipelineUniforms {
  // Existing
  bloomStrength: { value: number };
  bloomRadius: { value: number };
  bloomThreshold: { value: number };
  vignetteDarkness: { value: number };
  vignetteOffset: { value: number };
  // New - DOF
  dofFocusDistance?: { value: number };
  dofFocalLength?: { value: number };
  dofBokehScale?: { value: number };
  // New - Chromatic Aberration
  caStrength?: { value: number };
  // New - Film Grain
  filmIntensity?: { value: number };
}
```

## Implementation Notes

### DOF Requirements

DOF requires access to depth buffer. We need to:
1. Get depth texture from scene pass: `scenePass.getTextureNode('depth')`
2. Convert to viewZ using camera near/far
3. Pass to DOF node

```typescript
// DOF setup
const scenePassDepth = scenePass.getTextureNode('depth');
const dofNode = dof(
  outputNode,      // Color input (after bloom)
  scenePassDepth,  // Depth texture
  uDofFocusDistance,
  uDofFocalLength,
  uDofBokehScale
);
```

### Chromatic Aberration

Simple to integrate - takes color input and parameters:

```typescript
const caNode = chromaticAberration(
  outputNode,       // Color input
  uCaStrength,      // Strength uniform
  vec2(0.5, 0.5),  // Center point
  float(1.0)       // Scale
);
```

### Film Grain

Simplest effect - just needs color input and intensity:

```typescript
const filmNode = film(
  outputNode,      // Color input
  uFilmIntensity   // Intensity uniform
);
```

## Verification Steps

1. **Write tests first**: `npm test -- src/visualization/tsl-pipeline/post-processing-pipeline.test.ts`
2. **Implement until tests pass**
3. **Type check**: `npx tsc --noEmit`
4. **Visual test**: Enable each effect and verify rendering

## Success Criteria

- [x] All 10+ new tests pass (TDD) - 14 new tests added, all 33 total tests pass
- [x] Type check passes - No type errors in post-processing pipeline
- [ ] DOF effect creates visible blur based on depth (visual test pending)
- [ ] Chromatic aberration creates RGB fringing (visual test pending)
- [ ] Film grain adds visible noise (visual test pending)
- [x] All effects can be enabled/disabled at runtime
- [ ] Performance stays above 60fps with all effects (visual test pending)

## Notes

- DOF is the most complex as it requires depth buffer access
- Chromatic aberration and film grain are simpler additive effects
- All effects should be optional (disabled by default for performance)
- The existing bloom and vignette effects remain unchanged

---

*Phase template version: 1.0*
