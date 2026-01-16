# Feature: WebGPU Graphics Engine

**Status**: Draft
**Created**: 2026-01-16
**User Stories**: US-2.1 (Constellation Visualization), US-2.2 (Visual Effects)

## Goal

Build a comprehensive WebGPU graphics engine using Three.js TSL for stunning visual effects including bloom, particles, glow, smoke, and reflections for the Ancestral Vision constellation visualization.

## Background

The current implementation has two separate rendering paths:
- **WebGL**: Uses EffectComposer with UnrealBloomPass for post-processing effects
- **WebGPU**: Falls back to additive blending only, missing true bloom and other effects

Three.js TSL (Three Shading Language) provides a unified shader system that works across both WebGPU and WebGL backends. The TSL post-processing effects are available in `three/addons/tsl/display/` and include BloomNode, GaussianBlurNode, DOF, chromatic aberration, and more.

### Key Research Findings

1. **BloomNode API** (`three/addons/tsl/display/BloomNode.js`):
   - `bloom(node, strength=1, radius=0, threshold=0)` - Creates bloom effect
   - Uses 5-level mip chain with separable Gaussian blur
   - Supports selective bloom via emissive MRT channel

2. **Available TSL Effects**:
   - `bloom()` - HDR bloom with luminance threshold
   - `gaussianBlur()` - Configurable separable blur
   - `anamorphic()` - Cinematic lens flares
   - `dof()` - Depth of field with bokeh
   - `chromaticAberration()` - RGB color fringing
   - `film()` - Film grain noise
   - `fxaa()` / `smaa()` - Anti-aliasing
   - `lensflare()` - Bloom-based lens artifacts

3. **PostProcessing Pattern**:
   ```javascript
   import * as THREE from 'three/webgpu';
   import { pass } from 'three/tsl';
   import { bloom } from 'three/addons/tsl/display/BloomNode.js';

   const postProcessing = new THREE.PostProcessing(renderer);
   const scenePass = pass(scene, camera);
   const scenePassColor = scenePass.getTextureNode('output');
   const bloomPass = bloom(scenePassColor, strength, radius, threshold);
   postProcessing.outputNode = scenePassColor.add(bloomPass);
   ```

## Acceptance Criteria

- [ ] AC1: Bloom effect renders identically on WebGPU and WebGL backends
- [ ] AC2: Node spheres have visible ethereal glow halos matching prototype
- [ ] AC3: Internal mandala/swirl patterns visible on node surfaces
- [ ] AC4: Background particles appear as bright stars with subtle glow
- [ ] AC5: All effects can be controlled via uniform parameters at runtime
- [ ] AC6: Performance maintains 60fps on M1 Mac with 100+ nodes
- [ ] AC7: All resources properly disposed on cleanup (INV-A009)

## Technical Requirements

### Post-Processing Pipeline

- TSL-based PostProcessing with bloom, vignette, and optional effects
- Correct import from `three/addons/tsl/display/BloomNode.js`
- Scene pass with MRT for selective bloom via emissive channel
- Compositing with tone mapping and color correction

### Node Material System

- Enhanced MeshStandardNodeMaterial with TSL shaders
- Inner glow via Fresnel-based rim lighting
- Subsurface scattering approximation for luminosity
- Animated mandala/sacred geometry patterns
- Additive blending for ethereal appearance

### Particle Systems

- Background star field with PointsNodeMaterial
- Firefly/dust particles with animated trails
- Optional smoke/fog volumetric effects
- Point size responsive to camera distance

### Graphics Engine API

```typescript
interface GraphicsEngine {
  // Initialization
  init(canvas: HTMLCanvasElement): Promise<void>;

  // Post-processing
  setBloomParams(strength: number, radius: number, threshold: number): void;
  setVignetteParams(darkness: number, offset: number): void;

  // Materials
  createNodeMaterial(config: NodeMaterialConfig): NodeMaterialResult;
  createEdgeMaterial(config: EdgeMaterialConfig): EdgeMaterialResult;

  // Particles
  createParticleSystem(config: ParticleConfig): ParticleSystemResult;

  // Render loop
  render(): void;

  // Cleanup
  dispose(): void;
}
```

## Dependencies

- Three.js 0.182.0+ (current: 0.182.0 ✓)
- WebGPU browser support (with WebGL fallback)
- Existing constellation-canvas.tsx component
- Existing visualization module structure

## Out of Scope

- Custom WGSL compute shaders (use TSL abstractions)
- Ray tracing effects
- Volumetric lighting (deferred to future phase)
- VR/AR support

## Security Considerations

- No security implications for rendering engine
- All shader code is bundled, not user-provided

## Performance Considerations

- Multi-level bloom mip chain (5 levels) for quality/performance balance
- Separable Gaussian blur reduces complexity from O(N²) to O(2N)
- HalfFloatType textures for HDR precision without full float overhead
- Instanced rendering for node and particle systems
- Automatic size adjustment on window resize

## Open Questions

- [x] Q1: Does Three.js TSL have a bloom function? **Yes** - `bloom()` from `three/addons/tsl/display/BloomNode.js`
- [x] Q2: What is the correct import pattern? **Answered** - See Background section
- [ ] Q3: Should we use MRT for selective bloom (emissive-only) or apply to entire scene?

## References

- [Three.js TSL Documentation](https://threejs.org/docs/pages/TSL.html)
- [Three.js Shading Language Wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- [WebGPU Bloom Example](https://threejs.org/examples/webgpu_postprocessing_bloom.html)
- [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/)
- [BloomNode Source](node_modules/three/examples/jsm/tsl/display/BloomNode.js)

---

*Template version: 1.0*
