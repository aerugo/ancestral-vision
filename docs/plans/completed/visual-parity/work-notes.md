# Visual Parity - Work Notes

**Feature**: Achieve visual parity with family-constellations prototype
**Started**: 2026-01-15
**Branch**: `feature/visual-parity`

---

## Session Log

### 2026-01-15 - Initial Analysis and Planning

**Context Review Completed**:

- Analyzed reference prototype in `reference_prototypes/family-constellations/`
- Reviewed all visualization code in `src/visualization/`
- Compared screenshots of both applications
- Read planning protocol in `docs/plans/CLAUDE.md`

**Key Findings**:

1. **Infrastructure Exists**: ~90% of visual effect code is already written
2. **Effects Disabled**: Enhanced modes default to `false` throughout codebase
3. **Post-Processing Gap**: WebGPU TSL post-processing coded but never integrated
4. **Missing Effects**: Fog not implemented, grid not animated

**Gap Analysis Summary**:

| Category | Status | Gap |
|----------|--------|-----|
| Node inner glow | Coded | Disabled by default |
| Node SSS | Coded | Disabled by default |
| Node mandala | Coded | Disabled by default |
| Edge prayer beads | Coded | Disabled by default |
| Edge Byzantine | Coded | Disabled by default |
| Particle divine spark | Coded | Disabled by default |
| WebGPU post-processing | Coded | Not integrated into engine |
| Fog | Not coded | Missing entirely |
| Animated grid | Not coded | Missing entirely |

**Visual Differences Observed (Screenshots)**:

Reference Prototype:
- Bioluminescent glowing nodes with cream/gold/violet coloring
- Strong bloom effect creating ethereal halos
- Visible sacred geometry grid (concentric circles)
- Atmospheric depth with fog
- Better particle distribution and glow
- More sophisticated color mixing

Current Ancestral Vision:
- Simpler node styling (basic fresnel only)
- No visible bloom effect
- Sacred geometry grid present but subtle
- No atmospheric fog
- Basic particle effects
- Flatter color palette

**Completed**:

- [x] Analyzed reference prototype codebase
- [x] Analyzed current Ancestral Vision visualization code
- [x] Identified all gaps between implementations
- [x] Created spec.md
- [x] Created development-plan.md
- [x] Created work-notes.md
- [x] Created phase plans

**Next Steps**:

1. Begin Phase 1: Post-Processing Integration
2. Test WebGPU post-processing integration
3. Verify bloom and vignette effects working

---

## Phase Progress

### Phase 1: Post-Processing Integration

**Status**: Complete
**Started**: 2026-01-15
**Completed**: 2026-01-15

#### Test Results (TDD)

```
Test Files  1 passed (engine.test.ts)
Tests       29 passed (29)

New tests added:
- should create TSL post-processing for WebGPU renderer
- should dispose TSL post-processing on engine dispose
- should resize TSL post-processing on engine resize
- should use TSL post-processing in render loop
- should pass post-processing config to TSL post-processing
+ 3 WebGL verification tests
```

#### Results

- Integrated TSL post-processing for WebGPU renderer
- WebGL renderer continues to use EffectComposer-based post-processing
- Both paths now have bloom and vignette effects
- Proper disposal and resize handling for both paths

#### Files Modified

- `src/visualization/engine.ts` - Added TSL post-processing integration
- `src/visualization/engine.test.ts` - Added 8 new tests for WebGPU post-processing

#### Notes

- TSL post-processing already existed in `src/visualization/effects/webgpu-post-processing.ts`
- Instantiated and integrated into render loop in `engine.ts`
- Both WebGL and WebGPU renderer paths now have post-processing

---

### Phase 1.5: Generation-Based Vertical Layout

**Status**: Complete (Fixed 2026-01-15)
**Started**: 2026-01-15
**Completed**: 2026-01-15
**Fixed**: 2026-01-15 (direction and spacing corrected to match prototype)

#### Notes

- ForceLayout already has `generation` in LayoutNode structure
- Calculate Y from: `y = generation * verticalSpacing` (matching prototype)
- Ancestors (negative gen) go DOWN (negative Y)
- Descendants (positive gen) go UP (positive Y)

#### Fix #1 Applied (2026-01-15) - Direction and Spacing

**Issue**: Original implementation had incorrect direction and spacing value:
- Used `Y = -generation * 30` (ancestors UP, descendants DOWN, 30 unit spacing)
- Visual result: flat stacked layers instead of organic 3D cloud

**Fix**: Matched prototype behavior:
- Changed to `Y = generation * 8` (ancestors DOWN, descendants UP, 8 unit spacing)
- `verticalSpacing` default changed from 30 to 8
- Direction inverted to match prototype

#### Fix #2 Applied (2026-01-15) - 3D Force Calculations

**Issue**: Forces were 2D only (XZ plane), causing strict horizontal layers:
- Repulsion only calculated distance in XZ, applied forces only to X and Z
- Attraction only calculated distance in XZ, applied forces only to X and Z
- Nodes stayed at exact target Y positions with no organic variation

**Fix**: Made all forces operate in 3D:
- `_applyRepulsion()`: Now includes Y in distance calculation and applies Y forces
- `_applyAttraction()`: Now includes Y in distance calculation and applies Y forces
- Generation force still maintains target Y but allows variation from other forces

**Prototype Analysis**:
- Reference prototype uses `baseY = gen * 8`
- Subtle vertical separation (8 units) creates gentle 3D bowl shape
- Ancestors at negative Y (below), descendants at positive Y (above)
- 3D repulsion creates organic variation within each generation layer

#### Fix #3 Applied (2026-01-15) - Force Strength Values

**Issue**: Force strength values were completely different from prototype:
- `repulsionStrength: 80` vs prototype's `500` (6x weaker!)
- `generationSpacing: 60` vs prototype's `50`
- Single `generationStrength: 0.15` for both radial and Y forces

**Fix**: Matched prototype values exactly:
- Changed `repulsionStrength` from 80 to 500 (creates organic spread)
- Changed `generationSpacing` from 60 to 50
- Changed `generationStrength` from 0.15 to 0.08 (radial force)
- Hardcoded Y force strength to 0.15 (matching prototype)

**Prototype values** (from `reference_prototypes/family-constellations/src/core/layout.ts`):
- `repulsionForce: 500` (line 196)
- `generationSpacing: 50` (line 83)
- Y force: 0.15 (line 273, hardcoded)
- Radial force: 0.08 (line 286, hardcoded)

#### TDD Progress (Original + Fix)

**RED Phase (Failing Tests)**:
- Updated 7 tests to expect prototype-matching behavior
- Tests expected: ancestors at negative Y, descendants at positive Y
- Tests expected: default verticalSpacing of 8

**GREEN Phase (Implementation)**:
- Changed `verticalSpacing` default from 30 to 8
- Changed Y formula from `-generation * verticalSpacing` to `generation * verticalSpacing`
- Updated `_applyGenerationForce()` to use same formula
- All 27 force-layout tests pass

#### Fix #4: Complete Rewrite to Match Prototype Simulation Loop (2026-01-15)

**Issue**: Previous implementations only matched individual values but not the simulation loop behavior:
- Our simulation accumulated velocity with damping, prototype resets to 0 each step
- Prototype uses cooling schedule `temperature = 1 - progress * 0.8`
- Prototype centers layout after simulation completes
- Attraction used simple `dist * force`, prototype uses `(dist - idealDist) * force`
- Different golden offset calculation

**Complete rewrite to match prototype exactly**:

1. **Simulation loop** - Now matches prototype `simulationStep()`:
   - Reset velocity to {0, 0, 0} at start of each step (not accumulate)
   - Apply cooling schedule: `temperature = 1 - progress * 0.8`
   - Update position: `position += velocity * temperature`

2. **DEFAULT_CONFIG** - Now matches prototype `DEFAULT_CONFIG.layout`:
   - `generationSpacing: 50` (was correct)
   - `verticalSpacing: 8` (was correct)
   - `repulsionStrength: 500` (was correct)
   - `attractionStrength: 0.1` (fixed from 0.05)
   - `centerStrength: 0.05` (fixed from 0.02)
   - `generationStrength: 0.08` (was correct)
   - `iterations: 300` (added, prototype default)

3. **Golden angle offset** - `gen * Math.PI / 6` (was `gen * 0.5`)

4. **Jitter** - Added tiny 0.01 jitter (prevents Barnes-Hut issues)

5. **Center layout** - Added `_centerLayout()` called after simulation completes

6. **Attraction formula** - `(dist - idealDist) * strength` for spring-like behavior

7. **New `runFullSimulation()` method** - Convenience method matching prototype `calculate()`

#### Test Results (After Complete Rewrite)

```
Test Files  1 passed (1)
Tests       27 passed (27)
Duration    453ms

Tests updated for new prototype-matching behavior:
- Y position tests use toBeCloseTo() to account for jitter
- Damping test changed to verify velocity reset behavior
- Distinct Y layers test uses averages for jitter tolerance
```

#### Fix #5: Add BiographyWeight and Edges (2026-01-15)

**Issue**: Layout still appeared flat compared to prototype's organic 3D cloud:
- No biographyWeight for radius variation
- No edges passed to layout for attraction force
- Without attraction, nodes only spread apart (no clustering)

**Fixed implementation**:

1. **Added biographyWeight to LayoutNode interface**:
   ```typescript
   biographyWeight?: number;  // 0-1, affects radius variation
   ```

2. **Updated initialization to use biographyWeight for radius**:
   ```typescript
   const biographyWeight = node.biographyWeight ?? 0.5;
   const radiusVariation = biographyWeight * 5;  // prototype line 94-95
   const nodeRadius = ringRadius + radiusVariation;
   ```

3. **Updated constellation-canvas to create edges**:
   - Generates random biographyWeight (0.2-1.0) for each node
   - Creates edges by connecting nodes to adjacent generations
   - Each node connects to 1-2 nodes in the next generation
   - Passes edges to ForceLayout for attraction force

**Result**: Edges create attraction between connected nodes, producing organic clustering like the prototype's 3D cloud appearance.

#### Files Modified

- `src/visualization/layout/force-layout.ts` - Complete rewrite + biographyWeight support
- `src/visualization/layout/force-layout.test.ts` - Updated tests for prototype-matching behavior
- `src/components/constellation-canvas.tsx` - Added biographyWeight and edge generation

---

### Phase 2: Node Material Enhancement

**Status**: Complete
**Started**: 2026-01-15
**Completed**: 2026-01-15

#### Notes

- Enhanced effects already coded in `node-material.ts` lines 134-171
- Changed `enhancedMode` default from `false` to `true`
- All enhanced effects now enabled by default: inner glow, SSS, mandala patterns

#### TDD Progress

**RED Phase (Failing Tests)**:
- Added 5 new tests for enhanced mode default behavior
- 4 tests failed as expected (enhanced uniforms not present by default)

**GREEN Phase (Implementation)**:
- Changed `enhancedMode = false` to `enhancedMode = true` (line 91)
- Consolidated duplicate test cases
- All 29 node-material tests pass

**REFACTOR Phase**:
- Removed duplicate test case
- Implementation is minimal and clean

#### Test Results

```
Test Files  1 passed (1)
Tests       29 passed (29)
Duration    546ms

New tests added:
- should enable enhanced mode by default
- should have default inner glow intensity of 0.8 when using defaults
- should have default SSS strength of 0.3 when using defaults
- should have default mandala intensity of 0.3 when using defaults
- should allow disabling enhanced mode explicitly
```

#### Files Modified

- `src/visualization/materials/node-material.ts` - Changed enhancedMode default to true
- `src/visualization/materials/node-material.test.ts` - Added 5 new tests, removed duplicate

#### Plan Adherence

**Completed**:
- Step 2.1: ✅ Changed enhancedMode default to true

**Skipped/Not Needed**:
- Step 2.2: ⏭️ engine.ts doesn't use createNodeMaterial directly
- Step 2.5: ⏭️ Types already complete in node-material.ts

**Deferred**:
- Step 2.3: ➡️ Deferred to Phase 7 (Visual Verification)
- Step 2.4: ➡️ Deferred to Phase 6 (Color & Parameter Tuning)

---

### Phase 3: Edge Material Enhancement

**Status**: Pending
**Started**:
**Completed**:

#### Notes

- Prayer beads and Byzantine patterns coded in `edge-material.ts` lines 103-129
- Same enablement approach as node material

---

### Phase 4: Particle Enhancement

**Status**: Pending
**Started**:
**Completed**:

#### Notes

- Divine spark coded in both particle systems
- Need to enable enhanced mode and tune intensities

---

### Phase 5: Atmosphere & Grid

**Status**: Pending
**Started**:
**Completed**:

#### Notes

- Fog not currently implemented
- Grid exists but is static
- Need to add FogExp2 to scene
- Need to animate grid rotation or pulse

---

### Phase 6: Color & Parameter Tuning

**Status**: Pending
**Started**:
**Completed**:

#### Notes

- Will need visual comparison during this phase
- Prototype colors: violet #9966cc, gold #d4a84b, rose #c98b8b

---

### Phase 7: Visual Verification

**Status**: Pending
**Started**:
**Completed**:

#### Notes

- Will capture side-by-side screenshots
- Document any intentional differences

---

## Key Decisions

### Decision 1: Enable Enhanced Modes by Default

**Date**: 2026-01-15
**Context**: Enhanced visual effects are coded but disabled by default
**Decision**: Enable all enhanced modes by default rather than making them optional
**Rationale**: Visual parity is the goal; users expect full effects out of the box
**Alternatives Considered**:
- Making effects optional (adds complexity, reduces visual impact)
- Performance-based auto-detection (adds complexity, may miss capable systems)

### Decision 2: WebGPU Post-Processing Priority

**Date**: 2026-01-15
**Context**: Post-processing exists for both WebGL and WebGPU but only WebGL is integrated
**Decision**: Prioritize WebGPU post-processing integration as Phase 1
**Rationale**: WebGPU is the primary renderer; most users will experience this path
**Alternatives Considered**:
- Focus on material effects first (would still lack bloom/vignette)
- Defer post-processing (significant visual impact loss)

---

## Files Modified

### Created

- `docs/plans/active/visual-parity/spec.md` - Feature specification
- `docs/plans/active/visual-parity/development-plan.md` - Implementation plan
- `docs/plans/active/visual-parity/work-notes.md` - This file
- `docs/plans/active/visual-parity/phases/phase-1.md` - Post-processing phase
- `docs/plans/active/visual-parity/phases/phase-1.5.md` - Generation-based vertical layout phase
- `docs/plans/active/visual-parity/phases/phase-2.md` - Node material phase
- `docs/plans/active/visual-parity/phases/phase-3.md` - Edge material phase
- `docs/plans/active/visual-parity/phases/phase-4.md` - Particle phase
- `docs/plans/active/visual-parity/phases/phase-5.md` - Atmosphere phase
- `docs/plans/active/visual-parity/phases/phase-6.md` - Tuning phase
- `docs/plans/active/visual-parity/phases/phase-7.md` - Verification phase

### Modified

**Phase 1:**
- `src/visualization/engine.ts` - Integrated TSL post-processing for WebGPU
- `src/visualization/engine.test.ts` - Added WebGPU post-processing tests

**Phase 1.5:**
- `src/visualization/layout/force-layout.ts` - Added vertical spacing, 3D forces, prototype-matching values
- `src/visualization/layout/force-layout.test.ts` - Added 7 new tests, updated 1 existing test
- `src/components/constellation-canvas.tsx` - Updated config to match prototype (repulsion: 500, spacing: 50)

**Phase 2:**
- `src/visualization/materials/node-material.ts` - Changed enhancedMode default to true
- `src/visualization/materials/node-material.test.ts` - Added 5 new tests, removed duplicate

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [ ] Add INV-V010: Enhanced Visual Mode - Enhanced effects enabled by default
- [ ] Add INV-V011: Post-Processing Parity - WebGL and WebGPU equivalent effects

### Other Documentation

- [ ] Visual comparison screenshots after completion
- [ ] Update README if significant visual changes
