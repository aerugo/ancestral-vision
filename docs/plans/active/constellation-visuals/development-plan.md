# Constellation Visuals Enhancement - Development Plan

**Status**: In Progress
**Created**: 2026-01-14
**Branch**: `feature/constellation-visuals`
**Spec**: [spec.md](spec.md)

## Summary

Port rich 3D visual effects from the family-constellations WebGL prototype to Ancestral Vision using TSL (Three.js Shading Language) for WebGPU/WebGL cross-compatibility.

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md` by their canonical IDs:

- **INV-A001**: WebGPURenderer Init - Must `await renderer.init()` before use
- **INV-A002**: Animation Loop - Use `setAnimationLoop()` not `requestAnimationFrame`
- **INV-A008**: WebGPU Imports - Use `three/webgpu` and `three/tsl` import paths
- **INV-A009**: Resource Disposal - Dispose geometry, materials, textures on cleanup

**New invariants introduced** (to be added to INVARIANTS.md after implementation):

- **NEW INV-A010**: TSL Material Time - All animated TSL materials must share a unified time uniform updated in animation loop
- **NEW INV-A011**: Instanced Attributes - Instanced mesh attributes must be updated via `instancedBufferAttribute.needsUpdate = true`

## Current State Analysis

The existing `src/visualization/` module provides:
- WebGPU/WebGL dual renderer with fallback (`renderer.ts`)
- Basic scene setup with OrbitControls (`scene.ts`)
- Simple sphere nodes with MeshStandardMaterial (`constellation.ts`)
- 3D raycasting for selection (`selection.ts`)
- Smooth camera animations (`camera-animation.ts`)

**Gap**: No custom shaders, no edge rendering, no particles, no post-processing.

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `src/visualization/constellation.ts` | Basic spheres | Instanced mesh with TSL material |
| `src/visualization/index.ts` | Limited exports | Export new modules |
| `src/components/constellation-canvas.tsx` | Basic usage | Integrate all visual systems |

### Files to Create

| File | Purpose |
|------|---------|
| `src/visualization/shaders/noise.ts` | TSL simplex noise implementation |
| `src/visualization/shaders/fresnel.ts` | Fresnel rim glow utilities |
| `src/visualization/shaders/index.ts` | Shader module exports |
| `src/visualization/materials/node-material.ts` | Node sphere TSL material |
| `src/visualization/materials/edge-material.ts` | Edge line TSL material |
| `src/visualization/materials/particle-material.ts` | Background particle material |
| `src/visualization/materials/firefly-material.ts` | Event firefly material |
| `src/visualization/materials/index.ts` | Material module exports |
| `src/visualization/particles/background-particles.ts` | Atmosphere particle system |
| `src/visualization/particles/event-fireflies.ts` | Orbital event particles |
| `src/visualization/particles/index.ts` | Particle module exports |
| `src/visualization/edges/edge-geometry.ts` | Bezier curve generation |
| `src/visualization/edges/index.ts` | Edge module exports |
| `src/visualization/effects/post-processing.ts` | Bloom, vignette, SMAA |
| `src/visualization/effects/sacred-geometry-grid.ts` | Background mandala grid |
| `src/visualization/effects/index.ts` | Effect module exports |
| `src/types/visualization.ts` | GraphNode, GraphEdge, config interfaces |

## Solution Design

```
┌─────────────────────────────────────────────────────────────┐
│                  constellation-canvas.tsx                    │
│  (React component, lifecycle management, data fetching)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    constellation.ts                          │
│  (Orchestrates all visual systems, animation loop)          │
└─────────────────────────────────────────────────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Nodes   │ │  Edges   │ │Particles │ │ Effects  │
    │(instanced│ │ (Bezier  │ │(background│ │(grid,    │
    │ mesh +   │ │ curves + │ │+fireflies)│ │ post-    │
    │ TSL mat) │ │ TSL mat) │ │           │ │processing│
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
           │           │           │           │
           └───────────┴───────────┴───────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    Shaders/     │
                    │   Materials     │
                    │   (TSL-based)   │
                    └─────────────────┘
```

### Key Design Decisions

1. **TSL over GLSL**: TSL compiles to both WGSL (WebGPU) and GLSL (WebGL), enabling single codebase
2. **Instanced Rendering**: Use InstancedMesh for nodes to handle 500+ efficiently
3. **Unified Time**: Single time uniform shared across all animated materials
4. **Modular Systems**: Each visual system (nodes, edges, particles) is independently testable

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 1 | Core Node Rendering | TSL material, instancing, pulsing | 8-10 tests |
| 2 | Edge Connections | Bezier curves, flow animation | 6-8 tests |
| 3 | Background Particles | Particle system, shapes | 5-6 tests |
| 4 | Event Fireflies | Orbital particles, colors | 6-8 tests |
| 5 | Sacred Geometry Grid | Grid generation | 3-4 tests |
| 6 | Post-Processing | Bloom, vignette | 4-5 tests |
| 7 | Theme Support | Color/blending switching | 4-5 tests |
| 8 | Integration & Polish | Full system, performance | 5-6 tests |

---

## Phase 1: Core Node Rendering

**Goal**: Replace basic spheres with instanced TSL material nodes
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `src/visualization/shaders/noise.ts` - TSL simplex noise
2. `src/visualization/shaders/fresnel.ts` - Fresnel utilities
3. `src/visualization/materials/node-material.ts` - Node TSL material
4. `src/types/visualization.ts` - Type definitions
5. Updated `src/visualization/constellation.ts` - Instanced mesh usage

### TDD Approach

1. Write failing tests for noise function output range
2. Write failing tests for material creation and uniforms
3. Implement TSL modules to pass tests
4. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Nodes pulse visibly in browser
- [ ] Nodes scale based on biography weight
- [ ] Fresnel rim glow visible on node edges

---

## Phase 2: Edge Connections

**Goal**: Curved edges with flowing energy animation
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. `src/visualization/edges/edge-geometry.ts` - Bezier curve generation
2. `src/visualization/materials/edge-material.ts` - TSL edge material
3. `src/visualization/edges/index.ts` - Edge system manager

### TDD Approach

1. Write failing tests for Bezier curve point generation
2. Write failing tests for edge material flow animation
3. Implement to pass tests
4. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] Edges render as smooth curves
- [ ] Energy flows along edges (animated)
- [ ] Edges fade at endpoints

---

## Phase 3: Background Particles

**Goal**: Atmospheric Haeckel-inspired particle system
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. `src/visualization/particles/background-particles.ts`
2. `src/visualization/materials/particle-material.ts`

### Success Criteria

- [ ] All tests pass
- [ ] Particles visible in background
- [ ] Particles have organic/hexagonal shapes
- [ ] Particles animate (oscillate, pulse)

---

## Phase 4: Event Fireflies

**Goal**: Orbital particles representing life events
**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)

### Deliverables

1. `src/visualization/particles/event-fireflies.ts`
2. `src/visualization/materials/firefly-material.ts`

### Success Criteria

- [ ] All tests pass
- [ ] Fireflies orbit around nodes
- [ ] Different event types have distinct colors
- [ ] Fireflies flicker and pulse

---

## Phase 5: Sacred Geometry Grid

**Goal**: Background mandala reference grid
**Detailed Plan**: [phases/phase-5.md](phases/phase-5.md)

### Deliverables

1. `src/visualization/effects/sacred-geometry-grid.ts`

### Success Criteria

- [ ] All tests pass
- [ ] Grid visible below constellation
- [ ] Correct number of rings and radials
- [ ] Proper transparency

---

## Phase 6: Post-Processing

**Goal**: Bloom, vignette, antialiasing
**Detailed Plan**: [phases/phase-6.md](phases/phase-6.md)

### Deliverables

1. `src/visualization/effects/post-processing.ts`

### Success Criteria

- [ ] All tests pass
- [ ] Bloom effect on bright elements
- [ ] Vignette darkens edges
- [ ] Antialiased rendering

---

## Phase 7: Theme Support

**Goal**: Light/dark theme switching
**Detailed Plan**: [phases/phase-7.md](phases/phase-7.md)

### Deliverables

1. Theme uniforms in all material files
2. `setTheme()` function in orchestrator

### Success Criteria

- [ ] All tests pass
- [ ] Theme toggle updates all elements
- [ ] Dark theme: cosmic mystical
- [ ] Light theme: illuminated manuscript

---

## Phase 8: Integration & Polish

**Goal**: Full system integration and optimization
**Detailed Plan**: [phases/phase-8.md](phases/phase-8.md)

### Deliverables

1. Updated `constellation.ts` - Full orchestration
2. Updated `constellation-canvas.tsx` - React integration
3. Performance optimizations

### Success Criteria

- [ ] All tests pass (unit + integration)
- [ ] Visual parity with prototype
- [ ] 60fps with 500 nodes
- [ ] No memory leaks
- [ ] WebGL fallback works

---

## Testing Strategy

### Unit Tests (co-located with source)

- `src/visualization/shaders/noise.test.ts`: Noise function output
- `src/visualization/materials/node-material.test.ts`: Material creation
- `src/visualization/edges/edge-geometry.test.ts`: Bezier curves
- `src/visualization/particles/background-particles.test.ts`: Particle system

### Integration Tests

- `tests/integration/constellation-visuals.test.ts`: Full system rendering

### Invariant Tests

- `tests/invariants/visualization.test.ts`: INV-A001, INV-A002, INV-A008, INV-A009

### E2E Tests (if applicable)

- Visual comparison with prototype using Playwright screenshots

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-A010, INV-A011
- [ ] `docs/invariants/architecture.md` - Document TSL material patterns
- [ ] Update visualization module README

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Complete | 2026-01-14 | 2026-01-14 | Core node rendering (34 tests) |
| Phase 2 | Complete | 2026-01-14 | 2026-01-14 | Edge connections (32 tests) |
| Phase 3 | Complete | 2026-01-14 | 2026-01-14 | Background particles (16 tests) |
| Phase 4 | Complete | 2026-01-14 | 2026-01-14 | Event fireflies (19 tests) |
| Phase 5 | Complete | 2026-01-14 | 2026-01-14 | Sacred geometry grid (18 tests) |
| Phase 6 | Complete | 2026-01-14 | 2026-01-14 | Post-processing (19 tests) |
| Phase 7 | Skipped | - | - | Theme support (deferred) |
| Phase 8 | Complete | 2026-01-14 | 2026-01-14 | Integration engine (21 tests) |
| Phase 9 | NOT STARTED | - | - | Visual alignment with prototype |

**Total Tests**: 159 passing (Phases 1-6, 8)

---

## Phase 9: Visual Alignment with Prototype

**Goal**: Achieve visual parity with `reference_prototypes/family-constellations`
**Detailed Plan**: [phases/phase-9.md](phases/phase-9.md)

### Context

Visual comparison (2026-01-15) revealed significant gaps between current implementation and prototype:
- Nodes lack internal swirling patterns and inner glow
- Post-processing disabled for WebGPU (no bloom)
- Particles/fireflies missing organic shapes

### Sub-Phases

1. **9.1 Enhanced Node Material** - Inner glow, SSS, mandala patterns
2. **9.2 Enhanced Edge Material** - Prayer beads, Byzantine patterns
3. **9.3 WebGPU Post-Processing** - TSL-based bloom/vignette
4. **9.4 Enhanced Particles** - Hexagonal shapes, divine spark

---

*Template version: 1.0*
