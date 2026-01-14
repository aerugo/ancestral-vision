/**
 * Background Particle System
 * Creates atmospheric Haeckel-inspired particles in spherical shell
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 * INV-A009: Resource Disposal - Particle geometries and materials disposed on cleanup
 */
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import {
  uniform,
  attribute,
  float,
  vec3,
  sin,
  cos,
  mul,
  add,
  positionLocal,
} from 'three/tsl';

export interface BackgroundParticleConfig {
  /** Number of particles (default: 300) */
  count?: number;
  /** Inner shell radius (default: 100) */
  innerRadius?: number;
  /** Outer shell radius (default: 500) */
  outerRadius?: number;
  /** Base point size (default: 4) */
  pointSize?: number;
}

export interface BackgroundParticleUniforms {
  uTime: { value: number };
  uPointSize: { value: number };
}

export interface BackgroundParticleResult {
  mesh: THREE.Points;
  uniforms: BackgroundParticleUniforms;
}

const DEFAULT_CONFIG: Required<BackgroundParticleConfig> = {
  count: 300,
  innerRadius: 100,
  outerRadius: 500,
  pointSize: 4,
};

/**
 * Creates background particle system with organic shapes
 * @param config - Particle system configuration
 * @returns Points mesh and uniform references
 */
export function createBackgroundParticles(
  config: BackgroundParticleConfig = {}
): BackgroundParticleResult {
  const { count, innerRadius, outerRadius, pointSize } = { ...DEFAULT_CONFIG, ...config };

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // Color palette: violet, gold, rose (Klimt-inspired)
  const colorPalette = [
    new THREE.Color().setHSL(0.79, 0.6, 0.55), // Violet
    new THREE.Color().setHSL(0.12, 0.6, 0.55), // Gold
    new THREE.Color().setHSL(0.97, 0.6, 0.55), // Rose
  ];

  for (let i = 0; i < count; i++) {
    // Spherical shell distribution using spherical coordinates
    const theta = Math.random() * Math.PI * 2; // Azimuthal angle [0, 2π]
    const phi = Math.acos(2 * Math.random() - 1); // Polar angle [0, π] - uniform on sphere
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

    // Convert spherical to Cartesian
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Random phase for animation offset [0, 2π]
    phases[i] = Math.random() * Math.PI * 2;

    // Random color from palette
    const colorIndex = Math.floor(Math.random() * colorPalette.length);
    const color = colorPalette[colorIndex];
    if (color) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Create uniforms
  const uTime = uniform(0);
  const uPointSize = uniform(pointSize);

  // Vertex attributes
  const phase = attribute('aPhase');
  const vertexColor = attribute('color');

  // Animated position oscillation (subtle organic movement - Lissajous pattern)
  const oscillation = vec3(
    mul(sin(add(uTime, phase)), 2),
    mul(cos(add(mul(uTime, 0.7), mul(phase, 1.3))), 1.5),
    mul(sin(add(mul(uTime, 0.5), mul(phase, 0.7))), 2)
  );

  // Point size with distance attenuation (Haeckel radiolarian style)
  const sizeAttenuation = float(300).div(positionLocal.z.negate().add(float(1)));
  const finalSize = mul(uPointSize, sizeAttenuation);

  // Pulsing glow effect
  const glow = add(mul(sin(add(mul(uTime, 2), phase)), 0.2), 0.8);

  // Create material using PointsNodeMaterial (INV-A008)
  const material = new PointsNodeMaterial();
  material.positionNode = add(positionLocal, oscillation); // Apply Lissajous oscillation
  material.colorNode = mul(vertexColor, glow);
  material.sizeNode = finalSize;
  material.transparent = true;
  material.opacity = 0.6;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;

  // Create mesh
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false; // Particles span large area

  const uniforms: BackgroundParticleUniforms = {
    uTime: uTime as unknown as { value: number },
    uPointSize: uPointSize as unknown as { value: number },
  };

  return { mesh, uniforms };
}

/**
 * Updates particle animation time
 * @param uniforms - Uniform references from createBackgroundParticles
 * @param time - Current time in seconds
 */
export function updateBackgroundParticlesTime(
  uniforms: BackgroundParticleUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes particle system resources (INV-A009)
 * @param mesh - Points mesh to dispose
 */
export function disposeBackgroundParticles(mesh: THREE.Points): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
