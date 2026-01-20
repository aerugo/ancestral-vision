# WebGPU Graphics Engine Refactor - Work Notes

## Session: Initial Analysis

### Date: 2026-01-16

### Context

User requested a major graphics engine refactor after reviewing the webgpu-metaballs demo. The goal is to achieve similar visual polish for the Ancestral Vision constellation visualization.

### Key Insights from webgpu-metaballs Analysis

1. **Why it looks so good:**
   - Tri-planar texturing with animated flow creates organic surfaces
   - 4x MSAA eliminates jagged edges
   - Clustered lighting enables many point lights without performance loss
   - Proper PBR with smooth attenuation (no hard cutoffs)
   - Self-illumination/emissive for glowing surfaces
   - Light sprites provide visual feedback

2. **Architecture patterns worth adopting:**
   - Hybrid compute/render pipeline
   - Staging buffer ring for efficient uploads
   - Pipeline caching with async creation
   - GPU indirect drawing (avoids CPU-GPU sync)
   - Render bundles for static geometry

3. **What makes metaballs different from our nodes:**
   - Metaballs use marching cubes for dynamic isosurface mesh
   - Our nodes are fixed sphere geometry
   - We can still use their texturing/lighting techniques
   - Marching cubes is optional - could enable node blending effect

### Current Engine Limitations

Reviewed current implementation in:
- `src/visualization/materials/tsl-cloud-material.ts` - WGSL via TSL
- `src/visualization/instanced-constellation.ts` - Instanced rendering
- `src/components/constellation-canvas.tsx` - Three.js setup

**Issues identified:**
1. TSL abstraction limits direct WGSL optimization
2. No clustered lighting (forward rendering only)
3. No tri-planar texturing (procedural patterns only)
4. No GPU compute for effects
5. Post-processing through Three.js passes (limited)

### Decision Points

#### Q1: Keep Three.js or go pure WebGPU?

**Decision: Hybrid approach**
- Keep Three.js for scene graph, camera controls, GLTF loading
- Add custom WebGPU pipelines for materials, lighting, effects
- Access raw GPUDevice through WebGPURenderer internals

Rationale: Three.js provides significant value for scene management. Pure WebGPU would require reimplementing too much infrastructure.

#### Q2: Use marching cubes for nodes?

**Decision: Defer to later phase (optional)**
- Current sphere geometry works for family tree aesthetic
- Marching cubes adds complexity
- Could be nice for "close family" visual blending

#### Q3: Texture source for flowing surfaces?

**Decision: Start with pre-baked textures**
- Load lava/energy textures from assets
- Apply tri-planar projection with flow animation
- Add procedural generation later if needed

### Implementation Priority

Based on visual impact vs. complexity:

1. **Tri-planar flowing textures** (HIGH impact, MEDIUM complexity)
   - Most visible improvement
   - Makes nodes look organic/alive
   - Reference: metaballs lava style

2. **4x MSAA** (HIGH impact, LOW complexity)
   - Immediate quality improvement
   - Simple to enable

3. **Clustered lighting** (MEDIUM impact, HIGH complexity)
   - Enables many point lights
   - Required for proper light-per-node effect
   - Complex but well-documented pattern

4. **GPU compute particles** (MEDIUM impact, MEDIUM complexity)
   - Better background particles
   - Edge flow animation
   - Good GPU utilization

5. **Light sprites** (LOW impact, LOW complexity)
   - Visual polish
   - Easy to add once lighting works

### Technical Notes

#### Accessing Three.js WebGPU internals

```typescript
// Three.js WebGPURenderer exposes device after init
const renderer = new WebGPURenderer();
await renderer.init();

// Access internal device (may need to cast/access private)
const backend = renderer.backend;
const device = backend.device;
const context = backend.context;
```

Need to verify exact API - Three.js may have changed this in r171+.

#### WGSL vs TSL

Current TSL approach using `wgslFn`:
```typescript
const shader = wgslFn(`
  fn myShader(...) -> vec4<f32> { ... }
`);
```

This works but:
- Limited to single function
- No control over bind groups
- No compute shader support
- Can't use render bundles

New approach: Direct WGSL pipelines:
```typescript
const module = device.createShaderModule({
  code: `
    @group(0) @binding(0) var<uniform> camera: CameraUniforms;
    @group(1) @binding(0) var baseTexture: texture_2d<f32>;

    @vertex fn vs(...) -> VertexOutput { ... }
    @fragment fn fs(...) -> @location(0) vec4f { ... }
  `
});
```

Full control over everything.

### Assets Needed

1. **Textures:**
   - Lava/energy texture (similar to metaballs demo)
   - Nebula/celestial texture
   - Gold pattern texture (Klimt-inspired)
   - Noise textures for FBM

2. **Reference images:**
   - Hilma af Klint paintings
   - Gustav Klimt gold patterns
   - Sacred geometry patterns

### User Decisions (2026-01-16)

1. **Visual style for central nodes:**
   - ✅ All three styles - assign randomly per node
   - Lava/fire, Celestial/nebula, Sacred/golden
   - Allows visual variety and user can pick favorites

2. **Node blending/merging:**
   - ❌ No marching cubes needed
   - Keep individual sphere geometry
   - Simplifies implementation significantly

3. **Performance targets:**
   - 200-300 nodes maximum
   - Desktop or high-powered iPad
   - Clustered lighting still valuable at this scale

### Phase 0 Completion (2026-01-16)

- [x] Created feature branch: `feat/webgpu-engine-v2`
- [x] device-manager.ts - WebGPU device access with pipeline caching
- [x] staging-ring.ts - Efficient CPU-to-GPU data transfer
- [x] three-integration.ts - Three.js render hooks
- [x] Visual presets (lava, celestial, sacred) with random assignment
- ⚠️ Diverged: Pulled forward Phase 3 visual preset work
- ⚠️ Skipped: Phase 0 infrastructure tests (backfill needed)

### Phase 1 Completion (2026-01-16) - TDD

Following TDD principles - tests written before implementation:

- [x] render-pass.ts (21 tests) - Priority-based render pass management
- [x] pipeline-factory.ts (21 tests) - Async pipeline creation with caching
- [x] msaa.ts (25 tests) - Multi-sample anti-aliasing texture management
- [x] camera-uniforms.ts (20 tests) - Camera matrix packing for shaders

**Total: 87 passing tests for Phase 1**

### Phase 2 Completion (2026-01-16) - TDD

Implemented clustered deferred lighting system following strict TDD:

- [x] light-manager.ts (41 tests) - Point light storage and GPU buffer sync
- [x] cluster-grid.ts (32 tests) - 3D cluster subdivision (8×8×12 = 768 clusters)
- [x] cluster-compute.ts (25 tests) - Compute shader dispatch for light culling

WGSL Shaders created:
- cluster-bounds.wgsl - Computes AABB bounds using logarithmic depth slicing
- light-assignment.wgsl - Sphere-AABB intersection with atomic operations
- lighting.wgsl - Fragment utilities for PBR (Lambertian + Blinn-Phong)

**Total: 98 passing tests for Phase 2 (185 total engine tests)**

### Phase 3 Completion (2026-01-16) - TDD

Implemented node materials and texturing system following strict TDD:

- [x] texture-manager.ts (38 tests) - Texture loading, caching, procedural generation
- [x] flowing-material.ts (37 tests) - Animated tri-planar material with flow effects
- [x] presets.ts (29 tests) - Material presets (lava, celestial, sacred)

WGSL Shaders created:
- triplanar.wgsl - Tri-planar texture projection utilities
- flowing-surface.wgsl - Animated flow material with FBM noise
- pbr.wgsl - Full PBR lighting (GGX, Fresnel, tone mapping)

**Total: 104 passing tests for Phase 3 (289 total engine tests)**

### Next Session

- [ ] Phase 4: Compute-Based Effects
  - [ ] Particle system compute shader
  - [ ] Edge flow animation
  - [ ] GPU indirect drawing
  - [ ] Light sprites

---

## References

- [webgpu-metaballs](https://github.com/toji/webgpu-metaballs) - Main reference
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [Three.js WebGPU](https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU)
- [Protean Clouds Shadertoy](https://www.shadertoy.com/view/3sffzj)
