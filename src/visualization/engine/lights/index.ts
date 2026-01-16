/**
 * Clustered Lighting Module
 *
 * Provides scalable multi-light support through clustered deferred lighting.
 * The view frustum is subdivided into a 3D grid of clusters, and lights are
 * assigned to clusters via compute shaders for efficient access in fragment shaders.
 */

// Light Manager - handles point light storage and GPU sync
export {
  createLightManager,
  LIGHT_STRUCT_SIZE,
  DEFAULT_MAX_LIGHTS,
  type LightManager,
  type PointLight,
  type PointLightUpdate,
  type PointLightData,
  type LightManagerConfig,
  type LightBuffers,
} from './light-manager';

// Cluster Grid - manages the 3D cluster subdivision
export {
  createClusterGrid,
  TILE_COUNT_X,
  TILE_COUNT_Y,
  TILE_COUNT_Z,
  MAX_LIGHTS_PER_CLUSTER,
  CLUSTER_COUNT,
  type ClusterGrid,
  type ClusterGridConfig,
  type ClusterGridFullConfig,
  type ClusterBuffers,
  type ClusterUniformData,
} from './cluster-grid';

// Cluster Compute - dispatches compute shaders for light culling
export {
  createClusterCompute,
  type ClusterCompute,
  type ClusterComputeConfig,
} from './cluster-compute';
