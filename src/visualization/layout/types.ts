/**
 * Layout System Types
 *
 * Ported from: reference_prototypes/family-constellations/src/types/index.ts
 * These types define the data structures for the force-directed layout algorithm.
 */

/**
 * 3D vector for position and velocity
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Person data needed for layout (subset of full Person type)
 */
export interface LayoutPerson {
  id: string;
  name: string;
  biography?: string;
  generation?: number;
}

/**
 * Node in the layout graph
 * Contains position, velocity, and metadata for force simulation
 */
export interface GraphNode {
  /** Unique identifier */
  id: string;
  /** Reference to person data */
  person: LayoutPerson;
  /** Current position in 3D space */
  position: Vec3;
  /** Current velocity for force simulation */
  velocity: Vec3;
  /** Generation relative to center person (0 = center, -1 = parents, 1 = children) */
  generation: number;
  /** Weight derived from biography length (0-1), affects node size and radius */
  biographyWeight: number;
  /** IDs of connected nodes */
  connections: string[];
  /** Number of life events (for firefly rendering) */
  eventCount: number;
}

/**
 * Edge type for family relationships
 * Only parent-child edges are created - the tree structure is defined by lineage
 */
export type EdgeType = 'parent-child';

/**
 * Edge connecting two nodes in the graph
 */
export interface GraphEdge {
  /** Unique identifier */
  id: string;
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Relationship type - affects ideal distance */
  type: EdgeType;
  /** Force strength multiplier (0-1) */
  strength: number;
}

/**
 * Configuration for the force-directed layout algorithm
 */
export interface LayoutConfig {
  /** Gravity toward origin in XZ plane (default: 0.05) */
  centerForce: number;
  /** Node repulsion strength (default: 500) */
  repulsionForce: number;
  /** Edge attraction strength (default: 0.1) */
  attractionForce: number;
  /** Distance between generation rings (default: 50) */
  generationSpacing: number;
  /** Velocity damping factor (default: 0.85) - used for stability check */
  damping: number;
  /** Number of simulation iterations (default: 300) */
  iterations: number;
}

/**
 * Default layout configuration matching prototype exactly
 * From: reference_prototypes/family-constellations/src/types/index.ts
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  centerForce: 0.05,
  repulsionForce: 500,
  attractionForce: 0.1,
  generationSpacing: 50,
  damping: 0.85,
  iterations: 300,
};

/**
 * Ideal distance multiplier for parent-child edges
 */
export const EDGE_IDEAL_DISTANCE_MULTIPLIER = 1.0;

/**
 * Default strength for parent-child edges
 */
export const EDGE_STRENGTH_DEFAULTS: Record<EdgeType, number> = {
  'parent-child': 1.0,
};
