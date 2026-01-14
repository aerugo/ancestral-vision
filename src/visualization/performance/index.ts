/**
 * Performance monitoring and LOD system
 */

export {
  createPerformanceMonitor,
  disposePerformanceMonitor,
  type PerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceConfig,
} from './benchmark';

export {
  createLODSystem,
  disposeLODSystem,
  type LODSystem,
  type LODConfig,
  type LODLevel,
  type LODMetrics,
  type PerformanceMode,
} from './lod';
