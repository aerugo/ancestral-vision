# Phase 5: Atmosphere & Grid

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Add atmospheric fog for depth perception and animate the sacred geometry grid to enhance the mystical, ethereal quality of the visualization.

---

## Invariants Enforced in This Phase

- **INV-V001**: WebGPU Compatibility - Changes must work with WebGPU renderer

---

## Background

**Current State**:
- Scene has no fog (flat depth perception)
- Sacred geometry grid exists but is completely static
- Background color is deep space (0x050510)

**Prototype State**:
- Exponential fog creates depth (density ~0.0008-0.0012)
- Fog color matches background (cosmic indigo)
- Grid may have subtle animation

---

## Implementation Steps

### Step 5.1: Add Atmospheric Fog to Scene

**File**: `src/visualization/scene.ts`

Add exponential fog:

```typescript
import * as THREE from 'three';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  // Deep space background
  const backgroundColor = 0x050510;
  scene.background = new THREE.Color(backgroundColor);

  // Atmospheric fog for depth
  const fogColor = 0x0a0612;  // Slightly different from background for depth
  const fogDensity = 0.001;   // Prototype uses 0.0008-0.0012
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);

  // Lighting...
  return scene;
}
```

### Step 5.2: Tune Fog Parameters

Test different fog densities:

| Density | Effect | Notes |
|---------|--------|-------|
| 0.0005 | Very subtle | Objects barely fade |
| 0.0008 | Subtle | Good for large scenes |
| 0.001 | Moderate | Good balance |
| 0.0012 | Strong | Objects fade quickly |
| 0.002 | Very strong | May obscure details |

Starting value: `0.001` (moderate)

### Step 5.3: Ensure Materials Respect Fog

**File**: Various material files

Three.js materials automatically respect scene fog, but verify:

```typescript
// In material creation, ensure fog is not disabled
const material = new MeshStandardNodeMaterial({
  // fog: true is default, don't set to false
});
```

### Step 5.4: Add Animation to Sacred Geometry Grid

**File**: `src/visualization/effects/sacred-geometry-grid.ts`

Add time-based animation (subtle rotation or pulse):

```typescript
export interface SacredGeometryGrid {
  mesh: THREE.Group;
  update: (time: number) => void;  // Add update method
  dispose: () => void;
}

export function createSacredGeometryGrid(options = {}): SacredGeometryGrid {
  const group = new THREE.Group();

  // ... existing ring and line creation ...

  // Animation update function
  function update(time: number): void {
    // Option 1: Subtle rotation
    group.rotation.y = time * 0.02;  // Very slow rotation

    // Option 2: Subtle pulse (alternative)
    // const scale = 1 + Math.sin(time * 0.5) * 0.02;
    // group.scale.setScalar(scale);
  }

  return {
    mesh: group,
    update,
    dispose: () => { /* cleanup */ },
  };
}
```

### Step 5.5: Integrate Grid Animation into Engine

**File**: `src/visualization/engine.ts`

Call grid update in render loop:

```typescript
// In render function
function render(): void {
  const elapsed = clock.getElapsedTime();

  // ... other updates ...

  // Update sacred geometry grid
  if (sacredGeometryGrid) {
    sacredGeometryGrid.update(elapsed);
  }

  // ... rendering ...
}
```

### Step 5.6: Verify Grid Update Interface

**File**: `src/visualization/effects/sacred-geometry-grid.ts`

Ensure update method is properly exported:

```typescript
export interface SacredGeometryGrid {
  mesh: THREE.Group;
  update: (time: number) => void;
  dispose: () => void;
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/scene.ts` | MODIFY | Add FogExp2 |
| `src/visualization/effects/sacred-geometry-grid.ts` | MODIFY | Add animation |
| `src/visualization/engine.ts` | MODIFY | Integrate grid animation |

---

## Visual Reference

**Prototype Atmosphere**:
- Objects fade into cosmic background at distance
- Depth perception enhanced without obscuring content
- Grid provides subtle grounding motion
- Overall feeling of infinite cosmic space

---

## Verification

```bash
# Start dev server
npm run dev

# Visual verification:
1. Open browser to visualization
2. Zoom in and out to see fog effect
3. Distant objects should fade gradually
4. Observe sacred geometry grid
5. Grid should rotate or pulse subtly
6. Compare depth perception with prototype

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] Scene has FogExp2 configured
- [ ] Distant objects fade into background
- [ ] Fog color matches scene aesthetic
- [ ] Sacred geometry grid animates subtly
- [ ] Animation is smooth and not distracting
- [ ] Performance acceptable (60fps)
- [ ] Type check passes
- [ ] No console errors

---

## Reference

**Prototype Fog Configuration** (from `ModernRenderer.ts`):
```typescript
// Dark theme fog
scene.fog = new THREE.FogExp2(0x0a0612, 0.0012);

// Light theme fog (for reference)
scene.fog = new THREE.FogExp2(0xf5ebd7, 0.0003);
```

**Fog Colors**:
- Background: `0x050510` (near black)
- Fog: `0x0a0612` (cosmic indigo - slightly lighter for depth)

This slight difference between background and fog color creates the sense of atmospheric depth without visible fog "walls".
