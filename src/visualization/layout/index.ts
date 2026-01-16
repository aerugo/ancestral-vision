/**
 * Layout System Exports
 *
 * Force-directed layout with golden angle distribution
 * for organic mandala-style constellation positioning.
 *
 * Ported from: reference_prototypes/family-constellations/
 */

// New layout system (ported from prototype)
export {
  ForceDirectedLayout,
  GOLDEN_ANGLE,
  BARNES_HUT_THRESHOLD,
  vec3Add,
  vec3Sub,
  vec3Scale,
  vec3Length,
  vec3Normalize,
} from './force-directed-layout';

export { BarnesHutTree } from './barnes-hut';

export {
  FamilyGraph,
  calculateBiographyWeight,
  type PersonInput,
  type ParentChildInput,
} from './family-graph';

export {
  type Vec3,
  type GraphNode,
  type GraphEdge,
  type EdgeType,
  type LayoutPerson,
  type LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  EDGE_IDEAL_DISTANCE_MULTIPLIER,
  EDGE_STRENGTH_DEFAULTS,
} from './types';

