# Phase 1.5: Generation-Based Vertical Layout

**Status**: Complete (Fixed x3)
**Started**: 2026-01-15
**Completed**: 2026-01-15
**Fixed**: 2026-01-15 (3 fixes applied to match prototype)

## Objective

Add 3D vertical layering to the constellation layout where nodes are positioned at different Y heights based on their generation number. This creates a subtle 3D bowl/cloud effect matching the prototype:
- Generation 0 (subject person) at Y=0
- Ancestors (negative generations) go DOWN (negative Y)
- Descendants (positive generations) go UP (positive Y)

## Implementation (Matching Prototype)

The prototype uses `Y = generation * 8` which creates:
- Subtle vertical separation (8 units per generation)
- Ancestors below the subject (negative Y values)
- Descendants above the subject (positive Y values)
- An organic 3D cloud appearance, not flat stacked layers

### Key Formula

```typescript
// Y = generation * verticalSpacing (matching prototype)
// Gen 0: Y = 0
// Gen -1 (parents): Y = -8 (below)
// Gen -2 (grandparents): Y = -16 (further below)
// Gen +1 (children): Y = 8 (above)
node.position.y = node.generation * this._config.verticalSpacing;
```

### Default Configuration

```typescript
verticalSpacing: 8  // Matching prototype for subtle 3D effect
```

## Fixes Applied

### Fix #1: Direction and Spacing

**Original (incorrect) implementation**:
- Used `Y = -generation * 30` (ancestors UP, descendants DOWN)
- 30 unit spacing created harsh horizontal layers
- Visual result: stacked pancakes instead of 3D cloud

**Fixed implementation**:
- Changed to `Y = generation * 8` (ancestors DOWN, descendants UP)
- 8 unit spacing creates subtle 3D bowl shape

### Fix #2: 3D Force Calculations

**Original (incorrect) implementation**:
- Repulsion and attraction forces only operated in 2D (XZ plane)
- All nodes at same generation stayed at exact same Y position
- Visual result: strict horizontal layers with no organic variation

**Fixed implementation**:
- `_applyRepulsion()`: Now includes Y in distance calculation and force application
- `_applyAttraction()`: Now includes Y in distance calculation and force application
- Creates organic Y variation within each generation layer
- Matches prototype's organic 3D constellation appearance

### Fix #3: Force Strength Values

**Original (incorrect) values**:
- `repulsionStrength: 80` (prototype uses 500!)
- `generationSpacing: 60` (prototype uses 50)
- `generationStrength: 0.15` used for both radial and Y forces

**Fixed values (matching prototype)**:
- `repulsionStrength: 500` - 6x stronger repulsion creates organic spread
- `generationSpacing: 50` - matches prototype
- Radial force: `generationStrength: 0.08` (prototype hardcodes 0.08)
- Y force: hardcoded `0.15` (prototype hardcodes 0.15)

**Prototype analysis** (from `reference_prototypes/family-constellations/src/core/layout.ts`):
```typescript
// Prototype repulsion: line 196
const force = this.config.repulsionForce / distSq;  // repulsionForce: 500

// Prototype generation forces: lines 272-290
const targetY = node.generation * 8;
node.velocity.y += (targetY - node.position.y) * 0.15;  // Y strength: 0.15

const radialForce = radiusDiff * 0.08;  // radial strength: 0.08
```

## TDD Test Cases

### Tests Updated to Match Prototype

1. **Default vertical spacing** - should default to 8 (matching prototype)
2. **Custom vertical spacing** - should accept custom value
3. **Generation 0 at Y=0** - subject at center
4. **Ancestors at negative Y** - parents at Y=-8, grandparents at Y=-16
5. **Descendants at positive Y** - children at Y=8
6. **Vertical separation maintained** - force simulation preserves layers
7. **Distinct Y layers** - each generation at unique Y position

### Test Results

```
Test Files  1 passed (1)
Tests       27 passed (27)
Duration    733ms
```

## Acceptance Criteria

- [x] Nodes with different generations have different Y positions
- [x] Generation 0 (subject) positioned at Y=0
- [x] Ancestors (negative generations) positioned BELOW (negative Y)
- [x] Descendants (positive generations) positioned ABOVE (positive Y)
- [x] Force simulation maintains vertical separation
- [x] All existing force-layout tests still pass
- [x] Default spacing matches prototype (8 units)

## Files Modified

- `src/visualization/layout/force-layout.ts` - Fixed vertical spacing, direction, and 3D forces
- `src/visualization/layout/force-layout.test.ts` - Updated tests to match prototype
- `src/components/constellation-canvas.tsx` - Updated config values to match prototype

## Notes

- The prototype uses `baseY = gen * 8` for subtle 3D layering
- Original implementation inverted the direction AND used too large spacing
- The fix creates the organic 3D cloud appearance seen in the prototype
- Camera position and angle also affect perceived depth
