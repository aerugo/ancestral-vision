# Constellation Visuals Enhancement - Work Notes

**Feature**: Port rich 3D visuals from family-constellations prototype to WebGPU/TSL
**Started**: 2026-01-14
**Branch**: `feature/constellation-visuals`

---

## Session Log

### 2026-01-14 - Session 1: Planning and Setup

**Context Review Completed**:

- Read `docs/plans/CLAUDE.md` - Understood planning protocol and template structure
- Read `docs/plans/grand_plan/07_technology_decisions.md` - Confirmed WebGPU/TSL approach
- Analyzed `reference_prototypes/family-constellations/src/` - Inventoried visual features
- Analyzed `src/visualization/` - Understood current implementation state

**Applicable Invariants**:

- INV-A001: Must await renderer.init() for WebGPU
- INV-A002: Use setAnimationLoop() for animation
- INV-A008: Import from three/webgpu and three/tsl
- INV-A009: Dispose all resources on cleanup

**Key Insights**:

- TSL (Three.js Shading Language) compiles to both WGSL and GLSL - single codebase for WebGPU/WebGL
- Prototype uses GLSL simplex noise - need to port to TSL
- Biography weight is the key data-driven parameter affecting nearly all visual properties
- 8 phases identified for incremental implementation

**Completed**:

- [x] Explored planning protocol templates
- [x] Analyzed family-constellations prototype visual features
- [x] Analyzed current Ancestral Vision visualization code
- [x] Created implementation plan with 8 phases
- [x] Created planning documents (spec.md, development-plan.md, work-notes.md)
- [x] Created strict TDD phase files with concrete test code for all 8 phases:
  - `phases/phase-1.md` - Core Node Rendering (noise, fresnel, node-material, instanced constellation)
  - `phases/phase-2.md` - Edge Connections (Bezier geometry, edge material, edge system)
  - `phases/phase-3.md` - Background Particles (spherical shell distribution, organic shapes)
  - `phases/phase-4.md` - Event Fireflies (orbital mechanics, event color mapping)
  - `phases/phase-5.md` - Sacred Geometry Grid (concentric rings, radial lines)
  - `phases/phase-6.md` - Post-Processing (bloom, vignette, effect composer)
  - `phases/phase-7.md` - Theme Support (light/dark color palettes, theme manager)
  - `phases/phase-8.md` - Integration Engine (orchestration, full system tests)

**Test Status**:

```
Phase 1 Complete - 34 tests passing
Phase 2 Complete - 32 tests passing
Phase 3 Complete - 16 tests passing
Phase 4 Complete - 19 tests passing
Phase 5 Complete - 18 tests passing
Phase 6 Complete - 19 tests passing
Phase 7 - SKIPPED (user request)
Phase 8 Complete - 21 tests passing
Total: 159 tests passing
Visual Integration Test - PASSED (2026-01-14)
```

**Visual Test Results** (Playwright):

- ✅ TSL materials rendering via WebGPU
- ✅ Fresnel rim glow visible on sphere edges (violet/purple)
- ✅ Biography weight scaling working (different sphere sizes)
- ✅ Color mixing between violet and gold colors
- ✅ Time uniform updating in animation loop
- ✅ No console errors
- Screenshots saved to `.playwright-mcp/constellation-phase1-*.png`

**Blockers/Issues**:

- None

**Next Steps**:

1. Begin Phase 7 implementation following `phases/phase-7.md`
2. Create theme-manager.test.ts with failing tests (RED)
3. Implement light/dark theme switching (GREEN)
4. Configure color palette system

---

## Phase Progress

### Phase 1: Core Node Rendering

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/shaders/noise.ts` - TSL simplex noise (4 tests)
- [x] `src/visualization/shaders/fresnel.ts` - Fresnel utilities (5 tests)
- [x] `src/visualization/shaders/index.ts` - Exports
- [x] `src/visualization/materials/node-material.ts` - Node material (13 tests)
- [x] `src/visualization/materials/index.ts` - Exports
- [x] `src/visualization/instanced-constellation.ts` - Instanced mesh (12 tests)

#### Test Results

```
npx vitest run src/visualization/shaders/ src/visualization/materials/ src/visualization/instanced-constellation.test.ts
- noise.test.ts: 4 tests passing
- fresnel.test.ts: 5 tests passing
- node-material.test.ts: 13 tests passing
- instanced-constellation.test.ts: 12 tests passing
Total: 34 tests passing, 0 errors
```

#### Key Implementation Notes

- Used `any` type for TSL nodes due to complex Three.js TSL type system
- MeshStandardNodeMaterial imported from `three/webgpu` (INV-A008)
- TSL functions imported from `three/tsl`
- Added null checks for array access in instanced constellation

#### Visual Integration Test

Integrated new modules into `constellation-canvas.tsx` for visual verification:
- Added instanced constellation alongside original for comparison
- Old constellation offset by 100 units on X-axis
- Random biography weights (0.2-1.0) for demo visualization
- Time uniform updates in animation loop for pulsing effects

---

### Phase 2: Edge Connections

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/edges/edge-geometry.ts` - Bezier curves (14 tests)
- [x] `src/visualization/materials/edge-material.ts` - Edge material (11 tests)
- [x] `src/visualization/edges/index.ts` - Edge system (7 tests)

#### Test Results

```
npx vitest run src/visualization/edges/ src/visualization/materials/edge-material.test.ts
- edge-geometry.test.ts: 14 tests passing
- edge-material.test.ts: 11 tests passing
- index.test.ts: 7 tests passing
Total: 32 tests passing, 0 errors
```

#### Key Implementation Notes

- Quadratic Bezier curves for smooth edge paths
- Curvature factor 0.3 (configurable)
- Horizontal edges curve upward (Y offset) for better visual
- Vertical edges curve in XZ plane
- TSL flowing energy animation with configurable speed
- End fade using smoothstep for soft endpoints
- Gold shimmer effect on edges
- Additive blending for glow effect

#### Visual Integration Test (Playwright)

Integrated edge system into `constellation-canvas.tsx` for visual verification:
- Created edges between consecutive constellation nodes
- Added loop edge from last to first node for demo
- Time uniform updates in animation loop for flowing effect

**Visual Test Results**:
- ✅ Curved golden Bezier edges connecting nodes
- ✅ Edges curve upward (Y offset) as designed
- ✅ TSL flowing energy animation visible
- ✅ Additive blending creating glow effect
- ✅ End fade with soft endpoints working
- ✅ Edge types supported (parent-child, spouse)
- ✅ No console errors
- Screenshots saved to `.playwright-mcp/constellation-phase2-*.png`

---

### Phase 3: Background Particles

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/particles/background-particles.ts` - Particle system (16 tests)
- [x] `src/visualization/particles/index.ts` - Particle exports

#### Test Results

```
npx vitest run src/visualization/particles/
- background-particles.test.ts: 16 tests passing
Total: 16 tests passing, 0 errors
```

#### Key Implementation Notes

- Spherical shell distribution using spherical coordinates
- Configurable inner/outer radius (default 100-500)
- Default 300 particles, configurable count
- Klimt-inspired color palette: violet, gold, rose
- Random animation phase per particle [0, 2π]
- TSL pulsing glow effect
- Point size with distance attenuation
- Additive blending for glow
- PointsNodeMaterial from three/webgpu (INV-A008)
- Proper disposal function (INV-A009)

#### Visual Integration Test (Playwright)

Integrated background particles into `constellation-canvas.tsx` for visual verification:
- Added 300 particles in spherical shell (radius 100-400)
- Time uniform updates in animation loop for pulsing effect
- Proper disposal in cleanup function

**Visual Test Results**:
- ✅ Particles visible in spherical shell around constellation
- ✅ Violet, gold, rose colors from Klimt-inspired palette
- ✅ Particles rendered via WebGPU PointsNodeMaterial
- ✅ TSL pulsing glow animation working
- ✅ Additive blending creating atmospheric glow
- ✅ Lissajous position oscillation applied (particles move in 3D space)
- ✅ No console errors
- Screenshots saved to `.playwright-mcp/constellation-phase3-*.png`

**Oscillation Fix** (2026-01-14):
- Applied `material.positionNode = add(positionLocal, oscillation)` to make particles move
- Each axis uses different time multipliers for organic Lissajous pattern:
  - X: `sin(time + phase) * 2`
  - Y: `cos(time * 0.7 + phase * 1.3) * 1.5`
  - Z: `sin(time * 0.5 + phase * 0.7) * 2`

---

### Phase 4: Event Fireflies

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/particles/event-fireflies.ts` - Firefly orbital system (19 tests)
- [x] `src/visualization/particles/index.ts` - Added firefly exports

#### Test Results

```
npx vitest run src/visualization/particles/event-fireflies.test.ts
- event-fireflies.test.ts: 19 tests passing
Total: 19 tests passing, 0 errors
```

#### Key Implementation Notes

- Event color mapping: birth (green), death (purple), marriage (gold), occupation (blue)
- Firefly count formula: `baseCount + biographyWeight * weightMultiplier` (default: 5 + weight * 20)
- Three orbital shells with configurable radius
- Random orbital parameters: radius, speed, phase, tilt
- TSL orbital position calculation in shader
- Flickering effect at 8Hz for firefly-like behavior
- Node center attribute for positioning fireflies around parent nodes
- Additive blending for glow effect
- PointsNodeMaterial from three/webgpu (INV-A008)
- Proper disposal function (INV-A009)

#### Visual Integration Test (Playwright)

Integrated event fireflies into `constellation-canvas.tsx` for visual verification:
- Created demo event types array for testing (birth, death, marriage, occupation, etc.)
- Time uniform updates in animation loop for orbital animation
- Proper disposal in cleanup function

**Visual Test Results**:
- ✅ Fireflies visible orbiting around constellation nodes
- ✅ Multiple event colors visible (blue/purple for death/birth events)
- ✅ Orbital position calculation working in shader
- ✅ Flickering animation effect visible
- ✅ Additive blending creating glow effect
- ✅ No console errors
- Screenshots saved to `.playwright-mcp/constellation-phase4-*.png`

---

### Phase 5: Sacred Geometry Grid

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/effects/sacred-geometry-grid.ts` - Grid generation (18 tests)
- [x] `src/visualization/effects/index.ts` - Effect exports

#### Test Results

```
npx vitest run src/visualization/effects/
- sacred-geometry-grid.test.ts: 18 tests passing
Total: 18 tests passing, 0 errors
```

#### Key Implementation Notes

- 8 concentric rings with 50-unit spacing (configurable)
- 12 radial lines creating zodiac wheel pattern (configurable)
- Sacred gold color (0xd4a84b) at low opacity (0.08)
- Additive blending for subtle glow effect
- LineBasicMaterial for crisp lines
- Y offset -30 to position below constellation
- Proper disposal function (INV-A009)

#### Visual Integration Test (Playwright)

Integrated sacred geometry grid into `constellation-canvas.tsx` for visual verification:
- Grid renders below constellation nodes
- 8 concentric rings visible with golden color
- 12 radial lines creating mandala pattern
- Low opacity creating subtle spatial reference

**Visual Test Results**:
- ✅ Concentric rings visible in sacred gold color
- ✅ Radial lines creating zodiac wheel pattern
- ✅ Grid positioned below constellation (Y = -30)
- ✅ Low opacity with additive blending glow
- ✅ No console errors
- Screenshots saved to `.playwright-mcp/constellation-phase5-*.png`

---

### Phase 5 (OLD): Sacred Geometry Grid

**Status**: COMPLETE (duplicate entry removed)

---

### Phase 6: Post-Processing

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/effects/post-processing.ts` - Effect composer pipeline (19 tests)
- [x] `src/visualization/effects/index.ts` - Added post-processing exports

#### Test Results

```
npx vitest run src/visualization/effects/post-processing.test.ts
- post-processing.test.ts: 19 tests passing
Total: 19 tests passing, 0 errors
```

#### Key Implementation Notes

- EffectComposer with RenderPass, UnrealBloomPass, ShaderPass (vignette), OutputPass
- Bloom: intensity 0.6, threshold 0.3, radius 0.5 (configurable)
- Vignette: custom shader with darkness 0.4, offset 0.3
- WebGL-only: Post-processing disabled for WebGPU (EffectComposer incompatible)
- Feature detection: Checks renderer.constructor.name for WebGLRenderer
- Configurable enable/disable for bloom and vignette separately
- Proper disposal function (INV-A009)

#### Visual Integration

Integrated post-processing into `constellation-canvas.tsx` with:
- Conditional enabling based on renderer type (WebGL only)
- Resize handler updates composer size
- Proper disposal in cleanup function

**Note**: Post-processing is currently disabled when using WebGPU renderer since Three.js EffectComposer requires WebGLRenderer. When WebGL fallback is used, bloom and vignette effects will be visible.

---

### Phase 7: Theme Support

**Status**: SKIPPED
**Reason**: User requested to skip directly to integration phase

---

### Phase 8: Integration & Polish

**Status**: COMPLETE
**Started**: 2026-01-14
**Completed**: 2026-01-14

#### Deliverables

- [x] `src/visualization/engine.ts` - Visualization engine orchestrator (21 tests)
- [x] `src/visualization/index.ts` - Updated with all new exports

#### Test Results

```
npx vitest run src/visualization/engine.test.ts
- engine.test.ts: 21 tests passing
Total: 21 tests passing, 0 errors
```

#### Key Implementation Notes

- Unified VisualizationEngine interface orchestrating all systems:
  - Node rendering with TSL materials
  - Edge connections with Bezier curves
  - Background particles
  - Event fireflies
  - Sacred geometry grid
  - Post-processing (WebGL only)
- Async createVisualizationEngine() for WebGPU renderer init
- Configuration system with sensible defaults
- Complete lifecycle management: start/stop/resize/dispose
- INV-A009: Proper disposal of all resources
- INV-A002: Uses setAnimationLoop() for animation
- INV-A001: Awaits renderer.init() for WebGPU

#### Exports from visualization module

```typescript
// Core rendering
export { createRenderer, isWebGPUSupported, isWebGPURenderer, disposeRenderer }
export { createScene, createCamera, createControls, disposeScene }
export { createConstellationMesh, updateConstellation, generatePlaceholderPeople, disposeConstellation }

// Visualization Engine (orchestrates all systems)
export { createVisualizationEngine, disposeVisualizationEngine, type VisualizationEngine, type VisualizationData, ... }

// TSL Shaders
export { createNoiseFunction, defaultNoise, createFresnelNode, defaultFresnel, ... }

// TSL Materials
export { createNodeMaterial, disposeNodeMaterial, createEdgeMaterial, disposeEdgeMaterial, ... }

// Edges
export { createEdgeSystem, updateEdgeSystemTime, disposeEdgeSystem, ... }

// Particles
export { createBackgroundParticles, createEventFireflies, ... }

// Effects
export { createSacredGeometryGrid, createPostProcessing, ... }

// Instanced constellation (advanced)
export { createInstancedConstellation, ... }
```

---

## Key Decisions

### Decision 1: TSL over Raw GLSL/WGSL

**Date**: 2026-01-14
**Context**: Need shader code that works on both WebGPU and WebGL
**Decision**: Use TSL (Three.js Shading Language) for all custom shaders
**Rationale**: TSL compiles to both WGSL (WebGPU) and GLSL (WebGL), enabling single codebase. It's officially supported by Three.js and integrates well with node-based materials.
**Alternatives Considered**:

- Raw WGSL: Would require separate GLSL fallback code
- Raw GLSL with transpilation: More complex build setup
- Three.js ShaderMaterial: Less flexible than node materials

---

## Issues Encountered

*None yet*

---

## Files Modified

### Created

- `docs/plans/active/constellation-visuals/spec.md` - Feature specification
- `docs/plans/active/constellation-visuals/development-plan.md` - Implementation plan
- `docs/plans/active/constellation-visuals/work-notes.md` - This file
- `docs/plans/active/constellation-visuals/phases/phase-1.md` - TDD plan for Core Node Rendering
- `docs/plans/active/constellation-visuals/phases/phase-2.md` - TDD plan for Edge Connections
- `docs/plans/active/constellation-visuals/phases/phase-3.md` - TDD plan for Background Particles
- `docs/plans/active/constellation-visuals/phases/phase-4.md` - TDD plan for Event Fireflies
- `docs/plans/active/constellation-visuals/phases/phase-5.md` - TDD plan for Sacred Geometry Grid
- `docs/plans/active/constellation-visuals/phases/phase-6.md` - TDD plan for Post-Processing
- `docs/plans/active/constellation-visuals/phases/phase-7.md` - TDD plan for Theme Support
- `docs/plans/active/constellation-visuals/phases/phase-8.md` - TDD plan for Integration Engine
- `src/visualization/shaders/noise.ts` - TSL simplex noise implementation
- `src/visualization/shaders/noise.test.ts` - Noise module tests
- `src/visualization/shaders/fresnel.ts` - TSL fresnel effect
- `src/visualization/shaders/fresnel.test.ts` - Fresnel module tests
- `src/visualization/shaders/index.ts` - Shader exports
- `src/visualization/materials/node-material.ts` - TSL node material
- `src/visualization/materials/node-material.test.ts` - Node material tests
- `src/visualization/materials/index.ts` - Material exports
- `src/visualization/instanced-constellation.ts` - Instanced constellation rendering
- `src/visualization/instanced-constellation.test.ts` - Instanced constellation tests

### Modified

- `vitest.config.ts` - Added `pool: 'vmThreads'` for jsdom compatibility
- `src/components/constellation-canvas.tsx` - Integrated instanced constellation for visual testing
- `src/visualization/materials/index.ts` - Added edge material exports

### Phase 2 Created

- `src/visualization/edges/edge-geometry.ts` - Bezier curve geometry generation
- `src/visualization/edges/edge-geometry.test.ts` - Edge geometry tests
- `src/visualization/edges/index.ts` - Edge system orchestration
- `src/visualization/edges/index.test.ts` - Edge system tests
- `src/visualization/materials/edge-material.ts` - TSL edge material with flow animation
- `src/visualization/materials/edge-material.test.ts` - Edge material tests

### Phase 3 Created

- `src/visualization/particles/background-particles.ts` - Background particle system
- `src/visualization/particles/background-particles.test.ts` - Particle system tests
- `src/visualization/particles/index.ts` - Particle module exports

### Phase 4 Created

- `src/visualization/particles/event-fireflies.ts` - Event firefly orbital system
- `src/visualization/particles/event-fireflies.test.ts` - Firefly system tests

### Phase 4 Modified

- `src/visualization/particles/index.ts` - Added firefly exports
- `src/components/constellation-canvas.tsx` - Integrated event fireflies

### Phase 5 Created

- `src/visualization/effects/sacred-geometry-grid.ts` - Sacred geometry mandala grid
- `src/visualization/effects/sacred-geometry-grid.test.ts` - Grid tests
- `src/visualization/effects/index.ts` - Effects module exports

### Phase 5 Modified

- `src/components/constellation-canvas.tsx` - Integrated sacred geometry grid

### Phase 6 Created

- `src/visualization/effects/post-processing.ts` - Post-processing pipeline
- `src/visualization/effects/post-processing.test.ts` - Post-processing tests

### Phase 6 Modified

- `src/visualization/effects/index.ts` - Added post-processing exports
- `src/components/constellation-canvas.tsx` - Integrated post-processing (WebGL only)

### Phase 8 Created

- `src/visualization/engine.ts` - Visualization engine orchestrator
- `src/visualization/engine.test.ts` - Engine tests

### Phase 8 Modified

- `src/visualization/index.ts` - Added comprehensive exports for all new modules

### Deleted

*None*

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [ ] Add INV-A010: TSL Material Time (after implementation)
- [ ] Add INV-A011: Instanced Attributes (after implementation)

### Other Documentation

- [ ] Update visualization module documentation

---

## Final Summary

### Completed: 2026-01-14

Successfully ported rich 3D visual effects from the `family-constellations` WebGL prototype to Ancestral Vision using WebGPU/TSL (Three.js Shading Language).

### Test Coverage

- **159 total tests passing**
- Phase 1 (Core Node Rendering): 34 tests
- Phase 2 (Edge Connections): 32 tests
- Phase 3 (Background Particles): 16 tests
- Phase 4 (Event Fireflies): 19 tests
- Phase 5 (Sacred Geometry Grid): 18 tests
- Phase 6 (Post-Processing): 19 tests
- Phase 8 (Integration Engine): 21 tests

### Key Features Implemented

1. **TSL Materials** - Custom materials using Three.js Shading Language for WebGPU/WebGL compatibility
2. **Fresnel Rim Glow** - Edge-based glow effect on nodes
3. **Biography-driven Sizing** - Node sizes scale based on biography weight
4. **Bezier Edge Curves** - Smooth curved connections between nodes
5. **Flowing Energy Animation** - TSL shader-based flow effect on edges
6. **Background Particles** - Klimt-inspired atmospheric particle system
7. **Event Fireflies** - Orbital particles representing life events with color coding
8. **Sacred Geometry Grid** - Mandala-style reference grid
9. **Post-Processing** - Bloom and vignette effects (WebGL only)
10. **Visualization Engine** - Unified orchestrator for all visual systems

### Files Created

- 12 new TypeScript source files
- 10 new test files
- 8 phase planning documents

### Technical Highlights

- **TSL Shaders**: All custom effects written in TSL for cross-renderer compatibility
- **INV-A008**: Proper imports from `three/webgpu` and `three/tsl`
- **INV-A009**: Complete resource disposal for all visual systems
- **INV-A001**: Async WebGPU renderer initialization
- **INV-A002**: Animation loop via `setAnimationLoop()`

### Skipped

- Phase 7 (Theme Support) - Deferred per user request

---

*Template version: 1.0*
