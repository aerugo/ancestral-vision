/**
 * Edge Geometry Generation
 * Creates curved Bezier paths between constellation nodes
 */
import * as THREE from 'three';

export interface EdgeData {
  /** Unique edge identifier */
  id: string;
  /** Source node position */
  sourcePosition: THREE.Vector3;
  /** Target node position */
  targetPosition: THREE.Vector3;
  /** Edge relationship type (only parent-child edges exist in the tree) */
  type: 'parent-child';
  /** Edge strength (0-1) for visual intensity */
  strength: number;
}

export interface BezierConfig {
  /** Curvature factor (0-1, default: 0.3) */
  curvature?: number;
  /** Number of curve segments (default: 30) */
  segments?: number;
}

export interface EdgeGeometryConfig {
  /** Bezier curve configuration */
  bezier?: BezierConfig;
}

const DEFAULT_BEZIER_CONFIG: Required<BezierConfig> = {
  curvature: 0.3,
  segments: 30,
};

/**
 * Creates array of points along a quadratic Bezier curve
 * @param start - Start position
 * @param end - End position
 * @param config - Curve configuration
 * @returns Array of Vector3 points along curve
 */
export function createBezierCurvePoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  config: BezierConfig = {}
): THREE.Vector3[] {
  const { curvature, segments } = { ...DEFAULT_BEZIER_CONFIG, ...config };

  // Calculate midpoint and perpendicular offset
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const distance = direction.length();

  // Get perpendicular vector for curve offset
  // For mostly horizontal edges, curve upward (Y offset)
  // For vertical edges, curve in XZ plane
  const normalizedDir = direction.clone().normalize();
  const isVertical = Math.abs(normalizedDir.y) > 0.9;

  let perpendicular: THREE.Vector3;
  if (isVertical) {
    // For vertical edges, offset in XZ plane
    perpendicular = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(1, 0, 0));
    if (perpendicular.length() < 0.001) {
      perpendicular.crossVectors(direction, new THREE.Vector3(0, 0, 1));
    }
  } else {
    // For horizontal/diagonal edges, curve upward
    perpendicular = new THREE.Vector3(0, 1, 0);
  }
  perpendicular.normalize();

  // Control point offset perpendicular to edge direction
  const controlPoint = midpoint.clone().add(
    perpendicular.multiplyScalar(distance * curvature)
  );

  // Create quadratic Bezier curve
  const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
  return curve.getPoints(segments);
}

/**
 * Creates BufferGeometry for all edges with attributes for shader.
 * Uses line segment pairs for THREE.LineSegments to prevent spurious
 * connections between separate edges.
 *
 * @param edges - Array of edge data
 * @param config - Geometry configuration
 * @returns BufferGeometry with position, progress, and strength attributes
 */
export function createEdgeGeometry(
  edges: EdgeData[],
  config: EdgeGeometryConfig = {}
): THREE.BufferGeometry {
  const bezierConfig = { ...DEFAULT_BEZIER_CONFIG, ...config.bezier };
  const geometry = new THREE.BufferGeometry();

  if (edges.length === 0) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute([], 1));
    geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute([], 1));
    return geometry;
  }

  const positions: number[] = [];
  const progressValues: number[] = [];
  const strengthValues: number[] = [];

  for (const edge of edges) {
    const points = createBezierCurvePoints(
      edge.sourcePosition,
      edge.targetPosition,
      bezierConfig
    );

    // Create line segment pairs for LineSegments rendering
    // Each segment needs start and end points
    for (let i = 0; i < points.length - 1; i++) {
      const startPoint = points[i];
      const endPoint = points[i + 1];
      if (startPoint && endPoint) {
        // Segment start
        positions.push(startPoint.x, startPoint.y, startPoint.z);
        const startProgress = i / (points.length - 1);
        progressValues.push(startProgress);
        strengthValues.push(edge.strength);

        // Segment end
        positions.push(endPoint.x, endPoint.y, endPoint.z);
        const endProgress = (i + 1) / (points.length - 1);
        progressValues.push(endProgress);
        strengthValues.push(edge.strength);
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progressValues, 1));
  geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute(strengthValues, 1));

  return geometry;
}

/**
 * Disposes edge geometry resources (INV-A009)
 * @param geometry - Geometry to dispose
 */
export function disposeEdgeGeometry(geometry: THREE.BufferGeometry): void {
  geometry.dispose();
}
