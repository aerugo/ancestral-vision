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

### Next Session

- [ ] Review plan with user
- [ ] Get approval for Phase 0 start
- [ ] Create feature branch
- [ ] Begin device manager implementation

---

## References

- [webgpu-metaballs](https://github.com/toji/webgpu-metaballs) - Main reference
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [Three.js WebGPU](https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU)
- [Protean Clouds Shadertoy](https://www.shadertoy.com/view/3sffzj)
