# Phase 1: Post-Processing Integration

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Integrate TSL-based post-processing (bloom and vignette) into the WebGPU rendering path to achieve visual parity with the reference prototype's cinematic depth effects.

---

## Invariants Enforced in This Phase

- **INV-V001**: WebGPU Compatibility - All changes use TSL, no raw GLSL
- **NEW INV-V011**: Post-Processing Parity - WebGL and WebGPU must have equivalent effects

---

## Background

The codebase has two post-processing implementations:

1. **WebGL** (`src/visualization/effects/post-processing.ts`):
   - Uses Three.js EffectComposer
   - UnrealBloomPass for bloom
   - Custom vignette shader
   - Currently integrated and working

2. **WebGPU** (`src/visualization/effects/webgpu-post-processing.ts`):
   - Uses Three.js PostProcessing class
   - TSL-based bloom and vignette
   - **NOT integrated** - code exists but never used

The engine (`src/visualization/engine.ts`) only creates post-processing for WebGL:
```typescript
const isWebGL = renderer.constructor.name === 'WebGLRenderer';
if (isWebGL) {
  postProcessing = createPostProcessing(renderer as THREE.WebGLRenderer, ...);
}
// WebGPU users get nothing!
```

---

## Implementation Steps

### Step 1.1: Review Existing TSL Post-Processing

**File**: `src/visualization/effects/webgpu-post-processing.ts`

Verify the existing implementation:
- `createTSLPostProcessing()` function exists and is exported
- Bloom effect uses TSL `bloom()` function
- Vignette uses `screenUV` for coordinate-based darkening
- Uniforms are properly exposed for configuration

### Step 1.2: Modify Engine to Support WebGPU Post-Processing

**File**: `src/visualization/engine.ts`

Changes needed:

```typescript
import { createTSLPostProcessing, TSLPostProcessing } from './effects/webgpu-post-processing';

// In createVisualizationEngine():
let postProcessing: PostProcessing | null = null;
let tslPostProcessing: TSLPostProcessing | null = null;

const isWebGL = renderer.constructor.name === 'WebGLRenderer';
if (isWebGL) {
  postProcessing = createPostProcessing(renderer as THREE.WebGLRenderer, scene, camera, config);
} else {
  // WebGPU path
  tslPostProcessing = createTSLPostProcessing(renderer, scene, camera, config);
}
```

### Step 1.3: Integrate TSL Post-Processing into Render Loop

**File**: `src/visualization/engine.ts`

Modify the render function to use appropriate post-processing:

```typescript
function render(): void {
  const delta = clock.getDelta();
  controls.update();

  // Update time uniforms...

  if (postProcessing) {
    // WebGL path
    postProcessing.composer.render(delta);
  } else if (tslPostProcessing) {
    // WebGPU path
    tslPostProcessing.render();
  } else {
    renderer.render(scene, camera);
  }
}
```

### Step 1.4: Add TSL Post-Processing Dispose

**File**: `src/visualization/engine.ts`

Add proper cleanup in dispose function:

```typescript
if (tslPostProcessing) {
  tslPostProcessing.dispose();
}
```

### Step 1.5: Configure Default Values

Ensure post-processing config matches prototype:

```typescript
const postProcessingConfig = {
  bloom: {
    intensity: 0.6,    // Prototype value
    threshold: 0.8,
    radius: 0.5
  },
  vignette: {
    darkness: 0.4,     // Prototype value
    offset: 0.3
  }
};
```

### Step 1.6: Verify TSL Post-Processing Implementation

**File**: `src/visualization/effects/webgpu-post-processing.ts`

If needed, update the implementation to match prototype parameters:

```typescript
// Bloom configuration
const bloomIntensity = uniform(0.6);
const bloomThreshold = uniform(0.8);

// Vignette configuration
const vignetteDarkness = uniform(0.4);
const vignetteOffset = uniform(0.3);
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/engine.ts` | MODIFY | Add WebGPU post-processing integration |
| `src/visualization/effects/webgpu-post-processing.ts` | MODIFY | Verify/update TSL implementation |

---

## Verification

```bash
# Start dev server
npm run dev

# Test WebGPU post-processing:
1. Open browser to visualization
2. Verify bloom glow visible on bright nodes
3. Verify vignette darkening at screen edges
4. Compare visually with prototype

# Performance check:
1. Open Chrome DevTools Performance tab
2. Record rendering performance
3. Verify 60fps maintained
```

---

## Completion Criteria

- [ ] WebGPU renderer uses TSL post-processing
- [ ] Bloom effect visible on bright elements
- [ ] Vignette effect darkens screen edges
- [ ] WebGL post-processing still works (no regression)
- [ ] Performance within 5% of baseline
- [ ] No console errors or warnings
- [ ] Type check passes (`npx tsc --noEmit`)

---

## Reference

**Prototype post-processing setup** (from `ModernRenderer.ts`):
- Bloom intensity: 0.6
- Bloom mipmapBlur: true
- Vignette darkness: 0.4
- Vignette offset: 0.3
- Frame buffer: HalfFloatType for HDR-like rendering
