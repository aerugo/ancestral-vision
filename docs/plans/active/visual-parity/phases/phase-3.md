# Phase 3: Edge Material Enhancement

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Enable all enhanced visual effects on edge materials to achieve the flowing golden energy appearance with Byzantine patterns and prayer bead nodes matching the reference prototype.

---

## Invariants Enforced in This Phase

- **INV-V001**: WebGPU Compatibility - All changes use TSL
- **INV-V002**: Material Consistency - Colors match project palette

---

## Background

The edge material (`src/visualization/materials/edge-material.ts`) has enhanced effects coded but disabled:

**Currently Active (enhancedMode = false)**:
- Flowing energy animation
- Gold shimmer effect
- End fade transparency
- Additive blending

**Coded but Disabled**:
- Prayer bead discrete glow points (Alex Grey inspired)
- Byzantine wave pattern overlay (Klimt inspired)

The code exists in lines 103-129 but is gated by `enhancedMode`:
```typescript
if (enhancedMode && uPrayerBeadIntensity && uByzantineIntensity) {
  // Enhanced effects...
}
```

---

## Implementation Steps

### Step 3.1: Enable Enhanced Mode in Edge Material Creation

**File**: `src/visualization/materials/edge-material.ts`

Modify `createEdgeMaterial()` to enable enhanced mode by default:

```typescript
export function createEdgeMaterial(options: EdgeMaterialOptions = {}): EdgeMaterial {
  const {
    colorPrimary = 0x9966cc,
    colorSecondary = 0xd4a84b,
    flowSpeed = 0.5,
    enhancedMode = true,  // Change default to true
    // Enhanced uniforms with defaults
    prayerBeadIntensity = 0.6,
    byzantineIntensity = 0.3,
  } = options;

  // ... create uniforms for enhanced effects
}
```

### Step 3.2: Pass Enhanced Uniforms from Engine

**File**: `src/visualization/engine.ts`

Update edge material creation to pass enhanced parameters:

```typescript
const edgeMaterial = createEdgeMaterial({
  colorPrimary: config.colors?.primary ?? 0x9966cc,
  colorSecondary: config.colors?.secondary ?? 0xd4a84b,
  flowSpeed: config.edge?.flowSpeed ?? 0.5,
  enhancedMode: true,  // Always enable
  prayerBeadIntensity: 0.6,
  byzantineIntensity: 0.3,
});
```

### Step 3.3: Verify Prayer Bead Implementation

**File**: `src/visualization/materials/edge-material.ts`

Review the prayer bead effect (lines ~106-115):

```typescript
// Prayer beads - discrete glowing points along edge path
const beadPos = fract(sub(mul(progress, float(8)), mul(uTime, float(0.4))));
const beadShape = mul(
  smoothstep(float(0.4), float(0.5), beadPos),
  smoothstep(float(0.6), float(0.5), beadPos)
);
const prayerBeads = mul(beadShape, uPrayerBeadIntensity);
```

Key parameters:
- `8` controls number of beads along edge
- `0.4` controls animation speed
- Smoothstep values control bead sharpness

### Step 3.4: Verify Byzantine Pattern Implementation

**File**: `src/visualization/materials/edge-material.ts`

Review the Byzantine pattern effect (lines ~117-125):

```typescript
// Byzantine interlocking wave pattern
const byzantinePattern = mul(
  sin(mul(progress, float(40))),
  sin(add(mul(uTime, float(2)), mul(progress, float(15))))
);
const byzantineContribution = mul(
  mul(byzantinePattern, float(0.5)),
  uByzantineIntensity
);
```

Key parameters:
- `40` and `15` control pattern density
- `2` controls animation speed
- `0.5` scales pattern intensity

### Step 3.5: Tune Enhanced Effect Intensities

Compare visually with prototype and adjust:

| Effect | Prototype Value | Starting Value | Notes |
|--------|-----------------|----------------|-------|
| Prayer Bead Intensity | ~0.6 | 0.6 | Visible discrete points |
| Byzantine Intensity | ~0.3 | 0.3 | Subtle wave overlay |
| Bead Count | 8 | 8 | Beads per edge |
| Flow Speed | 0.4 | 0.4 | Bead animation speed |

### Step 3.6: Ensure Proper Opacity Contribution

Verify enhanced effects contribute to final opacity:

```typescript
// Base opacity from existing effects
let finalOpacity = mul(baseFade, shimmerIntensity);

// Add enhanced effect contributions
if (enhancedMode) {
  finalOpacity = add(finalOpacity, prayerBeads);
  finalOpacity = add(finalOpacity, byzantineContribution);
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/materials/edge-material.ts` | MODIFY | Enable enhanced mode, verify implementation |
| `src/visualization/engine.ts` | MODIFY | Pass enhanced parameters to material |
| `src/visualization/edges/index.ts` | VERIFY | Ensure edge system uses enhanced material |

---

## Visual Reference

**Prototype Edge Appearance**:
- Golden flowing energy moving along curve
- Discrete glowing "prayer bead" points spaced evenly
- Subtle wave pattern adding visual complexity
- Shimmer effect on gold color
- Fades at both endpoints

---

## Verification

```bash
# Start dev server
npm run dev

# Visual verification:
1. Open browser to visualization
2. Observe edges closely
3. Verify flowing energy animation visible
4. Verify discrete bead points visible
5. Verify wave pattern adds subtle complexity
6. Compare side-by-side with prototype

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] Enhanced mode enabled by default
- [ ] Prayer bead points visible along edges
- [ ] Byzantine wave pattern visible (subtle)
- [ ] Flow animation smooth and natural
- [ ] Effects balanced (not overpowering)
- [ ] Edge endpoints fade properly
- [ ] Performance acceptable (60fps)
- [ ] Type check passes
- [ ] No console errors

---

## Reference Code

**Prototype Edge Fragment Shader** (key effects):
```glsl
// Prayer beads (Alex Grey inspired)
float beadPos = fract(vProgress * 8.0 - uTime * 0.4);
float prayerBeads = smoothstep(0.4, 0.5, beadPos) * smoothstep(0.6, 0.5, beadPos);

// Byzantine pattern (Klimt inspired)
float byzantine = sin(vProgress * 40.0) * sin(uTime * 2.0 + vProgress * 15.0);

// Combined with flowing energy
float energy = fract(vProgress * 3.0 - uTime * 0.5);
float flowPulse = smoothstep(0.0, 0.3, energy) * smoothstep(1.0, 0.6, energy);
```
