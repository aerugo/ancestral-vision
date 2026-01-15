/**
 * Force-Directed Layout System Tests
 * TDD: RED phase - these tests should FAIL initially
 *
 * Tests the golden angle distribution and force simulation
 * that creates organic mandala-style node positioning.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ForceLayout,
  type LayoutNode,
  type LayoutEdge,
  type ForceLayoutConfig,
  GOLDEN_ANGLE,
} from './force-layout';

// Test helpers
function createTestNodes(count: number, generation = 0): LayoutNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    generation,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
  }));
}

function createTestNodesWithGenerations(): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  // Subject (gen 0)
  nodes.push({ id: 'subject', generation: 0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  // Parents (gen -1)
  nodes.push({ id: 'father', generation: -1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  nodes.push({ id: 'mother', generation: -1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  // Grandparents (gen -2)
  nodes.push({ id: 'gf1', generation: -2, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  nodes.push({ id: 'gm1', generation: -2, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  nodes.push({ id: 'gf2', generation: -2, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  nodes.push({ id: 'gm2', generation: -2, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  // Children (gen 1)
  nodes.push({ id: 'child1', generation: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  nodes.push({ id: 'child2', generation: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
  return nodes;
}

function createOverlappingNodes(): LayoutNode[] {
  return [
    { id: 'a', generation: 0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
    { id: 'b', generation: 0, position: { x: 1, y: 0, z: 1 }, velocity: { x: 0, y: 0, z: 0 } },
  ];
}

function createConnectedNodes(): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodes: LayoutNode[] = [
    { id: 'a', generation: 0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
    { id: 'b', generation: -1, position: { x: 100, y: 0, z: 100 }, velocity: { x: 0, y: 0, z: 0 } },
  ];
  const edges: LayoutEdge[] = [
    { source: 'a', target: 'b' },
  ];
  return { nodes, edges };
}

function distance(a: LayoutNode, b: LayoutNode): number {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function avgDistance(nodes: LayoutNode[]): number {
  if (nodes.length === 0) return 0;
  const sum = nodes.reduce((acc, n) => {
    return acc + Math.sqrt(n.position.x ** 2 + n.position.z ** 2);
  }, 0);
  return sum / nodes.length;
}

function calculateCentroid(nodes: LayoutNode[]): { x: number; z: number } {
  if (nodes.length === 0) return { x: 0, z: 0 };
  const sum = nodes.reduce(
    (acc, n) => ({ x: acc.x + n.position.x, z: acc.z + n.position.z }),
    { x: 0, z: 0 }
  );
  return { x: sum.x / nodes.length, z: sum.z / nodes.length };
}

describe('Force-directed layout system', () => {
  describe('Golden angle constant', () => {
    it('should export GOLDEN_ANGLE approximately equal to 137.5 degrees', () => {
      const expectedRadians = Math.PI * (3 - Math.sqrt(5));
      expect(GOLDEN_ANGLE).toBeCloseTo(expectedRadians, 10);
      // ~2.399 radians = ~137.5 degrees
      expect(GOLDEN_ANGLE * (180 / Math.PI)).toBeCloseTo(137.5, 0);
    });
  });

  describe('Initial positioning', () => {
    it('should position nodes using golden angle distribution within same generation', () => {
      const nodes = createTestNodes(5, 0);
      const layout = new ForceLayout(nodes);
      layout.initialize();

      // All nodes should be positioned (not at origin)
      nodes.forEach(n => {
        const dist = Math.sqrt(n.position.x ** 2 + n.position.z ** 2);
        expect(dist).toBeGreaterThan(0);
      });

      // Calculate angles and verify golden angle spacing
      const angles = nodes.map(n => Math.atan2(n.position.z, n.position.x));
      for (let i = 1; i < angles.length; i++) {
        let diff = angles[i] - angles[i - 1];
        // Normalize to positive angle
        if (diff < 0) diff += 2 * Math.PI;
        // Golden angle or its complement
        const isGoldenAngle = Math.abs(diff - GOLDEN_ANGLE) < 0.1 ||
                              Math.abs(diff - (2 * Math.PI - GOLDEN_ANGLE)) < 0.1;
        expect(isGoldenAngle).toBe(true);
      }
    });

    it('should place generation 0 (subject) at center with small radius', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes);
      layout.initialize();

      const gen0Nodes = nodes.filter(n => n.generation === 0);
      gen0Nodes.forEach(n => {
        const dist = Math.sqrt(n.position.x ** 2 + n.position.z ** 2);
        expect(dist).toBeLessThan(30); // Small radius for center
      });
    });

    it('should place nodes in concentric rings by generation', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes, { generationSpacing: 50 });
      layout.initialize();

      // Group by generation
      const gen0 = nodes.filter(n => n.generation === 0);
      const genM1 = nodes.filter(n => n.generation === -1);
      const genM2 = nodes.filter(n => n.generation === -2);
      const gen1 = nodes.filter(n => n.generation === 1);

      const avgGen0 = avgDistance(gen0);
      const avgGenM1 = avgDistance(genM1);
      const avgGenM2 = avgDistance(genM2);
      const avgGen1 = avgDistance(gen1);

      // Parents should be further than subject
      expect(avgGenM1).toBeGreaterThan(avgGen0);
      // Grandparents should be further than parents
      expect(avgGenM2).toBeGreaterThan(avgGenM1);
      // Children should also be further than subject
      expect(avgGen1).toBeGreaterThan(avgGen0);
    });

    it('should use generation spacing from config', () => {
      const nodes = createTestNodesWithGenerations();
      const spacing = 80;
      const layout = new ForceLayout(nodes, { generationSpacing: spacing });
      layout.initialize();

      const genM1 = nodes.filter(n => n.generation === -1);
      const genM2 = nodes.filter(n => n.generation === -2);

      const avgGenM1 = avgDistance(genM1);
      const avgGenM2 = avgDistance(genM2);

      // Gen -1 should be around 1*spacing, gen -2 around 2*spacing
      expect(avgGenM1).toBeCloseTo(spacing, -1); // Within order of magnitude
      expect(avgGenM2).toBeCloseTo(spacing * 2, -1);
    });

    it('should set y position to 0 for flat layout', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes);
      layout.initialize();

      nodes.forEach(n => {
        expect(n.position.y).toBe(0);
      });
    });

    it('should initialize velocity to zero', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes);
      layout.initialize();

      nodes.forEach(n => {
        expect(n.velocity.x).toBe(0);
        expect(n.velocity.y).toBe(0);
        expect(n.velocity.z).toBe(0);
      });
    });
  });

  describe('Force simulation', () => {
    it('should apply repulsion force between nearby nodes', () => {
      const nodes = createOverlappingNodes();
      const layout = new ForceLayout(nodes, { repulsionStrength: 100 });

      const initialDist = distance(nodes[0], nodes[1]);

      // Run a few simulation steps
      for (let i = 0; i < 10; i++) {
        layout.step();
      }

      const finalDist = distance(nodes[0], nodes[1]);
      // Nodes should have moved apart
      expect(finalDist).toBeGreaterThan(initialDist);
    });

    it('should apply attraction force along edges', () => {
      const { nodes, edges } = createConnectedNodes();
      const layout = new ForceLayout(nodes, {
        edges,
        attractionStrength: 0.5,
        repulsionStrength: 10, // Lower repulsion to let attraction work
      });

      const initialDist = distance(nodes[0], nodes[1]);

      // Run simulation
      for (let i = 0; i < 50; i++) {
        layout.step();
      }

      const finalDist = distance(nodes[0], nodes[1]);
      // Connected nodes should be closer (or at least not drastically further)
      expect(finalDist).toBeLessThan(initialDist * 1.5);
    });

    it('should apply center gravity to prevent drift', () => {
      const nodes = createTestNodes(20);
      // Position nodes far from center
      nodes.forEach((n, i) => {
        n.position.x = 500 + i * 10;
        n.position.z = 500 + i * 10;
      });

      const layout = new ForceLayout(nodes, { centerStrength: 0.1 });

      // Run simulation
      for (let i = 0; i < 100; i++) {
        layout.step();
      }

      // Centroid should be closer to origin
      const centroid = calculateCentroid(nodes);
      expect(Math.abs(centroid.x)).toBeLessThan(400);
      expect(Math.abs(centroid.z)).toBeLessThan(400);
    });

    it('should apply generation layer force to maintain ring structure', () => {
      const nodes = createTestNodesWithGenerations();
      const spacing = 50;
      const layout = new ForceLayout(nodes, {
        generationSpacing: spacing,
        generationStrength: 0.2,
      });
      layout.initialize();

      // Disturb positions
      nodes.forEach(n => {
        n.position.x += (Math.random() - 0.5) * 30;
        n.position.z += (Math.random() - 0.5) * 30;
      });

      // Run simulation
      for (let i = 0; i < 100; i++) {
        layout.step();
      }

      // Generations should still be roughly at their target radii
      const genM1 = nodes.filter(n => n.generation === -1);
      const genM2 = nodes.filter(n => n.generation === -2);

      const avgGenM1 = avgDistance(genM1);
      const avgGenM2 = avgDistance(genM2);

      // Should be roughly at spacing * |generation|
      expect(avgGenM1).toBeGreaterThan(spacing * 0.5);
      expect(avgGenM1).toBeLessThan(spacing * 2);
      expect(avgGenM2).toBeGreaterThan(spacing * 1.5);
      expect(avgGenM2).toBeLessThan(spacing * 3);
    });

    it('should apply velocity damping', () => {
      const nodes = createOverlappingNodes();
      nodes[0].velocity = { x: 100, y: 0, z: 100 };

      const layout = new ForceLayout(nodes, { damping: 0.8 });
      layout.step();

      // Velocity should be reduced by damping
      expect(Math.abs(nodes[0].velocity.x)).toBeLessThan(100);
      expect(Math.abs(nodes[0].velocity.z)).toBeLessThan(100);
    });
  });

  describe('Configuration', () => {
    it('should use default config when none provided', () => {
      const nodes = createTestNodes(5);
      const layout = new ForceLayout(nodes);

      // Should not throw
      expect(() => layout.initialize()).not.toThrow();
      expect(() => layout.step()).not.toThrow();
    });

    it('should allow partial config override', () => {
      const nodes = createTestNodes(5);
      const layout = new ForceLayout(nodes, { generationSpacing: 100 });

      // Should not throw with partial config
      expect(() => layout.initialize()).not.toThrow();
    });

    it('should accept edges in config', () => {
      const { nodes, edges } = createConnectedNodes();
      const layout = new ForceLayout(nodes, { edges });

      // Should not throw
      expect(() => layout.step()).not.toThrow();
    });
  });

  describe('Layout convergence', () => {
    it('should converge to stable state', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes, {
        damping: 0.9,
        repulsionStrength: 50,
      });
      layout.initialize();

      // Run until stable or max iterations
      for (let i = 0; i < 200; i++) {
        layout.step();
        if (layout.isStable()) break;
      }

      expect(layout.isStable()).toBe(true);
    });

    it('should report energy level', () => {
      const nodes = createTestNodesWithGenerations();
      const layout = new ForceLayout(nodes);
      layout.initialize();

      // Run a few steps to build up energy from forces
      for (let i = 0; i < 10; i++) {
        layout.step();
      }
      const peakEnergy = layout.getEnergy();

      // Run more steps to let system settle
      for (let i = 0; i < 100; i++) {
        layout.step();
      }
      const finalEnergy = layout.getEnergy();

      // Energy should decrease as system stabilizes after peak
      expect(finalEnergy).toBeLessThan(peakEnergy);
      // And should be small when stable
      expect(finalEnergy).toBeLessThan(1);
    });
  });

  describe('Node position retrieval', () => {
    it('should return node positions as array', () => {
      const nodes = createTestNodes(5);
      const layout = new ForceLayout(nodes);
      layout.initialize();

      const positions = layout.getPositions();

      expect(positions).toHaveLength(5);
      positions.forEach(p => {
        expect(p).toHaveProperty('x');
        expect(p).toHaveProperty('y');
        expect(p).toHaveProperty('z');
      });
    });

    it('should return position map by node id', () => {
      const nodes = createTestNodes(3);
      nodes[0].id = 'alpha';
      nodes[1].id = 'beta';
      nodes[2].id = 'gamma';

      const layout = new ForceLayout(nodes);
      layout.initialize();

      const positionMap = layout.getPositionMap();

      expect(positionMap.get('alpha')).toBeDefined();
      expect(positionMap.get('beta')).toBeDefined();
      expect(positionMap.get('gamma')).toBeDefined();
    });
  });
});
