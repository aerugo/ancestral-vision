# Animation Orchestration System - Work Notes

**Feature**: Declarative animation orchestration with event-driven coordination
**Started**: 2026-01-18
**Branch**: `feature/animation-orchestration`

---

## Session Log

### 2026-01-18 - Initial Planning

**Context Review Completed**:

- Read `docs/invariants/INVARIANTS.md` - identified applicable invariants: INV-A001, INV-A002, INV-A009
- Analyzed current animation implementation across multiple files
- Compiled research report: `docs/reports/animation-orchestration-research.md`

**Applicable Invariants**:

- INV-A001: WebGPURenderer initialization - orchestrator integrates with existing render loop
- INV-A002: Use setAnimationLoop - orchestrator.update() called from existing loop
- INV-A009: Scene Cleanup - orchestrator disposes subscriptions on cleanup

**Key Insights**:

1. Current timing is scattered across 4+ files with inconsistent phase boundaries
2. Event-driven architecture provides loose coupling for easy extension
3. Declarative definitions enable visualization and debugging
4. TypeScript discriminated unions provide compile-time safety

**Problem Analysis**:

Current files with animation timing:
- `BiographyTransitionAnimator.ts`: Phase boundaries (0.3, 0.4, 0.7, 0.9)
- `ConstellationManager.ts`: Ghost phases (0.4, 0.7, 0.9), biography phases (0.55, 0.85)
- `constellation-canvas.tsx`: Reveal sphere phases (0.55, 0.85), inline callbacks
- `metamorphosis-particles.ts`: GPU-side phase logic

**Completed**:

- [x] Created research report analyzing best practices
- [x] Created feature specification
- [x] Created development plan with 6 phases
- [x] Created work notes (this file)
- [x] Created Phase 1 detailed plan

**Next Steps**:

1. ~~Create Phase 2-6 detailed plans~~
2. Begin Phase 1 implementation (Types and Event Bus)

---

### 2026-01-18 - Comprehensive Architecture Revision

**User Feedback**: The initial narrow scope (only biography transition orchestration) was insufficient. User asked: "Will this system be able to express all the existing animations with the same dynamism as we have today? for example loops, constellation animations, particles, fireflies and so on?"

**Analysis Completed**:

Identified 12+ distinct animation systems in codebase:

| Category | Animations | Current Driver |
|----------|------------|----------------|
| **Shader Loops** | Ghost mandala, Biography cloud, Edge flow, Background particles, Event fireflies | `uTime` uniform |
| **One-Shot** | Camera zoom, Biography transition | `deltaTime` CPU |
| **Propagation** | Pulse along graph path | Graph traversal + `deltaTime` |
| **Reactive** | Selection glow, Pulse intensity | State → instance attribute |
| **Multi-Phase** | Metamorphosis particles | 7 phases with `uProgress` + `uTime` |

**Architecture Revision**:

Expanded from narrow timeline-only focus to comprehensive 7-phase architecture:

1. **Phase 1: Foundation** - TimeProvider, Easing, Types, EventBus
2. **Phase 2: Shader Loops** - ShaderLoop, ShaderLoopRegistry for uTime uniforms
3. **Phase 3: Transitions** - Timeline, Track, Transition for one-shot animations
4. **Phase 4: Propagation** - PropagationAnimator wrapper for pulse
5. **Phase 5: Reactive Bindings** - ReactiveBinding for selection state
6. **Phase 6: Multi-Phase** - PhaseAnimator for metamorphosis particles
7. **Phase 7: Integration** - AnimationSystem central coordinator

**Key Design Decisions**:

- **Wrap-and-delegate pattern**: Wrap existing implementations without changing internal logic
- **Preserve visual output**: Each phase must produce IDENTICAL visuals to before migration
- **TimeProvider as single source**: All timing flows through TimeProvider for pause/resume/timeScale

**Completed**:

- [x] Revised spec.md with comprehensive architecture
- [x] Rewrote development-plan.md for 7-phase migration
- [x] Created detailed phase plans for all 7 phases
- [x] Estimated ~114 total tests across all phases

**Next Steps**:

1. Begin Phase 1 implementation (TimeProvider, Easing, Types, EventBus)

---

### 2026-01-18 - Implementation Complete (Phases 1-7)

**Summary**: Implemented all 7 phases of the Animation Orchestration System with 208 tests passing.

**Implementation Order**:

1. Phase 1 (Foundation) - 32 tests
2. Phase 2 (Shader Loops) - 26 tests
3. Phase 3 (Transitions) - 44 tests (fixed phase exit detection bug)
4. Phase 4 (Propagation) - 25 tests
5. Phase 5 (Reactive Bindings) - 30 tests
6. Phase 6 (Multi-Phase) - 22 tests
7. Phase 7 (Integration) - 29 tests

**Key Fixes During Implementation**:

1. **Phase 3 - Timeline phase exit detection**: Original implementation didn't correctly detect when exiting a phase. Fixed by checking both `wasInPhase` and `isInPhase` based on progress values.

2. **Phase 7 - Test delta time values**: AnimationSystem constructor sets `setMaxDeltaTime(0.1)` by default to prevent animation catch-up after tab sleep. Updated tests to use small delta values (0.05s) instead of large ones (1.0s) to avoid hitting the cap.

**Architecture Created**:

```
src/visualization/animation/
├── index.ts                     # Public exports
├── types.ts                     # Shared types
├── core/
│   ├── animation-system.ts      # Central coordinator
│   ├── time-provider.ts         # Unified time management
│   ├── easing.ts                # Standard easing functions
│   └── event-bus.ts             # Animation events
├── loops/
│   ├── shader-loop.ts           # Continuous shader animations
│   └── shader-loop-registry.ts  # Track all uTime uniforms
├── transitions/
│   ├── timeline.ts              # Progress and phase tracking
│   ├── track.ts                 # Keyframe interpolation
│   └── transition.ts            # One-shot animations
├── propagation/
│   └── propagation-animator.ts  # Graph-based pulse animations
├── reactive/
│   ├── reactive-binding.ts      # State → animation binding
│   └── instance-attributes.ts   # Manage instanced attributes
├── phases/
│   ├── phase-animator.ts        # Multi-phase coordination
│   └── metamorphosis.ts         # Particle phase definitions
├── definitions/
│   └── biography-transition.ts  # Biography animation definition
└── debug/
    └── animation-inspector.ts   # Runtime inspection
```

**Next Steps**:

1. Integration with existing codebase (constellation-canvas.tsx, ConstellationManager)
2. Screenshot regression testing setup
3. Add INV-A010 to INVARIANTS.md

---

## Phase Progress

### Phase 1: Foundation (TimeProvider, Easing, Types, EventBus)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/types.ts` - Animation types (AnimationDefinition, Keyframe, etc.)
- `src/visualization/animation/core/time-provider.ts` - Unified time management with pause/resume/timeScale
- `src/visualization/animation/core/time-provider.test.ts` - 15 tests
- `src/visualization/animation/core/easing.ts` - Standard Robert Penner easing functions
- `src/visualization/animation/core/easing.test.ts` - 9 tests
- `src/visualization/animation/core/event-bus.ts` - Typed pub/sub event system
- `src/visualization/animation/core/event-bus.test.ts` - 8 tests

#### Notes

- Total 32 tests passing
- TimeProvider handles delta capping to prevent catch-up after tab sleep

---

### Phase 2: Shader Loops (ShaderLoop, ShaderLoopRegistry)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/loops/shader-loop.ts` - Wrapper for uTime-driven animations
- `src/visualization/animation/loops/shader-loop.test.ts` - 12 tests
- `src/visualization/animation/loops/shader-loop-registry.ts` - Track all shader loops
- `src/visualization/animation/loops/shader-loop-registry.test.ts` - 14 tests
- `src/visualization/animation/loops/index.ts` - Module exports

#### Notes

- Total 26 tests passing

---

### Phase 3: Transitions (Timeline, Track, Transition)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/transitions/timeline.ts` - Progress tracking with phases
- `src/visualization/animation/transitions/timeline.test.ts` - 16 tests
- `src/visualization/animation/transitions/track.ts` - Keyframe interpolation with easing
- `src/visualization/animation/transitions/track.test.ts` - 12 tests
- `src/visualization/animation/transitions/transition.ts` - One-shot animation orchestration
- `src/visualization/animation/transitions/transition.test.ts` - 16 tests
- `src/visualization/animation/transitions/index.ts` - Module exports
- `src/visualization/animation/definitions/biography-transition.ts` - Biography animation definition
- `src/visualization/animation/definitions/index.ts` - Definition exports

#### Notes

- Total 44 tests passing
- Fixed phase transition detection to correctly handle both enter and exit events

---

### Phase 4: Propagation (PropagationAnimator)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/propagation/propagation-animator.ts` - Graph-based pulse with breathing
- `src/visualization/animation/propagation/propagation-animator.test.ts` - 25 tests
- `src/visualization/animation/propagation/index.ts` - Module exports

#### Notes

- Total 25 tests passing
- Implements wave propagation + breathing overlay pattern

---

### Phase 5: Reactive Bindings (ReactiveBinding, InstanceAttributes)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/reactive/reactive-binding.ts` - State-to-visual binding with transitions
- `src/visualization/animation/reactive/reactive-binding.test.ts` - 17 tests
- `src/visualization/animation/reactive/instance-attributes.ts` - Instanced buffer attribute manager
- `src/visualization/animation/reactive/instance-attributes.test.ts` - 13 tests
- `src/visualization/animation/reactive/index.ts` - Module exports

#### Notes

- Total 30 tests passing

---

### Phase 6: Multi-Phase (PhaseAnimator, Metamorphosis)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/phases/phase-animator.ts` - Multi-phase sequence coordinator
- `src/visualization/animation/phases/phase-animator.test.ts` - 22 tests
- `src/visualization/animation/phases/metamorphosis.ts` - 7-phase metamorphosis particle definition
- `src/visualization/animation/phases/index.ts` - Module exports

#### Notes

- Total 22 tests passing
- PhaseAnimator supports looping, callbacks, and pause/resume

---

### Phase 7: Integration (AnimationSystem)

**Status**: Complete
**Started**: 2026-01-18
**Completed**: 2026-01-18

#### Deliverables

- `src/visualization/animation/core/animation-system.ts` - Central coordinator
- `src/visualization/animation/core/animation-system.test.ts` - 19 tests
- `src/visualization/animation/debug/animation-inspector.ts` - Runtime debug interface
- `src/visualization/animation/debug/animation-inspector.test.ts` - 10 tests
- `src/visualization/animation/debug/index.ts` - Debug exports
- `src/visualization/animation/index.ts` - Main module exports

#### Notes

- Total 29 tests passing
- AnimationSystem sets default max delta of 0.1s to prevent catch-up after tab sleep
- AnimationInspector can expose controls to window for browser console debugging

---

## Key Decisions

### Decision 1: Event Bus over Direct Callbacks

**Date**: 2026-01-18
**Context**: Need to coordinate multiple animation systems without tight coupling
**Decision**: Use typed pub/sub event bus pattern
**Rationale**:
- Loose coupling allows adding/removing participants without modifying orchestrator
- Events can be logged for debugging
- Multiple subscribers can react to same event
**Alternatives Considered**:
- Direct callback injection (rejected: tight coupling)
- Redux-style state (rejected: overkill for animation state)

### Decision 2: Custom Easing over Tween.js

**Date**: 2026-01-18
**Context**: Need easing functions for keyframe interpolation
**Decision**: Implement custom easing functions (standard Robert Penner equations)
**Rationale**:
- Keep bundle size small
- Only need ~5 easing functions
- No external dependency management
**Alternatives Considered**:
- Tween.js (rejected: adds dependency for small feature set)
- GSAP (rejected: licensing considerations, large library)

### Decision 3: Discriminated Unions for Events

**Date**: 2026-01-18
**Context**: Need type-safe event handling
**Decision**: Use TypeScript discriminated unions with `type` field
**Rationale**:
- Compile-time exhaustiveness checking
- IDE autocomplete for event properties
- Runtime type narrowing via `event.type`
**Alternatives Considered**:
- String literals (rejected: no type narrowing)
- Class hierarchy (rejected: more boilerplate)

---

## Files Modified

### Created - Documentation

- `docs/plans/active/animation-orchestration/spec.md`
- `docs/plans/active/animation-orchestration/development-plan.md`
- `docs/plans/active/animation-orchestration/work-notes.md`
- `docs/plans/active/animation-orchestration/phases/phase-1.md`
- `docs/plans/active/animation-orchestration/phases/phase-2.md`
- `docs/plans/active/animation-orchestration/phases/phase-3.md`
- `docs/plans/active/animation-orchestration/phases/phase-4.md`
- `docs/plans/active/animation-orchestration/phases/phase-5.md`
- `docs/plans/active/animation-orchestration/phases/phase-6.md`
- `docs/plans/active/animation-orchestration/phases/phase-7.md`
- `docs/reports/animation-orchestration-research.md`

### Created - Animation System Implementation

**Core**:
- `src/visualization/animation/types.ts`
- `src/visualization/animation/core/time-provider.ts`
- `src/visualization/animation/core/time-provider.test.ts`
- `src/visualization/animation/core/easing.ts`
- `src/visualization/animation/core/easing.test.ts`
- `src/visualization/animation/core/event-bus.ts`
- `src/visualization/animation/core/event-bus.test.ts`
- `src/visualization/animation/core/animation-system.ts`
- `src/visualization/animation/core/animation-system.test.ts`
- `src/visualization/animation/core/index.ts`

**Shader Loops**:
- `src/visualization/animation/loops/shader-loop.ts`
- `src/visualization/animation/loops/shader-loop.test.ts`
- `src/visualization/animation/loops/shader-loop-registry.ts`
- `src/visualization/animation/loops/shader-loop-registry.test.ts`
- `src/visualization/animation/loops/index.ts`

**Transitions**:
- `src/visualization/animation/transitions/timeline.ts`
- `src/visualization/animation/transitions/timeline.test.ts`
- `src/visualization/animation/transitions/track.ts`
- `src/visualization/animation/transitions/track.test.ts`
- `src/visualization/animation/transitions/transition.ts`
- `src/visualization/animation/transitions/transition.test.ts`
- `src/visualization/animation/transitions/index.ts`

**Propagation**:
- `src/visualization/animation/propagation/propagation-animator.ts`
- `src/visualization/animation/propagation/propagation-animator.test.ts`
- `src/visualization/animation/propagation/index.ts`

**Reactive Bindings**:
- `src/visualization/animation/reactive/reactive-binding.ts`
- `src/visualization/animation/reactive/reactive-binding.test.ts`
- `src/visualization/animation/reactive/instance-attributes.ts`
- `src/visualization/animation/reactive/instance-attributes.test.ts`
- `src/visualization/animation/reactive/index.ts`

**Multi-Phase**:
- `src/visualization/animation/phases/phase-animator.ts`
- `src/visualization/animation/phases/phase-animator.test.ts`
- `src/visualization/animation/phases/metamorphosis.ts`
- `src/visualization/animation/phases/index.ts`

**Definitions**:
- `src/visualization/animation/definitions/biography-transition.ts`
- `src/visualization/animation/definitions/index.ts`

**Debug**:
- `src/visualization/animation/debug/animation-inspector.ts`
- `src/visualization/animation/debug/animation-inspector.test.ts`
- `src/visualization/animation/debug/index.ts`

**Main Export**:
- `src/visualization/animation/index.ts`

### Modified

- `src/hooks/use-dev-shortcuts.ts` - Added biography transition event emission for 'B' shortcut
- `src/visualization/constellation-manager.ts` - Fixed timing alignment to eliminate visual gap

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [ ] Add INV-A010: Animation Timing Single Source of Truth

### Other Documentation

- [ ] Update research report with implementation notes after completion
