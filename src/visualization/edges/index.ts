/**
 * Edge System - Manages family connection rendering
 */
import * as THREE from 'three';
import {
  createEdgeGeometry,
  disposeEdgeGeometry,
  type EdgeData,
  type EdgeGeometryConfig,
} from './edge-geometry';
import {
  createEdgeMaterial,
  updateEdgeMaterialTime,
  disposeEdgeMaterial,
  type EdgeMaterialConfig,
  type EdgeMaterialUniforms,
} from '../materials/edge-material';

export type { EdgeData, EdgeGeometryConfig } from './edge-geometry';
export type { EdgeMaterialConfig, EdgeMaterialUniforms } from '../materials/edge-material';

export interface EdgeSystemData {
  edges: EdgeData[];
}

export interface EdgeSystemConfig {
  geometry?: EdgeGeometryConfig;
  material?: EdgeMaterialConfig;
}

export interface EdgeSystemResult {
  mesh: THREE.LineSegments;
  uniforms: EdgeMaterialUniforms;
}

/**
 * Creates complete edge rendering system.
 * Uses LineSegments to prevent spurious connections between separate edges.
 *
 * @param data - Edge connection data
 * @param config - System configuration
 * @returns LineSegments mesh and uniform references
 */
export function createEdgeSystem(
  data: EdgeSystemData,
  config: EdgeSystemConfig = {}
): EdgeSystemResult {
  const geometry = createEdgeGeometry(data.edges, config.geometry);
  const { material, uniforms } = createEdgeMaterial(config.material);

  // Use LineSegments to draw disconnected line segments
  // This prevents THREE.Line from drawing spurious connections between edges
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false; // Edges span large areas

  return { mesh, uniforms };
}

/**
 * Updates edge system animation time
 * @param uniforms - Uniform references from createEdgeSystem
 * @param time - Current time in seconds
 */
export function updateEdgeSystemTime(uniforms: EdgeMaterialUniforms, time: number): void {
  updateEdgeMaterialTime(uniforms, time);
}

/**
 * Disposes edge system resources (INV-A009)
 * @param mesh - LineSegments mesh to dispose
 */
export function disposeEdgeSystem(mesh: THREE.LineSegments): void {
  disposeEdgeGeometry(mesh.geometry);
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => disposeEdgeMaterial(m));
  } else {
    disposeEdgeMaterial(mesh.material);
  }
}
