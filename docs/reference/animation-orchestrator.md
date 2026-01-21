# Animation Orchestrator Reference

The Animation Orchestrator provides unified animation management for the constellation visualization. It coordinates shader loops, one-shot transitions, propagation effects, and reactive state bindings through a single timing source.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
  - [AnimationSystem](#animationsystem)
  - [TimeProvider](#timeprovider)
  - [Event Bus](#event-bus)
- [Animation Types](#animation-types)
  - [Shader Loops](#shader-loops)
  - [Transitions](#transitions)
  - [Propagation](#propagation)
  - [Reactive Bindings](#reactive-bindings)
  - [Multi-Phase Animations](#multi-phase-animations)
- [Animation Definitions](#animation-definitions)
- [Easing Functions](#easing-functions)
- [React Integration](#react-integration)
- [Debugging](#debugging)
- [API Reference](#api-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AnimationSystem                              │
│  ┌──────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │ TimeProvider │──│ ShaderLoopRegistry │──│ AnimationEventBus│ │
│  └──────────────┘  └────────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                    │                     │
     ┌─────┴─────┐        ┌─────┴─────┐         ┌────┴────┐
     ▼           ▼        ▼           ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐
│Transition│ │PhaseAnim│ │Shader  │ │Shader  │ │React- │ │Propag- │
│(one-shot)│ │(multi)  │ │Loop 1  │ │Loop 2  │ │ive    │ │ation   │
└─────────┘ └─────────┘ └────────┘ └────────┘ └───────┘ └────────┘
```

**Key Principles:**

1. **Single source of truth**: All timing flows through `TimeProvider`
2. **Event-driven coordination**: Loose coupling via typed pub/sub
3. **Declarative definitions**: Animations defined as data, not code
4. **Type-safe events**: Discriminated unions with compile-time checking

---

## Quick Start

### Basic Usage

```typescript
import {
  AnimationSystem,
  Transition,
  biographyTransitionDefinition,
} from '@/visualization/animation';

// 1. Create animation system
const system = new AnimationSystem();

// 2. Register shader loops for continuous animations
system.registerShaderLoop('ghostNodes', ghostMaterial.uniforms);
system.registerShaderLoop('edges', edgeMaterial.uniforms);

// 3. Create a one-shot transition
const transition = new Transition(biographyTransitionDefinition);

// 4. Subscribe to events
transition.subscribe((event) => {
  if (event.type === 'phase:enter') {
    console.log(`Entered phase: ${event.phase}`);
  }
  if (event.type === 'track:update' && event.track === 'biography.scale') {
    updateNodeScale(event.value);
  }
});

// 5. Play the transition
transition.play();

// 6. Update in render loop
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  system.update(delta);
  transition.update(delta);
  renderer.render(scene, camera);
});
```

### React Integration

```typescript
import { useAnimationSystem } from '@/visualization/animation';

function ConstellationCanvas() {
  const { system, setup, update, pause, resume } = useAnimationSystem({
    initialConfig: {
      ghostNodes: ghostMaterial.uniforms,
      edges: edgeMaterial.uniforms,
    },
    exposeGlobally: true,  // Enable console debugging
  });

  useFrame(({ clock }) => {
    update(clock.getDelta());
  });

  return <canvas ref={canvasRef} />;
}
```

---

## Core Components

### AnimationSystem

The central coordinator for all animation timing and control.

```typescript
import { AnimationSystem } from '@/visualization/animation';

const system = new AnimationSystem();
```

#### Methods

| Method | Description |
|--------|-------------|
| `update(deltaTime: number)` | Update all registered animations |
| `pause()` | Pause all animations |
| `resume()` | Resume all animations |
| `setTimeScale(scale: number)` | Set global time scale (0.5 = half speed) |
| `getElapsedTime()` | Get total elapsed time |
| `getDeltaTime()` | Get delta from last update |
| `isPaused()` | Check if paused |
| `registerShaderLoop(name, uniforms)` | Register a shader loop |
| `unregisterShaderLoop(name)` | Remove a shader loop |
| `getDebugInfo()` | Get debug information |

#### Example

```typescript
const system = new AnimationSystem();

// Register shaders
system.registerShaderLoop('edges', edgeMaterial.uniforms);

// In render loop
function animate() {
  system.update(clock.getDelta());
}

// Pause/resume
system.pause();
system.setTimeScale(0.5);  // Slow motion
system.resume();
```

---

### TimeProvider

Unified time management with pause, resume, and time scaling.

```typescript
import { TimeProvider } from '@/visualization/animation';

const time = new TimeProvider({
  maxDeltaTime: 0.1,  // Prevents catch-up after tab sleep
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `update(rawDelta: number)` | Advance time by delta |
| `getElapsedTime()` | Total elapsed time |
| `getDeltaTime()` | Scaled delta time |
| `pause()` / `resume()` | Pause/resume time |
| `isPaused()` | Check pause state |
| `setTimeScale(scale: number)` | Set time multiplier |
| `getTimeScale()` | Get time multiplier |
| `reset()` | Reset to zero |

#### Example

```typescript
const time = new TimeProvider();

// Update each frame
time.update(rawDelta);

// Use scaled time
const scaledDelta = time.getDeltaTime();
const total = time.getElapsedTime();

// Slow motion
time.setTimeScale(0.25);

// Pause
time.pause();
```

---

### Event Bus

Typed pub/sub system for animation coordination.

```typescript
import { AnimationEventBus } from '@/visualization/animation';
import type { AnimationEvent, Unsubscribe } from '@/visualization/animation';

const bus = new AnimationEventBus();
```

#### Event Types

```typescript
type AnimationEvent =
  | { type: 'animation:start'; animationName: string }
  | { type: 'animation:complete' }
  | { type: 'animation:cancel' }
  | { type: 'phase:enter'; phase: string; progress: number }
  | { type: 'phase:progress'; phase: string; progress: number; phaseProgress: number }
  | { type: 'phase:exit'; phase: string; progress: number }
  | { type: 'track:update'; track: string; value: number | number[] };
```

#### Methods

| Method | Description |
|--------|-------------|
| `subscribe(handler)` | Subscribe to events, returns unsubscribe function |
| `emit(event)` | Emit an event to all subscribers |
| `clear()` | Remove all subscribers |

#### Example

```typescript
const bus = new AnimationEventBus();

// Subscribe
const unsubscribe = bus.subscribe((event) => {
  switch (event.type) {
    case 'phase:enter':
      console.log(`Entered: ${event.phase} at ${event.progress}`);
      break;
    case 'track:update':
      if (event.track === 'ghost.scale') {
        applyScale(event.value);
      }
      break;
  }
});

// Emit
bus.emit({ type: 'animation:start', animationName: 'biography-transition' });

// Cleanup
unsubscribe();
```

---

## Animation Types

### Shader Loops

Continuous animations driven by elapsed time. Used for shader `uTime` uniforms.

```typescript
import { ShaderLoop, ShaderLoopRegistry } from '@/visualization/animation';
```

#### ShaderLoop

Wraps a single shader's time uniform.

```typescript
const loop = new ShaderLoop(
  material.uniforms,
  {
    frequencyMultiplier: 1.0,  // Speed multiplier
    phaseOffset: 0,            // Time offset
  }
);

// Update
loop.update(elapsedTime);
```

#### ShaderLoopRegistry

Manages multiple shader loops.

```typescript
const registry = new ShaderLoopRegistry();

// Register loops
registry.register('ghostNodes', ghostMaterial.uniforms);
registry.register('biographyNodes', bioMaterial.uniforms, { frequencyMultiplier: 0.5 });

// Update all
registry.update(elapsedTime);

// Get loop
const loop = registry.get('ghostNodes');

// Unregister
registry.unregister('ghostNodes');
```

#### Standard Loop Names

```typescript
import { SHADER_LOOP_NAMES } from '@/visualization/animation';

SHADER_LOOP_NAMES.GHOST_NODES       // 'ghostNodes'
SHADER_LOOP_NAMES.BIOGRAPHY_NODES   // 'biographyNodes'
SHADER_LOOP_NAMES.EDGES             // 'edges'
SHADER_LOOP_NAMES.BACKGROUND_PARTICLES // 'backgroundParticles'
SHADER_LOOP_NAMES.EVENT_FIREFLIES   // 'eventFireflies'
```

---

### Transitions

One-shot animations with phases and value tracks.

```typescript
import { Transition, AnimationTimeline, AnimationTrack } from '@/visualization/animation';
```

#### Transition

High-level animation controller.

```typescript
const transition = new Transition(definition);

// Subscribe to events
transition.subscribe((event) => {
  // Handle events
});

// Play
transition.play();

// Update each frame
transition.update(deltaTime);

// Cancel if needed
transition.cancel();

// Check state
transition.isPlaying();
transition.getProgress();  // 0-1
```

#### AnimationTimeline

Tracks progress and detects phase transitions.

```typescript
const timeline = new AnimationTimeline(definition.phases, definition.duration);

// Register callbacks
timeline.onPhaseEnter('shrink', (progress) => {
  console.log('Started shrinking');
});

timeline.onPhaseExit('shrink', (progress) => {
  console.log('Finished shrinking');
});

// Update
timeline.update(deltaTime);

// Get progress
timeline.getProgress();        // Overall 0-1
timeline.isInPhase('shrink');  // Boolean
timeline.getCurrentPhases();   // Active phase names
```

#### AnimationTrack

Keyframe interpolation with easing.

```typescript
const track = new AnimationTrack({
  name: 'ghost.scale',
  keyframes: [
    { time: 0, value: 0.7 },
    { time: 0.5, value: 1.0 },
    { time: 1, value: 0 },
  ],
  easing: 'easeInOutCubic',
});

// Get interpolated value
const value = track.getValue(0.75);  // Returns interpolated value
```

---

### Propagation

Pulse animations that travel through graph connections.

```typescript
import { PropagationAnimator } from '@/visualization/animation';
```

#### PropagationAnimator

```typescript
const propagation = new PropagationAnimator({
  pathFinder: (from, to) => findPath(graph, from, to),
  pulseSpeed: 2.0,      // Edges per second
  glowDuration: 0.5,    // Glow duration after pulse
  breathingEnabled: true,
});

// Start pulse from one node to another
propagation.startPulse('node-1', 'node-2');

// Update each frame
propagation.update(deltaTime);

// Get intensities for rendering
const nodeIntensity = propagation.getNodeIntensity('node-1');
const edgeIntensity = propagation.getEdgeIntensity('node-1', 'node-2');

// Or get all intensities
const nodeIntensities = propagation.getAllNodeIntensities();
const edgeIntensities = propagation.getAllEdgeIntensities();
```

---

### Reactive Bindings

Smooth transitions between state-driven values.

```typescript
import { ReactiveBinding, InstanceAttributeManager } from '@/visualization/animation';
```

#### ReactiveBinding

```typescript
type SelectionState = 'none' | 'connected' | 'selected';

const binding = new ReactiveBinding<SelectionState>({
  initialState: 'none',
  transform: (state) => {
    switch (state) {
      case 'none': return 0;
      case 'connected': return 0.5;
      case 'selected': return 1.0;
    }
  },
  transitionDuration: 300,  // ms
});

// Change state (smoothly transitions)
binding.setState('selected');

// Update each frame
binding.update(deltaTime);

// Get current value
const glowValue = binding.getValue();
```

#### InstanceAttributeManager

Manages reactive bindings for instanced geometry.

```typescript
const manager = new InstanceAttributeManager();

// Register attribute
manager.registerAttribute('selectionState', selectionAttribute);

// Create binding for an instance
const binding = manager.createBinding<SelectionState>('selectionState', instanceIndex, {
  initialState: 'none',
  transform: stateToValue,
  transitionDuration: 300,
});

// Update all bindings
manager.updateBindings(deltaTime);
```

---

### Multi-Phase Animations

Complex animations with overlapping phases.

```typescript
import { PhaseAnimator, metamorphosisDefinition } from '@/visualization/animation';
```

#### PhaseAnimator

```typescript
const animator = new PhaseAnimator(definition, {
  onPhaseEnter: (phase, progress) => {
    console.log(`Entered ${phase} at ${progress}`);
  },
  onPhaseExit: (phase, progress) => {
    console.log(`Exited ${phase} at ${progress}`);
  },
  onComplete: () => {
    console.log('Animation complete');
  },
  loop: false,
});

// Start animation
animator.start();

// Update each frame
animator.update(deltaTime);

// Get current state
animator.getCurrentPhase();           // Current phase name
animator.getPhaseProgress('burst');   // Progress within phase (0-1)
animator.getOverallProgress();        // Overall progress (0-1)

// Control
animator.pause();
animator.resume();
animator.stop();
```

#### Metamorphosis Definition

Pre-built 7-phase particle animation:

```typescript
import {
  metamorphosisDefinition,
  getMetamorphosisPhase,
  getMetamorphosisPhaseIndex,
} from '@/visualization/animation';

// Phases: burst, expand, hover, spiral, converge, settle, fade
const phase = getMetamorphosisPhase(0.6);  // Returns 'spiral'
const index = getMetamorphosisPhaseIndex('spiral');  // Returns 3
```

---

## Animation Definitions

Animations are defined declaratively as data structures.

### Structure

```typescript
interface AnimationDefinition {
  name: string;
  duration: number;  // seconds
  phases: PhaseDefinition[];
  tracks: TrackDefinition[];
}

interface PhaseDefinition {
  name: string;
  start: number;  // 0-1 normalized
  end: number;    // 0-1 normalized
}

interface TrackDefinition {
  name: string;
  keyframes: Keyframe[];
  easing?: EasingName;
}

interface Keyframe {
  time: number;        // 0-1 normalized
  value: number | number[];
}
```

### Example: Biography Transition

```typescript
export const biographyTransitionDefinition: AnimationDefinition = {
  name: 'biography-transition',
  duration: 3.5,  // seconds

  phases: [
    { name: 'cameraZoom', start: 0, end: 0.30 },
    { name: 'glowIntensify', start: 0.30, end: 0.40 },
    { name: 'shrink', start: 0.40, end: 0.70 },
    { name: 'reconvene', start: 0.55, end: 0.85 },  // Overlaps with shrink
    { name: 'particleFade', start: 0.70, end: 0.90 },
    { name: 'hold', start: 0.90, end: 1.0 },
  ],

  tracks: [
    {
      name: 'ghost.scale',
      keyframes: [
        { time: 0, value: 0.7 },
        { time: 0.30, value: 0.7 },
        { time: 0.40, value: 0.77 },   // Swell
        { time: 0.70, value: 0.14 },   // Shrink
        { time: 0.90, value: 0 },      // Fade
        { time: 1.0, value: 0 },
      ],
      easing: 'easeInCubic',
    },
    {
      name: 'biography.scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.55, value: 0 },
        { time: 0.85, value: 1 },      // Emerge
        { time: 1.0, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
    // Additional tracks for glow, particles, camera...
  ],
};
```

### Creating Custom Definitions

```typescript
const myAnimation: AnimationDefinition = {
  name: 'custom-fade',
  duration: 2.0,
  phases: [
    { name: 'fadeOut', start: 0, end: 0.5 },
    { name: 'fadeIn', start: 0.5, end: 1.0 },
  ],
  tracks: [
    {
      name: 'opacity',
      keyframes: [
        { time: 0, value: 1 },
        { time: 0.5, value: 0 },
        { time: 1, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
  ],
};
```

---

## Easing Functions

Standard Robert Penner easing equations.

```typescript
import { easings, getEasing, type EasingName } from '@/visualization/animation';
```

### Available Easings

| Name | Description |
|------|-------------|
| `linear` | No easing |
| `easeInCubic` | Cubic acceleration |
| `easeOutCubic` | Cubic deceleration |
| `easeInOutCubic` | Cubic ease in and out |
| `easeInQuart` | Quartic acceleration |
| `easeOutQuart` | Quartic deceleration |

### Usage

```typescript
// Get easing function by name
const easing = getEasing('easeInOutCubic');
const easedValue = easing(0.5);  // Returns ~0.5

// Direct access
const value = easings.easeInCubic(0.5);  // Returns ~0.125

// In track definitions
const track: TrackDefinition = {
  name: 'scale',
  keyframes: [...],
  easing: 'easeOutCubic',  // Applied between keyframes
};
```

### Easing Curves

```
linear:        ╱
easeInCubic:   ╱ (starts slow)
easeOutCubic:  ╱ (ends slow)
easeInOutCubic: S (smooth both ends)
```

---

## React Integration

### useAnimationSystem Hook

```typescript
import { useAnimationSystem } from '@/visualization/animation';

function Component() {
  const {
    system,      // AnimationSystem instance
    setup,       // ConstellationAnimationSetup helper
    inspector,   // AnimationInspector for debugging
    update,      // Update function for render loop
    pause,       // Pause all animations
    resume,      // Resume all animations
    setTimeScale // Set global time scale
  } = useAnimationSystem({
    initialConfig: {
      ghostNodes: ghostMaterial.uniforms,
      biographyNodes: bioMaterial.uniforms,
      edges: edgeMaterial.uniforms,
    },
    exposeGlobally: true,  // Enable __animationSystem in console
  });

  // Use in render loop
  useFrame(({ clock }) => {
    update(clock.getDelta());
  });

  // Control animations
  const handlePause = () => pause();
  const handleSlowMo = () => setTimeScale(0.25);

  return <canvas />;
}
```

### ConstellationAnimationSetup

Convenience helper for registering constellation materials.

```typescript
import { ConstellationAnimationSetup } from '@/visualization/animation';

const setup = new ConstellationAnimationSetup(system);

// Register materials
setup.registerGhostNodes(ghostMaterial.uniforms);
setup.registerBiographyNodes(bioMaterial.uniforms);
setup.registerEdges(edgeMaterial.uniforms);
setup.registerBackgroundParticles(particleUniforms);
setup.registerEventFireflies(fireflyUniforms);

// Check registration status
const status = setup.getRegistrationStatus();
// { ghostNodes: true, biographyNodes: true, edges: true, ... }
```

---

## Debugging

### AnimationInspector

Runtime inspection and control.

```typescript
import { AnimationInspector } from '@/visualization/animation';

const inspector = new AnimationInspector(system);

// Expose to window for console debugging
inspector.exposeToWindow();

// In browser console:
__animationSystem.pause();
__animationSystem.setTimeScale(0.5);
__animationSystem.getInfo();
```

### Debug Information

```typescript
const info = system.getDebugInfo();
// {
//   elapsedTime: 45.2,
//   deltaTime: 0.016,
//   timeScale: 1.0,
//   isPaused: false,
//   registeredLoops: ['ghostNodes', 'edges', 'particles'],
// }
```

### Console Commands

When `exposeGlobally: true`:

```javascript
// In browser console
__animationSystem.pause()
__animationSystem.resume()
__animationSystem.setTimeScale(0.25)  // Slow motion
__animationSystem.setTimeScale(2.0)   // Fast forward
__animationSystem.getInfo()           // Debug info
```

---

## API Reference

### Core

| Export | Type | Description |
|--------|------|-------------|
| `AnimationSystem` | Class | Central animation coordinator |
| `TimeProvider` | Class | Unified time management |
| `AnimationEventBus` | Class | Typed event pub/sub |
| `easings` | Object | Easing function map |
| `getEasing(name)` | Function | Get easing by name |

### Types

| Export | Description |
|--------|-------------|
| `AnimationDefinition` | Complete animation definition |
| `AnimationEvent` | Event discriminated union |
| `AnimationEventHandler` | Event handler function type |
| `PhaseDefinition` | Phase timing definition |
| `TrackDefinition` | Track with keyframes |
| `Keyframe` | Single keyframe |
| `EasingName` | Easing function names |
| `ShaderUniforms` | Shader uniform interface |
| `Unsubscribe` | Cleanup function type |

### Shader Loops

| Export | Type | Description |
|--------|------|-------------|
| `ShaderLoop` | Class | Single shader time wrapper |
| `ShaderLoopRegistry` | Class | Multiple loop manager |
| `SHADER_LOOP_NAMES` | Object | Standard loop name constants |

### Transitions

| Export | Type | Description |
|--------|------|-------------|
| `Transition` | Class | One-shot animation |
| `AnimationTimeline` | Class | Progress and phase tracking |
| `AnimationTrack` | Class | Keyframe interpolation |
| `biographyTransitionDefinition` | Object | Pre-built biography animation |

### Propagation

| Export | Type | Description |
|--------|------|-------------|
| `PropagationAnimator` | Class | Graph pulse animations |

### Reactive

| Export | Type | Description |
|--------|------|-------------|
| `ReactiveBinding` | Class | State to value binding |
| `InstanceAttributeManager` | Class | Instanced attribute manager |

### Phases

| Export | Type | Description |
|--------|------|-------------|
| `PhaseAnimator` | Class | Multi-phase coordinator |
| `metamorphosisDefinition` | Object | 7-phase particle animation |
| `getMetamorphosisPhase(progress)` | Function | Get phase name from progress |
| `getMetamorphosisPhaseIndex(name)` | Function | Get phase index from name |

### Integration

| Export | Type | Description |
|--------|------|-------------|
| `useAnimationSystem` | Hook | React integration |
| `ConstellationAnimationSetup` | Class | Material registration helper |

### Debug

| Export | Type | Description |
|--------|------|-------------|
| `AnimationInspector` | Class | Runtime debugging |

---

## Best Practices

### 1. Single Update Call

All animations should be updated from a single render loop call:

```typescript
// Good
renderer.setAnimationLoop(() => {
  system.update(delta);      // Updates all shader loops
  transition.update(delta);   // Updates one-shot animation
  renderer.render(scene, camera);
});

// Bad - multiple separate loops
setInterval(() => system.update(delta), 16);  // Don't do this
requestAnimationFrame(() => transition.update(delta));  // Or this
```

### 2. Use Events for Coordination

Prefer events over polling for animation coordination:

```typescript
// Good - event-driven
transition.subscribe((event) => {
  if (event.type === 'phase:enter' && event.phase === 'shrink') {
    startShrinkEffect();
  }
});

// Avoid - polling
setInterval(() => {
  if (transition.isInPhase('shrink')) {
    startShrinkEffect();  // May be called multiple times
  }
}, 16);
```

### 3. Clean Up Subscriptions

Always unsubscribe when components unmount:

```typescript
useEffect(() => {
  const unsubscribe = transition.subscribe(handler);
  return () => unsubscribe();  // Clean up
}, []);
```

### 4. Use Appropriate Animation Types

| Need | Use |
|------|-----|
| Continuous shader effect | `ShaderLoop` |
| One-shot with phases | `Transition` |
| Graph path animation | `PropagationAnimator` |
| State-driven smooth value | `ReactiveBinding` |
| Complex multi-phase | `PhaseAnimator` |

---

## See Also

- [Graphics Engine](./graphics-engine.md) - Rendering system
- [Work Notes](../plans/active/animation-orchestration/work-notes.md) - Implementation details
