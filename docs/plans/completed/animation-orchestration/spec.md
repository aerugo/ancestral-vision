# Feature: Unified Animation System

**Status**: Draft (Revised)
**Created**: 2026-01-18
**Revised**: 2026-01-18
**Research**: [docs/reports/animation-orchestration-research.md](../../../reports/animation-orchestration-research.md)

## Goal

Create a unified animation system that manages ALL animations in the constellation visualization, providing centralized control while maintaining the exact visual output of the current implementation.

## Background

The current codebase has 12+ distinct animation systems scattered across multiple files:

### Current Animation Types

| Category | Animations | Current Driver |
|----------|------------|----------------|
| **Shader Loops** | Ghost mandala, Biography cloud, Edge flow, Background particles, Event fireflies | `uTime` uniform |
| **One-Shot** | Camera zoom, Biography transition | `deltaTime` CPU |
| **Propagation** | Pulse along graph path | Graph traversal + `deltaTime` |
| **Reactive** | Selection glow, Pulse intensity | State → instance attribute |
| **Multi-Phase** | Metamorphosis particles | 7 phases with `uProgress` + `uTime` |

### Current Problems

1. **No central control**: Cannot pause, speed up, or debug all animations together
2. **Scattered timing**: Phase constants duplicated across files
3. **Difficult coordination**: Multi-system animations require manual callback wiring
4. **No animation hierarchy**: Cannot group or sequence animations
5. **Testing challenges**: Hard to test animation timing without visual inspection

## Acceptance Criteria

- [ ] AC1: All existing animations continue to work with IDENTICAL visual output
- [ ] AC2: Single entry point to pause/resume ALL animations
- [ ] AC3: Global time scale affects all time-based animations
- [ ] AC4: Shader loop animations driven through unified time provider
- [ ] AC5: One-shot animations use shared easing and progress tracking
- [ ] AC6: Propagation animations integrate with graph structure
- [ ] AC7: Reactive animations respond to state through unified binding
- [ ] AC8: Multi-phase animations use declarative phase definitions
- [ ] AC9: Animation system exposes debugging/inspection API
- [ ] AC10: All animation classes have >90% test coverage

## Technical Requirements

### Module Structure

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
│   └── easing.test.ts
│
├── loops/
│   ├── shader-loop.ts           # Continuous shader animations
│   ├── shader-loop.test.ts
│   └── shader-loop-registry.ts  # Track all uTime uniforms
│
├── transitions/
│   ├── transition.ts            # One-shot animations
│   ├── transition.test.ts
│   ├── transition-builder.ts    # Fluent API for building
│   └── presets/
│       ├── camera-transition.ts
│       └── biography-transition.ts
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
└── debug/
    ├── animation-inspector.ts   # Runtime inspection
    └── timeline-visualizer.ts   # Optional visualization
```

### Core Components

#### 1. AnimationSystem (Central Coordinator)

```typescript
class AnimationSystem {
  // Lifecycle
  update(deltaTime: number): void;
  pause(): void;
  resume(): void;

  // Time control
  setTimeScale(scale: number): void;  // 0.5 = half speed, 2.0 = double
  getElapsedTime(): number;

  // Registration
  registerShaderLoop(uniforms: { uTime: { value: number } }): void;
  registerTransition(transition: Transition): void;
  registerPropagation(propagation: PropagationAnimator): void;
  registerReactiveBinding(binding: ReactiveBinding): void;

  // Query
  isAnyAnimating(): boolean;
  getActiveTransitions(): Transition[];
  getDebugInfo(): AnimationDebugInfo;
}
```

#### 2. TimeProvider (Unified Time)

```typescript
class TimeProvider {
  // Time management
  update(rawDeltaTime: number): void;
  getElapsedTime(): number;
  getDeltaTime(): number;

  // Time scale
  setTimeScale(scale: number): void;
  getTimeScale(): number;

  // Pause/resume
  pause(): void;
  resume(): void;
  isPaused(): boolean;

  // Delta capping (prevent catch-up after sleep)
  setMaxDeltaTime(maxMs: number): void;
}
```

#### 3. ShaderLoop (Continuous Animations)

```typescript
class ShaderLoop {
  constructor(uniforms: ShaderUniforms);

  // Lifecycle (called by AnimationSystem)
  update(elapsedTime: number): void;

  // Optional modifiers
  setFrequencyMultiplier(mult: number): void;  // Speed up/slow down
  setPhaseOffset(offset: number): void;         // Shift timing
}
```

#### 4. Transition (One-Shot Animations)

```typescript
class Transition {
  constructor(config: TransitionConfig);

  // Lifecycle
  start(): void;
  update(deltaTime: number): void;
  cancel(): void;

  // State
  getProgress(): number;
  isComplete(): boolean;
  isAnimating(): boolean;

  // Events
  onStart(callback: () => void): this;
  onProgress(callback: (progress: number) => void): this;
  onPhaseEnter(phase: string, callback: () => void): this;
  onComplete(callback: () => void): this;

  // Value interpolation
  getValue(trackName: string): number | number[];
}
```

#### 5. PropagationAnimator (Graph-Based)

```typescript
class PropagationAnimator {
  constructor(graph: FamilyGraph);

  // Start propagation
  startPulse(fromNode: string, toNode: string): void;

  // Lifecycle
  update(deltaTime: number): void;

  // Query intensities
  getNodeIntensity(nodeId: string): number;
  getEdgeIntensity(sourceId: string, targetId: string): number;
  getAllNodeIntensities(): Map<string, number>;

  // State
  isAnimating(): boolean;
  isBreathing(): boolean;
}
```

#### 6. ReactiveBinding (State → Visual)

```typescript
class ReactiveBinding<T> {
  constructor(config: ReactiveBindingConfig<T>);

  // Update source state
  setState(state: T): void;

  // Get computed values for rendering
  getValue(): number;
  getInstanceValue(instanceId: string): number;

  // Smooth transitions
  setTransitionDuration(ms: number): void;
}
```

## Migration Strategy

### Phase 1: Foundation
- Create TimeProvider, Easing, core types
- No changes to existing code

### Phase 2: Shader Loops
- Create ShaderLoop wrapper
- Migrate all `uTime` uniforms to use TimeProvider
- Existing visuals unchanged

### Phase 3: Transitions
- Create Transition class with phase support
- Migrate CameraAnimator → uses Transition internally
- Migrate BiographyTransitionAnimator → uses Transition
- Existing visuals unchanged

### Phase 4: Propagation
- Wrap PathPulseAnimator in PropagationAnimator
- Integrate with AnimationSystem
- Existing pulse behavior unchanged

### Phase 5: Reactive Bindings
- Create ReactiveBinding for selection state
- Migrate instance attribute updates
- Existing selection highlighting unchanged

### Phase 6: Multi-Phase (Metamorphosis)
- Create PhaseAnimator for complex sequences
- Migrate metamorphosis particle phases
- Existing particle animation unchanged

### Phase 7: Integration
- Wire all components through AnimationSystem
- Add pause/resume/timeScale controls
- Add debugging API

## Dependencies

- Existing Three.js materials with `uTime` uniforms
- Existing FamilyGraph for path finding
- Existing instance attribute system

## Out of Scope

- Visual timeline editor UI
- Animation recording/playback
- External animation file formats (glTF, etc.)
- Skeletal/bone animations

## Security Considerations

- None (client-side only, no user data)

## Open Questions

- [x] Q1: Keep existing animator classes or replace? → **Wrap and delegate**
- [x] Q2: How to handle GPU-only animations? → **TimeProvider updates uniforms**
- [x] Q3: Animation priority/layering? → **Phase 2 if needed**
