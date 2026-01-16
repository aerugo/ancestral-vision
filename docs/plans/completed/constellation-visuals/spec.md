# Feature: Constellation Visuals Enhancement

**Status**: In Progress
**Created**: 2026-01-14
**User Stories**: US-1.1, US-1.2 (from 04_user_stories.md)

## Goal

Port the rich 3D visual effects from the family-constellations WebGL prototype to Ancestral Vision using WebGPU/TSL for visual parity and optimal performance.

## Background

The current Ancestral Vision constellation view uses basic MeshStandardMaterial spheres without custom shaders. The family-constellations prototype (`reference_prototypes/family-constellations/`) demonstrates a rich, ethereal aesthetic with:

- Biography-driven node sizing and pulsing animations
- Fresnel rim glow effects
- Flowing energy along edge connections
- Atmospheric background particles with organic shapes
- Orbital event fireflies around nodes
- Sacred geometry background grid
- Post-processing effects (bloom, vignette)
- Light/dark theme support with distinct aesthetics

This feature ports these visuals to the WebGPU/TSL tech stack while maintaining WebGL fallback.

## Acceptance Criteria

- [ ] AC1: Nodes scale based on biography weight (1 + weight * 2.5)
- [ ] AC2: Nodes pulse rhythmically with sin-based animation
- [ ] AC3: Fresnel rim glow visible on node edges
- [ ] AC4: Family edges render as curved Bezier lines with flowing energy
- [ ] AC5: Background particles have Haeckel-inspired organic shapes
- [ ] AC6: Event fireflies orbit nodes with event-type colors
- [ ] AC7: Sacred geometry grid visible below constellation
- [ ] AC8: Bloom and vignette post-processing effects applied
- [ ] AC9: Light/dark theme switching updates all visual elements
- [ ] AC10: Performance maintains 60fps with 500+ nodes
- [ ] AC11: WebGL fallback provides equivalent visuals

## Technical Requirements

### Database Changes

- None required - uses existing Person and relationship data

### API Changes

- None required - visualization is client-side only

### UI Changes

- Enhanced `constellation-canvas.tsx` component with new visual systems
- Theme toggle affects 3D visualization
- New visual directories under `src/visualization/`

## Dependencies

- Three.js r182 with WebGPU support (already installed)
- TSL (Three.js Shading Language) from `three/tsl`
- Existing visualization modules (renderer, scene, selection, camera-animation)
- Person data from GraphQL API

## Out of Scope

- Compute shader particle physics (optional future enhancement)
- VR/AR rendering modes
- Mobile-specific optimizations
- Accessibility features for 3D content (future consideration)

## Security Considerations

- No additional security requirements - visualization is read-only
- All data comes from authenticated GraphQL API

## Performance Considerations

- Target: 60fps with 500+ nodes
- Instanced mesh rendering for node performance
- LOD (Level of Detail) if needed for large graphs
- Frustum culling for off-screen objects
- Particle count scaling based on graph size

## Open Questions

- [x] Q1: Use Three.js built-in post-processing or `postprocessing` library? → Use Three.js built-in for WebGPU compatibility
- [ ] Q2: Should node interactions (hover/click) affect visual state?

## References

- [User Stories](../../../plans/grand_plan/04_user_stories.md)
- [Features Spec](../../../plans/grand_plan/05_features.md)
- [Technology Decisions](../../../plans/grand_plan/07_technology_decisions.md)
- [Prototype Source](../../../../reference_prototypes/family-constellations/)

---

*Template version: 1.0*
