# WebGPU Graphics Engine Refactor - Development Plan

## Phase Overview

| Phase | Name | Duration | Priority |
|-------|------|----------|----------|
| 0 | Infrastructure & Access | Foundation | Critical |
| 1 | Core Rendering Pipeline | Large | Critical |
| 2 | Clustered Lighting | Medium | High |
| 3 | Node Materials & Texturing | Medium | High |
| 4 | Compute-Based Effects | Medium | Medium |
| 5 | Polish & Optimization | Medium | Medium |

---

## Phase 0: Infrastructure & Access

**Goal:** Establish low-level WebGPU access while keeping Three.js for scene management.

### Tasks

#### 0.1 Create WebGPU Device Manager
```typescript
// src/visualization/engine/device-manager.ts
interface DeviceManager {
  device: GPUDevice;
  adapter: GPUAdapter;
  context: GPUCanvasContext;
  format: GPUTextureFormat;

  // Access Three.js renderer internals
  getThreeDevice(): GPUDevice;

  // Resource management
  createBuffer(desc: GPUBufferDescriptor): GPUBuffer;
  createTexture(desc: GPUTextureDescriptor): GPUTexture;

  // Pipeline caching
  getOrCreatePipeline(key: string, factory: () => GPURenderPipeline): GPURenderPipeline;
}
```

#### 0.2 Create Staging Buffer Ring
```typescript
// src/visualization/engine/staging-ring.ts
interface StagingBufferRing {
  // Ring of staging buffers to avoid stalls
  acquireBuffer(size: number): Promise<GPUBuffer>;
  releaseBuffer(buffer: GPUBuffer): void;

  // Efficient data upload
  uploadData(target: GPUBuffer, data: ArrayBuffer): void;
}
```

#### 0.3 Integrate with Three.js WebGPURenderer
```typescript
// src/visualization/engine/three-integration.ts
interface ThreeIntegration {
  // Hook into Three.js render loop
  onBeforeRender(callback: () => void): void;
  onAfterRender(callback: () => void): void;

  // Access internal resources
  getDepthTexture(): GPUTexture;
  getColorTexture(): GPUTexture;
  getBindGroup(type: 'camera' | 'lights'): GPUBindGroup;
}
```

### Files to Create
- `src/visualization/engine/device-manager.ts`
- `src/visualization/engine/staging-ring.ts`
- `src/visualization/engine/three-integration.ts`
- `src/visualization/engine/index.ts`

### Tests
- Device initialization and fallback
- Staging buffer allocation/release
- Three.js integration hooks

---

## Phase 1: Core Rendering Pipeline

**Goal:** Establish custom render pipeline that works alongside Three.js.

### Tasks

#### 1.1 Create Render Pass Manager
```typescript
// src/visualization/engine/render-pass.ts
interface RenderPassManager {
  // Configure passes
  addPass(name: string, config: RenderPassConfig): void;
  removePass(name: string): void;

  // Execute
  execute(encoder: GPUCommandEncoder): void;
}

interface RenderPassConfig {
  colorAttachments: GPURenderPassColorAttachment[];
  depthAttachment?: GPURenderPassDepthStencilAttachment;
  pipeline: GPURenderPipeline;
  bindGroups: GPUBindGroup[];
  drawCalls: DrawCall[];
}
```

#### 1.2 Create Pipeline Factory
```typescript
// src/visualization/engine/pipeline-factory.ts
interface PipelineFactory {
  // Async creation for non-blocking init
  createRenderPipelineAsync(desc: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
  createComputePipelineAsync(desc: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;

  // Cached access
  getCachedPipeline(key: string): GPURenderPipeline | null;
}
```

#### 1.3 Implement MSAA Support
```typescript
// Enable 4x MSAA
const SAMPLE_COUNT = 4;

// Create MSAA texture
const msaaTexture = device.createTexture({
  size: [width, height],
  format: 'bgra8unorm',
  sampleCount: SAMPLE_COUNT,
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});
```

#### 1.4 Create Camera Uniform Buffer
```typescript
// src/visualization/engine/camera-uniforms.ts
struct CameraUniforms {
  projectionMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  inverseProjection: mat4x4<f32>,
  position: vec3<f32>,
  near: f32,
  far: f32,
  time: f32,
}
```

### Files to Create
- `src/visualization/engine/render-pass.ts`
- `src/visualization/engine/pipeline-factory.ts`
- `src/visualization/engine/camera-uniforms.ts`
- `src/visualization/engine/msaa.ts`

### Tests
- Render pass execution order
- Pipeline caching
- MSAA texture creation
- Camera uniform updates

---

## Phase 2: Clustered Lighting

**Goal:** Implement clustered deferred lighting for scalable multi-light support.

### Tasks

#### 2.1 Create Light Manager
```typescript
// src/visualization/engine/lights/light-manager.ts
interface LightManager {
  maxLights: number; // e.g., 1024

  // Light data stored in GPU buffer
  lightsBuffer: GPUBuffer;
  lightCountBuffer: GPUBuffer;

  // Add/update/remove lights
  addLight(light: PointLight): number;
  updateLight(id: number, light: PointLight): void;
  removeLight(id: number): void;

  // Upload to GPU
  sync(): void;
}

interface PointLight {
  position: vec3;
  range: number;
  color: vec3;
  intensity: number;
}
```

#### 2.2 Create Cluster Grid
```typescript
// src/visualization/engine/lights/cluster-grid.ts
const TILE_COUNT = [8, 8, 12]; // 768 clusters
const MAX_LIGHTS_PER_CLUSTER = 20;

interface ClusterGrid {
  // GPU buffers
  clusterBoundsBuffer: GPUBuffer;
  clusterLightsBuffer: GPUBuffer;
  clusterIndicesBuffer: GPUBuffer;

  // Bind group for fragment shader access
  bindGroup: GPUBindGroup;
}
```

#### 2.3 Cluster Bounds Compute Shader
```wgsl
// src/visualization/engine/lights/shaders/cluster-bounds.wgsl
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
  let tileIndex = globalId.x + globalId.y * TILE_COUNT.x + globalId.z * TILE_COUNT.x * TILE_COUNT.y;

  // Calculate AABB in view space for this cluster
  let minPoint = screenToView(tileMin, zNear);
  let maxPoint = screenToView(tileMax, zFar);

  clusterBounds[tileIndex] = AABB(minPoint, maxPoint);
}
```

#### 2.4 Light Assignment Compute Shader
```wgsl
// src/visualization/engine/lights/shaders/light-assignment.wgsl
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
  let lightIndex = globalId.x;
  if (lightIndex >= lightCount) { return; }

  let light = lights[lightIndex];
  let lightPosView = (viewMatrix * vec4(light.position, 1.0)).xyz;

  // Check each cluster for intersection
  for (var i = 0u; i < CLUSTER_COUNT; i++) {
    if (sphereAABBIntersect(lightPosView, light.range, clusterBounds[i])) {
      let offset = atomicAdd(&clusters[i].count, 1u);
      if (offset < MAX_LIGHTS_PER_CLUSTER) {
        clusterIndices[i * MAX_LIGHTS_PER_CLUSTER + offset] = lightIndex;
      }
    }
  }
}
```

#### 2.5 Fragment Shader Integration
```wgsl
// Access clustered lights in fragment shader
fn getClusterIndex(fragCoord: vec2f, depth: f32) -> u32 {
  let tile = vec2u(fragCoord / TILE_SIZE);
  let slice = u32(log(depth / zNear) / log(zFar / zNear) * f32(TILE_COUNT.z));
  return tile.x + tile.y * TILE_COUNT.x + slice * TILE_COUNT.x * TILE_COUNT.y;
}

fn computeLighting(position: vec3f, normal: vec3f, albedo: vec3f) -> vec3f {
  let clusterIdx = getClusterIndex(fragCoord, depth);
  let cluster = clusters[clusterIdx];

  var totalLight = vec3f(0.0);
  for (var i = 0u; i < cluster.count && i < MAX_LIGHTS_PER_CLUSTER; i++) {
    let lightIdx = clusterIndices[clusterIdx * MAX_LIGHTS_PER_CLUSTER + i];
    let light = lights[lightIdx];
    totalLight += evaluatePointLight(light, position, normal, albedo);
  }
  return totalLight;
}
```

### Files to Create
- `src/visualization/engine/lights/light-manager.ts`
- `src/visualization/engine/lights/cluster-grid.ts`
- `src/visualization/engine/lights/cluster-compute.ts`
- `src/visualization/engine/lights/shaders/cluster-bounds.wgsl`
- `src/visualization/engine/lights/shaders/light-assignment.wgsl`
- `src/visualization/engine/lights/shaders/lighting.wgsl`

### Tests
- Light manager add/remove
- Cluster grid initialization
- Compute shader dispatch
- Light-cluster intersection

---

## Phase 3: Node Materials & Texturing

**Goal:** Implement tri-planar texturing with animated flow for organic surfaces.

### Tasks

#### 3.1 Create Texture Manager
```typescript
// src/visualization/engine/textures/texture-manager.ts
interface TextureManager {
  // Load and cache textures
  loadTexture(url: string): Promise<GPUTexture>;
  getTexture(name: string): GPUTexture;

  // Procedural texture generation
  generateNoiseTexture(width: number, height: number): GPUTexture;
  generateFlowTexture(width: number, height: number): GPUTexture;
}
```

#### 3.2 Tri-Planar Projection Shader
```wgsl
// src/visualization/engine/materials/shaders/triplanar.wgsl
fn triplanarSample(
  tex: texture_2d<f32>,
  samp: sampler,
  worldPos: vec3f,
  normal: vec3f,
  flow: vec3f,
  scale: f32
) -> vec4f {
  // UV coordinates for each projection plane
  let uvX = worldPos.yz * scale + flow.yz;
  let uvY = worldPos.xz * scale + flow.xz;
  let uvZ = worldPos.xy * scale + flow.xy;

  // Sample from all three projections
  let texX = textureSample(tex, samp, uvX);
  let texY = textureSample(tex, samp, uvY);
  let texZ = textureSample(tex, samp, uvZ);

  // Blend weights based on surface normal
  let blending = pow(abs(normal), vec3f(4.0));
  let blendSum = blending.x + blending.y + blending.z;
  let normalizedBlend = blending / blendSum;

  // Final blended color
  return texX * normalizedBlend.x + texY * normalizedBlend.y + texZ * normalizedBlend.z;
}
```

#### 3.3 Animated Flow Material
```wgsl
// src/visualization/engine/materials/shaders/flowing-surface.wgsl
struct FlowingMaterial {
  baseColor: vec3f,
  emissive: vec3f,
  emissiveStrength: f32,
  flowSpeed: f32,
  flowScale: f32,
  turbulence: f32,
}

fn flowingMaterialColor(
  worldPos: vec3f,
  normal: vec3f,
  time: f32,
  material: FlowingMaterial
) -> vec4f {
  // Calculate flow offset
  let flowOffset = vec3f(
    sin(time * material.flowSpeed * 0.3) * 0.2,
    time * material.flowSpeed * 0.1,
    cos(time * material.flowSpeed * 0.2) * 0.15
  );

  // Tri-planar texture sampling with flow
  let surfaceColor = triplanarSample(
    baseTexture, baseSampler,
    worldPos, normal, flowOffset,
    material.flowScale
  );

  // Add turbulence noise
  let noise = fbmNoise(worldPos * material.turbulence + flowOffset);
  let finalColor = mix(surfaceColor.rgb, material.baseColor, noise * 0.3);

  // Self-illumination
  let emissive = material.emissive * material.emissiveStrength * (0.5 + noise * 0.5);

  return vec4f(finalColor + emissive, 1.0);
}
```

#### 3.4 PBR Lighting Functions
```wgsl
// src/visualization/engine/materials/shaders/pbr.wgsl
fn evaluatePointLight(
  light: PointLight,
  position: vec3f,
  normal: vec3f,
  albedo: vec3f,
  metallic: f32,
  roughness: f32
) -> vec3f {
  let L = normalize(light.position - position);
  let distance = length(light.position - position);

  // Smooth attenuation
  let attenuation = lightAttenuation(distance, light.range);
  let radiance = light.color * light.intensity * attenuation;

  // Simplified BRDF (can upgrade to Cook-Torrance later)
  let NdotL = max(dot(normal, L), 0.0);
  let F0 = mix(vec3f(0.04), albedo, metallic);

  // Diffuse + ambient
  let diffuse = (albedo / PI) * radiance * NdotL;

  return diffuse;
}

fn lightAttenuation(distance: f32, range: f32) -> f32 {
  let s = distance / range;
  if (s >= 1.0) { return 0.0; }
  let s2 = s * s;
  let os2 = 1.0 - s2;
  return (os2 * os2) / (1.0 + 4.0 * s);  // Smooth falloff
}
```

#### 3.5 Lava/Energy Texture Presets
```typescript
// src/visualization/engine/materials/presets.ts
export const MATERIAL_PRESETS = {
  lava: {
    textureUrl: '/textures/lava.jpg',
    baseColor: [0.9, 0.3, 0.1],
    emissive: [1.0, 0.4, 0.0],
    emissiveStrength: 2.0,
    flowSpeed: 0.5,
    flowScale: 0.3,
    turbulence: 2.0,
  },

  celestial: {
    textureUrl: '/textures/nebula.jpg',
    baseColor: [0.3, 0.4, 0.8],
    emissive: [0.5, 0.6, 1.0],
    emissiveStrength: 1.5,
    flowSpeed: 0.3,
    flowScale: 0.4,
    turbulence: 1.5,
  },

  sacred: {
    textureUrl: '/textures/gold-pattern.jpg',
    baseColor: [0.85, 0.7, 0.3],
    emissive: [0.9, 0.8, 0.4],
    emissiveStrength: 1.0,
    flowSpeed: 0.2,
    flowScale: 0.5,
    turbulence: 1.0,
  },
};
```

### Files to Create
- `src/visualization/engine/textures/texture-manager.ts`
- `src/visualization/engine/materials/flowing-material.ts`
- `src/visualization/engine/materials/presets.ts`
- `src/visualization/engine/materials/shaders/triplanar.wgsl`
- `src/visualization/engine/materials/shaders/flowing-surface.wgsl`
- `src/visualization/engine/materials/shaders/pbr.wgsl`
- `public/textures/lava.jpg`
- `public/textures/nebula.jpg`
- `public/textures/gold-pattern.jpg`

### Tests
- Texture loading and caching
- Tri-planar UV calculation
- Flow animation
- Light attenuation curve

---

## Phase 4: Compute-Based Effects

**Goal:** Leverage GPU compute for particle systems and dynamic effects.

### Tasks

#### 4.1 Particle System Compute Shader
```wgsl
// src/visualization/engine/particles/shaders/particle-sim.wgsl
struct Particle {
  position: vec3f,
  velocity: vec3f,
  life: f32,
  size: f32,
}

@compute @workgroup_size(256)
fn simulate(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  if (idx >= particleCount) { return; }

  var p = particles[idx];

  // Update position
  p.position += p.velocity * deltaTime;

  // Apply forces (gravity, attraction to nodes)
  p.velocity += gravity * deltaTime;

  // Decay life
  p.life -= deltaTime;

  // Respawn dead particles
  if (p.life <= 0.0) {
    p = spawnParticle(idx);
  }

  particles[idx] = p;
}
```

#### 4.2 Edge Flow Animation Compute
```wgsl
// src/visualization/engine/edges/shaders/edge-flow.wgsl
struct EdgeVertex {
  position: vec3f,
  flowPhase: f32,
  intensity: f32,
}

@compute @workgroup_size(64)
fn animateEdges(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  if (idx >= edgeVertexCount) { return; }

  var v = edgeVertices[idx];

  // Update flow phase
  v.flowPhase = fract(v.flowPhase + flowSpeed * deltaTime);

  // Pulsing intensity
  v.intensity = 0.5 + 0.5 * sin(v.flowPhase * 2.0 * PI + time);

  edgeVertices[idx] = v;
}
```

#### 4.3 GPU Indirect Drawing
```typescript
// src/visualization/engine/indirect-draw.ts
interface IndirectDrawBuffer {
  // Indirect draw arguments populated by compute
  buffer: GPUBuffer;

  // Compute shader updates count
  updateCount(encoder: GPUCommandEncoder): void;
}

// Usage: drawIndexedIndirect for variable particle count
renderPass.drawIndexedIndirect(indirectBuffer.buffer, 0);
```

#### 4.4 Light Sprite Rendering
```wgsl
// src/visualization/engine/lights/shaders/light-sprite.wgsl
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  let light = lights[instanceIndex];

  // Billboard quad vertices
  let quadVertices = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let vertex = quadVertices[vertexIndex];
  let size = sqrt(light.intensity) * 0.1;

  // Billboard in view space
  let viewPos = (viewMatrix * vec4f(light.position, 1.0)).xyz;
  viewPos.xy += vertex * size;

  var output: VertexOutput;
  output.position = projectionMatrix * vec4f(viewPos, 1.0);
  output.color = light.color;
  output.uv = vertex * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Radial falloff for soft glow
  let dist = length(input.uv - vec2f(0.5));
  let alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  return vec4f(input.color * alpha, alpha);
}
```

### Files to Create
- `src/visualization/engine/particles/particle-system.ts`
- `src/visualization/engine/particles/shaders/particle-sim.wgsl`
- `src/visualization/engine/particles/shaders/particle-render.wgsl`
- `src/visualization/engine/edges/edge-flow.ts`
- `src/visualization/engine/edges/shaders/edge-flow.wgsl`
- `src/visualization/engine/indirect-draw.ts`
- `src/visualization/engine/lights/light-sprites.ts`
- `src/visualization/engine/lights/shaders/light-sprite.wgsl`

### Tests
- Particle spawn/despawn
- Compute dispatch sizes
- Indirect draw buffer
- Light sprite billboarding

---

## Phase 5: Polish & Optimization

**Goal:** Achieve final visual quality and performance targets.

### Tasks

#### 5.1 Post-Processing Pipeline
- Bloom for emissive surfaces
- Tone mapping (ACES or Uncharted 2)
- Vignette (subtle)
- Optional: Depth of field

#### 5.2 Anti-Aliasing
- Enable 4x MSAA (built into render pipeline)
- Optional: FXAA/SMAA as post-process

#### 5.3 Performance Profiling
```typescript
// src/visualization/engine/profiler.ts
interface GPUProfiler {
  // Timestamp queries
  beginFrame(): void;
  markSection(name: string): void;
  endFrame(): void;

  // Results
  getTimings(): Map<string, number>;
}
```

#### 5.4 Render Bundles for Static Geometry
```typescript
// Pre-record draw commands for static objects
const bundle = device.createRenderBundle({
  colorFormats: [format],
  depthStencilFormat: 'depth24plus',
  sampleCount: 4,
});

// Execute bundle in render pass
renderPass.executeBundles([staticBundle]);
```

#### 5.5 Level of Detail (LOD)
- Reduce sphere segments for distant nodes
- Simplify materials for far objects
- Cull off-screen particles

#### 5.6 Memory Management
- Pool GPU buffers for particles
- Texture atlas for node textures
- Lazy loading of high-res textures

### Files to Create
- `src/visualization/engine/post-processing/bloom.ts`
- `src/visualization/engine/post-processing/tone-mapping.ts`
- `src/visualization/engine/profiler.ts`
- `src/visualization/engine/lod-manager.ts`

### Tests
- Bloom intensity
- Frame timing consistency
- Memory usage benchmarks

---

## Integration Strategy

### Step 1: Parallel Development
Keep existing Three.js rendering working while building new engine in parallel.

### Step 2: Feature Flags
```typescript
const ENGINE_CONFIG = {
  useClusteredLighting: true,
  useTriplanarTexturing: true,
  useComputeParticles: true,
  useMSAA: true,
  debugMode: false,
};
```

### Step 3: Gradual Migration
1. Replace node materials first (most visible improvement)
2. Add clustered lighting
3. Switch particle system to compute
4. Enable full post-processing

### Step 4: Fallback Path
```typescript
if (!navigator.gpu || !device.features.has('timestamp-query')) {
  // Fall back to Three.js-only rendering
  return new ThreeJSFallbackRenderer();
}
```

---

## File Structure

```
src/visualization/engine/
├── index.ts                    # Public API
├── device-manager.ts           # GPU device management
├── staging-ring.ts             # Buffer staging
├── three-integration.ts        # Three.js hooks
├── render-pass.ts              # Render pass management
├── pipeline-factory.ts         # Pipeline creation/caching
├── camera-uniforms.ts          # Camera data
├── msaa.ts                     # MSAA setup
├── profiler.ts                 # GPU timing
├── lod-manager.ts              # Level of detail
├── indirect-draw.ts            # GPU indirect rendering
│
├── lights/
│   ├── light-manager.ts
│   ├── cluster-grid.ts
│   ├── cluster-compute.ts
│   ├── light-sprites.ts
│   └── shaders/
│       ├── cluster-bounds.wgsl
│       ├── light-assignment.wgsl
│       ├── lighting.wgsl
│       └── light-sprite.wgsl
│
├── materials/
│   ├── flowing-material.ts
│   ├── presets.ts
│   └── shaders/
│       ├── triplanar.wgsl
│       ├── flowing-surface.wgsl
│       └── pbr.wgsl
│
├── textures/
│   └── texture-manager.ts
│
├── particles/
│   ├── particle-system.ts
│   └── shaders/
│       ├── particle-sim.wgsl
│       └── particle-render.wgsl
│
├── edges/
│   ├── edge-flow.ts
│   └── shaders/
│       └── edge-flow.wgsl
│
└── post-processing/
    ├── bloom.ts
    └── tone-mapping.ts
```

---

## Milestones

| Milestone | Deliverable | Criteria |
|-----------|-------------|----------|
| M1 | Infrastructure | Device manager, staging ring, Three.js hooks working |
| M2 | Basic Render | Custom render pass alongside Three.js, MSAA enabled |
| M3 | Lighting | Clustered lighting with 100+ lights at 60fps |
| M4 | Materials | Tri-planar flowing materials on central nodes |
| M5 | Compute Effects | GPU particle system, edge flow animation |
| M6 | Polish | Bloom, profiling, LOD, memory optimization |
| M7 | Release | All features integrated, documented, tested |

---

## Open Questions

1. **Should we use marching cubes for node blending?**
   - Pro: Organic merging between close nodes
   - Con: Complexity, may not fit family tree aesthetic

2. **Texture source for flowing surfaces?**
   - Option A: Procedural (compute shader)
   - Option B: Pre-baked (load from assets)
   - Recommendation: Start with pre-baked, add procedural later

3. **How much of Three.js to keep?**
   - Minimum: Scene graph, camera controls, GLTF loading
   - Maximum: Post-processing, materials, render loop
   - Recommendation: Keep scene graph, replace materials and add custom passes

4. **WebGL2 fallback scope?**
   - Option A: Full feature parity (expensive to maintain)
   - Option B: Basic rendering only
   - Recommendation: Basic rendering with reduced features

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Three.js WebGPU changes | Medium | High | Pin version, abstract access |
| Performance regression | Medium | High | Benchmark each phase |
| Browser bugs | Low | Medium | Feature detection, workarounds |
| Scope creep | High | Medium | Strict milestone gates |

---

## Next Steps

1. Review and approve this plan
2. Create branch `feat/webgpu-engine-v2`
3. Begin Phase 0 implementation
4. Set up GPU profiling early for benchmarking
