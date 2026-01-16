# Phase 2: Node Material Enhancement

**Status**: Complete
**Started**: 2026-01-15
**Completed**: 2026-01-15
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Enable all enhanced visual effects on node materials to achieve the bioluminescent, ethereal appearance of the reference prototype.

---

## Invariants Enforced in This Phase

- **INV-V001**: WebGPU Compatibility - All changes use TSL
- **INV-V002**: Material Consistency - Colors match project palette
- **NEW INV-V010**: Enhanced Visual Mode - Enhanced effects enabled by default

---

## Background

The node material (`src/visualization/materials/node-material.ts`) has extensive enhanced effects already coded but disabled:

**Currently Active (enhancedMode = false)**:
- Basic Fresnel rim glow
- Pulsing animation
- Noise-based color variation

**Coded but Disabled**:
- Inner glow (inverse Fresnel for center emanation)
- Subsurface scattering (backlit translucency)
- Mandala ring patterns (animated concentric rings)
- Golden spiral pattern (rotating overlay)

The code exists in lines 134-171 but is gated by `enhancedMode`:
```typescript
if (enhancedMode && uInnerGlowIntensity && uSSSStrength && uMandalaIntensity) {
  // Enhanced effects...
}
```

---

## Implementation Steps

### Step 2.1: Enable Enhanced Mode in Node Material Creation ✅ COMPLETE

**File**: `src/visualization/materials/node-material.ts`

Changed `enhancedMode` default from `false` to `true` (line 91):

```typescript
enhancedMode = true, // Phase 2: Enable enhanced visual effects by default
```

**Tests Added** (TDD):
- `should enable enhanced mode by default`
- `should have default inner glow intensity of 0.8 when using defaults`
- `should have default SSS strength of 0.3 when using defaults`
- `should have default mandala intensity of 0.3 when using defaults`
- `should allow disabling enhanced mode explicitly`

All 29 node-material tests pass.

### Step 2.2: Pass Enhanced Uniforms from Engine ⏭️ SKIPPED

**Reason**: Not needed. `engine.ts` does not directly use `createNodeMaterial()`. The node material is created and used by other visualization components that already pass the correct config. Since `enhancedMode` now defaults to `true`, no engine changes are required.

**Original Plan** (not implemented):
```typescript
const nodeMaterial = createNodeMaterial({
  colorPrimary: config.colors?.primary ?? 0x9966cc,
  colorSecondary: config.colors?.secondary ?? 0xd4a84b,
  glowIntensity: config.node?.glowIntensity ?? 1.5,
  pulseSpeed: config.node?.pulseSpeed ?? 2.0,
  enhancedMode: true,  // Always enable
  innerGlowIntensity: 0.8,
  sssStrength: 0.3,
  mandalaIntensity: 0.4,
  goldenSpiralIntensity: 0.3,
});
```

### Step 2.3: Verify Enhanced Effect Implementation ➡️ DEFERRED to Phase 7

**Deferred to**: Phase 7 (Visual Verification)

**Reason**: Visual verification is best done during the dedicated verification phase when all visual effects are enabled across nodes, edges, and particles. This allows for holistic comparison with the prototype.

**Original Reference** (for Phase 7):

**Inner Glow** (lines ~138-142):
```typescript
// Inverse Fresnel for soft center glow
const innerGlow = smoothstep(float(0), float(0.8), sub(float(1), fresnel));
const innerGlowContribution = mul(innerGlow, uInnerGlowIntensity);
```

**Subsurface Scattering** (lines ~144-148):
```typescript
// Backlit translucency effect
const backlit = pow(max(dot(viewDir, neg(vNormal)), float(0)), float(2));
const sssContribution = mul(backlit, uSSSStrength);
```

**Mandala Rings** (lines ~150-154):
```typescript
// Animated concentric ring pattern
const ringDist = length(vPosition.xy);
const rings = sin(sub(mul(ringDist, float(15)), mul(uTime, float(0.8))));
const mandalaContribution = mul(mul(rings, float(0.5)), uMandalaIntensity);
```

**Golden Spiral** (lines ~156-166):
```typescript
// Rotating spiral overlay
const angle = atan2(vPosition.y, vPosition.x);
const spiralDist = length(vPosition.xy);
const spiral = sin(add(mul(angle, float(6)), sub(mul(spiralDist, float(25)), mul(uTime, float(0.5)))));
const spiralContribution = mul(mul(spiral, float(0.5)), uGoldenSpiralIntensity);
```

### Step 2.4: Tune Enhanced Effect Intensities ➡️ DEFERRED to Phase 6

**Deferred to**: Phase 6 (Color & Parameter Tuning)

**Reason**: Parameter tuning should be done in Phase 6 when all visual effects are enabled and we can do a comprehensive side-by-side comparison with the prototype.

**Current Values** (using defaults from node-material.ts):

| Effect | Current Value | Phase 6 Task |
|--------|---------------|--------------|
| Inner Glow | 0.8 | Compare with prototype, adjust if needed |
| SSS Strength | 0.3 | Compare with prototype, adjust if needed |
| Mandala | 0.3 | Compare with prototype, adjust if needed |
| Golden Spiral | 0.15 (via mandalaIntensity * 0.5) | Compare with prototype, adjust if needed |

### Step 2.5: Update Types and Interfaces ⏭️ NOT NEEDED

**Reason**: Types are already complete in `src/visualization/materials/node-material.ts`. The `NodeMaterialConfig` interface (lines 36-55) already includes all enhanced options:

```typescript
export interface NodeMaterialConfig {
  colorPrimary?: THREE.Color;
  colorSecondary?: THREE.Color;
  glowIntensity?: number;
  pulseSpeed?: number;
  pulseAmplitude?: number;
  enhancedMode?: boolean;
  innerGlowIntensity?: number;
  sssStrength?: number;
  mandalaIntensity?: number;
}
```

No additional type changes required.

---

## Files

| File | Action | Status | Purpose |
|------|--------|--------|---------|
| `src/visualization/materials/node-material.ts` | MODIFY | ✅ Complete | Changed `enhancedMode` default to `true` |
| `src/visualization/materials/node-material.test.ts` | MODIFY | ✅ Complete | Added 5 TDD tests for enhanced mode default |
| `src/visualization/engine.ts` | MODIFY | ⏭️ Skipped | Not needed - doesn't use createNodeMaterial directly |
| `src/types/visualization.ts` | MODIFY | ⏭️ Not needed | Types already complete in node-material.ts |

---

## Visual Reference

**Prototype Node Appearance**:
- Soft glowing center that fades outward (inner glow)
- Slight translucency when backlit (SSS)
- Subtle animated rings on surface (mandala)
- Gentle rotating pattern overlay (golden spiral)
- Strong rim highlight (existing Fresnel)
- Pulsing based on biography weight (existing)

---

## Verification

```bash
# Start dev server
npm run dev

# Visual verification:
1. Open browser to visualization
2. Observe individual nodes closely
3. Verify soft center glow visible
4. Verify subtle animated patterns on surface
5. Compare side-by-side with prototype

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

**Phase 2 (This Phase)**:
- [x] Enhanced mode enabled by default
- [x] Type check passes (types already complete)
- [x] Unit tests pass (29 tests)

**Deferred to Phase 6 (Tuning)**:
- [ ] Effects not overpowering (subtle enhancement)
- [ ] Parameter values match prototype

**Deferred to Phase 7 (Verification)**:
- [ ] Inner glow effect visible (soft center)
- [ ] Subsurface scattering visible (backlit effect)
- [ ] Mandala ring animation visible
- [ ] Golden spiral animation visible
- [ ] Performance acceptable (60fps)
- [ ] No console errors

---

## Reference Code

**Prototype Node Fragment Shader** (key effects):
```glsl
// Inner glow (inverse fresnel)
float innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel);

// Subsurface scattering
float sss = pow(max(dot(viewDir, -vNormal), 0.0), 2.0) * 0.3;

// Mandala rings
float rings = sin(ringDist * 15.0 - uTime * 0.8);

// Golden spiral
float spiral = sin(angle * 6.0 + ringDist * 25.0 - uTime * 0.5);
```
