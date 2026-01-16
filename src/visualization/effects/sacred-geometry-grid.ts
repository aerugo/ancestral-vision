/**
 * Sacred Geometry Grid
 * Mandala-style background grid with concentric rings and radial lines
 *
 * INV-A009: Resource Disposal - Grid resources disposed on cleanup
 */
import * as THREE from 'three';

export interface SacredGeometryConfig {
  /** Number of concentric rings (default: 8) */
  ringCount?: number;
  /** Spacing between rings (default: 50) */
  ringSpacing?: number;
  /** Base segments per ring (default: 64, increases with ring index) */
  ringSegments?: number;
  /** Number of radial lines (default: 12, zodiac wheel pattern) */
  radialCount?: number;
  /** Grid color (default: sacred gold 0xd4a84b) */
  color?: THREE.Color;
  /** Grid opacity (default: 0.08) */
  opacity?: number;
  /** Y offset below origin (default: -5) */
  yOffset?: number;
}

const DEFAULT_CONFIG: Required<SacredGeometryConfig> = {
  ringCount: 8,
  ringSpacing: 50,
  ringSegments: 64,
  radialCount: 12,
  color: new THREE.Color(0xd4a84b),
  opacity: 0.08,
  yOffset: -5,
};

/**
 * Sacred geometry grid result with animation capability
 * Phase 5: Visual parity with prototype
 */
export interface SacredGeometryGridResult {
  /** The grid group mesh */
  mesh: THREE.Group;
  /** Update function for animation (call with elapsed time in seconds) */
  update: (time: number) => void;
  /** Dispose function for cleanup */
  dispose: () => void;
}

/**
 * Creates sacred geometry grid group with concentric rings and radial lines
 * @param config - Grid configuration
 * @returns Group containing ring and radial line meshes
 */
export function createSacredGeometryGrid(
  config: SacredGeometryConfig = {}
): THREE.Group {
  const {
    ringCount,
    ringSpacing,
    ringSegments,
    radialCount,
    color,
    opacity,
    yOffset,
  } = { ...DEFAULT_CONFIG, ...config };

  const group = new THREE.Group();
  group.position.y = yOffset;

  const outerRadius = ringSpacing * ringCount;
  group.userData.outerRadius = outerRadius;

  // Create concentric rings
  for (let i = 1; i <= ringCount; i++) {
    const radius = ringSpacing * i;
    const segments = ringSegments + i * 8; // More segments for outer rings (smoother)

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      positions.push(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const material = new THREE.LineBasicMaterial({
      color: color.clone(),
      opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const ring = new THREE.Line(geometry, material);
    ring.userData.type = 'ring';
    ring.userData.index = i;
    group.add(ring);
  }

  // Create radial lines (zodiac wheel pattern)
  for (let i = 0; i < radialCount; i++) {
    const angle = (i / radialCount) * Math.PI * 2;

    const geometry = new THREE.BufferGeometry();
    const positions = [
      0, 0, 0,
      Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius,
    ];

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const material = new THREE.LineBasicMaterial({
      color: color.clone(),
      opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const radial = new THREE.Line(geometry, material);
    radial.userData.type = 'radial';
    radial.userData.index = i;
    group.add(radial);
  }

  return group;
}

/**
 * Creates sacred geometry grid with animation capability
 * Phase 5: Visual parity with prototype - adds subtle rotation animation
 *
 * @param config - Grid configuration
 * @returns Grid result with mesh, update, and dispose methods
 */
export function createAnimatedSacredGeometryGrid(
  config: SacredGeometryConfig = {}
): SacredGeometryGridResult {
  const group = createSacredGeometryGrid(config);

  /**
   * Update animation - very slow rotation for ethereal effect
   * @param time - Elapsed time in seconds
   */
  function update(time: number): void {
    group.rotation.y = time * 0.02; // Very slow rotation (0.02 rad/sec)
  }

  /**
   * Dispose all resources
   */
  function dispose(): void {
    disposeSacredGeometryGrid(group);
  }

  return {
    mesh: group,
    update,
    dispose,
  };
}

/**
 * Updates sacred geometry grid animation
 * Convenience function for existing grid groups
 * @param group - Grid group to animate
 * @param time - Elapsed time in seconds
 */
export function updateSacredGeometryGrid(group: THREE.Group, time: number): void {
  group.rotation.y = time * 0.02; // Very slow rotation (0.02 rad/sec)
}

/**
 * Disposes sacred geometry grid resources (INV-A009)
 * @param group - Grid group to dispose
 */
export function disposeSacredGeometryGrid(group: THREE.Group): void {
  group.children.forEach((child) => {
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
  group.clear();
}
