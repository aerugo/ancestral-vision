# Phase 5: Performance Optimization

**Goal**: Optimize bloom quality and performance for various devices
**Status**: Complete
**Parent Plan**: [../development-plan.md](../development-plan.md)

## Critical Invariants

- **INV-A009**: Resource Disposal - Dispose all resources on cleanup
- **INV-A008**: WebGPU Imports - Use `three/webgpu` and `three/tsl` import paths

## Overview

This phase adds performance optimization features to the TSL post-processing pipeline:

1. **Configurable Bloom Mip Levels**: Control bloom quality vs performance trade-off
2. **Resolution Scaling**: Render at lower resolution for better performance
3. **Performance Presets**: Pre-configured quality levels (low, medium, high, ultra)
4. **Adaptive Quality**: Optional automatic adjustment based on frame rate

## Deliverables

1. `src/visualization/tsl-pipeline/performance-config.ts` - Performance configuration
2. `src/visualization/tsl-pipeline/performance-config.test.ts` - Unit tests (6+ tests)
3. Extended `PostProcessingPipelineConfig` with performance options
4. Updated `GraphicsEngine` to support performance presets

## TDD Test Cases

### Tests to Implement (6+ tests)

| Test | Description |
|------|-------------|
| should export PerformancePreset enum | LOW, MEDIUM, HIGH, ULTRA presets |
| should export getPerformanceConfig function | Returns config for preset |
| should return correct mipLevels for each preset | LOW=3, MEDIUM=4, HIGH=5, ULTRA=6 |
| should return correct resolutionScale for each preset | LOW=0.5, MEDIUM=0.75, HIGH=1.0, ULTRA=1.0 |
| should apply performance config to post-processing | Integration with pipeline |
| should support custom performance config | Override preset values |

## API Design

### PerformancePreset Enum

```typescript
export enum PerformancePreset {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ULTRA = 'ULTRA',
}
```

### PerformanceConfig Interface

```typescript
export interface PerformanceConfig {
  /** Number of mip levels for bloom (3-6, higher = better quality, slower) */
  bloomMipLevels: number;

  /** Resolution scale factor (0.5-1.0, lower = faster, blurrier) */
  resolutionScale: number;

  /** Maximum effects enabled (for low-end devices) */
  maxEffects: number;

  /** Enable DOF (expensive effect) */
  enableDof: boolean;

  /** Enable chromatic aberration */
  enableChromaticAberration: boolean;

  /** Enable film grain */
  enableFilmGrain: boolean;
}
```

### Preset Configurations

```typescript
const PERFORMANCE_PRESETS: Record<PerformancePreset, PerformanceConfig> = {
  [PerformancePreset.LOW]: {
    bloomMipLevels: 3,
    resolutionScale: 0.5,
    maxEffects: 2,
    enableDof: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
  },
  [PerformancePreset.MEDIUM]: {
    bloomMipLevels: 4,
    resolutionScale: 0.75,
    maxEffects: 3,
    enableDof: false,
    enableChromaticAberration: true,
    enableFilmGrain: false,
  },
  [PerformancePreset.HIGH]: {
    bloomMipLevels: 5,
    resolutionScale: 1.0,
    maxEffects: 4,
    enableDof: true,
    enableChromaticAberration: true,
    enableFilmGrain: false,
  },
  [PerformancePreset.ULTRA]: {
    bloomMipLevels: 6,
    resolutionScale: 1.0,
    maxEffects: 5,
    enableDof: true,
    enableChromaticAberration: true,
    enableFilmGrain: true,
  },
};
```

### Extended GraphicsEngine Config

```typescript
export interface GraphicsEngineConfig {
  // ... existing config ...

  /** Performance preset (default: HIGH) */
  performancePreset?: PerformancePreset;

  /** Custom performance config (overrides preset) */
  performanceConfig?: Partial<PerformanceConfig>;
}
```

## Implementation Notes

### Bloom Mip Levels

The bloom effect uses a mip chain for multi-scale blur. More levels = smoother bloom but more GPU work:

- 3 levels: Fast, visible banding on large blooms
- 4 levels: Good balance for most devices
- 5 levels: High quality, recommended for dedicated GPUs
- 6 levels: Ultra quality, may impact performance on integrated GPUs

### Resolution Scaling

Resolution scaling renders the scene at a lower resolution then upscales:

- 0.5: 25% of pixels, very fast but noticeably blurry
- 0.75: 56% of pixels, good balance for integrated GPUs
- 1.0: Full resolution, best quality

### Integration with Post-Processing Pipeline

```typescript
const config = getPerformanceConfig(PerformancePreset.HIGH);

const result = createPostProcessingPipeline(renderer, scene, camera, {
  bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
  vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
  dof: config.enableDof ? { enabled: true, ... } : undefined,
  chromaticAberration: config.enableChromaticAberration ? { enabled: true, ... } : undefined,
  filmGrain: config.enableFilmGrain ? { enabled: true, ... } : undefined,
});
```

## Verification Steps

1. **Write tests first**: `npm test -- src/visualization/tsl-pipeline/performance-config.test.ts`
2. **Implement until tests pass**
3. **Type check**: `npx tsc --noEmit`
4. **Visual test**: Compare presets side-by-side

## Success Criteria

- [x] All 6+ tests pass (TDD) - 20 tests + 5 integration tests = 25 total
- [x] Type check passes
- [x] Performance presets correctly configure effects
- [x] Resolution scaling works with post-processing
- [x] GraphicsEngine integration complete (performancePreset option)
- [ ] Documentation updated with performance guidelines (pending)

## Notes

- Bloom mip levels may require changes to the bloom import/usage
- Resolution scaling may need renderer.setPixelRatio or setSize adjustments
- The current BloomNode from three/addons may not expose mip level configuration directly - may need to document as a future enhancement if API doesn't support it

---

*Phase template version: 1.0*
