# Animation System - Development Plan

**Status**: Draft (Revised)
**Created**: 2026-01-18
**Revised**: 2026-01-18
**Branch**: `feature/animation-system`
**Spec**: [spec.md](spec.md)

## Summary

Implement a unified animation system that manages ALL animations in the constellation visualization, providing centralized control while maintaining the exact visual output of the current implementation.

## Critical Invariants to Respect

- **INV-A001**: WebGPURenderer Must Be Initialized - AnimationSystem integrates with existing render loop
- **INV-A002**: Use `renderer.setAnimationLoop()` - AnimationSystem `update()` called from existing loop
- **INV-A009**: Scene Cleanup on Unmount - AnimationSystem disposes all resources on cleanup

**New invariants introduced** (to be added to INVARIANTS.md after implementation):

- **NEW INV-A010**: Animation Timing Single Source of Truth - All animation timing flows through AnimationSystem

## Current State Analysis

### Problem

The codebase has 12+ distinct animation systems scattered across multiple files:

| Category | Animations | Current Driver |
|----------|------------|----------------|
| **Shader Loops** | Ghost mandala, Biography cloud, Edge flow, Background particles, Event fireflies | `uTime` uniform |
| **One-Shot** | Camera zoom, Biography transition | `deltaTime` CPU |
| **Propagation** | Pulse along graph path | Graph traversal + `deltaTime` |
| **Reactive** | Selection glow, Pulse intensity | State → instance attribute |
| **Multi-Phase** | Metamorphosis particles | 7 phases with `uProgress` + `uTime` |

Each system manages its own timing, making it impossible to:
- Pause/resume all animations together
- Apply a global time scale
- Debug animation timing
- Coordinate complex multi-system sequences

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AnimationSystem                               │
│  - Central coordinator for ALL animations                            │
│  - Owns TimeProvider (single source of truth)                        │
│  - Pause/resume/timeScale controls                                   │
└─────────────────────────────────────────────────────────────────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ShaderLoop │ │Transition │ │Propagation│ │Reactive   │ │PhaseAnim  │
│Registry   │ │Manager    │ │Animator   │ │Binding    │ │ator       │
│           │ │           │ │           │ │           │ │           │
│• uTime    │ │• Camera   │ │• Pulse    │ │• Selection│ │• Meta-    │
│  uniforms │ │• Biography│ │• Graph    │ │• Glow     │ │  morphosis│
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

## Migration Strategy Overview

The migration follows a **wrap-and-delegate** pattern:
1. Create new AnimationSystem components
2. Wrap existing animations without changing their logic
3. Gradually migrate consumers to use AnimationSystem
4. Maintain identical visual output throughout

## Phase Overview

| Phase | Description | New Components | Est. Tests |
|-------|-------------|----------------|------------|
| 1 | Foundation | TimeProvider, Easing, Types, EventBus | 20 tests |
| 2 | Shader Loops | ShaderLoop, ShaderLoopRegistry | 12 tests |
| 3 | Transitions | Timeline, Track, Orchestrator, Definitions | 35 tests |
| 4 | Propagation | PropagationAnimator wrapper | 10 tests |
| 5 | Reactive Bindings | ReactiveBinding, InstanceAttributes | 12 tests |
| 6 | Multi-Phase | PhaseAnimator, Metamorphosis definition | 15 tests |
| 7 | Integration | AnimationSystem, Debug API | 10 tests |

**Total Estimated Tests**: ~114 tests

---

## Phase 1: Foundation

**Goal**: Create core building blocks for the animation system
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `src/visualization/animation/core/time-provider.ts` - Unified time management
2. `src/visualization/animation/core/time-provider.test.ts` - Unit tests
3. `src/visualization/animation/core/easing.ts` - Shared easing functions
4. `src/visualization/animation/core/easing.test.ts` - Unit tests
5. `src/visualization/animation/types.ts` - Shared TypeScript types
6. `src/visualization/animation/core/event-bus.ts` - Animation event system
7. `src/visualization/animation/core/event-bus.test.ts` - Unit tests

### Success Criteria

- [ ] All foundation tests pass
- [ ] TimeProvider handles pause/resume and time scale
- [ ] TimeProvider caps delta time to prevent catch-up after sleep
- [ ] Easing functions match standard Robert Penner curves
- [ ] EventBus supports typed subscription/emission

---

## Phase 2: Shader Loops

**Goal**: Unify all continuous shader animations through TimeProvider
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. `src/visualization/animation/loops/shader-loop.ts` - ShaderLoop wrapper
2. `src/visualization/animation/loops/shader-loop.test.ts` - Unit tests
3. `src/visualization/animation/loops/shader-loop-registry.ts` - Track all uTime uniforms

### Affected Existing Files (wrap, don't modify internals)

- `src/visualization/materials/ghost-node-material.ts` - Ghost mandala
- `src/visualization/materials/biography-cloud-material.ts` - Biography cloud
- `src/visualization/materials/edge-material.ts` - Edge flow
- `src/visualization/materials/background-particles-material.ts` - Background
- `src/visualization/particles/firefly-material.ts` - Event fireflies

### Success Criteria

- [ ] All shader loop tests pass
- [ ] ShaderLoopRegistry tracks all `uTime` uniforms
- [ ] TimeProvider drives all shader animations
- [ ] Pause/resume affects all shader loops
- [ ] Visual output IDENTICAL to before

---

## Phase 3: Transitions

**Goal**: Create timeline-based one-shot animation system
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. `src/visualization/animation/transitions/timeline.ts` - Progress and phase tracking
2. `src/visualization/animation/transitions/timeline.test.ts` - Unit tests
3. `src/visualization/animation/transitions/track.ts` - Keyframe interpolation
4. `src/visualization/animation/transitions/track.test.ts` - Unit tests
5. `src/visualization/animation/transitions/transition.ts` - Transition class
6. `src/visualization/animation/transitions/transition.test.ts` - Unit tests
7. `src/visualization/animation/transitions/transition-builder.ts` - Fluent API
8. `src/visualization/animation/definitions/biography-transition.ts` - Biography definition
9. `src/visualization/animation/definitions/camera-transition.ts` - Camera definition

### Affected Existing Files

- `src/visualization/biography-transition/biography-transition-animator.ts` - Deprecated
- `src/visualization/camera-animator.ts` - Uses Transition internally

### Success Criteria

- [ ] All transition tests pass
- [ ] Timeline tracks progress and emits phase events
- [ ] Track interpolates keyframe values with easing
- [ ] BiographyTransitionAnimator wrapped with Transition
- [ ] CameraAnimator wrapped with Transition
- [ ] Visual output IDENTICAL to before

---

## Phase 4: Propagation

**Goal**: Wrap PathPulseAnimator in PropagationAnimator
**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)

### Deliverables

1. `src/visualization/animation/propagation/propagation-animator.ts` - Graph-based animation
2. `src/visualization/animation/propagation/propagation-animator.test.ts` - Unit tests
3. `src/visualization/animation/propagation/path-pulse.ts` - Existing pulse logic

### Affected Existing Files

- `src/visualization/path-pulse-animator.ts` - Wrapped, not replaced

### Success Criteria

- [ ] All propagation tests pass
- [ ] PropagationAnimator integrates with FamilyGraph
- [ ] Node/edge intensities queryable
- [ ] Breathing animation continues after pulse
- [ ] Visual output IDENTICAL to before

---

## Phase 5: Reactive Bindings

**Goal**: Create state-to-visual bindings for selection and other reactive animations
**Detailed Plan**: [phases/phase-5.md](phases/phase-5.md)

### Deliverables

1. `src/visualization/animation/reactive/reactive-binding.ts` - State → visual binding
2. `src/visualization/animation/reactive/reactive-binding.test.ts` - Unit tests
3. `src/visualization/animation/reactive/instance-attributes.ts` - Manage aSelectionState, etc.

### Affected Existing Files

- Instance attribute updates in ConstellationManager
- Selection state management

### Success Criteria

- [ ] All reactive binding tests pass
- [ ] Selection state flows through ReactiveBinding
- [ ] Smooth transitions for state changes
- [ ] Visual output IDENTICAL to before

---

## Phase 6: Multi-Phase (Metamorphosis)

**Goal**: Create PhaseAnimator for complex multi-phase sequences
**Detailed Plan**: [phases/phase-6.md](phases/phase-6.md)

### Deliverables

1. `src/visualization/animation/phases/phase-animator.ts` - Multi-phase coordination
2. `src/visualization/animation/phases/phase-animator.test.ts` - Unit tests
3. `src/visualization/animation/phases/metamorphosis.ts` - Particle phase definitions

### Affected Existing Files

- `src/visualization/biography-transition/metamorphosis-particles.ts` - Uses PhaseAnimator

### Success Criteria

- [ ] All phase animator tests pass
- [ ] 7 metamorphosis phases defined declaratively
- [ ] GPU uniforms (uProgress, uTime) updated through AnimationSystem
- [ ] Visual output IDENTICAL to before

---

## Phase 7: Integration

**Goal**: Wire all components through AnimationSystem
**Detailed Plan**: [phases/phase-7.md](phases/phase-7.md)

### Deliverables

1. `src/visualization/animation/core/animation-system.ts` - Central coordinator
2. `src/visualization/animation/core/animation-system.test.ts` - Unit tests
3. `src/visualization/animation/debug/animation-inspector.ts` - Runtime inspection
4. `src/visualization/animation/index.ts` - Public exports

### Affected Existing Files

- `src/components/constellation-canvas.tsx` - Uses AnimationSystem
- `src/visualization/constellation-manager.ts` - Receives events from AnimationSystem

### Success Criteria

- [ ] All integration tests pass
- [ ] Single entry point to pause/resume ALL animations
- [ ] Global time scale affects all animations
- [ ] Debug API exposes animation state
- [ ] All existing visual tests pass
- [ ] Visual output IDENTICAL to before

---

## Testing Strategy

### Unit Tests (co-located with source)

Each component has dedicated test files:
- `core/*.test.ts`: TimeProvider, Easing, EventBus
- `loops/*.test.ts`: ShaderLoop, Registry
- `transitions/*.test.ts`: Timeline, Track, Transition
- `propagation/*.test.ts`: PropagationAnimator
- `reactive/*.test.ts`: ReactiveBinding
- `phases/*.test.ts`: PhaseAnimator

### Screenshot Regression Tests

Automated visual regression testing using Playwright to ensure animations look identical before and after migration.

#### Setup

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

#### Test Structure

```
tests/
├── visual/
│   ├── animation-regression.spec.ts    # Main regression test suite
│   ├── helpers/
│   │   ├── animation-controller.ts     # Control animation progress
│   │   └── screenshot-utils.ts         # Screenshot capture utilities
│   └── baselines/                      # Baseline screenshots (git tracked)
│       ├── ghost-mandala-t0.png
│       ├── ghost-mandala-t500.png
│       ├── biography-transition-p00.png
│       ├── biography-transition-p30.png
│       ├── biography-transition-p55.png
│       ├── biography-transition-p85.png
│       └── ...
```

#### Animation Regression Test Suite

```typescript
// tests/visual/animation-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Animation Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000?template=true&reset=true');
    await page.waitForSelector('[data-testid="constellation-canvas"]');
    // Wait for initial render
    await page.waitForTimeout(1000);
  });

  test.describe('Shader Loops', () => {
    test('ghost mandala at t=0', async ({ page }) => {
      await page.evaluate(() => window.__animationSystem?.pause());
      await page.evaluate(() => window.__animationSystem?.setElapsedTime(0));
      await expect(page).toHaveScreenshot('ghost-mandala-t0.png', {
        clip: { x: 400, y: 300, width: 200, height: 200 },
        maxDiffPixelRatio: 0.01,
      });
    });

    test('ghost mandala at t=500ms', async ({ page }) => {
      await page.evaluate(() => window.__animationSystem?.pause());
      await page.evaluate(() => window.__animationSystem?.setElapsedTime(0.5));
      await expect(page).toHaveScreenshot('ghost-mandala-t500.png', {
        clip: { x: 400, y: 300, width: 200, height: 200 },
        maxDiffPixelRatio: 0.01,
      });
    });
  });

  test.describe('Biography Transition', () => {
    const progressPoints = [0, 0.30, 0.40, 0.55, 0.70, 0.85, 1.0];

    for (const progress of progressPoints) {
      test(`biography transition at ${(progress * 100).toFixed(0)}%`, async ({ page }) => {
        // Select a ghost node
        await page.click('[data-testid="ghost-node-0"]');

        // Trigger biography transition
        await page.keyboard.press('b');

        // Pause and set specific progress
        await page.evaluate((p) => {
          window.__animationSystem?.pause();
          window.__animationSystem?.getActiveTransition()?.setProgress(p);
        }, progress);

        // Force render
        await page.evaluate(() => window.__forceRender?.());

        await expect(page).toHaveScreenshot(
          `biography-transition-p${(progress * 100).toFixed(0).padStart(2, '0')}.png`,
          { maxDiffPixelRatio: 0.02 }
        );
      });
    }
  });

  test.describe('Pulse Propagation', () => {
    test('pulse at 50% along path', async ({ page }) => {
      // Select source node
      await page.click('[data-testid="node-source"]');
      // Trigger pulse to target
      await page.keyboard.press('p');

      // Advance to 50%
      await page.evaluate(() => {
        window.__animationSystem?.pause();
        // Advance pulse animator to 50%
      });

      await expect(page).toHaveScreenshot('pulse-propagation-50.png', {
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  test.describe('Selection Highlighting', () => {
    test('node selected state', async ({ page }) => {
      await page.click('[data-testid="ghost-node-0"]');
      await page.waitForTimeout(300); // Wait for selection transition

      await expect(page).toHaveScreenshot('selection-glow.png', {
        clip: { x: 400, y: 300, width: 200, height: 200 },
        maxDiffPixelRatio: 0.01,
      });
    });
  });
});
```

#### Debug API for Visual Testing

Add to AnimationSystem for test controllability:

```typescript
// Expose for visual testing (development only)
if (process.env.NODE_ENV === 'development') {
  (window as any).__animationSystem = animationSystem;
  (window as any).__forceRender = () => renderer.render(scene, camera);
}
```

#### Baseline Capture Workflow

1. **Before migration**: Capture baseline screenshots with current implementation
   ```bash
   # Run with current implementation
   npx playwright test --update-snapshots
   ```

2. **After each phase**: Run regression tests to compare
   ```bash
   npx playwright test tests/visual/
   ```

3. **Review differences**: Playwright generates diff images for failures
   ```
   test-results/
   ├── animation-regression-biography-transition-at-55/
   │   ├── actual.png
   │   ├── expected.png
   │   └── diff.png
   ```

#### Key Animation Checkpoints

| Animation | Checkpoints | What to Verify |
|-----------|-------------|----------------|
| Ghost Mandala | t=0, 0.5s, 1s, 2s | Rotation angle, glow intensity |
| Biography Cloud | t=0, 0.5s, 1s | Turbulence pattern |
| Edge Flow | t=0, 0.25s, 0.5s | Flow position along edge |
| Biography Transition | 0%, 30%, 40%, 55%, 70%, 85%, 100% | Ghost scale, biography emergence |
| Metamorphosis Particles | Each phase boundary | Particle positions, intensity |
| Selection Glow | Before, during, after | Glow intensity, transition smoothness |
| Pulse Propagation | 0%, 25%, 50%, 75%, 100% | Node/edge intensities |

#### CI Integration

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests

on:
  pull_request:
    paths:
      - 'src/visualization/animation/**'

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run dev &
      - run: npx playwright test tests/visual/
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-regression-diff
          path: test-results/
```

### Manual Visual Verification

For each phase, also manually verify:
1. Run `npm run dev:template -- --reset`
2. Trigger the relevant animation
3. Compare visually to before migration
4. Ensure timing, easing, and appearance are IDENTICAL

### Invariant Tests

- Test that animation timing only comes from AnimationSystem
- Test that pause/resume affects all registered animations
- Test that timeScale affects all time-based animations

---

## File Structure After Completion

```
src/visualization/animation/
├── index.ts                     # Public exports
├── types.ts                     # Shared types
│
├── core/
│   ├── animation-system.ts      # Central coordinator
│   ├── animation-system.test.ts
│   ├── time-provider.ts         # Unified time management
│   ├── time-provider.test.ts
│   ├── easing.ts                # Shared easing functions
│   ├── easing.test.ts
│   ├── event-bus.ts             # Animation events
│   └── event-bus.test.ts
│
├── loops/
│   ├── shader-loop.ts           # Continuous shader animations
│   ├── shader-loop.test.ts
│   └── shader-loop-registry.ts  # Track all uTime uniforms
│
├── transitions/
│   ├── timeline.ts              # Progress and phase tracking
│   ├── timeline.test.ts
│   ├── track.ts                 # Keyframe interpolation
│   ├── track.test.ts
│   ├── transition.ts            # One-shot animations
│   ├── transition.test.ts
│   └── transition-builder.ts    # Fluent API
│
├── propagation/
│   ├── propagation-animator.ts  # Graph-based animations
│   ├── propagation-animator.test.ts
│   └── path-pulse.ts            # Existing pulse logic
│
├── reactive/
│   ├── reactive-binding.ts      # State → animation binding
│   ├── reactive-binding.test.ts
│   └── instance-attributes.ts   # Manage aSelectionState, etc.
│
├── phases/
│   ├── phase-animator.ts        # Multi-phase coordination
│   ├── phase-animator.test.ts
│   └── metamorphosis.ts         # Particle phase definitions
│
├── definitions/
│   ├── index.ts                 # Definition exports
│   ├── biography-transition.ts  # Biography animation definition
│   └── camera-transition.ts     # Camera animation definition
│
└── debug/
    ├── animation-inspector.ts   # Runtime inspection
    └── timeline-visualizer.ts   # Optional visualization
```

---

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-A010 (Animation Timing Single Source of Truth)
- [ ] Update `docs/reports/animation-orchestration-research.md` with implementation notes
- [ ] Add JSDoc comments to all public APIs

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Complete | 2026-01-18 | 2026-01-18 | Foundation - 32 tests |
| Phase 2 | Complete | 2026-01-18 | 2026-01-18 | Shader Loops - 26 tests |
| Phase 3 | Complete | 2026-01-18 | 2026-01-18 | Transitions - 44 tests |
| Phase 4 | Complete | 2026-01-18 | 2026-01-18 | Propagation - 25 tests |
| Phase 5 | Complete | 2026-01-18 | 2026-01-18 | Reactive Bindings - 30 tests |
| Phase 6 | Complete | 2026-01-18 | 2026-01-18 | Multi-Phase - 22 tests |
| Phase 7 | Complete | 2026-01-18 | 2026-01-18 | Integration - 29 tests |

**Total: 208 tests passing**
