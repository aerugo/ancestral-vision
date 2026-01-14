/**
 * Event Firefly System
 * Orbital particles around nodes representing life events
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 * INV-A009: Resource Disposal - Firefly resources disposed on cleanup
 */
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import {
  uniform,
  attribute,
  vec3,
  sin,
  cos,
  mul,
  add,
  positionLocal,
} from 'three/tsl';

/**
 * Event type to color mapping
 * Colors chosen to represent the emotional significance of each event type
 */
const EVENT_COLORS: Record<string, THREE.Color> = {
  birth: new THREE.Color(0.4, 0.9, 0.6), // Green - new life
  death: new THREE.Color(0.6, 0.5, 0.8), // Purple - transition
  marriage: new THREE.Color(1.0, 0.8, 0.4), // Gold - celebration
  occupation: new THREE.Color(0.4, 0.7, 1.0), // Blue - work/purpose
  residence: new THREE.Color(0.6, 0.9, 0.9), // Cyan - home/place
  military: new THREE.Color(0.9, 0.5, 0.4), // Red-orange - service
  graduation: new THREE.Color(0.9, 0.9, 0.5), // Yellow - achievement
  default: new THREE.Color(0.8, 0.8, 0.8), // Gray - unknown
};

export interface EventFireflyConfig {
  /** Base firefly count per node (default: 5) */
  baseCount?: number;
  /** Additional fireflies per biography weight (default: 20) */
  weightMultiplier?: number;
  /** Base orbit radius (default: 6) */
  orbitRadius?: number;
  /** Point size (default: 3) */
  pointSize?: number;
}

export interface EventFireflyData {
  /** Position of each node in the constellation */
  nodePositions: THREE.Vector3[];
  /** Biography weight (0-1) for each node, affects firefly count */
  nodeBiographyWeights: number[];
  /** Event types for each node (e.g., ['birth', 'death', 'marriage']) */
  nodeEventTypes: string[][];
}

export interface EventFireflyUniforms {
  uTime: { value: number };
  uPointSize: { value: number };
}

export interface EventFireflyResult {
  mesh: THREE.Points;
  uniforms: EventFireflyUniforms;
}

const DEFAULT_CONFIG: Required<EventFireflyConfig> = {
  baseCount: 5,
  weightMultiplier: 20,
  orbitRadius: 6,
  pointSize: 3,
};

/**
 * Gets color for event type
 * @param eventType - Event type string (birth, death, marriage, etc.)
 * @returns THREE.Color for the event type
 */
export function getEventColor(eventType: string): THREE.Color {
  return EVENT_COLORS[eventType] ?? EVENT_COLORS.default!;
}

/**
 * Creates event firefly orbital particle system
 * Fireflies orbit around constellation nodes, with count based on biography weight
 * and colors based on event types
 *
 * @param data - Node positions, biography weights, and event types
 * @param config - System configuration (counts, radius, size)
 * @returns Points mesh and uniform references for animation
 */
export function createEventFireflies(
  data: EventFireflyData,
  config: EventFireflyConfig = {}
): EventFireflyResult {
  const { baseCount, weightMultiplier, orbitRadius, pointSize } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const { nodePositions, nodeBiographyWeights, nodeEventTypes } = data;

  // Calculate total firefly count across all nodes
  let totalFireflies = 0;
  const fireflyCounts: number[] = [];

  for (let i = 0; i < nodePositions.length; i++) {
    const events = nodeEventTypes[i];
    if (!events || events.length === 0) {
      fireflyCounts.push(0);
      continue;
    }

    const weight = nodeBiographyWeights[i] ?? 0;
    // Formula: baseCount + weight * weightMultiplier (e.g., 5 + 0.5 * 20 = 15)
    const count = Math.floor(baseCount + weight * weightMultiplier);
    fireflyCounts.push(count);
    totalFireflies += count;
  }

  // Create geometry arrays
  const positions = new Float32Array(totalFireflies * 3);
  const colors = new Float32Array(totalFireflies * 3);
  const orbitParams = new Float32Array(totalFireflies * 4); // radius, speed, phase, tilt
  const nodeCenters = new Float32Array(totalFireflies * 3);

  let fireflyIndex = 0;

  for (let nodeIdx = 0; nodeIdx < nodePositions.length; nodeIdx++) {
    const nodePos = nodePositions[nodeIdx];
    const events = nodeEventTypes[nodeIdx];
    const count = fireflyCounts[nodeIdx];

    if (!nodePos || !events || !count || count === 0) continue;

    for (let i = 0; i < count; i++) {
      // Initial position at node center (will be overridden by shader orbital calculation)
      positions[fireflyIndex * 3] = nodePos.x;
      positions[fireflyIndex * 3 + 1] = nodePos.y;
      positions[fireflyIndex * 3 + 2] = nodePos.z;

      // Event color - cycle through events for this node
      const eventType = events[i % events.length];
      const color = eventType ? getEventColor(eventType) : EVENT_COLORS.default!;
      colors[fireflyIndex * 3] = color.r;
      colors[fireflyIndex * 3 + 1] = color.g;
      colors[fireflyIndex * 3 + 2] = color.b;

      // Orbital parameters for shader
      const layer = i % 3; // Three orbital shells
      const radius = orbitRadius + layer * 2 + Math.random() * 2;
      const speed = 0.5 + Math.random() * 0.5;
      const phase = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * Math.PI * 0.6; // ±54 degrees tilt

      orbitParams[fireflyIndex * 4] = radius;
      orbitParams[fireflyIndex * 4 + 1] = speed;
      orbitParams[fireflyIndex * 4 + 2] = phase;
      orbitParams[fireflyIndex * 4 + 3] = tilt;

      // Node center for orbital calculation in shader
      nodeCenters[fireflyIndex * 3] = nodePos.x;
      nodeCenters[fireflyIndex * 3 + 1] = nodePos.y;
      nodeCenters[fireflyIndex * 3 + 2] = nodePos.z;

      fireflyIndex++;
    }
  }

  // Create geometry with attributes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aOrbitParams', new THREE.BufferAttribute(orbitParams, 4));
  geometry.setAttribute('aNodeCenter', new THREE.BufferAttribute(nodeCenters, 3));

  // Create uniforms
  const uTime = uniform(0);
  const uPointSize = uniform(pointSize);

  // Vertex attributes for TSL shader
  const orbitParamsAttr = attribute('aOrbitParams');
  const nodeCenterAttr = attribute('aNodeCenter');
  const vertexColor = attribute('color');

  // Extract orbital parameters
  const radius = orbitParamsAttr.x;
  const speed = orbitParamsAttr.y;
  const phase = orbitParamsAttr.z;
  const tilt = orbitParamsAttr.w;

  // Orbital position calculation
  const angle = add(mul(uTime, speed), phase);

  // Calculate orbit position in local space
  const orbitX = mul(cos(angle), radius);
  const orbitY = mul(mul(sin(mul(tilt, 2)), sin(angle)), mul(radius, 0.3)); // Tilted orbit wobble
  const orbitZ = mul(sin(angle), radius);

  // Final position: node center + orbital offset
  const orbitalOffset = vec3(orbitX, orbitY, orbitZ);
  const finalPosition = add(nodeCenterAttr, orbitalOffset);

  // Flickering effect (fast oscillation for firefly-like behavior)
  const flicker = add(mul(sin(add(mul(uTime, 8), mul(phase, 12.56))), 0.2), 0.8);

  // Create material using PointsNodeMaterial (INV-A008)
  const material = new PointsNodeMaterial();
  material.positionNode = finalPosition; // Apply orbital position
  material.colorNode = mul(vertexColor, flicker);
  material.sizeNode = mul(uPointSize, flicker);
  material.transparent = true;
  material.opacity = 0.9;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;

  // Create mesh
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false; // Fireflies may move outside initial bounds

  const uniforms: EventFireflyUniforms = {
    uTime: uTime as unknown as { value: number },
    uPointSize: uPointSize as unknown as { value: number },
  };

  return { mesh, uniforms };
}

/**
 * Updates firefly animation time
 * @param uniforms - Uniform references from createEventFireflies
 * @param time - Current time in seconds
 */
export function updateEventFirefliesTime(
  uniforms: EventFireflyUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes firefly system resources (INV-A009)
 * @param mesh - Points mesh to dispose
 */
export function disposeEventFireflies(mesh: THREE.Points): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
