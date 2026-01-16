# Phase 1: TSL Post-Processing Pipeline

**Goal**: Create a working TSL post-processing pipeline with bloom and vignette effects
**Status**: Pending
**Parent Plan**: [../development-plan.md](../development-plan.md)

## Critical Invariants

- **INV-A008**: WebGPU Imports - Use `three/webgpu` and `three/tsl` import paths
- **INV-A009**: Resource Disposal - Dispose post-processing resources on cleanup
- **NEW INV-A012**: TSL Bloom Import - Import bloom from `three/addons/tsl/display/BloomNode.js`
- **NEW INV-A013**: PostProcessing Unified - Use TSL PostProcessing for both WebGPU and WebGL
- **NEW INV-A014**: Effect Composition - Post-processing effects are composed via node addition

## Overview

This phase replaces the non-functional `webgpu-post-processing.ts` with a working TSL-based post-processing pipeline. The key fix is using the correct import path for bloom:

```typescript
// WRONG (current broken code):
import { bloom } from 'three/tsl';  // Does not export bloom!

// CORRECT (INV-A012):
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
```

## Deliverables

1. `src/visualization/engine/post-processing-pipeline.ts`
2. `src/visualization/engine/post-processing-pipeline.test.ts`
3. `src/visualization/engine/index.ts`

## TDD Test Cases

### Test File: `post-processing-pipeline.test.ts`

```typescript
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Three.js WebGPU and TSL modules
vi.mock('three/webgpu', () => ({
  PostProcessing: vi.fn().mockImplementation(() => ({
    outputNode: null,
    render: vi.fn(),
    setSize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('three/tsl', () => {
  const createMockNode = () => ({
    add: vi.fn().mockReturnThis(),
    mul: vi.fn().mockReturnThis(),
    getTextureNode: vi.fn().mockReturnThis(),
  });

  return {
    pass: vi.fn(() => createMockNode()),
    screenUV: createMockNode(),
    smoothstep: vi.fn(() => createMockNode()),
    length: vi.fn(() => createMockNode()),
    sub: vi.fn(() => createMockNode()),
    vec2: vi.fn(() => createMockNode()),
    mul: vi.fn(() => createMockNode()),
    add: vi.fn(() => createMockNode()),
    float: vi.fn((v) => ({ value: v })),
    uniform: vi.fn((v) => ({ value: v })),
  };
});

vi.mock('three/addons/tsl/display/BloomNode.js', () => ({
  bloom: vi.fn(() => ({
    strength: { value: 1 },
    radius: { value: 0 },
    threshold: { value: 0 },
    getTextureNode: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
}));

describe('post-processing-pipeline module', () => {
  describe('createPostProcessingPipeline', () => {
    it('should export createPostProcessingPipeline function', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');
      expect(createPostProcessingPipeline).toBeDefined();
      expect(typeof createPostProcessingPipeline).toBe('function');
    });

    it('should create PostProcessing instance', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');
      const mockRenderer = {} as any;
      const mockScene = {} as any;
      const mockCamera = {} as any;

      const result = createPostProcessingPipeline(mockRenderer, mockScene, mockCamera, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
      });

      expect(result.postProcessing).toBeDefined();
    });

    it('should use correct bloom import from addons (INV-A012)', async () => {
      const bloomMock = await import('three/addons/tsl/display/BloomNode.js');
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline({} as any, {} as any, {} as any, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: false },
      });

      expect(bloomMock.bloom).toHaveBeenCalled();
    });

    it('should return bloom uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline({} as any, {} as any, {} as any, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
      });

      expect(result.uniforms.bloomStrength).toBeDefined();
      expect(result.uniforms.bloomRadius).toBeDefined();
      expect(result.uniforms.bloomThreshold).toBeDefined();
    });

    it('should return vignette uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline({} as any, {} as any, {} as any, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
      });

      expect(result.uniforms.vignetteDarkness).toBeDefined();
      expect(result.uniforms.vignetteOffset).toBeDefined();
    });
  });

  describe('disposePostProcessingPipeline (INV-A009)', () => {
    it('should dispose PostProcessing resources', async () => {
      const { createPostProcessingPipeline, disposePostProcessingPipeline } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline({} as any, {} as any, {} as any, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
      });

      expect(() => disposePostProcessingPipeline(result)).not.toThrow();
    });
  });

  describe('updatePostProcessingSize', () => {
    it('should update size on window resize', async () => {
      const { createPostProcessingPipeline, updatePostProcessingSize } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline({} as any, {} as any, {} as any, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
      });

      expect(() => updatePostProcessingSize(result, 1920, 1080)).not.toThrow();
    });
  });
});
```

## Implementation

### File: `src/visualization/engine/post-processing-pipeline.ts`

```typescript
/**
 * TSL Post-Processing Pipeline for WebGPU/WebGL
 *
 * INV-A008: Use three/webgpu for classes, three/tsl for shader nodes
 * INV-A009: Resource Disposal - PostProcessing disposed on cleanup
 * INV-A012: TSL Bloom Import - Import from three/addons/tsl/display/BloomNode.js
 * INV-A013: PostProcessing Unified - Works with both WebGPU and WebGL renderers
 * INV-A014: Effect Composition - Compose via node addition
 */
import * as THREE from 'three';
import { PostProcessing } from 'three/webgpu';
import {
  pass,
  screenUV,
  smoothstep,
  length,
  sub,
  vec2,
  mul,
  float,
  uniform,
} from 'three/tsl';
// INV-A012: Correct bloom import from addons
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

export interface BloomConfig {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}

export interface VignetteConfig {
  enabled: boolean;
  darkness: number;
  offset: number;
}

export interface PostProcessingPipelineConfig {
  bloom: BloomConfig;
  vignette: VignetteConfig;
}

export interface PostProcessingPipelineUniforms {
  bloomStrength: { value: number };
  bloomRadius: { value: number };
  bloomThreshold: { value: number };
  vignetteDarkness: { value: number };
  vignetteOffset: { value: number };
}

export interface PostProcessingPipelineResult {
  postProcessing: PostProcessing;
  config: PostProcessingPipelineConfig;
  uniforms: PostProcessingPipelineUniforms;
  bloomNode: ReturnType<typeof bloom> | null;
}

const DEFAULT_BLOOM: BloomConfig = {
  enabled: true,
  strength: 1.5,
  radius: 0.6,
  threshold: 0.2,
};

const DEFAULT_VIGNETTE: VignetteConfig = {
  enabled: true,
  darkness: 0.4,
  offset: 0.3,
};

/**
 * Creates TSL-based post-processing pipeline
 *
 * @param renderer - Three.js renderer (WebGPU or WebGL)
 * @param scene - Scene to render
 * @param camera - Camera for rendering
 * @param config - Effect configuration
 * @returns PostProcessing instance, config, uniforms, and bloom node
 */
export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer | THREE.Renderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: Partial<PostProcessingPipelineConfig> = {}
): PostProcessingPipelineResult {
  const resolvedConfig: PostProcessingPipelineConfig = {
    bloom: { ...DEFAULT_BLOOM, ...config.bloom },
    vignette: { ...DEFAULT_VIGNETTE, ...config.vignette },
  };

  // Create uniforms for runtime control
  const uBloomStrength = uniform(resolvedConfig.bloom.strength);
  const uBloomRadius = uniform(resolvedConfig.bloom.radius);
  const uBloomThreshold = uniform(resolvedConfig.bloom.threshold);
  const uVignetteDarkness = uniform(resolvedConfig.vignette.darkness);
  const uVignetteOffset = uniform(resolvedConfig.vignette.offset);

  // Create post-processing instance (INV-A013)
  const postProcessing = new PostProcessing(renderer as THREE.Renderer);

  // Scene render pass
  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode('output');

  // Start with scene color
  let outputNode = scenePassColor;

  // Bloom effect (INV-A012, INV-A014)
  let bloomNode: ReturnType<typeof bloom> | null = null;
  if (resolvedConfig.bloom.enabled) {
    bloomNode = bloom(
      scenePassColor,
      uBloomStrength.value,
      uBloomRadius.value,
      uBloomThreshold.value
    );

    // INV-A014: Compose via addition
    outputNode = scenePassColor.add(bloomNode);
  }

  // Vignette effect
  if (resolvedConfig.vignette.enabled) {
    const center = vec2(float(0.5), float(0.5));
    const dist = length(sub(screenUV, center));
    const vignetteStrength = smoothstep(
      float(0.8),
      uVignetteOffset,
      mul(dist, mul(uVignetteDarkness, float(2.0)))
    );
    outputNode = mul(outputNode, vignetteStrength);
  }

  postProcessing.outputNode = outputNode;

  const uniforms: PostProcessingPipelineUniforms = {
    bloomStrength: uBloomStrength as unknown as { value: number },
    bloomRadius: uBloomRadius as unknown as { value: number },
    bloomThreshold: uBloomThreshold as unknown as { value: number },
    vignetteDarkness: uVignetteDarkness as unknown as { value: number },
    vignetteOffset: uVignetteOffset as unknown as { value: number },
  };

  return {
    postProcessing,
    config: resolvedConfig,
    uniforms,
    bloomNode,
  };
}

/**
 * Updates post-processing render size on window resize
 */
export function updatePostProcessingSize(
  result: PostProcessingPipelineResult,
  width: number,
  height: number
): void {
  result.postProcessing.setSize(width, height);
  // BloomNode handles its own internal size updates
}

/**
 * Renders scene with post-processing effects
 */
export function renderWithPostProcessing(result: PostProcessingPipelineResult): void {
  result.postProcessing.render();
}

/**
 * Disposes post-processing resources (INV-A009)
 */
export function disposePostProcessingPipeline(result: PostProcessingPipelineResult): void {
  result.postProcessing.dispose();
  if (result.bloomNode) {
    result.bloomNode.dispose();
  }
}
```

### File: `src/visualization/engine/index.ts`

```typescript
/**
 * WebGPU Graphics Engine
 * Unified rendering engine for Ancestral Vision constellation visualization
 */

export {
  createPostProcessingPipeline,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessingPipeline,
  type BloomConfig,
  type VignetteConfig,
  type PostProcessingPipelineConfig,
  type PostProcessingPipelineResult,
  type PostProcessingPipelineUniforms,
} from './post-processing-pipeline';
```

## Verification Steps

1. **Run tests**: `npm test -- src/visualization/engine/post-processing-pipeline.test.ts`
2. **Type check**: `npx tsc --noEmit`
3. **Lint**: `npm run lint`
4. **Visual test**: Update constellation-canvas.tsx to use new pipeline and verify bloom renders

## Success Criteria

- [ ] All 8 tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] Bloom import uses `three/addons/tsl/display/BloomNode.js` (INV-A012)
- [ ] PostProcessing works with both WebGPU and WebGL (INV-A013)
- [ ] Effects composed via node addition (INV-A014)
- [ ] Dispose cleans up all resources (INV-A009)

## Notes

The key insight from research is that `bloom` is NOT exported from `three/tsl` directly. It must be imported from `three/addons/tsl/display/BloomNode.js`. This is the source of the previous "bloom is not a function" errors.

The BloomNode internally:
1. Extracts bright areas via luminance threshold (high-pass filter)
2. Creates 5-level mip chain with decreasing resolution
3. Applies separable Gaussian blur at each mip level
4. Composites all blur levels with weighted contribution
5. Returns result scaled by strength parameter

---

*Phase template version: 1.0*
