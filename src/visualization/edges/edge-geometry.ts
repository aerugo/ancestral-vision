/**
 * Edge Geometry Generation
 * Creates curved Bezier paths between constellation nodes
 */
import * as THREE from 'three';

export interface EdgeData {
  /** Unique edge identifier */
  id: string;
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Source node position */
  sourcePosition: THREE.Vector3;
  /** Target node position */
  targetPosition: THREE.Vector3;
  /** Edge relationship type (only parent-child edges exist in the tree) */
  type: 'parent-child';
  /** Edge strength (0-1) for visual intensity */
  strength: number;
}

/**
 * Mapping from edge to vertex indices in the geometry buffer
 * Used for updating pulse intensity per-edge
 */
export interface EdgeSegmentMapping {
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Sorted key for consistent lookup (e.g., "A-B") */
  sortedKey: string;
  /** Start index in the vertex buffer */
  startIndex: number;
  /** Number of vertices for this edge */
  vertexCount: number;
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
 * Result from createEdgeGeometry including segment mapping for pulse updates
 */
export interface EdgeGeometryResult {
  /** The BufferGeometry for rendering */
  geometry: THREE.BufferGeometry;
  /** Mapping from edge to vertex indices */
  segmentMapping: EdgeSegmentMapping[];
  /** Reference to the pulse intensity attribute for updates */
  pulseIntensityAttribute: THREE.BufferAttribute;
}

/**
 * Creates BufferGeometry for all edges with attributes for shader.
 * Uses line segment pairs for THREE.LineSegments to prevent spurious
 * connections between separate edges.
 *
 * @param edges - Array of edge data
 * @param config - Geometry configuration
 * @returns EdgeGeometryResult with geometry, segment mapping, and pulse attribute
 */
export function createEdgeGeometry(
  edges: EdgeData[],
  config: EdgeGeometryConfig = {}
): EdgeGeometryResult {
  const bezierConfig = { ...DEFAULT_BEZIER_CONFIG, ...config.bezier };
  const geometry = new THREE.BufferGeometry();
  const segmentMapping: EdgeSegmentMapping[] = [];

  if (edges.length === 0) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute([], 1));
    geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute([], 1));
    const pulseIntensityAttribute = new THREE.Float32BufferAttribute([], 1);
    geometry.setAttribute('aPulseIntensity', pulseIntensityAttribute);
    return { geometry, segmentMapping, pulseIntensityAttribute };
  }

  const positions: number[] = [];
  const progressValues: number[] = [];
  const strengthValues: number[] = [];

  for (const edge of edges) {
    const startIndex = positions.length / 3; // Track vertex start index

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

    const vertexCount = positions.length / 3 - startIndex;

    // Store segment mapping with sorted key for consistent lookup
    segmentMapping.push({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      sortedKey: [edge.sourceId, edge.targetId].sort().join('-'),
      startIndex,
      vertexCount,
    });
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progressValues, 1));
  geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute(strengthValues, 1));

  // Add pulse intensity attribute, initialized to 0
  const pulseIntensityArray = new Float32Array(positions.length / 3);
  pulseIntensityArray.fill(0);
  const pulseIntensityAttribute = new THREE.Float32BufferAttribute(pulseIntensityArray, 1);
  geometry.setAttribute('aPulseIntensity', pulseIntensityAttribute);

  return { geometry, segmentMapping, pulseIntensityAttribute };
}

/**
 * Update edge pulse intensities from animator state
 * @param attribute - The pulse intensity buffer attribute
 * @param segmentMapping - Edge to vertex mapping
 * @param intensities - Map of sorted edge key to intensity (from PathPulseAnimator)
 */
export function updateEdgePulseIntensities(
  attribute: THREE.BufferAttribute,
  segmentMapping: EdgeSegmentMapping[],
  intensities: Map<string, number>
): void {
  const array = attribute.array as Float32Array;

  // Reset all to 0
  array.fill(0);

  // Set intensities for edges in the pulse path
  for (const mapping of segmentMapping) {
    const intensity = intensities.get(mapping.sortedKey);
    if (intensity !== undefined && intensity > 0) {
      // Set intensity for all vertices of this edge
      for (let i = 0; i < mapping.vertexCount; i++) {
        array[mapping.startIndex + i] = intensity;
      }
    }
  }

  attribute.needsUpdate = true;
}

/**
 * Edge pulse detail from PathPulseAnimator.getEdgePulseDetails()
 */
export interface EdgePulseDetail {
  sortedKey: string;
  sourceId: string;
  targetId: string;
  edgeIndex: number;
  /** How far the pulse front is from this edge's start (0 = at start, 1 = at end) */
  pulseProgressRelativeToEdge: number;
  /** True if path traverses this edge in reverse direction from geometry */
  reversed: boolean;
}

/**
 * Update edge pulse intensities with smooth per-vertex falloff.
 * Creates a light orb effect that travels smoothly through edges.
 *
 * @param attribute - The pulse intensity buffer attribute
 * @param progressAttribute - The aProgress buffer attribute (0-1 along each edge)
 * @param segmentMapping - Edge to vertex mapping
 * @param pulseDetails - Detailed pulse position from PathPulseAnimator.getEdgePulseDetails()
 * @param pulseWidth - Width of the pulse glow (0-1, default: 0.4)
 */
export function updateEdgePulseIntensitiesSmooth(
  attribute: THREE.BufferAttribute,
  progressAttribute: THREE.BufferAttribute,
  segmentMapping: EdgeSegmentMapping[],
  pulseDetails: EdgePulseDetail[],
  pulseWidth: number = 0.4
): void {
  const intensityArray = attribute.array as Float32Array;
  const progressArray = progressAttribute.array as Float32Array;

  // Reset all to 0
  intensityArray.fill(0);

  // Create lookup map for pulse details by sorted key
  const detailMap = new Map<string, EdgePulseDetail>();
  for (const detail of pulseDetails) {
    detailMap.set(detail.sortedKey, detail);
  }

  // For each edge in the geometry
  for (const mapping of segmentMapping) {
    const detail = detailMap.get(mapping.sortedKey);
    if (!detail) continue;

    // Check if path direction matches geometry direction by comparing source IDs
    // Geometry has progress 0 at mapping.sourceId and 1 at mapping.targetId
    // Path has progress 0 at detail.sourceId and 1 at detail.targetId
    const isReversed = detail.sourceId !== mapping.sourceId;

    // The pulse position along this edge (can be <0 or >1 if pulse is on adjacent edge)
    // If reversed, invert the pulse position to match geometry direction
    const pulsePos = isReversed
      ? 1 - detail.pulseProgressRelativeToEdge
      : detail.pulseProgressRelativeToEdge;

    // For each vertex of this edge
    for (let i = 0; i < mapping.vertexCount; i++) {
      const vertexIndex = mapping.startIndex + i;
      // This vertex's position along the edge (0-1)
      const vertexProgress = progressArray[vertexIndex];
      if (vertexProgress === undefined) continue;

      // Distance from pulse front to this vertex
      const distance = Math.abs(pulsePos - vertexProgress);

      // Calculate intensity with smooth falloff
      // Full intensity at pulse front, fading to 0 at pulseWidth distance
      if (distance < pulseWidth) {
        // Smooth cosine falloff
        const normalizedDist = distance / pulseWidth;
        const intensity = Math.cos(normalizedDist * Math.PI * 0.5);
        intensityArray[vertexIndex] = intensity;
      }
    }
  }

  attribute.needsUpdate = true;
}

/**
 * Disposes edge geometry resources (INV-A009)
 * @param geometry - Geometry to dispose
 */
export function disposeEdgeGeometry(geometry: THREE.BufferGeometry): void {
  geometry.dispose();
}
