# Phase 7: Visual Verification

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Document visual parity achievement with side-by-side comparison screenshots, performance metrics, and any known differences.

---

## Deliverables

1. Screenshot comparison document
2. Performance benchmark results
3. Known differences documentation
4. Acceptance criteria verification

---

## Deferred Items from Earlier Phases

**From Phase 2 (Node Material)**:
- Step 2.3: Verify node enhanced effect implementation (inner glow, SSS, mandala, golden spiral visible and working)

**From Phase 3 (Edge Material)** (expected):
- Verify edge enhanced effect implementation (prayer beads, Byzantine patterns visible and working)

**From Phase 4 (Particles)** (expected):
- Verify particle divine spark effects visible and working

---

## Implementation Steps

### Step 7.1: Prepare Test Environment

Set up consistent comparison environment:

```bash
# Same browser (Chrome recommended for WebGPU)
# Same viewport size (1920x1080 recommended)
# Same data file for both
# Clear browser cache before testing
```

### Step 7.2: Capture Prototype Screenshots

**Locations**:
- `docs/plans/active/visual-parity/screenshots/prototype/`

Capture:
1. `prototype-overview.png` - Full scene view
2. `prototype-nodes.png` - Close-up of node detail
3. `prototype-edges.png` - Close-up of edge detail
4. `prototype-particles.png` - Background particle atmosphere
5. `prototype-fireflies.png` - Event fireflies around nodes
6. `prototype-grid.png` - Sacred geometry grid

### Step 7.3: Capture Ancestral Vision Screenshots

**Locations**:
- `docs/plans/active/visual-parity/screenshots/ancestral-vision/`

Capture (matching prototype angles):
1. `av-overview.png`
2. `av-nodes.png`
3. `av-edges.png`
4. `av-particles.png`
5. `av-fireflies.png`
6. `av-grid.png`

### Step 7.4: Create Comparison Document

**File**: `docs/plans/active/visual-parity/visual-comparison.md`

```markdown
# Visual Comparison: Ancestral Vision vs Prototype

## Overview Comparison

| Prototype | Ancestral Vision |
|-----------|-----------------|
| ![](screenshots/prototype/prototype-overview.png) | ![](screenshots/ancestral-vision/av-overview.png) |

**Analysis**: [Description of similarities and differences]

## Node Detail Comparison

| Prototype | Ancestral Vision |
|-----------|-----------------|
| ![](screenshots/prototype/prototype-nodes.png) | ![](screenshots/ancestral-vision/av-nodes.png) |

**Analysis**: [Node-specific comparison]

[Continue for each category...]
```

### Step 7.5: Run Performance Benchmarks

Measure and document:

```bash
# Chrome DevTools Performance Tab
# Record 10 seconds of rendering
# Note key metrics:

| Metric | Prototype | Ancestral Vision | Target |
|--------|-----------|------------------|--------|
| FPS (avg) | | | 60 |
| FPS (min) | | | 30 |
| Frame time (avg) | | | <16ms |
| GPU memory | | | <500MB |
| JS heap | | | <100MB |
```

### Step 7.6: Document Known Differences

Create documentation for any intentional or unavoidable differences:

```markdown
## Known Differences

### 1. [Difference Name]
**What**: [Description]
**Why**: [Reason - intentional or technical limitation]
**Impact**: [Visual impact level: minimal/moderate/significant]

### 2. [...]
```

### Step 7.7: Verify All Acceptance Criteria

Go through spec.md acceptance criteria:

**Node Rendering**:
- [ ] AC1: Nodes display Fresnel rim glow ✓/✗
- [ ] AC2: Nodes show inner glow ✓/✗
- [ ] AC3: Nodes exhibit SSS effect ✓/✗
- [ ] AC4: Nodes display mandala rings ✓/✗
- [ ] AC5: Nodes pulse with bio weight ✓/✗
- [ ] AC6: Colors match prototype ✓/✗

**Edge Rendering**:
- [ ] AC7: Flowing energy animation ✓/✗
- [ ] AC8: Prayer bead points ✓/✗
- [ ] AC9: Byzantine pattern ✓/✗
- [ ] AC10: Gold shimmer ✓/✗

**Particle Systems**:
- [ ] AC11: Background particle motion ✓/✗
- [ ] AC12: Divine spark flashes ✓/✗
- [ ] AC13: Firefly orbital motion ✓/✗
- [ ] AC14: Firefly spark effects ✓/✗

**Post-Processing**:
- [ ] AC15: Bloom effect ✓/✗
- [ ] AC16: Vignette effect ✓/✗
- [ ] AC17: Both renderers work ✓/✗

**Atmosphere**:
- [ ] AC18: Sacred geometry grid ✓/✗
- [ ] AC19: Atmospheric fog ✓/✗
- [ ] AC20: Color palette match ✓/✗

**Performance**:
- [ ] AC21: 60fps with 500+ nodes ✓/✗
- [ ] AC22: No visual artifacts ✓/✗

### Step 7.8: Update Feature Status

**File**: `docs/plans/active/visual-parity/spec.md`

Update status to Complete if all criteria pass.

**File**: `docs/plans/active/visual-parity/development-plan.md`

Update all phase statuses and completion dates.

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `docs/plans/active/visual-parity/screenshots/` | CREATE | Store comparison images |
| `docs/plans/active/visual-parity/visual-comparison.md` | CREATE | Document comparison |
| `docs/plans/active/visual-parity/spec.md` | UPDATE | Mark complete |
| `docs/plans/active/visual-parity/development-plan.md` | UPDATE | Final status |

---

## Final Documentation

After successful verification:

1. Move entire plan to `docs/plans/completed/visual-parity/`
2. Update `docs/invariants/INVARIANTS.md` with new visual invariants
3. Consider updating README with visualization capabilities
4. Archive screenshots for future reference

---

## Completion Criteria

- [ ] All comparison screenshots captured
- [ ] Visual comparison document created
- [ ] Performance benchmarks documented
- [ ] Known differences documented
- [ ] All acceptance criteria verified
- [ ] Spec marked as complete
- [ ] Plan moved to completed directory
- [ ] Invariants updated if needed

---

## Success Definition

Visual parity is achieved when:
1. Side-by-side screenshots show visually equivalent results
2. All 22 acceptance criteria are met
3. Performance targets are achieved (60fps, 500+ nodes)
4. Any differences are documented and justified
5. Overall aesthetic matches the ethereal, bioluminescent, mystical quality of the prototype
