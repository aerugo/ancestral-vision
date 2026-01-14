/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createSacredGeometryGrid,
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
} from './sacred-geometry-grid';

describe('sacred-geometry-grid module', () => {
  describe('createSacredGeometryGrid', () => {
    it('should export createSacredGeometryGrid function', () => {
      expect(createSacredGeometryGrid).toBeDefined();
      expect(typeof createSacredGeometryGrid).toBe('function');
    });

    it('should return a THREE.Group', () => {
      const grid = createSacredGeometryGrid();
      expect(grid).toBeInstanceOf(THREE.Group);
    });

    it('should contain ring meshes', () => {
      const grid = createSacredGeometryGrid();
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings.length).toBeGreaterThan(0);
    });

    it('should create default 8 concentric rings', () => {
      const grid = createSacredGeometryGrid();
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings.length).toBe(8);
    });

    it('should accept custom ring count', () => {
      const config: SacredGeometryConfig = { ringCount: 5 };
      const grid = createSacredGeometryGrid(config);
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings.length).toBe(5);
    });

    it('should contain radial line meshes', () => {
      const grid = createSacredGeometryGrid();
      const radials = grid.children.filter(
        (child) => child.userData.type === 'radial'
      );
      expect(radials.length).toBeGreaterThan(0);
    });

    it('should create default 12 radial lines', () => {
      const grid = createSacredGeometryGrid();
      const radials = grid.children.filter(
        (child) => child.userData.type === 'radial'
      );
      expect(radials.length).toBe(12);
    });

    it('should accept custom radial count', () => {
      const config: SacredGeometryConfig = { radialCount: 8 };
      const grid = createSacredGeometryGrid(config);
      const radials = grid.children.filter(
        (child) => child.userData.type === 'radial'
      );
      expect(radials.length).toBe(8);
    });

    it('should use ring spacing for radius calculation', () => {
      const config: SacredGeometryConfig = { ringSpacing: 100 };
      const grid = createSacredGeometryGrid(config);
      // Outer ring should be at ringSpacing * ringCount
      expect(grid.userData.outerRadius).toBe(800); // 100 * 8 default rings
    });

    it('should position grid below origin', () => {
      const config: SacredGeometryConfig = { yOffset: -10 };
      const grid = createSacredGeometryGrid(config);
      expect(grid.position.y).toBe(-10);
    });

    it('should use sacred gold color by default', () => {
      const grid = createSacredGeometryGrid();
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.color.getHex()).toBe(0xd4a84b);
    });

    it('should accept custom color', () => {
      const config: SacredGeometryConfig = { color: new THREE.Color(0xff0000) };
      const grid = createSacredGeometryGrid(config);
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.color.getHex()).toBe(0xff0000);
    });

    it('should set low opacity by default', () => {
      const grid = createSacredGeometryGrid();
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.opacity).toBeLessThan(0.2);
    });

    it('should create rings at correct radii', () => {
      const config: SacredGeometryConfig = { ringSpacing: 50, ringCount: 3 };
      const grid = createSacredGeometryGrid(config);
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings[0]!.userData.index).toBe(1);
      expect(rings[1]!.userData.index).toBe(2);
      expect(rings[2]!.userData.index).toBe(3);
    });

    it('should create radial lines from center to outer radius', () => {
      const config: SacredGeometryConfig = { ringSpacing: 50, ringCount: 4 };
      const grid = createSacredGeometryGrid(config);
      const radial = grid.children.find(
        (c) => c.userData.type === 'radial'
      ) as THREE.Line;
      const positions = radial.geometry.attributes.position;
      expect(positions).toBeDefined();
      // Start at origin
      expect(positions!.getX(0)).toBe(0);
      expect(positions!.getZ(0)).toBe(0);
      // End at outer radius
      const endX = positions!.getX(1);
      const endZ = positions!.getZ(1);
      const endRadius = Math.sqrt(endX * endX + endZ * endZ);
      expect(endRadius).toBeCloseTo(200, 0); // 50 * 4 = 200
    });

    it('should use additive blending for glow effect', () => {
      const grid = createSacredGeometryGrid();
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.blending).toBe(THREE.AdditiveBlending);
    });
  });

  describe('disposeSacredGeometryGrid', () => {
    it('should dispose all children geometry and materials', () => {
      const grid = createSacredGeometryGrid();
      const disposeCalls: string[] = [];

      grid.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          vi.spyOn(child.geometry, 'dispose').mockImplementation(() => {
            disposeCalls.push('geometry');
          });
          vi.spyOn(child.material as THREE.Material, 'dispose').mockImplementation(() => {
            disposeCalls.push('material');
          });
        }
      });

      disposeSacredGeometryGrid(grid);

      // Should have disposed geometry and material for each child
      expect(disposeCalls.filter(c => c === 'geometry').length).toBeGreaterThan(0);
      expect(disposeCalls.filter(c => c === 'material').length).toBeGreaterThan(0);
    });

    it('should clear the group', () => {
      const grid = createSacredGeometryGrid();
      const initialChildCount = grid.children.length;
      expect(initialChildCount).toBeGreaterThan(0);

      disposeSacredGeometryGrid(grid);
      expect(grid.children.length).toBe(0);
    });
  });
});
