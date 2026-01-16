/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createBezierCurvePoints,
  createEdgeGeometry,
  updateEdgePulseIntensities,
  updateEdgePulseIntensitiesSmooth,
  type EdgeData,
  type EdgeSegmentMapping,
  type EdgePulseDetail,
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

    it('should return EdgeGeometryResult with geometry', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const result = createEdgeGeometry(edges);

      expect(result.geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.segmentMapping).toBeDefined();
      expect(result.pulseIntensityAttribute).toBeDefined();
    });

    it('should create position attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { geometry } = createEdgeGeometry(edges);

      expect(geometry.attributes.position).toBeDefined();
    });

    it('should create progress attribute for shader animation', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { geometry } = createEdgeGeometry(edges);

      expect(geometry.attributes.aProgress).toBeDefined();
    });

    it('should create strength attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 0.8,
      }];
      const { geometry } = createEdgeGeometry(edges);

      expect(geometry.attributes.aStrength).toBeDefined();
    });

    it('should create aPulseIntensity attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { geometry } = createEdgeGeometry(edges);

      expect(geometry.attributes.aPulseIntensity).toBeDefined();
    });

    it('should handle multiple edges', () => {
      const edges: EdgeData[] = [
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
        {
          id: 'edge-2',
          sourceId: 'A',
          targetId: 'C',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(0, 10, 0),
          type: 'parent-child',
          strength: 0.8,
        },
      ];
      const { geometry } = createEdgeGeometry(edges);

      // Should have vertices for both edges
      expect(geometry.attributes.position?.count).toBeGreaterThan(40);
    });

    it('should return empty geometry for empty edges array', () => {
      const { geometry, segmentMapping } = createEdgeGeometry([]);
      expect(geometry.attributes.position?.count).toBe(0);
      expect(segmentMapping.length).toBe(0);
    });

    it('should return segment mapping for each edge', () => {
      const edges: EdgeData[] = [
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
        {
          id: 'edge-2',
          sourceId: 'B',
          targetId: 'C',
          sourcePosition: new THREE.Vector3(10, 0, 0),
          targetPosition: new THREE.Vector3(20, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
      ];
      const { segmentMapping } = createEdgeGeometry(edges);

      expect(segmentMapping.length).toBe(2);
      expect(segmentMapping[0]?.sourceId).toBe('A');
      expect(segmentMapping[0]?.targetId).toBe('B');
      expect(segmentMapping[0]?.sortedKey).toBe('A-B');
      expect(segmentMapping[1]?.sourceId).toBe('B');
      expect(segmentMapping[1]?.targetId).toBe('C');
      expect(segmentMapping[1]?.sortedKey).toBe('B-C');
    });
  });

  describe('updateEdgePulseIntensities', () => {
    it('should update pulse intensities for matching edges', () => {
      const edges: EdgeData[] = [
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
        {
          id: 'edge-2',
          sourceId: 'B',
          targetId: 'C',
          sourcePosition: new THREE.Vector3(10, 0, 0),
          targetPosition: new THREE.Vector3(20, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
      ];
      const { pulseIntensityAttribute, segmentMapping } = createEdgeGeometry(edges);

      // Set intensity for edge A-B
      const intensities = new Map<string, number>();
      intensities.set('A-B', 0.8);

      updateEdgePulseIntensities(pulseIntensityAttribute, segmentMapping, intensities);

      // Check that A-B edge has intensity
      const array = pulseIntensityAttribute.array as Float32Array;
      const mapping = segmentMapping[0]!;
      expect(array[mapping.startIndex]).toBeCloseTo(0.8);

      // Check that B-C edge has zero intensity
      const mapping2 = segmentMapping[1]!;
      expect(array[mapping2.startIndex]).toBe(0);
    });

    it('should reset all intensities to zero first', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { pulseIntensityAttribute, segmentMapping } = createEdgeGeometry(edges);

      // First update with intensity
      const intensities1 = new Map<string, number>();
      intensities1.set('A-B', 1.0);
      updateEdgePulseIntensities(pulseIntensityAttribute, segmentMapping, intensities1);

      // Second update with empty intensities
      const intensities2 = new Map<string, number>();
      updateEdgePulseIntensities(pulseIntensityAttribute, segmentMapping, intensities2);

      // Should all be zero now
      const array = pulseIntensityAttribute.array as Float32Array;
      for (let i = 0; i < array.length; i++) {
        expect(array[i]).toBe(0);
      }
    });
  });

  describe('updateEdgePulseIntensitiesSmooth', () => {
    it('should update per-vertex intensities based on pulse position', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { geometry, pulseIntensityAttribute, segmentMapping } = createEdgeGeometry(edges);
      const progressAttribute = geometry.getAttribute('aProgress') as THREE.BufferAttribute;

      // Simulate pulse at 50% through the edge
      const pulseDetails: EdgePulseDetail[] = [{
        sortedKey: 'A-B',
        sourceId: 'A',
        targetId: 'B',
        edgeIndex: 0,
        pulseProgressRelativeToEdge: 0.5,
        reversed: false,
      }];

      updateEdgePulseIntensitiesSmooth(
        pulseIntensityAttribute,
        progressAttribute,
        segmentMapping,
        pulseDetails,
        0.4 // pulse width
      );

      const array = pulseIntensityAttribute.array as Float32Array;
      const progressArray = progressAttribute.array as Float32Array;

      // Find a vertex near the pulse front (progress ~0.5)
      let maxIntensity = 0;
      for (let i = 0; i < array.length; i++) {
        if (array[i]! > maxIntensity) {
          maxIntensity = array[i]!;
        }
      }

      // Maximum intensity should be near 1.0 at the pulse front
      expect(maxIntensity).toBeGreaterThan(0.8);
    });

    it('should have smooth falloff from pulse front', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { geometry, pulseIntensityAttribute, segmentMapping } = createEdgeGeometry(edges);
      const progressAttribute = geometry.getAttribute('aProgress') as THREE.BufferAttribute;

      // Simulate pulse at the start of the edge
      const pulseDetails: EdgePulseDetail[] = [{
        sortedKey: 'A-B',
        sourceId: 'A',
        targetId: 'B',
        edgeIndex: 0,
        pulseProgressRelativeToEdge: 0.0,
        reversed: false,
      }];

      updateEdgePulseIntensitiesSmooth(
        pulseIntensityAttribute,
        progressAttribute,
        segmentMapping,
        pulseDetails,
        0.4
      );

      const array = pulseIntensityAttribute.array as Float32Array;
      const progressArray = progressAttribute.array as Float32Array;

      // Vertices at progress 0 should have high intensity
      // Vertices at progress > 0.4 should have zero intensity
      for (let i = 0; i < array.length; i++) {
        const progress = progressArray[i]!;
        const intensity = array[i]!;

        if (progress <= 0.1) {
          // Near the pulse front - should have intensity
          expect(intensity).toBeGreaterThan(0.5);
        } else if (progress > 0.5) {
          // Far from pulse front - should be zero or near zero
          expect(intensity).toBeLessThan(0.1);
        }
      }
    });

    it('should reset all intensities to zero when no pulse details', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourceId: 'A',
        targetId: 'B',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const { geometry, pulseIntensityAttribute, segmentMapping } = createEdgeGeometry(edges);
      const progressAttribute = geometry.getAttribute('aProgress') as THREE.BufferAttribute;

      // First, set some intensities
      const pulseDetails: EdgePulseDetail[] = [{
        sortedKey: 'A-B',
        sourceId: 'A',
        targetId: 'B',
        edgeIndex: 0,
        pulseProgressRelativeToEdge: 0.5,
        reversed: false,
      }];
      updateEdgePulseIntensitiesSmooth(
        pulseIntensityAttribute,
        progressAttribute,
        segmentMapping,
        pulseDetails,
        0.4
      );

      // Then clear with empty pulse details
      updateEdgePulseIntensitiesSmooth(
        pulseIntensityAttribute,
        progressAttribute,
        segmentMapping,
        [],
        0.4
      );

      const array = pulseIntensityAttribute.array as Float32Array;
      for (let i = 0; i < array.length; i++) {
        expect(array[i]).toBe(0);
      }
    });

    it('should handle multiple edges with pulse on one', () => {
      const edges: EdgeData[] = [
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
        {
          id: 'edge-2',
          sourceId: 'B',
          targetId: 'C',
          sourcePosition: new THREE.Vector3(10, 0, 0),
          targetPosition: new THREE.Vector3(20, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
      ];
      const { geometry, pulseIntensityAttribute, segmentMapping } = createEdgeGeometry(edges);
      const progressAttribute = geometry.getAttribute('aProgress') as THREE.BufferAttribute;

      // Pulse only on edge A-B
      const pulseDetails: EdgePulseDetail[] = [{
        sortedKey: 'A-B',
        sourceId: 'A',
        targetId: 'B',
        edgeIndex: 0,
        pulseProgressRelativeToEdge: 0.5,
        reversed: false,
      }];

      updateEdgePulseIntensitiesSmooth(
        pulseIntensityAttribute,
        progressAttribute,
        segmentMapping,
        pulseDetails,
        0.4
      );

      const array = pulseIntensityAttribute.array as Float32Array;
      const mapping1 = segmentMapping[0]!;
      const mapping2 = segmentMapping[1]!;

      // Check that edge A-B has some non-zero intensities
      let hasNonZero = false;
      for (let i = 0; i < mapping1.vertexCount; i++) {
        if (array[mapping1.startIndex + i]! > 0) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);

      // Check that edge B-C has all zeros
      for (let i = 0; i < mapping2.vertexCount; i++) {
        expect(array[mapping2.startIndex + i]).toBe(0);
      }
    });
  });
});
