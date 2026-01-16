# Phase 9: Visual Alignment with Prototype

**Status**: NOT STARTED
**Goal**: Achieve visual parity with `reference_prototypes/family-constellations`

## Visual Gap Analysis

Side-by-side comparison of prototype vs current implementation revealed significant visual gaps despite having the infrastructure in place.

### Screenshots Compared

- **Prototype** (Port 8081): Rich organic nodes with swirling internal patterns, curved glowing edges, atmospheric depth
- **Ancestral Vision** (Port 3000): Basic nodes with fresnel rim, straight yellow edges, less atmospheric

## Detailed Gap Analysis

### 1. Node Rendering (MAJOR)

| Feature | Prototype | Current | Gap |
|---------|-----------|---------|-----|
| Internal Pattern | Swirling marble/clouds with 2 noise layers | Color mix only | **MISSING** |
| Inner Glow | `smoothstep(0.0, 0.8, 1.0 - fresnel)` | None | **MISSING** |
| Subsurface Scattering | `pow(max(dot(viewDir, -vNormal), 0.0), 2.0)` | None | **MISSING** |
| Mandala Overlays | `hilmaMandala()` with rings, spirals | None | **MISSING** |
| Sacred Geometry Surface | Haeckel hexagonal, golden spiral | None | **MISSING** |
| Bright Spots | `smoothstep(0.6, 0.8, noise2) * weight` | None | **MISSING** |
| Cel-shading | 3-band with soft AA edges | None | **MISSING** |

### 2. Edge Rendering (MAJOR)

| Feature | Prototype | Current | Gap |
|---------|-----------|---------|-----|
| Curve Shape | Bezier (implemented) | Straight lines visible | **NOT APPLIED** |
| Prayer Bead Nodes | `fract(progress * 8.0 - time * 0.4)` | None | **MISSING** |
| Byzantine Pattern | `sin(progress * 40.0) * sin(time * 2.0)` | None | **MISSING** |
| Gold Shimmer | `sin(time * 5.0 + progress * 30.0)` | Basic glow | **PARTIAL** |
| End Fade | `smoothstep(0.0, 0.1, p) * smoothstep(1.0, 0.9, p)` | Implemented | OK |

### 3. Post-Processing (MAJOR)

| Feature | Prototype | Current | Gap |
|---------|-----------|---------|-----|
| Bloom | UnrealBloomPass | WebGL only (disabled) | **NOT WORKING** |
| Vignette | Custom shader | WebGL only (disabled) | **NOT WORKING** |
| SMAA | Antialiasing | None | **MISSING** |

**Root Cause**: Three.js EffectComposer requires WebGLRenderer, incompatible with WebGPU.

### 4. Background Particles (MEDIUM)

| Feature | Prototype | Current | Gap |
|---------|-----------|---------|-----|
| Hexagonal Shape | `cos(angle * 6.0) * 0.08 + 0.42` | Basic circle | **MISSING** |
| Inner Rings | `sin(dist * 30.0 - time * 2.0)` | None | **MISSING** |
| Flash Effect | `pow(sin(...) * 0.5 + 0.5, 8.0)` | Basic pulse | **PARTIAL** |

### 5. Event Fireflies (MEDIUM)

| Feature | Prototype | Current | Gap |
|---------|-----------|---------|-----|
| Star/Mandala Shape | `cos(angle * 6.0) * 0.1 + 0.4` | Basic circle | **MISSING** |
| Inner Mandala Rings | `sin(dist * 25.0 - time * 3.0)` | None | **MISSING** |
| Divine Spark Flash | `pow(..., 6.0)` flash | None | **MISSING** |
| Flickering | 8Hz sacred flame | Basic | **PARTIAL** |

### 6. Node Layout/Positioning (MAJOR)

| Feature | Prototype | Current | Gap |
|---------|-----------|---------|-----|
| Layout Algorithm | Force-directed with Barnes-Hut | Simple spiral | **COMPLETELY DIFFERENT** |
| Golden Angle | `Math.PI * (3 - Math.sqrt(5))` ~137.5° | Linear angle | **MISSING** |
| Generation Rings | Concentric mandala rings by generation | Vertical spiral | **MISSING** |
| Force Simulation | Repulsion, attraction, center, generation forces | None | **MISSING** |
| Barnes-Hut Optimization | Quadtree for O(n log n) at 100+ nodes | N/A | **MISSING** |
| Organic Distribution | Natural clustering with breathing room | Tight packing | **MISSING** |

**Root Cause**: Current implementation uses a simple spiral formula:
```typescript
// Current: Tight vertical spiral
const angle = (index / people.length) * Math.PI * 4;
const radius = 20 + Math.abs(person.generation) * 15;
const height = person.generation * 20;
```

**Prototype**: Sophisticated force-directed layout with mandala aesthetic:
```typescript
// Prototype: Golden angle for organic distribution
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
const ringRadius = gen === 0
  ? 15 + genNodes.length * 3
  : Math.abs(gen) * generationSpacing;
const angle = i * GOLDEN_ANGLE + goldenOffset;
```

---

## Implementation Plan

### Sub-Phase 9.1: Enhanced Node Material

**Files to Modify**:
- `src/visualization/materials/node-material.ts`

**TDD Tests** (add to `node-material.test.ts`):

```typescript
describe('Enhanced node material visual effects', () => {
  it('should apply dual noise layers for internal pattern', () => {
    const { material } = createNodeMaterial();
    // Verify material has noise-based colorNode with multiple octaves
    expect(material.colorNode).toBeDefined();
  });

  it('should calculate inner glow using inverse fresnel', () => {
    // innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel)
  });

  it('should apply subsurface scattering for backlit effect', () => {
    // sss = pow(max(dot(viewDir, -normal), 0.0), 2.0) * 0.3
  });

  it('should add mandala ring pattern overlay', () => {
    // Concentric rings: sin(ringDist * 15.0 - time * 0.8)
  });

  it('should add golden spiral pattern overlay', () => {
    // Spiral: sin(angle * 6.0 + ringDist * 25.0 - time * 0.5)
  });

  it('should add bright spots based on secondary noise', () => {
    // spots = smoothstep(0.6, 0.8, noise2) * biographyWeight
  });
});
```

**Implementation**:

```typescript
// Enhanced node material with full prototype effects
const noise1 = createNoiseFunction({ scale: 0.1, octaves: 2 });
const noise2 = createNoiseFunction({ scale: 0.3, octaves: 2 });

// Inner glow (inverse fresnel)
const innerGlow = smoothstep(float(0), float(0.8), sub(float(1), fresnel));

// Subsurface scattering
const backDot = max(dot(viewDir, negate(normalWorld)), 0);
const sss = mul(mul(pow(backDot, 2), 0.3), add(float(1), biographyWeight));

// Mandala patterns
const ringDist = length(vec2(normalLocal.x, normalLocal.y));
const rings = mul(add(mul(sin(sub(mul(ringDist, 15), mul(uTime, 0.8))), 0.5), 0.5), mul(biographyWeight, 0.3));

// Golden spiral
const angle = atan2(normalLocal.y, normalLocal.x);
const spiral = smoothstep(float(0.6), float(0.8), sin(add(mul(angle, 6), sub(mul(ringDist, 25), mul(uTime, 0.5)))));
```

---

### Sub-Phase 9.2: Enhanced Edge Material

**Files to Modify**:
- `src/visualization/materials/edge-material.ts`

**TDD Tests** (add to `edge-material.test.ts`):

```typescript
describe('Enhanced edge material visual effects', () => {
  it('should render prayer bead energy nodes along edge', () => {
    // nodePos = fract(progress * 8.0 - time * 0.4)
    // energyNode = smoothstep(0.4, 0.5, nodePos) * smoothstep(0.6, 0.5, nodePos)
  });

  it('should apply Byzantine pattern overlay', () => {
    // byzantine = sin(progress * 40.0) * sin(time * 2.0 + progress * 15.0)
  });

  it('should include gold shimmer animation', () => {
    // shimmer = sin(time * 5.0 + progress * 30.0) * 0.15 + 0.85
  });
});
```

---

### Sub-Phase 9.3: WebGPU Post-Processing

**Problem**: Three.js EffectComposer doesn't work with WebGPURenderer.

**Solution Options**:
1. **TSL Post-Processing**: Build bloom/vignette using TSL fullscreen passes
2. **WebGPU Native**: Use three/webgpu's built-in post-processing when available
3. **Hybrid Approach**: Render to texture, apply TSL effects, composite

**Files to Create**:
- `src/visualization/effects/webgpu-post-processing.ts`

**TDD Tests**:

```typescript
describe('WebGPU post-processing', () => {
  it('should apply bloom effect using TSL', () => {
    // Mipmap-based bloom
  });

  it('should apply vignette using TSL', () => {
    // Screen-space vignette
  });

  it('should work with WebGPURenderer', () => {
    // Verify compatibility
  });
});
```

---

### Sub-Phase 9.4: Enhanced Particles

**Files to Modify**:
- `src/visualization/particles/background-particles.ts`
- `src/visualization/particles/event-fireflies.ts`

**Key Enhancements**:

```typescript
// Hexagonal Haeckel shape for particles
const angle = atan2(center.y, center.x);
const hexShape = add(mul(cos(mul(angle, 6)), 0.08), 0.42);

// Inner concentric rings
const innerRings = mul(add(mul(sin(sub(mul(dist, 30), mul(uTime, 2))), 0.5), 0.5), 0.3);

// Divine spark flash for fireflies
const flash = pow(mul(add(mul(sin(add(mul(uTime, 2), mul(phase, 6.28))), 0.5), 0.5)), 6);
```

---

### Sub-Phase 9.5: Force-Directed Layout System

**Goal**: Replace simple spiral layout with force-directed algorithm matching prototype's organic mandala aesthetic.

**Files to Create**:
- `src/visualization/layout/force-layout.ts` - Main layout engine
- `src/visualization/layout/quadtree.ts` - Barnes-Hut optimization
- `src/visualization/layout/forces.ts` - Individual force functions

**Files to Modify**:
- `src/components/constellation-canvas.tsx` - Use new layout system

**TDD Tests** (create `force-layout.test.ts`):

```typescript
describe('Force-directed layout system', () => {
  describe('Initial positioning', () => {
    it('should position nodes using golden angle distribution', () => {
      const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
      const nodes = createTestNodes(10);
      const layout = new ForceLayout(nodes);
      layout.initialize();

      // Verify golden angle spacing between nodes
      const angles = nodes.map(n => Math.atan2(n.position.z, n.position.x));
      for (let i = 1; i < angles.length; i++) {
        const diff = Math.abs(angles[i] - angles[i-1]);
        expect(diff).toBeCloseTo(GOLDEN_ANGLE, 1);
      }
    });

    it('should place generation 0 (subject) at center with small radius', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes);
      layout.initialize();

      const gen0Nodes = nodes.filter(n => n.generation === 0);
      gen0Nodes.forEach(n => {
        const dist = Math.sqrt(n.position.x ** 2 + n.position.z ** 2);
        expect(dist).toBeLessThan(20);
      });
    });

    it('should place nodes in concentric rings by generation', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes, { generationSpacing: 50 });
      layout.initialize();

      // Parents (gen -1) should be further than subject (gen 0)
      const gen0Dist = avgDistance(nodes.filter(n => n.generation === 0));
      const genM1Dist = avgDistance(nodes.filter(n => n.generation === -1));
      expect(genM1Dist).toBeGreaterThan(gen0Dist);
    });
  });

  describe('Force simulation', () => {
    it('should apply repulsion force between nearby nodes', () => {
      const nodes = createOverlappingNodes();
      const layout = new ForceLayout(nodes);
      layout.initialize();
      layout.step();

      // Nodes should move apart
      const initialDist = distance(nodes[0], nodes[1]);
      expect(initialDist).toBeGreaterThan(5); // Minimum separation
    });

    it('should apply attraction force along edges', () => {
      const { nodes, edges } = createConnectedNodes();
      const layout = new ForceLayout(nodes, { edges });
      layout.initialize();

      // Connected nodes should stay reasonably close
      edges.forEach(edge => {
        const dist = distance(edge.source, edge.target);
        expect(dist).toBeLessThan(100);
      });
    });

    it('should apply center gravity to prevent drift', () => {
      const nodes = createTestNodes(50);
      const layout = new ForceLayout(nodes);
      layout.initialize();

      // Run simulation
      for (let i = 0; i < 100; i++) layout.step();

      // Centroid should be near origin
      const centroid = calculateCentroid(nodes);
      expect(Math.abs(centroid.x)).toBeLessThan(10);
      expect(Math.abs(centroid.z)).toBeLessThan(10);
    });

    it('should apply generation layer force to maintain ring structure', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes, { generationSpacing: 50 });

      // Run simulation
      for (let i = 0; i < 200; i++) layout.step();

      // Generation groups should remain roughly at their target radii
      const genGroups = groupByGeneration(nodes);
      genGroups.forEach((group, gen) => {
        const avgDist = avgDistance(group);
        const targetRadius = gen === 0 ? 15 : Math.abs(gen) * 50;
        expect(avgDist).toBeCloseTo(targetRadius, -1); // Within order of magnitude
      });
    });
  });

  describe('Barnes-Hut optimization', () => {
    it('should use quadtree for repulsion when nodes > 100', () => {
      const nodes = createTestNodes(150);
      const layout = new ForceLayout(nodes, { barnesHutThreshold: 100 });

      // Should not throw, should complete in reasonable time
      const start = performance.now();
      layout.step();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be fast with optimization
    });

    it('should produce similar results to direct calculation', () => {
      const nodes1 = createTestNodes(50);
      const nodes2 = JSON.parse(JSON.stringify(nodes1));

      const layoutDirect = new ForceLayout(nodes1, { useBarnesHut: false });
      const layoutBH = new ForceLayout(nodes2, { useBarnesHut: true });

      layoutDirect.step();
      layoutBH.step();

      // Results should be similar (not identical due to approximation)
      for (let i = 0; i < nodes1.length; i++) {
        expect(nodes1[i].position.x).toBeCloseTo(nodes2[i].position.x, 0);
        expect(nodes1[i].position.z).toBeCloseTo(nodes2[i].position.z, 0);
      }
    });
  });

  describe('Layout convergence', () => {
    it('should converge to stable state', () => {
      const nodes = createTestNodes(30);
      const layout = new ForceLayout(nodes);
      layout.initialize();

      // Run until stable
      let prevEnergy = Infinity;
      for (let i = 0; i < 500; i++) {
        layout.step();
        if (layout.isStable()) break;
      }

      expect(layout.isStable()).toBe(true);
    });
  });
});
```

**Implementation**:

```typescript
// src/visualization/layout/force-layout.ts
export interface ForceLayoutConfig {
  generationSpacing: number;      // Distance between generation rings (default: 50)
  repulsionStrength: number;      // Node repulsion force (default: 500)
  attractionStrength: number;     // Edge attraction force (default: 0.1)
  centerStrength: number;         // Gravity toward center (default: 0.02)
  generationStrength: number;     // Force to maintain ring structure (default: 0.1)
  damping: number;                // Velocity damping (default: 0.9)
  barnesHutThreshold: number;     // Use quadtree above this node count (default: 100)
  barnesHutTheta: number;         // Barnes-Hut approximation parameter (default: 0.5)
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

export class ForceLayout {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];
  private config: ForceLayoutConfig;
  private quadtree: Quadtree | null = null;

  constructor(nodes: LayoutNode[], config: Partial<ForceLayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodes = nodes;
    this.edges = config.edges || [];
  }

  /**
   * Initialize node positions using golden angle distribution
   */
  public initialize(): void {
    // Group nodes by generation
    const generations = new Map<number, LayoutNode[]>();
    this.nodes.forEach(node => {
      const gen = node.generation || 0;
      if (!generations.has(gen)) generations.set(gen, []);
      generations.get(gen)!.push(node);
    });

    // Position each generation in a ring
    generations.forEach((genNodes, gen) => {
      const ringRadius = gen === 0
        ? 15 + genNodes.length * 3  // Subject ring: small, expands with count
        : Math.abs(gen) * this.config.generationSpacing;

      const goldenOffset = gen * 0.5; // Offset each generation for variety

      genNodes.forEach((node, i) => {
        const angle = i * GOLDEN_ANGLE + goldenOffset;
        node.position.x = Math.cos(angle) * ringRadius;
        node.position.z = Math.sin(angle) * ringRadius;
        node.position.y = 0; // Flat layout (can add height variation later)
        node.velocity = { x: 0, y: 0, z: 0 };
      });
    });
  }

  /**
   * Run one step of force simulation
   */
  public step(): void {
    // Build quadtree if using Barnes-Hut optimization
    if (this.nodes.length > this.config.barnesHutThreshold) {
      this.quadtree = new Quadtree(this.nodes);
    }

    // Calculate forces
    this.applyRepulsion();
    this.applyAttraction();
    this.applyCenterGravity();
    this.applyGenerationForce();

    // Update positions
    this.nodes.forEach(node => {
      node.velocity.x *= this.config.damping;
      node.velocity.z *= this.config.damping;
      node.position.x += node.velocity.x;
      node.position.z += node.velocity.z;
    });
  }

  private applyRepulsion(): void {
    if (this.quadtree) {
      // Barnes-Hut O(n log n)
      this.nodes.forEach(node => {
        const force = this.quadtree!.calculateForce(node, this.config.barnesHutTheta);
        node.velocity.x += force.x * this.config.repulsionStrength;
        node.velocity.z += force.z * this.config.repulsionStrength;
      });
    } else {
      // Direct calculation O(n²)
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const dx = this.nodes[j].position.x - this.nodes[i].position.x;
          const dz = this.nodes[j].position.z - this.nodes[i].position.z;
          const dist = Math.sqrt(dx * dx + dz * dz) + 0.1;
          const force = this.config.repulsionStrength / (dist * dist);

          this.nodes[i].velocity.x -= (dx / dist) * force;
          this.nodes[i].velocity.z -= (dz / dist) * force;
          this.nodes[j].velocity.x += (dx / dist) * force;
          this.nodes[j].velocity.z += (dz / dist) * force;
        }
      }
    }
  }

  // ... additional force methods
}
```

**Key Algorithms from Prototype**:

1. **Golden Angle Distribution**: `angle = i * GOLDEN_ANGLE + offset` for organic spacing
2. **Generation Rings**: Concentric circles at `radius = |generation| * spacing`
3. **Barnes-Hut**: Quadtree approximation for O(n log n) repulsion at scale
4. **Force Balance**: Repulsion + attraction + center + generation layer forces
5. **Damping**: Velocity decay for stable convergence

---

## Success Criteria

| Criteria | Verification |
|----------|--------------|
| Nodes have swirling internal patterns | Visual inspection |
| Nodes glow from inside out | Compare screenshots |
| Edges show prayer bead energy nodes | Animation visible |
| Bloom effect works on WebGPU | Glow halos visible |
| Background particles are hexagonal | Shape inspection |
| Fireflies have star/mandala shape | Animation visible |
| **Nodes arranged in organic mandala pattern** | **Visual comparison** |
| **Generations form concentric rings** | **Screenshot comparison** |
| **Layout converges stably with 100+ nodes** | **Performance test** |
| Overall atmosphere matches prototype | Side-by-side comparison |

---

## Estimated Complexity

| Sub-Phase | New Tests | LOC | Complexity |
|-----------|-----------|-----|------------|
| 9.1 Node Material | 6 | ~150 | Medium |
| 9.2 Edge Material | 3 | ~80 | Low |
| 9.3 WebGPU Post-Processing | 4 | ~200 | High |
| 9.4 Enhanced Particles | 4 | ~100 | Medium |
| **9.5 Force-Directed Layout** | **10** | **~400** | **High** |
| **Total** | **27** | **~930** | |

---

## Dependencies

- Phase 1-6 complete (infrastructure in place)
- TSL noise functions working
- Edge system integrated

## Risks

1. **WebGPU post-processing complexity** - May need custom render pipeline
2. **TSL limitations** - Some GLSL patterns may not translate directly
3. **Performance impact** - More complex shaders may affect frame rate with 500+ nodes
4. **Layout convergence time** - Force simulation may take many iterations to stabilize with 100+ nodes
5. **Barnes-Hut accuracy** - Quadtree approximation may produce slightly different layouts than prototype

---

*Template version: 1.0*
