# Feature: Visual Parity with Family Constellations Prototype

**Status**: Draft
**Created**: 2026-01-15
**User Stories**: US-1.1, US-1.2 (visualization quality)

## Goal

Make Ancestral Vision's 3D visualization visually identical to the reference prototype in `reference_prototypes/family-constellations`.

## Background

The reference prototype demonstrates a sophisticated constellation aesthetic with:
- Bioluminescent glowing nodes with Fresnel rim effects, inner glow, and subsurface scattering
- Flowing golden edges with Byzantine patterns and "prayer bead" energy nodes
- Ethereal particle systems with hexagonal shapes and divine spark effects
- Post-processing (bloom, vignette) for cinematic depth
- Sacred geometry grid with concentric rings
- Atmospheric fog for depth perception

Ancestral Vision has ~90% of the infrastructure coded but many effects are:
1. **Disabled by default** (enhancedMode flags are false)
2. **Not integrated** (WebGPU post-processing exists but isn't used)
3. **Missing entirely** (fog, hexagonal particles, animated grid)

## Acceptance Criteria

### Node Rendering
- [ ] AC1: Nodes display Fresnel rim glow with proper intensity matching prototype
- [ ] AC2: Nodes show inner glow emanating from center (inverse Fresnel)
- [ ] AC3: Nodes exhibit subsurface scattering effect (backlit translucency)
- [ ] AC4: Nodes display animated mandala ring patterns on surface
- [ ] AC5: Nodes pulse with biography weight-influenced intensity
- [ ] AC6: Node colors match prototype palette (violet #9966cc, gold #d4a84b)

### Edge Rendering
- [ ] AC7: Edges show flowing energy animation with proper speed
- [ ] AC8: Edges display "prayer bead" discrete glow points along path
- [ ] AC9: Edges exhibit Byzantine wave pattern overlay
- [ ] AC10: Edge colors and gold shimmer match prototype intensity

### Particle Systems
- [ ] AC11: Background particles display organic floating motion
- [ ] AC12: Background particles show divine spark flash effects
- [ ] AC13: Event fireflies orbit nodes with proper mechanics
- [ ] AC14: Fireflies flicker and display divine spark effects

### Post-Processing
- [ ] AC15: Bloom effect creates ethereal glow on bright elements
- [ ] AC16: Vignette darkens edges for focal depth
- [ ] AC17: Post-processing works with both WebGL and WebGPU renderers

### Atmosphere & Effects
- [ ] AC18: Sacred geometry grid visible with concentric rings
- [ ] AC19: Atmospheric fog provides depth perception
- [ ] AC20: Overall color palette matches prototype (dark cosmic theme)

### Performance
- [ ] AC21: Maintains 60fps with 500+ nodes on modern GPU
- [ ] AC22: No visual artifacts or z-fighting issues

## Technical Requirements

### Shader Changes
- Enable enhanced mode flags in all TSL materials
- Tune Fresnel, noise, and animation parameters to match prototype
- Add fog integration to scene and materials

### Rendering Pipeline Changes
- Integrate TSL post-processing for WebGPU renderer
- Configure bloom intensity, threshold, and radius
- Configure vignette darkness and offset

### Configuration Changes
- Update default config to enable enhanced visual modes
- Add UI controls for visual parameter adjustment
- Expose theme switching (dark/light)

### No Database Changes
This is purely a visual/rendering feature with no data model impact.

### No API Changes
This is purely a visual/rendering feature with no API impact.

### UI Changes
- Optional: Add visual settings panel for tuning effects
- No required UI changes for core visual parity

## Dependencies

- Three.js r171+ with WebGPU support
- TSL shader system (already implemented)
- Reference prototype for visual comparison

## Out of Scope

- Light theme implementation (focus on dark cosmic theme first)
- Hexagonal particle shapes (complex geometry change)
- Cel-shading bands (can be added later)
- Real-time parameter adjustment UI (can be added later)
- LOD system for performance (separate feature)

## Security Considerations

None - this is a pure visual/rendering feature with no security implications.

## Open Questions

- [ ] Q1: Should enhanced modes be always-on or togglable?
  - **Decision**: Always-on for now, add toggle later if needed
- [ ] Q2: What bloom intensity provides best balance?
  - **Decision**: Start with prototype values (0.6), tune visually
- [ ] Q3: Should we expose all visual parameters in UI?
  - **Decision**: Defer to future phase, focus on parity first
