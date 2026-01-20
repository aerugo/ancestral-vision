# WebGPU Graphics Engine Refactor

## Overview

Major refactor of the Ancestral Vision graphics engine to leverage WebGPU's full capabilities, inspired by the visual polish of [webgpu-metaballs](https://github.com/toji/webgpu-metaballs). The goal is to achieve professional-grade rendering quality with flowing, organic visuals.

## Current State

The current graphics engine uses:
- Three.js r171+ with WebGPURenderer
- TSL (Three Shading Language) for materials via `wgslFn`
- Instanced meshes for constellation nodes
- Basic forward rendering
- Post-processing via Three.js passes

**Limitations:**
- No clustered lighting (limited scalability)
- No GPU compute for dynamic effects
- Forward rendering only
- No tri-planar texturing
- TSL abstraction limits direct WGSL optimization
- No render bundles or indirect rendering

## Target State

A hybrid rendering architecture that:
1. Keeps Three.js for scene graph management and convenience
2. Adds custom WebGPU compute pipelines for dynamic effects
3. Implements clustered deferred lighting
4. Uses tri-planar texturing for organic surfaces
5. Enables GPU indirect rendering
6. Achieves visual parity with webgpu-metaballs demo

## Visual Goals

### Constellation Nodes (Central Nodes - "Illuminated Planets")
- **Flowing lava/energy surface** like metaballs demo
- Tri-planar projected textures with animated flow
- Self-illumination with proper emissive
- Smooth organic movement
- Optional: Isosurface blending between close nodes (marching cubes)

### Constellation Nodes (Peripheral)
- PBR materials with proper metallic/roughness
- Clustered lighting response
- Subtle glow/bloom

### Edge Connections
- GPU-computed flow animation
- Light-reactive materials
- Energy pulse effects

### Environment
- Background particles with GPU compute
- Sacred geometry grid
- Volumetric effects (optional)

## Key Techniques from webgpu-metaballs

### 1. Clustered Deferred Lighting
- Screen-space 8×8×12 tile grid (768 clusters)
- Compute shader assigns lights to clusters
- Fragment shader queries cluster for relevant lights
- Scales to 1000+ lights without performance degradation

### 2. GPU Compute Pipelines
- Isosurface field computation
- Marching cubes triangulation
- Cluster bounds calculation
- Light assignment

### 3. Tri-Planar Texturing
```wgsl
// Project world position onto three planes
uvX = worldPosition.yz + flow.yz
uvY = worldPosition.xz + flow.xz
uvZ = worldPosition.xy + flow.xy

// Blend based on surface normal
blending = normalize(max(abs(normal), 0.00001))
tex = xTex * blending.x + yTex * blending.y + zTex * blending.z
```

### 4. PBR Lighting Model
- Cook-Torrance BRDF (optional, for specular)
- Proper light attenuation with smooth falloff
- Fresnel term for metallics
- Ambient occlusion

### 5. Performance Optimizations
- 4x MSAA anti-aliasing
- Async pipeline creation
- Render bundles for static geometry
- GPU indirect rendering
- Staging buffer ring for data uploads

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  (React, GraphQL, State Management)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Graphics Engine (New)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Scene Graph │ │ Render Loop │ │ Resource    │               │
│  │ (Three.js)  │ │ Controller  │ │ Manager     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Compute Stage   │ │ Render Stage    │ │ Post-Process    │
│                 │ │                 │ │ Stage           │
│ • Cluster Lights│ │ • Scene Pass    │ │ • Bloom         │
│ • Particle Sim  │ │ • Node Pass     │ │ • Tone Mapping  │
│ • Flow Animation│ │ • Edge Pass     │ │ • FXAA/SMAA     │
│ • (Marching     │ │ • Light Sprites │ │                 │
│    Cubes opt.)  │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WebGPU Device Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Pipelines   │ │ Buffers     │ │ Textures    │               │
│  │ (Cached)    │ │ (Ring)      │ │ (Sampled)   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Non-Goals (Phase 1)

- Full deferred rendering (hybrid approach is sufficient)
- WebXR/VR support (future consideration)
- Custom mesh generation via marching cubes (unless needed)
- Abandoning Three.js entirely

## Success Criteria

1. Visual quality matches or exceeds webgpu-metaballs demo
2. Smooth 60fps with 100+ nodes and 50+ connections
3. Flowing, organic node surfaces with animated textures
4. Proper lighting with many point lights
5. No visual artifacts (aliasing, z-fighting, etc.)
6. Clean architecture that's maintainable

## Risks

| Risk | Mitigation |
|------|------------|
| Three.js incompatibility with custom WebGPU | Hybrid approach, access raw device when needed |
| Performance regression | Benchmark each phase, rollback capability |
| Complexity increase | Modular architecture, clear interfaces |
| Browser compatibility | Feature detection, WebGL2 fallback path |

## Dependencies

- Three.js r171+ (current)
- WebGPU-capable browser
- No additional runtime dependencies (pure WebGPU)

## References

- [webgpu-metaballs](https://github.com/toji/webgpu-metaballs)
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [Three.js WebGPU](https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU)
- [WGSL Specification](https://www.w3.org/TR/WGSL/)
