/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createBezierCurvePoints,
  createEdgeGeometry,
  type EdgeData,
} from './edge-geometry';

describe('edge-geometry module', () => {
  describe('createBezierCurvePoints', () => {
    it('should export createBezierCurvePoints function', () => {
      expect(createBezierCurvePoints).toBeDefined();
      expect(typeof createBezierCurvePoints).toBe('function');
    });

    it('should return array of Vector3 points', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end);

      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toBeInstanceOf(THREE.Vector3);
    });

    it('should start at start point', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end);

      expect(points[0]?.x).toBeCloseTo(0);
      expect(points[0]?.y).toBeCloseTo(0);
      expect(points[0]?.z).toBeCloseTo(0);
    });

    it('should end at end point', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end);
      const lastPoint = points[points.length - 1];

      expect(lastPoint?.x).toBeCloseTo(10);
      expect(lastPoint?.y).toBeCloseTo(0);
      expect(lastPoint?.z).toBeCloseTo(0);
    });

    it('should create curved path with curvature factor', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end, { curvature: 0.3 });
      const midIndex = Math.floor(points.length / 2);

      // Mid-point should be offset perpendicular to line
      expect(points[midIndex]?.y).not.toBe(0);
    });

    it('should accept configurable segment count', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points20 = createBezierCurvePoints(start, end, { segments: 20 });
      const points50 = createBezierCurvePoints(start, end, { segments: 50 });

      expect(points20.length).toBe(21); // segments + 1
      expect(points50.length).toBe(51);
    });

    it('should handle zero-length edges gracefully', () => {
      const point = new THREE.Vector3(5, 5, 5);
      const points = createBezierCurvePoints(point, point.clone());

      expect(points.length).toBeGreaterThan(0);
    });
  });

  describe('createEdgeGeometry', () => {
    it('should export createEdgeGeometry function', () => {
      expect(createEdgeGeometry).toBeDefined();
      expect(typeof createEdgeGeometry).toBe('function');
    });

    it('should return BufferGeometry', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should create position attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry.attributes.position).toBeDefined();
    });

    it('should create progress attribute for shader animation', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry.attributes.aProgress).toBeDefined();
    });

    it('should create strength attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 0.8,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry.attributes.aStrength).toBeDefined();
    });

    it('should handle multiple edges', () => {
      const edges: EdgeData[] = [
        {
          id: 'edge-1',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
        {
          id: 'edge-2',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(0, 10, 0),
          type: 'spouse',
          strength: 0.8,
        },
      ];
      const geometry = createEdgeGeometry(edges);

      // Should have vertices for both edges
      expect(geometry.attributes.position.count).toBeGreaterThan(40);
    });

    it('should return empty geometry for empty edges array', () => {
      const geometry = createEdgeGeometry([]);
      expect(geometry.attributes.position.count).toBe(0);
    });
  });
});
