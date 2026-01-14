/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  createLODSystem,
  disposeLODSystem,
  type LODSystem,
  type LODConfig,
  type LODLevel,
  type LODMetrics,
} from './lod';

describe('LOD (Level of Detail) system', () => {
  let mockCamera: THREE.PerspectiveCamera;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    mockCamera.position.set(0, 0, 100);
  });

  describe('createLODSystem', () => {
    it('should export createLODSystem function', () => {
      expect(createLODSystem).toBeDefined();
      expect(typeof createLODSystem).toBe('function');
    });

    it('should return LOD system interface', () => {
      const lod = createLODSystem();
      expect(lod).toHaveProperty('update');
      expect(lod).toHaveProperty('getLevelForDistance');
      expect(lod).toHaveProperty('getMetrics');
      expect(lod).toHaveProperty('setPerformanceMode');
      expect(lod).toHaveProperty('getConfig');
      disposeLODSystem(lod);
    });

    it('should accept configuration', () => {
      const config: LODConfig = {
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
        ],
        enableAdaptive: true,
      };
      const lod = createLODSystem(config);
      expect(lod.getConfig().levels.length).toBe(2);
      expect(lod.getConfig().enableAdaptive).toBe(true);
      disposeLODSystem(lod);
    });

    it('should use default LOD levels', () => {
      const lod = createLODSystem();
      const config = lod.getConfig();
      expect(config.levels.length).toBeGreaterThan(0);
      expect(config.levels[0].distance).toBe(0);
      disposeLODSystem(lod);
    });
  });

  describe('LODSystem.getLevelForDistance', () => {
    it('should return highest detail for close distances', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
          { distance: 200, nodeDetail: 8, particleMultiplier: 0.25 },
        ],
      });
      lod.setPerformanceMode('quality'); // Set quality mode for raw values

      const level = lod.getLevelForDistance(50);
      expect(level.nodeDetail).toBe(32);
      expect(level.particleMultiplier).toBe(1.0);
      disposeLODSystem(lod);
    });

    it('should return medium detail for medium distances', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
          { distance: 200, nodeDetail: 8, particleMultiplier: 0.25 },
        ],
      });
      lod.setPerformanceMode('quality'); // Set quality mode for raw values

      const level = lod.getLevelForDistance(150);
      expect(level.nodeDetail).toBe(16);
      expect(level.particleMultiplier).toBe(0.5);
      disposeLODSystem(lod);
    });

    it('should return lowest detail for far distances', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
          { distance: 200, nodeDetail: 8, particleMultiplier: 0.25 },
        ],
      });
      lod.setPerformanceMode('quality'); // Set quality mode for raw values

      const level = lod.getLevelForDistance(300);
      expect(level.nodeDetail).toBe(8);
      expect(level.particleMultiplier).toBe(0.25);
      disposeLODSystem(lod);
    });

    it('should handle exact distance thresholds', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
        ],
      });

      const level = lod.getLevelForDistance(100);
      expect(level.nodeDetail).toBe(16);
      disposeLODSystem(lod);
    });
  });

  describe('LODSystem.update', () => {
    it('should update current LOD level based on camera position', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
        ],
      });

      // Camera at origin, looking at origin - distance = 0
      mockCamera.position.set(0, 0, 50);
      const centerPoint = new THREE.Vector3(0, 0, 0);

      const level = lod.update(mockCamera, centerPoint);
      expect(level.nodeDetail).toBe(32);
      disposeLODSystem(lod);
    });

    it('should return lower detail when camera is far', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
        ],
      });

      mockCamera.position.set(0, 0, 200);
      const centerPoint = new THREE.Vector3(0, 0, 0);

      const level = lod.update(mockCamera, centerPoint);
      expect(level.nodeDetail).toBe(16);
      disposeLODSystem(lod);
    });
  });

  describe('LODSystem.setPerformanceMode', () => {
    it('should have quality mode with full detail', () => {
      const lod = createLODSystem();
      lod.setPerformanceMode('quality');

      const level = lod.getLevelForDistance(0);
      expect(level.particleMultiplier).toBeGreaterThanOrEqual(0.8);
      disposeLODSystem(lod);
    });

    it('should have balanced mode with medium detail', () => {
      const lod = createLODSystem();
      lod.setPerformanceMode('balanced');

      const level = lod.getLevelForDistance(0);
      expect(level.particleMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(level.particleMultiplier).toBeLessThanOrEqual(1.0);
      disposeLODSystem(lod);
    });

    it('should have performance mode with reduced detail', () => {
      const lod = createLODSystem();
      lod.setPerformanceMode('performance');

      const level = lod.getLevelForDistance(0);
      expect(level.particleMultiplier).toBeLessThanOrEqual(0.5);
      disposeLODSystem(lod);
    });
  });

  describe('LODSystem.getMetrics', () => {
    it('should return LOD metrics', () => {
      const lod = createLODSystem();

      mockCamera.position.set(0, 0, 100);
      const centerPoint = new THREE.Vector3(0, 0, 0);
      lod.update(mockCamera, centerPoint);

      const metrics = lod.getMetrics();
      expect(metrics).toHaveProperty('currentLevel');
      expect(metrics).toHaveProperty('currentDistance');
      expect(metrics).toHaveProperty('performanceMode');
      expect(metrics).toHaveProperty('levelChanges');
      disposeLODSystem(lod);
    });

    it('should track level changes', () => {
      const lod = createLODSystem({
        levels: [
          { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
          { distance: 100, nodeDetail: 16, particleMultiplier: 0.5 },
        ],
      });

      const centerPoint = new THREE.Vector3(0, 0, 0);

      // Start close
      mockCamera.position.set(0, 0, 50);
      lod.update(mockCamera, centerPoint);

      // Move far
      mockCamera.position.set(0, 0, 200);
      lod.update(mockCamera, centerPoint);

      const metrics = lod.getMetrics();
      expect(metrics.levelChanges).toBeGreaterThanOrEqual(1);
      disposeLODSystem(lod);
    });

    it('should track current distance', () => {
      const lod = createLODSystem();

      mockCamera.position.set(0, 0, 150);
      const centerPoint = new THREE.Vector3(0, 0, 0);
      lod.update(mockCamera, centerPoint);

      const metrics = lod.getMetrics();
      expect(metrics.currentDistance).toBeCloseTo(150);
      disposeLODSystem(lod);
    });
  });

  describe('adaptive LOD', () => {
    it('should adjust detail based on FPS when adaptive enabled', () => {
      const lod = createLODSystem({ enableAdaptive: true });

      // Simulate low FPS
      lod.updateAdaptive(30, 60); // 30 FPS when target is 60

      const level = lod.getLevelForDistance(0);
      // Should reduce detail when FPS is low
      expect(level.particleMultiplier).toBeLessThan(1.0);
      disposeLODSystem(lod);
    });

    it('should maintain detail when FPS is good', () => {
      const lod = createLODSystem({ enableAdaptive: true });
      lod.setPerformanceMode('quality'); // Set quality mode for full detail baseline

      // Simulate good FPS
      lod.updateAdaptive(60, 60); // 60 FPS when target is 60

      const level = lod.getLevelForDistance(0);
      // Should maintain full detail (adaptive multiplier = 1.0)
      expect(level.particleMultiplier).toBeGreaterThanOrEqual(0.8);
      disposeLODSystem(lod);
    });

    it('should not adjust when adaptive disabled', () => {
      const lod = createLODSystem({ enableAdaptive: false });

      const levelBefore = lod.getLevelForDistance(0);
      lod.updateAdaptive(30, 60); // Simulate low FPS
      const levelAfter = lod.getLevelForDistance(0);

      expect(levelBefore.particleMultiplier).toBe(levelAfter.particleMultiplier);
      disposeLODSystem(lod);
    });
  });

  describe('disposeLODSystem', () => {
    it('should dispose system', () => {
      const lod = createLODSystem();
      expect(() => disposeLODSystem(lod)).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      const lod = createLODSystem();
      disposeLODSystem(lod);
      expect(() => disposeLODSystem(lod)).not.toThrow();
    });
  });
});
