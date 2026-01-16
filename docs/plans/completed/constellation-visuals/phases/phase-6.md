# Phase 6: Post-Processing

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement post-processing pipeline with bloom, vignette, and antialiasing effects using Three.js post-processing compatible with WebGPU renderer.

---

## Invariants Enforced in This Phase

- **INV-A001**: WebGPURenderer Init - Ensure post-processing works after renderer init
- **INV-A009**: Resource Disposal - Effect composer and passes disposed on cleanup

---

## TDD Steps

### Step 6.1: Write Failing Tests for Post-Processing (RED)

Create `src/visualization/effects/post-processing.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
  type PostProcessingConfig,
  type PostProcessingResult,
} from './post-processing';

// Mock Three.js post-processing
vi.mock('three/addons/postprocessing/EffectComposer.js', () => ({
  EffectComposer: vi.fn().mockImplementation(() => ({
    addPass: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    passes: [],
  })),
}));

vi.mock('three/addons/postprocessing/RenderPass.js', () => ({
  RenderPass: vi.fn().mockImplementation(() => ({
    enabled: true,
  })),
}));

vi.mock('three/addons/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: vi.fn().mockImplementation(() => ({
    enabled: true,
    strength: 0,
    radius: 0,
    threshold: 0,
  })),
}));

describe('post-processing module', () => {
  let mockRenderer: THREE.WebGLRenderer;
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;

  beforeEach(() => {
    mockRenderer = {
      setSize: vi.fn(),
      getSize: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
      getPixelRatio: vi.fn().mockReturnValue(1),
      dispose: vi.fn(),
    } as unknown as THREE.WebGLRenderer;

    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
  });

  describe('createPostProcessing', () => {
    it('should export createPostProcessing function', () => {
      expect(createPostProcessing).toBeDefined();
      expect(typeof createPostProcessing).toBe('function');
    });

    it('should return composer and config', () => {
      const result = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result).toHaveProperty('composer');
      expect(result).toHaveProperty('config');
    });

    it('should add render pass', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(composer.addPass).toHaveBeenCalled();
    });

    it('should accept bloom configuration', () => {
      const config: PostProcessingConfig = {
        bloom: {
          enabled: true,
          intensity: 0.8,
          threshold: 0.5,
          radius: 0.5,
        },
      };
      const { config: resultConfig } = createPostProcessing(
        mockRenderer,
        mockScene,
        mockCamera,
        config
      );
      expect(resultConfig.bloom.intensity).toBe(0.8);
    });

    it('should accept vignette configuration', () => {
      const config: PostProcessingConfig = {
        vignette: {
          enabled: true,
          darkness: 0.5,
          offset: 0.4,
        },
      };
      const { config: resultConfig } = createPostProcessing(
        mockRenderer,
        mockScene,
        mockCamera,
        config
      );
      expect(resultConfig.vignette.darkness).toBe(0.5);
    });

    it('should use default bloom intensity of 0.6', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.bloom.intensity).toBe(0.6);
    });

    it('should use default vignette darkness of 0.4', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.vignette.darkness).toBe(0.4);
    });
  });

  describe('updatePostProcessingSize', () => {
    it('should call composer setSize', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      updatePostProcessingSize(composer, 800, 600);
      expect(composer.setSize).toHaveBeenCalledWith(800, 600);
    });
  });

  describe('renderWithPostProcessing', () => {
    it('should call composer render', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      renderWithPostProcessing(composer);
      expect(composer.render).toHaveBeenCalled();
    });
  });

  describe('disposePostProcessing', () => {
    it('should call composer dispose', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      disposePostProcessing(composer);
      expect(composer.dispose).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/effects/post-processing.test.ts
```

### Step 6.2: Implement Post-Processing (GREEN)

Create `src/visualization/effects/post-processing.ts`:

```typescript
/**
 * Post-Processing Pipeline
 * Bloom, vignette, and antialiasing effects
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface BloomConfig {
  enabled: boolean;
  intensity: number;
  threshold: number;
  radius: number;
}

export interface VignetteConfig {
  enabled: boolean;
  darkness: number;
  offset: number;
}

export interface PostProcessingConfig {
  bloom?: Partial<BloomConfig>;
  vignette?: Partial<VignetteConfig>;
}

interface ResolvedConfig {
  bloom: BloomConfig;
  vignette: VignetteConfig;
}

export interface PostProcessingResult {
  composer: EffectComposer;
  config: ResolvedConfig;
  bloomPass?: UnrealBloomPass;
  vignettePass?: ShaderPass;
}

const DEFAULT_BLOOM: BloomConfig = {
  enabled: true,
  intensity: 0.6,
  threshold: 0.3,
  radius: 0.5,
};

const DEFAULT_VIGNETTE: VignetteConfig = {
  enabled: true,
  darkness: 0.4,
  offset: 0.3,
};

// Custom vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.4 },
    offset: { value: 0.3 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 center = vec2(0.5);
      float dist = distance(vUv, center);
      float vignette = smoothstep(0.8, offset, dist * (darkness + offset));
      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `,
};

/**
 * Creates post-processing pipeline
 * @param renderer - Three.js renderer
 * @param scene - Scene to render
 * @param camera - Camera for rendering
 * @param config - Effect configuration
 * @returns Composer and effect references
 */
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: PostProcessingConfig = {}
): PostProcessingResult {
  const resolvedConfig: ResolvedConfig = {
    bloom: { ...DEFAULT_BLOOM, ...config.bloom },
    vignette: { ...DEFAULT_VIGNETTE, ...config.vignette },
  };

  // Get renderer size
  const size = new THREE.Vector2();
  renderer.getSize(size);

  // Create composer
  const composer = new EffectComposer(renderer);

  // Render pass (scene to buffer)
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  let bloomPass: UnrealBloomPass | undefined;
  let vignettePass: ShaderPass | undefined;

  // Bloom pass
  if (resolvedConfig.bloom.enabled) {
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      resolvedConfig.bloom.intensity,
      resolvedConfig.bloom.radius,
      resolvedConfig.bloom.threshold
    );
    composer.addPass(bloomPass);
  }

  // Vignette pass
  if (resolvedConfig.vignette.enabled) {
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.darkness.value = resolvedConfig.vignette.darkness;
    vignettePass.uniforms.offset.value = resolvedConfig.vignette.offset;
    composer.addPass(vignettePass);
  }

  // Output pass (color correction)
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    config: resolvedConfig,
    bloomPass,
    vignettePass,
  };
}

/**
 * Updates post-processing render size
 * @param composer - Effect composer
 * @param width - New width
 * @param height - New height
 */
export function updatePostProcessingSize(
  composer: EffectComposer,
  width: number,
  height: number
): void {
  composer.setSize(width, height);
}

/**
 * Renders scene with post-processing
 * @param composer - Effect composer
 */
export function renderWithPostProcessing(composer: EffectComposer): void {
  composer.render();
}

/**
 * Disposes post-processing resources (INV-A009)
 * @param composer - Effect composer to dispose
 */
export function disposePostProcessing(composer: EffectComposer): void {
  composer.dispose();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/effects/post-processing.test.ts
```

### Step 6.3: Refactor

- [ ] Add SMAA antialiasing pass
- [ ] Add configurable tone mapping
- [ ] Optimize for WebGPU compatibility

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/effects/post-processing.ts` | CREATE | Effect pipeline |
| `src/visualization/effects/post-processing.test.ts` | CREATE | Post-processing tests |
| `src/visualization/effects/index.ts` | MODIFY | Add post-processing exports |

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Bloom visible on bright elements
- [ ] Vignette darkens screen edges
- [ ] Works with WebGPU renderer
- [ ] Falls back gracefully to WebGL
- [ ] INV-A009 verified (disposal tests pass)

---

*Template version: 1.0*
