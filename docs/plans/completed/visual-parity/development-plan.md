# Visual Parity with Reference Prototype - Development Plan

**Status**: In Progress
**Created**: 2026-01-15
**Branch**: `feature/visual-parity`
**Spec**: [spec.md](spec.md)

## Summary

This implementation brings Ancestral Vision's 3D constellation visualization to visual parity with the reference prototype in `reference_prototypes/family-constellations`. Most infrastructure exists but effects are disabled or not integrated.

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md`:

- **INV-V001**: WebGPU Compatibility - All shaders must use TSL, not raw GLSL
- **INV-V002**: Material Consistency - Node/edge/particle materials must share color palette

**New invariants introduced**:

- **NEW INV-V010**: Enhanced Visual Mode - Enhanced effects shall be enabled by default
- **NEW INV-V011**: Post-Processing Parity - WebGL and WebGPU must have equivalent post-processing

## Current State Analysis

The codebase has substantial visualization infrastructure:

| Component | Infrastructure | Active Effects | Gap |
|-----------|----------------|----------------|-----|
| Node Material | 100% | 40% | Enhanced effects disabled |
| Edge Material | 100% | 35% | Enhanced effects disabled |
| Background Particles | 90% | 50% | Divine spark disabled |
| Event Fireflies | 90% | 60% | Divine spark disabled |
| Post-Processing (WebGL) | 100% | 100% | Works but WebGL only |
| Post-Processing (WebGPU) | 100% | 0% | Coded but never used |
| Sacred Geometry Grid | 100% | 80% | Static, no animation |
| Fog/Atmosphere | 0% | 0% | Not implemented |

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `src/visualization/engine.ts` | WebGPU post-processing not integrated | Add TSL post-processing for WebGPU |
| `src/visualization/materials/node-material.ts` | Enhanced mode disabled | Enable and tune enhanced effects |
| `src/visualization/materials/edge-material.ts` | Enhanced mode disabled | Enable and tune enhanced effects |
| `src/visualization/particles/background-particles.ts` | Divine spark disabled | Enable enhanced effects |
| `src/visualization/particles/event-fireflies.ts` | Divine spark disabled | Enable enhanced effects |
| `src/visualization/scene.ts` | No fog | Add atmospheric fog |
| `src/visualization/effects/sacred-geometry-grid.ts` | Static | Add subtle animation |

### Files to Create

| File | Purpose |
|------|---------|
| `src/visualization/config/visual-presets.ts` | Centralized visual configuration |

## Solution Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Visualization Engine                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Scene     │  │   Camera     │  │   Controls   │          │
│  │  + Fog NEW   │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                         Objects                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Nodes (InstancedMesh)                                   │  │
│  │  + Fresnel rim glow ✓                                    │  │
│  │  + Inner glow (enable)                                   │  │
│  │  + Subsurface scattering (enable)                        │  │
│  │  + Mandala patterns (enable)                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Edges (Lines)                                           │  │
│  │  + Flowing energy ✓                                      │  │
│  │  + Prayer beads (enable)                                 │  │
│  │  + Byzantine pattern (enable)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Particles (Points)                                      │  │
│  │  + Background particles ✓                                │  │
│  │  + Event fireflies ✓                                     │  │
│  │  + Divine spark (enable)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Effects                                                 │  │
│  │  + Sacred geometry grid ✓                                │  │
│  │  + Grid animation (add)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Post-Processing                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebGL: EffectComposer + UnrealBloomPass ✓               │  │
│  │  WebGPU: TSL PostProcessing (integrate)                  │  │
│  │  + Bloom effect                                          │  │
│  │  + Vignette effect                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Enable All Enhanced Effects by Default**: Users expect visual parity out of the box
2. **WebGPU Post-Processing Priority**: Most users will use WebGPU, critical for visual parity
3. **Tune to Prototype Values**: Start with exact prototype parameters, adjust only if needed
4. **No New Shader Languages**: All changes use TSL to maintain WebGPU compatibility

## Phase Overview

| Phase | Description | Focus | Files |
|-------|-------------|-------|-------|
| 1 | Post-Processing Integration | Bloom, vignette for WebGPU | engine.ts, webgpu-post-processing.ts |
| 1.5 | Generation-Based Vertical Layout | 3D layering by generation | force-layout.ts |
| 2 | Node Material Enhancement | Enable all node effects | node-material.ts |
| 3 | Edge Material Enhancement | Enable all edge effects | edge-material.ts |
| 4 | Particle Enhancement | Divine spark, improved motion | background-particles.ts, event-fireflies.ts |
| 5 | Atmosphere & Grid | Fog, animated grid | scene.ts, sacred-geometry-grid.ts |
| 6 | Color & Parameter Tuning | Match prototype exactly | All material files |
| 7 | Visual Verification | Side-by-side comparison | Documentation |

---

## Phase 1: Post-Processing Integration

**Goal**: Enable bloom and vignette effects for WebGPU renderer
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. Integrated TSL post-processing into WebGPU rendering path
2. Bloom effect working with configurable intensity
3. Vignette effect working with configurable darkness

### Key Changes

- Modify `engine.ts` to create and use TSL post-processing for WebGPU
- Ensure post-processing render loop integration
- Test both WebGL and WebGPU paths

### Success Criteria

- [ ] Bloom visible on bright nodes and particles
- [ ] Vignette darkens screen edges
- [ ] Both renderers have equivalent visual output
- [ ] No performance regression >5%

---

## Phase 1.5: Generation-Based Vertical Layout

**Goal**: Add 3D vertical layering based on generation number
**Detailed Plan**: [phases/phase-1.5.md](phases/phase-1.5.md)

### Deliverables

1. Vertical spacing configuration option for ForceLayout
2. Y-axis positioning based on generation number
3. Generation force maintaining vertical separation

### Key Changes

- Add `verticalSpacing` config to ForceLayoutConfig
- Modify `initialize()` to set Y based on generation
- Update `applyGenerationForce()` to maintain vertical positions

### Success Criteria

- [ ] Generation 0 (subject) at Y=0
- [ ] Ancestors (negative generations) above at positive Y
- [ ] Descendants (positive generations) below at negative Y
- [ ] Force simulation maintains vertical separation
- [ ] All existing layout tests pass

---

## Phase 2: Node Material Enhancement

**Goal**: Enable all enhanced node visual effects
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. Inner glow effect (inverse Fresnel)
2. Subsurface scattering effect
3. Mandala ring pattern animation
4. Golden spiral overlay

### Key Changes

- Set `enhancedMode: true` for node material creation
- Pass enhanced uniforms to material
- Tune intensity values to match prototype

### Success Criteria

- [ ] Nodes display soft center glow
- [ ] Nodes show backlit translucency effect
- [ ] Animated rings visible on node surfaces
- [ ] Visual match with prototype nodes

---

## Phase 3: Edge Material Enhancement

**Goal**: Enable all enhanced edge visual effects
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. Prayer bead discrete glow points
2. Byzantine wave pattern overlay
3. Enhanced gold shimmer

### Key Changes

- Set `enhancedMode: true` for edge material creation
- Pass enhanced uniforms to material
- Tune pattern density and intensity

### Success Criteria

- [ ] Discrete glowing beads visible along edges
- [ ] Wave pattern adds visual complexity
- [ ] Edges match prototype appearance

---

## Phase 4: Particle Enhancement

**Goal**: Enable enhanced particle effects
**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)

### Deliverables

1. Divine spark flash effect on background particles
2. Divine spark on event fireflies
3. Improved flickering dynamics

### Key Changes

- Enable enhanced mode for particle systems
- Tune spark intensity and frequency
- Verify orbital mechanics match prototype

### Success Criteria

- [ ] Occasional bright flashes visible in particle fields
- [ ] Fireflies display ethereal spark effect
- [ ] Overall particle aesthetic matches prototype

---

## Phase 5: Atmosphere & Grid

**Goal**: Add atmospheric effects and animate grid
**Detailed Plan**: [phases/phase-5.md](phases/phase-5.md)

### Deliverables

1. Exponential fog for depth perception
2. Subtle grid animation (rotation or pulse)
3. Proper fog color matching scene

### Key Changes

- Add `FogExp2` to scene setup
- Add time-based animation to sacred geometry grid
- Tune fog density for optimal depth effect

### Success Criteria

- [ ] Distant objects fade into background
- [ ] Grid provides subtle motion
- [ ] Atmosphere enhances depth perception

---

## Phase 6: Color & Parameter Tuning

**Goal**: Fine-tune all visual parameters to match prototype exactly
**Detailed Plan**: [phases/phase-6.md](phases/phase-6.md)

### Deliverables

1. Color palette alignment (violet, gold, rose)
2. Intensity and timing adjustments
3. Final visual polish

### Key Changes

- Compare colors hex-by-hex with prototype
- Adjust animation speeds and intensities
- Fine-tune post-processing parameters

### Success Criteria

- [ ] Colors visually indistinguishable from prototype
- [ ] Animation timing feels correct
- [ ] Overall aesthetic matches

---

## Phase 7: Visual Verification

**Goal**: Document visual parity with side-by-side comparison
**Detailed Plan**: [phases/phase-7.md](phases/phase-7.md)

### Deliverables

1. Screenshot comparison document
2. Performance metrics
3. Known differences documentation

### Key Changes

- Capture screenshots of both applications
- Document any intentional differences
- Update feature as complete

### Success Criteria

- [ ] Visual comparison shows parity
- [ ] Performance within acceptable range
- [ ] All acceptance criteria verified

---

## Testing Strategy

### Visual Testing

- Manual side-by-side comparison with prototype
- Screenshot captures for documentation
- Performance profiling with Chrome DevTools

### Unit Tests (if applicable)

- Material creation tests
- Post-processing initialization tests
- Config validation tests

### No Integration Tests Required

This is a visual feature with no API surface changes.

## Documentation Updates

After implementation is complete:

- [ ] Update `docs/invariants/INVARIANTS.md` with new visual invariants
- [ ] Add visual comparison screenshots to documentation
- [ ] Update README if visual system has new features

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Complete | 2026-01-15 | 2026-01-15 | Post-processing integrated for WebGPU |
| Phase 1.5 | Complete | 2026-01-15 | 2026-01-15 | Generation-based vertical layout (TDD) |
| Phase 2 | Complete | 2026-01-15 | 2026-01-15 | Node enhanced mode enabled by default (TDD) |
| Phase 3 | Complete | 2026-01-16 | 2026-01-16 | Edge enhanced mode enabled by default (TDD) |
| Phase 4 | Complete | 2026-01-16 | 2026-01-16 | Particle divine spark enabled by default (TDD) |
| Phase 5 | Complete | 2026-01-16 | 2026-01-16 | Fog added, grid animation implemented |
| Phase 6 | Complete | 2026-01-16 | 2026-01-16 | Parameters tuned: bloom (0.8/0.4), node glow (2.0), inner glow (1.2), mandala (0.6), particles (15), fog (0.0008) |
| Phase 7 | In Progress | 2026-01-16 | | Visual verification pending |
