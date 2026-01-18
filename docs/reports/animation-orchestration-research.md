# Animation Orchestration Research Report

**Date:** 2026-01-18
**Context:** Ancestral Vision constellation transitions require coordinated animations across multiple systems (camera, particles, node scaling, material effects). Current ad-hoc approach creates timing misalignment and maintenance burden.

## Executive Summary

This report evaluates best practices for orchestrating complex animation sequences in 3D WebGPU applications. Key findings recommend a **timeline-based orchestration layer** with **state machine transitions** and **event-driven coordination**. This architecture would replace the current scattered timing logic with a declarative, maintainable system.

---

## 1. Current Problem Analysis

The biography transition animation currently involves:

| System | Timing | Current Implementation |
|--------|--------|----------------------|
| Camera zoom | 0-30% | CameraAnimator (separate class) |
| Ghost glow | 30-40% | BiographyTransitionAnimator.getState() |
| Ghost shrink | 40-90% | ConstellationManager.updateTransition() |
| Particles | 0-100% | MetamorphosisParticles (GPU uniforms) |
| Biography grow | 55-85% | ConstellationManager.updateTransition() |
| Reveal sphere | 55-85% | constellation-canvas.tsx inline logic |

**Problems:**
1. Timing constants duplicated across 4+ files
2. Phase boundaries defined inconsistently (animator vs manager)
3. No single source of truth for animation timeline
4. Adding/removing animation elements requires editing multiple files
5. Difficult to debug timing issues

---

## 2. Timeline-Based Animation Systems

### Game Engine Approaches

**Unity Mecanim & Unreal Sequencer:**
- Visual timeline editor for sequencing events
- States linked to animation clips with entry/exit conditions
- Transition blending with crossfade support
- Event markers trigger callbacks at specific times

**Three.js AnimationMixer Pattern:**
```typescript
const mixer = new THREE.AnimationMixer(model);
const clip = THREE.AnimationClip.findByName(clips, 'Transform');
const action = mixer.clipAction(clip);
action.play();

// In render loop
mixer.update(deltaTime);
```

**Key Insight:** Timeline systems excel at sequential playback and state-based transitions. One mixer per animated object allows independent control.

### Recommended Pattern: Declarative Timeline Definition

```typescript
interface AnimationTimeline {
  duration: number;
  tracks: Track[];
}

interface Track {
  name: string;
  target: string; // e.g., 'ghost.scale', 'camera.position'
  keyframes: Keyframe[];
  easing?: EasingName;
}

interface Keyframe {
  time: number; // 0-1 normalized or absolute seconds
  value: number | number[];
}
```

This separates animation data from playback control, enabling:
- JSON serialization for data-driven animations
- Reusable animation definitions
- Easy timeline visualization tools

---

## 3. Tweening Libraries Analysis

### GSAP (GreenSock Animation Platform)

**Strengths:**
- Industry-standard timeline sequencing
- Position parameters for precise timing: `"+=1"`, `"-=0.5"`, `"<1"`
- Built-in stagger control for distributed animations
- Excellent Three.js integration
- Nested timelines for modular code

**Example:**
```typescript
const tl = gsap.timeline();
tl.to(ghost.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "power3.in" })
  .to(biography.scale, { x: 1, y: 1, z: 1, duration: 0.8 }, "-=0.5") // Overlap by 0.5s
  .call(() => onComplete());
```

**Consideration:** GSAP is proprietary (free for most uses, paid for some business cases).

### Tween.js

**Strengths:**
- MIT licensed, lightweight
- Robert Penner's easing equations
- Non-invasive (integrates into existing render loops)
- Works excellently with Three.js

**Example:**
```typescript
new TWEEN.Tween(ghost.scale)
  .to({ x: 0, y: 0, z: 0 }, 1000)
  .easing(TWEEN.Easing.Cubic.In)
  .onComplete(() => startBiographyGrow())
  .start();

// In render loop
TWEEN.update();
```

**Consideration:** Lower-level than GSAP, requires manual sequence coordination.

### Recommendation

Use **Tween.js** for value interpolation, wrapped by a **custom orchestration layer** for sequence coordination. This provides flexibility without vendor lock-in.

---

## 4. State Machine Patterns

### Animation State Machine Design

State machines model animation flows as explicit states and transitions:

```
┌─────────┐  transition_event  ┌─────────────┐
│  Idle   │ ─────────────────▶ │ Transitioning │
└─────────┘                    └──────┬──────┘
                                      │
     ┌────────────────────────────────┘
     │ complete_event
     ▼
┌───────────────┐
│ BiographyMode │
└───────────────┘
```

### TypeScript Implementation

```typescript
type AnimationState =
  | { type: 'idle' }
  | { type: 'transitioning'; personId: string; progress: number }
  | { type: 'completed' };

type AnimationEvent =
  | { type: 'START_TRANSITION'; personId: string }
  | { type: 'UPDATE'; deltaTime: number }
  | { type: 'COMPLETE' };

function animationReducer(state: AnimationState, event: AnimationEvent): AnimationState {
  switch (state.type) {
    case 'idle':
      if (event.type === 'START_TRANSITION') {
        return { type: 'transitioning', personId: event.personId, progress: 0 };
      }
      break;
    case 'transitioning':
      if (event.type === 'UPDATE') {
        const newProgress = state.progress + event.deltaTime / DURATION;
        if (newProgress >= 1) {
          return { type: 'completed' };
        }
        return { ...state, progress: newProgress };
      }
      break;
  }
  return state;
}
```

**Benefits:**
- Type-safe state transitions
- Impossible states are unrepresentable
- Easy to add new states/transitions
- Debuggable state flow

---

## 5. Event-Driven Animation Coordination

### Pub/Sub Pattern for Animation

```typescript
interface AnimationEvents {
  'animation:phase': { phase: string; progress: number };
  'animation:complete': { personId: string };
  'camera:zoom:complete': void;
  'particles:burst:start': { position: THREE.Vector3 };
}

class AnimationEventBus {
  private listeners = new Map<string, Set<Function>>();

  emit<K extends keyof AnimationEvents>(event: K, data: AnimationEvents[K]): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  on<K extends keyof AnimationEvents>(event: K, handler: (data: AnimationEvents[K]) => void): () => void {
    // ... subscription logic
  }
}
```

**Benefits:**
- Loose coupling between animation systems
- One event triggers responses in multiple systems
- Easy to add new subscribers without modifying publishers
- Central logging for debugging

### Application to Current Problem

Instead of:
```typescript
// In constellation-canvas.tsx
if (state.progress >= 0.55) {
  // Inline biography scaling logic
}
```

Use:
```typescript
// In BiographyTransitionOrchestrator
this.events.emit('animation:phase', { phase: 'reconvene', progress });

// In ConstellationManager (subscriber)
events.on('animation:phase', ({ phase, progress }) => {
  if (phase === 'reconvene') {
    this.updateBiographyScale(progress);
  }
});
```

---

## 6. WebGPU-Specific Considerations

### GPU-Side Animations

For particle systems and high-count animations:

- **Compute Shaders:** Move physics to GPU for massive parallelization
- **Performance:** CPU handles tens of thousands; GPU handles millions at 60 FPS
- **Data Flow:** Eliminates CPU-to-GPU transfer overhead per frame

### Three.js WebGPU Best Practices

```typescript
// Mandatory async initialization (r171+)
await renderer.init();

// Use setAnimationLoop, not requestAnimationFrame
renderer.setAnimationLoop(() => {
  // animation logic
  renderer.render(scene, camera);
});

// For compute-heavy work
await renderer.renderAsync(scene, camera);
```

### Uniform Communication Pattern

CPU animation state communicates to GPU via uniforms:

```typescript
interface ParticleUniforms {
  uProgress: { value: number };
  uTime: { value: number };
  uOrigin: { value: THREE.Vector3 };
}

// In animation loop
uniforms.uProgress.value = animationProgress;
uniforms.uTime.value = elapsedTime;
```

**Optimization Target:** Under 100 draw calls per frame. Use instancing to reduce by 90%+.

---

## 7. Keyframe and Track Systems

### Three.js KeyframeTrack

```typescript
const positionTrack = new THREE.VectorKeyframeTrack(
  'object.position',
  [0, 0.5, 1],  // times (normalized or seconds)
  [0,0,0, 0,5,0, 0,0,0]  // values (x,y,z for each keyframe)
);

const clip = new THREE.AnimationClip('bounce', 1, [positionTrack]);
```

### Declarative Animation Data

```typescript
const biographyTransition: AnimationDefinition = {
  name: 'ghost-to-biography',
  duration: 3.5,
  phases: [
    { name: 'cameraZoom', start: 0, end: 0.30 },
    { name: 'glowIntensify', start: 0.30, end: 0.40 },
    { name: 'shrink', start: 0.40, end: 0.70 },
    { name: 'reconvene', start: 0.55, end: 0.85 },
    { name: 'particleFade', start: 0.70, end: 0.90 },
    { name: 'hold', start: 0.90, end: 1.00 },
  ],
  tracks: [
    {
      target: 'ghost.scale',
      keyframes: [
        { time: 0.30, value: 0.7 },
        { time: 0.40, value: 0.77 },
        { time: 0.70, value: 0.14 },
        { time: 0.90, value: 0 },
      ],
      easing: 'easeInCubic',
    },
    {
      target: 'biography.scale',
      keyframes: [
        { time: 0.55, value: 0 },
        { time: 0.85, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
  ],
};
```

**Benefits:**
- Single source of truth for timing
- Easy to visualize and adjust
- Can be loaded from JSON files
- Supports procedural animation generation

---

## 8. Handling Overlapping and Parallel Animations

### Composition Strategies

```typescript
// Parallel: Start simultaneously
parallel([
  tween(ghost.scale, { x: 0 }, 1000),
  tween(particles.intensity, { value: 1 }, 800),
]);

// Sequence: One after another
sequence([
  tween(camera.position, targetPos, 1000),
  delay(200),
  tween(ghost.opacity, 0, 500),
]);

// Stagger: Distributed start times
stagger([node1, node2, node3], (node, i) =>
  tween(node.scale, { x: 1 }, 500, { delay: i * 100 })
);
```

### GSAP-Style Position Parameters

```typescript
timeline
  .add(cameraZoom, 0)           // Start at 0
  .add(glowIntensify, 0.3)      // Start at 30%
  .add(particleBurst, 0.4)      // Start at 40%
  .add(biographyGrow, "-=0.15") // Overlap by 15% of timeline
```

---

## 9. Proposed Architecture for Ancestral Vision

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Animation Orchestrator                     │
│  - Manages animation definitions and playback                │
│  - Single source of truth for timing/phases                  │
│  - Emits phase events                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Event Bus                               │
│  - 'phase:cameraZoom', 'phase:shrink', 'phase:reconvene'    │
│  - 'animation:complete', 'animation:cancelled'               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ CameraSystem  │   │ NodeSystem    │   │ParticleSystem │
│ - Subscribes  │   │ - Subscribes  │   │ - Subscribes  │
│   to zoom     │   │   to scale    │   │   to burst    │
│   events      │   │   events      │   │   events      │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Core Classes

```typescript
// Central orchestrator
class AnimationOrchestrator {
  private _currentAnimation: Animation | null = null;
  private _eventBus: AnimationEventBus;

  play(animation: AnimationDefinition): void;
  update(deltaTime: number): void;
  cancel(): void;
}

// Animation definition (data)
interface AnimationDefinition {
  name: string;
  duration: number;
  phases: Phase[];
  tracks: Track[];
}

// Individual track that emits values
interface Track {
  target: string;
  keyframes: Keyframe[];
  easing?: EasingName;
  onUpdate?: (value: number) => void;
}
```

### Implementation Roadmap

1. **Phase 1: Event Bus**
   - Create `AnimationEventBus` with typed events
   - Add phase events: `phase:start`, `phase:progress`, `phase:end`

2. **Phase 2: Timeline Player**
   - Create `Timeline` class that tracks progress
   - Emit events as phases are entered/exited
   - Support pause, resume, cancel

3. **Phase 3: Track Interpolation**
   - Integrate Tween.js for value interpolation
   - Create `Track` class that reads keyframes and emits values
   - Support custom easing per track

4. **Phase 4: Subscriber Migration**
   - Move camera animation to subscribe to events
   - Move node scaling to subscribe to events
   - Move particle system to subscribe to events

5. **Phase 5: Declarative Definitions**
   - Define animations as JSON/TypeScript data
   - Create animation editor tooling (optional)

---

## 10. Recommendations Summary

| Aspect | Recommendation |
|--------|----------------|
| **Timeline System** | Custom declarative timeline with phase markers |
| **Interpolation** | Tween.js for easing and value transitions |
| **State Management** | TypeScript discriminated unions state machine |
| **Coordination** | Event-driven pub/sub between animation systems |
| **Data Format** | Declarative animation definitions (TypeScript/JSON) |
| **GPU Animations** | Keep particle compute shaders, drive via uniforms |

### Immediate Next Steps

1. Create `src/visualization/animation/` module structure
2. Implement `AnimationEventBus` with typed events
3. Implement `AnimationTimeline` that reads phase definitions
4. Refactor `BiographyTransitionAnimator` to use new timeline
5. Update `ConstellationManager` to subscribe to timeline events

### Expected Benefits

- **Single source of truth** for animation timing
- **Easier debugging** via event logging
- **Flexible composition** of animation sequences
- **Reduced coupling** between animation systems
- **Simpler maintenance** when adding/modifying animations

---

## Sources

- Three.js Animation System Documentation
- GSAP Timeline Documentation
- Unity Animation State Machine Manual
- Unreal Engine Sequencer Documentation
- Game Programming Patterns (State Pattern)
- Tween.js GitHub and Documentation
- Three.js WebGPU Renderer Best Practices
- WebGPU Compute Shader Tutorials
