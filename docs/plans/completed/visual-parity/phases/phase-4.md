# Phase 4: Particle Enhancement

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Enable enhanced particle effects including divine spark flashes for both background particles and event fireflies to achieve the ethereal, mystical atmosphere of the reference prototype.

---

## Invariants Enforced in This Phase

- **INV-V001**: WebGPU Compatibility - All changes use TSL
- **INV-V002**: Material Consistency - Colors match project palette

---

## Background

Both particle systems have divine spark effects coded but disabled:

**Background Particles** (`src/visualization/particles/background-particles.ts`):
- Currently: Soft pulsing glow, Lissajous motion
- Coded but disabled: Divine spark flash effect (lines ~143-150)

**Event Fireflies** (`src/visualization/particles/event-fireflies.ts`):
- Currently: Orbital motion, flickering, event-type colors
- Coded but disabled: Divine spark flash effect (lines ~227-234)

---

## Implementation Steps

### Step 4.1: Enable Enhanced Mode in Background Particles

**File**: `src/visualization/particles/background-particles.ts`

Modify creation to enable divine spark:

```typescript
export function createBackgroundParticles(options: ParticleOptions = {}): ParticleSystem {
  const {
    count = 300,
    size = 2.0,
    enhancedMode = true,  // Change default to true
    divineSparkIntensity = 0.8,
  } = options;

  // ...
}
```

### Step 4.2: Verify Divine Spark Implementation (Background)

**File**: `src/visualization/particles/background-particles.ts`

Review divine spark effect (lines ~143-150):

```typescript
// Divine spark - occasional bright flash
if (enhancedMode && uDivineSparkIntensity) {
  const sparkPhase = add(mul(uTime, float(0.5)), mul(vPhase, float(12.56)));
  const spark = pow(
    add(mul(sin(sparkPhase), float(0.5)), float(0.5)),
    float(8)  // Sharp peak for flash
  );
  const sparkContribution = mul(spark, uDivineSparkIntensity);
  // Add to final color/brightness
}
```

Key parameters:
- `0.5` controls spark frequency
- `12.56` (4*PI) varies timing per particle
- `8` power creates sharp peak (higher = shorter flash)

### Step 4.3: Enable Enhanced Mode in Event Fireflies

**File**: `src/visualization/particles/event-fireflies.ts`

Modify creation to enable divine spark:

```typescript
export function createEventFireflies(options: FireflyOptions = {}): FireflySystem {
  const {
    baseCount = 5,
    weightMultiplier = 20,
    enhancedMode = true,  // Change default to true
    divineSparkIntensity = 0.8,
  } = options;

  // ...
}
```

### Step 4.4: Verify Divine Spark Implementation (Fireflies)

**File**: `src/visualization/particles/event-fireflies.ts`

Review divine spark effect (lines ~227-234):

```typescript
// Divine spark - sacred flame effect
if (enhancedMode && uDivineSparkIntensity) {
  const sparkPhase = add(mul(uTime, float(0.5)), mul(vPhase, float(12.56)));
  const spark = pow(
    add(mul(sin(sparkPhase), float(0.5)), float(0.5)),
    float(8)
  );
  const sparkContribution = mul(spark, uDivineSparkIntensity);
  // Add to final color/brightness
}
```

### Step 4.5: Pass Enhanced Uniforms from Engine

**File**: `src/visualization/engine.ts`

Update particle system creation:

```typescript
// Background particles
const backgroundParticles = createBackgroundParticles({
  count: config.particles?.count ?? 300,
  size: config.particles?.size ?? 2.0,
  enhancedMode: true,
  divineSparkIntensity: 0.8,
});

// Event fireflies
const eventFireflies = createEventFireflies({
  baseCount: config.fireflies?.baseCount ?? 5,
  weightMultiplier: config.fireflies?.weightMultiplier ?? 20,
  enhancedMode: true,
  divineSparkIntensity: 0.8,
});
```

### Step 4.6: Tune Spark Parameters

Compare visually with prototype and adjust:

| Parameter | Prototype Value | Starting Value | Notes |
|-----------|-----------------|----------------|-------|
| Spark Intensity | 0.8 | 0.8 | Brightness of flash |
| Spark Frequency | 0.5 | 0.5 | How often flashes occur |
| Power Exponent | 8 | 8 | Sharpness of flash peak |

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/particles/background-particles.ts` | MODIFY | Enable enhanced mode |
| `src/visualization/particles/event-fireflies.ts` | MODIFY | Enable enhanced mode |
| `src/visualization/engine.ts` | MODIFY | Pass enhanced parameters |

---

## Visual Reference

**Prototype Particle Appearance**:

Background Particles:
- Soft floating motion with organic curves
- Gentle pulsing glow
- Occasional bright flash (divine spark)
- Colors: violet (75%), gold (15%), rose (10%)

Event Fireflies:
- Orbital motion around parent nodes
- Flickering like candle flame
- Occasional sacred flash
- Colors based on event type (birth=green, death=purple, etc.)

---

## Verification

```bash
# Start dev server
npm run dev

# Visual verification:
1. Open browser to visualization
2. Observe background particles
3. Wait for occasional bright flashes
4. Observe fireflies around nodes
5. Verify flickering and flashing visible
6. Compare side-by-side with prototype

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] Enhanced mode enabled for background particles
- [ ] Divine spark flashes visible on background particles
- [ ] Enhanced mode enabled for event fireflies
- [ ] Divine spark flashes visible on fireflies
- [ ] Flash frequency feels natural (not too frequent)
- [ ] Flash intensity noticeable but not jarring
- [ ] Performance acceptable (60fps)
- [ ] Type check passes
- [ ] No console errors

---

## Reference Code

**Prototype Particle Fragment Shader** (divine spark):
```glsl
// Divine spark effect - occasional bright flash
float sparkPhase = uTime * 0.5 + vPhase * 12.56;
float spark = pow(sin(sparkPhase) * 0.5 + 0.5, 8.0);

// Apply to brightness
float brightness = baseBrightness + spark * uDivineSparkIntensity;

// Makes particles occasionally flash bright
// Creating ethereal, mystical atmosphere
```
