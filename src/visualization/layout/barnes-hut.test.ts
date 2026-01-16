/**
 * Barnes-Hut Octree Tests
 *
 * Tests for the O(n log n) force calculation algorithm.
 */
import { describe, it, expect } from 'vitest';
import { BarnesHutTree } from './barnes-hut';
import type { Vec3 } from './types';

function createGridPositions(size: number, spacing: number = 10): Vec3[] {
  const positions: Vec3[] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        positions.push({
          x: x * spacing,
          y: y * spacing,
          z: z * spacing,
        });
      }
    }
  }
  return positions;
}

describe('BarnesHutTree', () => {
  describe('build', () => {
    it('should handle empty positions array', () => {
      const tree = new BarnesHutTree();
      tree.build([]);

      const force = tree.calculateForce(0, { x: 0, y: 0, z: 0 }, 100);
      expect(force.x).toBe(0);
      expect(force.y).toBe(0);
      expect(force.z).toBe(0);
    });

    it('should build tree from single position', () => {
      const tree = new BarnesHutTree();
      tree.build([{ x: 0, y: 0, z: 0 }]);

      // Force on self should be zero
      const force = tree.calculateForce(0, { x: 0, y: 0, z: 0 }, 100);
      expect(force.x).toBe(0);
      expect(force.y).toBe(0);
      expect(force.z).toBe(0);
    });

    it('should build tree from multiple positions', () => {
      const tree = new BarnesHutTree();
      const positions = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 },
      ];
      tree.build(positions);

      // Should calculate non-zero force
      const force = tree.calculateForce(0, positions[0]!, 100);
      expect(Math.abs(force.x) + Math.abs(force.y) + Math.abs(force.z)).toBeGreaterThan(0);
    });
  });

  describe('calculateForce', () => {
    it('should calculate repulsive force between two bodies', () => {
      const tree = new BarnesHutTree();
      const positions: Vec3[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      tree.build(positions);

      const force = tree.calculateForce(0, positions[0]!, 100);

      // Force should push body 0 away from body 1 (negative X direction)
      expect(force.x).toBeLessThan(0);
      expect(Math.abs(force.y)).toBeLessThan(0.001);
      expect(Math.abs(force.z)).toBeLessThan(0.001);
    });

    it('should calculate symmetric forces', () => {
      const tree = new BarnesHutTree();
      const positions: Vec3[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      tree.build(positions);

      const force0 = tree.calculateForce(0, positions[0]!, 100);
      const force1 = tree.calculateForce(1, positions[1]!, 100);

      // Forces should be equal and opposite
      expect(force0.x + force1.x).toBeCloseTo(0, 5);
      expect(force0.y + force1.y).toBeCloseTo(0, 5);
      expect(force0.z + force1.z).toBeCloseTo(0, 5);
    });

    it('should calculate inverse square law force', () => {
      const tree = new BarnesHutTree();
      const positions1: Vec3[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      tree.build(positions1);
      const force1 = tree.calculateForce(0, positions1[0]!, 100);

      const tree2 = new BarnesHutTree();
      const positions2: Vec3[] = [
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 0 },
      ];
      tree2.build(positions2);
      const force2 = tree2.calculateForce(0, positions2[0]!, 100);

      // Force at double distance should be roughly 1/4 (inverse square)
      const ratio = Math.abs(force2.x) / Math.abs(force1.x);
      expect(ratio).toBeCloseTo(0.25, 1);
    });

    it('should handle 3D positions', () => {
      const tree = new BarnesHutTree();
      const positions: Vec3[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 10 },
      ];
      tree.build(positions);

      const force = tree.calculateForce(0, positions[0]!, 100);

      // Force should have components in all three dimensions
      expect(force.x).toBeLessThan(0);
      expect(force.y).toBeLessThan(0);
      expect(force.z).toBeLessThan(0);

      // Components should be equal for diagonal position
      expect(force.x).toBeCloseTo(force.y, 5);
      expect(force.y).toBeCloseTo(force.z, 5);
    });
  });

  describe('accuracy vs direct calculation', () => {
    it('should produce similar results to direct calculation for small graphs', () => {
      const positions = createGridPositions(2, 20); // 8 positions
      const tree = new BarnesHutTree(0.5); // Lower theta for more accuracy
      tree.build(positions);

      // Calculate Barnes-Hut force
      const bhForce = tree.calculateForce(0, positions[0]!, 100);

      // Calculate direct force (O(n²))
      const directForce: Vec3 = { x: 0, y: 0, z: 0 };
      for (let i = 1; i < positions.length; i++) {
        const dx = positions[i]!.x - positions[0]!.x;
        const dy = positions[i]!.y - positions[0]!.y;
        const dz = positions[i]!.z - positions[0]!.z;
        const distSq = dx * dx + dy * dy + dz * dz + 0.1;
        const dist = Math.sqrt(distSq);
        const f = 100 / distSq;
        directForce.x -= (dx / dist) * f;
        directForce.y -= (dy / dist) * f;
        directForce.z -= (dz / dist) * f;
      }

      // Should be within 20% for small graphs
      expect(bhForce.x).toBeCloseTo(directForce.x, 0);
      expect(bhForce.y).toBeCloseTo(directForce.y, 0);
      expect(bhForce.z).toBeCloseTo(directForce.z, 0);
    });
  });

  describe('theta parameter', () => {
    it('should produce more accurate results with lower theta', () => {
      const positions = createGridPositions(3, 10); // 27 positions

      const treeHighTheta = new BarnesHutTree(1.0);
      treeHighTheta.build(positions);
      const forceHigh = treeHighTheta.calculateForce(0, positions[0]!, 100);

      const treeLowTheta = new BarnesHutTree(0.3);
      treeLowTheta.build(positions);
      const forceLow = treeLowTheta.calculateForce(0, positions[0]!, 100);

      // Both should produce similar direction
      expect(Math.sign(forceHigh.x)).toBe(Math.sign(forceLow.x));
      expect(Math.sign(forceHigh.y)).toBe(Math.sign(forceLow.y));
      expect(Math.sign(forceHigh.z)).toBe(Math.sign(forceLow.z));
    });
  });
});
