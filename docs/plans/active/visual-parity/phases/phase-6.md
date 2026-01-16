# Phase 6: Color & Parameter Tuning

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Fine-tune all visual parameters (colors, intensities, animation speeds) to achieve exact visual match with the reference prototype.

---

## Invariants Enforced in This Phase

- **INV-V002**: Material Consistency - All materials share consistent color palette

---

## Background

After enabling all enhanced effects, parameters need tuning to match prototype exactly. This phase involves visual comparison and iterative adjustment.

## Deferred Items from Earlier Phases

**From Phase 2 (Node Material)**:
- Step 2.4: Tune node enhanced effect intensities (inner glow, SSS, mandala, golden spiral)

**From Phase 3 (Edge Material)** (expected):
- Tune edge enhanced effect intensities (prayer beads, Byzantine patterns)

**From Phase 4 (Particles)** (expected):
- Tune particle divine spark intensities

---

## Reference Color Palette

**Prototype Colors**:

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Luminous Violet | `#9966cc` | (153, 102, 204) | Node primary color |
| Sacred Gold | `#d4a84b` | (212, 168, 75) | Node secondary, edge color |
| Ethereal Rose | `#c98b8b` | (201, 139, 139) | Accent color |
| Cosmic Background | `#050510` | (5, 5, 16) | Scene background |
| Fog Indigo | `#0a0612` | (10, 6, 18) | Atmospheric fog |
| Grid Gold | `#d4a84b` | (212, 168, 75) | Sacred geometry |

---

## Implementation Steps

### Step 6.1: Verify Node Material Colors

**File**: `src/visualization/materials/node-material.ts`

Compare and adjust:

```typescript
const DEFAULT_PRIMARY = 0x9966cc;    // Luminous Violet
const DEFAULT_SECONDARY = 0xd4a84b;  // Sacred Gold
```

Visual comparison checklist:
- [ ] Primary color matches prototype violet
- [ ] Secondary color matches prototype gold
- [ ] Color blend ratio feels correct

### Step 6.2: Verify Edge Material Colors

**File**: `src/visualization/materials/edge-material.ts`

Compare and adjust:

```typescript
const DEFAULT_PRIMARY = 0x9966cc;    // Luminous Violet
const DEFAULT_SECONDARY = 0xd4a84b;  // Sacred Gold
```

Visual comparison checklist:
- [ ] Edge base color matches prototype
- [ ] Gold shimmer intensity correct
- [ ] Prayer bead glow color correct

### Step 6.3: Verify Particle Colors

**File**: `src/visualization/particles/background-particles.ts`

Compare Haeckel palette:

```typescript
// Prototype distribution: 75% violet, 15% gold, 10% rose
const colors = [
  new THREE.Color(0x9966cc),  // Violet (dominant)
  new THREE.Color(0xd4a84b),  // Gold
  new THREE.Color(0xc98b8b),  // Rose
];
```

### Step 6.4: Tune Animation Speeds

**All material files**

| Animation | Prototype Value | Current | Notes |
|-----------|-----------------|---------|-------|
| Node pulse | 2.0 | ? | Breathing speed |
| Node mandala | 0.8 | ? | Ring animation |
| Edge flow | 0.5 | ? | Energy flow speed |
| Edge beads | 0.4 | ? | Bead movement |
| Particle pulse | 2.0 | ? | Background glow |
| Grid rotation | 0.02 | ? | Very slow |

### Step 6.5: Tune Glow Intensities

**All material files**

| Effect | Prototype Value | Current | Notes |
|--------|-----------------|---------|-------|
| Node Fresnel | 1.5 | ? | Rim glow brightness |
| Node inner glow | 0.8 | ? | Center emanation |
| Node SSS | 0.3 | ? | Backlit effect |
| Node mandala | 0.4 | ? | Ring visibility |
| Edge shimmer | 0.15 | ? | Gold variation |
| Edge beads | 0.6 | ? | Bead brightness |
| Bloom intensity | 0.6 | ? | Post-processing |
| Vignette darkness | 0.4 | ? | Edge darkening |

### Step 6.6: Tune Post-Processing

**File**: `src/visualization/effects/webgpu-post-processing.ts`

```typescript
const bloomConfig = {
  intensity: 0.6,     // Prototype value
  threshold: 0.8,
  radius: 0.5,
};

const vignetteConfig = {
  darkness: 0.4,      // Prototype value
  offset: 0.3,
};
```

### Step 6.7: Tune Fog

**File**: `src/visualization/scene.ts`

```typescript
const fogDensity = 0.001;  // Adjust based on visual comparison
```

### Step 6.8: Create Visual Comparison

Side-by-side comparison process:
1. Run prototype at reference resolution
2. Run Ancestral Vision at same resolution
3. Take screenshots of same data
4. Compare pixel-by-pixel if needed
5. Document any intentional differences

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/materials/node-material.ts` | TUNE | Color and intensity values |
| `src/visualization/materials/edge-material.ts` | TUNE | Color and intensity values |
| `src/visualization/particles/background-particles.ts` | TUNE | Color distribution |
| `src/visualization/particles/event-fireflies.ts` | TUNE | Intensity values |
| `src/visualization/effects/webgpu-post-processing.ts` | TUNE | Bloom/vignette values |
| `src/visualization/scene.ts` | TUNE | Fog density, lighting |

---

## Verification Process

```bash
# Side-by-side comparison setup:

# Terminal 1 - Run prototype
cd reference_prototypes/family-constellations
npm run dev

# Terminal 2 - Run Ancestral Vision
cd /Users/hugi/GitRepos/ancestral-vision
npm run dev

# Compare in browser:
1. Open both at same viewport size
2. Load same or similar data
3. Position camera similarly
4. Take screenshots
5. Compare in image editor
```

---

## Completion Criteria

- [ ] Node colors match prototype
- [ ] Edge colors match prototype
- [ ] Particle colors match prototype
- [ ] Animation speeds feel correct
- [ ] Glow intensities match prototype
- [ ] Post-processing intensity matches
- [ ] Fog depth matches prototype
- [ ] Overall aesthetic is visually indistinguishable
- [ ] Any differences are documented and intentional

---

## Adjustment Log

Document all parameter changes:

| Parameter | Original | Final | Reason |
|-----------|----------|-------|--------|
| (fill during implementation) | | | |

---

## Reference Values Summary

```typescript
// Node Material
colorPrimary: 0x9966cc,
colorSecondary: 0xd4a84b,
glowIntensity: 1.5,
pulseSpeed: 2.0,
innerGlowIntensity: 0.8,
sssStrength: 0.3,
mandalaIntensity: 0.4,
goldenSpiralIntensity: 0.3,

// Edge Material
flowSpeed: 0.5,
prayerBeadIntensity: 0.6,
byzantineIntensity: 0.3,

// Particles
divineSparkIntensity: 0.8,

// Post-Processing
bloomIntensity: 0.6,
bloomThreshold: 0.8,
vignetteDarkness: 0.4,
vignetteOffset: 0.3,

// Atmosphere
fogDensity: 0.001,
fogColor: 0x0a0612,
backgroundColor: 0x050510,

// Grid
gridOpacity: 0.08,
gridRotationSpeed: 0.02,
```
