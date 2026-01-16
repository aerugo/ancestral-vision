/**
 * ClusterGrid
 *
 * Manages the cluster grid for clustered lighting. Subdivides the view
 * frustum into a 3D grid of clusters for efficient light culling.
 */

/**
 * Default tile counts (8x8x12 = 768 clusters as per webgpu-metaballs)
 */
export const TILE_COUNT_X = 8;
export const TILE_COUNT_Y = 8;
export const TILE_COUNT_Z = 12;

/**
 * Maximum lights that can affect a single cluster
 */
export const MAX_LIGHTS_PER_CLUSTER = 20;

/**
 * Total cluster count (default configuration)
 */
export const CLUSTER_COUNT = TILE_COUNT_X * TILE_COUNT_Y * TILE_COUNT_Z;

/**
 * Size of cluster bounds struct (AABB: min vec3 + max vec3, aligned to 32 bytes)
 */
const CLUSTER_BOUNDS_SIZE = 32;

/**
 * Size of cluster lights struct (count u32, aligned to 16 bytes)
 */
const CLUSTER_LIGHTS_SIZE = 16;

/**
 * ClusterGrid configuration
 */
export interface ClusterGridConfig {
  tileCountX?: number;
  tileCountY?: number;
  tileCountZ?: number;
  maxLightsPerCluster?: number;
}

/**
 * Full configuration with viewport data
 */
export interface ClusterGridFullConfig {
  tileCountX: number;
  tileCountY: number;
  tileCountZ: number;
  maxLightsPerCluster: number;
  viewportWidth: number;
  viewportHeight: number;
  near: number;
  far: number;
}

/**
 * Cluster buffers
 */
export interface ClusterBuffers {
  clusterBoundsBuffer: GPUBuffer;
  clusterLightsBuffer: GPUBuffer;
  clusterIndicesBuffer: GPUBuffer;
}

/**
 * Uniform data for shaders
 */
export interface ClusterUniformData {
  tileCount: [number, number, number];
  tileSize: [number, number];
  near: number;
  far: number;
  viewportSize: [number, number];
}

/**
 * ClusterGrid interface
 */
export interface ClusterGrid {
  /** Get all cluster buffers */
  getBuffers(): ClusterBuffers;
  /** Get bind group layout descriptor */
  getBindGroupLayout(): GPUBindGroupLayoutDescriptor;
  /** Get or create bind group */
  getBindGroup(): GPUBindGroup;
  /** Get current configuration */
  getConfig(): ClusterGridFullConfig;
  /** Update viewport dimensions and camera planes */
  resize(width: number, height: number, near: number, far: number): void;
  /** Compute cluster index from screen position and depth */
  getClusterIndex(screenX: number, screenY: number, depth: number): number;
  /** Get tile size in pixels */
  getTileSize(): { x: number; y: number };
  /** Get uniform data for shaders */
  getUniformData(): ClusterUniformData;
  /** Dispose GPU resources */
  dispose(): void;
}

/**
 * Creates a new ClusterGrid
 *
 * @param device - The GPUDevice to create buffers on
 * @param config - Optional configuration
 * @returns A ClusterGrid instance
 */
export function createClusterGrid(
  device: GPUDevice,
  config: ClusterGridConfig = {}
): ClusterGrid {
  const tileCountX = config.tileCountX ?? TILE_COUNT_X;
  const tileCountY = config.tileCountY ?? TILE_COUNT_Y;
  const tileCountZ = config.tileCountZ ?? TILE_COUNT_Z;
  const maxLightsPerCluster = config.maxLightsPerCluster ?? MAX_LIGHTS_PER_CLUSTER;

  const clusterCount = tileCountX * tileCountY * tileCountZ;

  // Viewport configuration (set via resize)
  let viewportWidth = 1920;
  let viewportHeight = 1080;
  let near = 0.1;
  let far = 1000;

  // Create GPU buffers
  const clusterBoundsBuffer = device.createBuffer({
    label: 'cluster-bounds',
    size: clusterCount * CLUSTER_BOUNDS_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const clusterLightsBuffer = device.createBuffer({
    label: 'cluster-lights',
    size: clusterCount * CLUSTER_LIGHTS_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const clusterIndicesBuffer = device.createBuffer({
    label: 'cluster-indices',
    size: clusterCount * maxLightsPerCluster * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Bind group layout
  const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: 'storage' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: 'storage' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: 'storage' },
      },
    ],
  };

  let bindGroupLayout: GPUBindGroupLayout | null = null;
  let bindGroup: GPUBindGroup | null = null;
  let disposed = false;

  /**
   * Get or create bind group layout
   */
  function getLayout(): GPUBindGroupLayout {
    if (!bindGroupLayout) {
      bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    return bindGroupLayout;
  }

  return {
    getBuffers(): ClusterBuffers {
      return {
        clusterBoundsBuffer,
        clusterLightsBuffer,
        clusterIndicesBuffer,
      };
    },

    getBindGroupLayout(): GPUBindGroupLayoutDescriptor {
      return bindGroupLayoutDescriptor;
    },

    getBindGroup(): GPUBindGroup {
      if (!bindGroup) {
        bindGroup = device.createBindGroup({
          layout: getLayout(),
          entries: [
            { binding: 0, resource: { buffer: clusterBoundsBuffer } },
            { binding: 1, resource: { buffer: clusterLightsBuffer } },
            { binding: 2, resource: { buffer: clusterIndicesBuffer } },
          ],
        });
      }
      return bindGroup;
    },

    getConfig(): ClusterGridFullConfig {
      return {
        tileCountX,
        tileCountY,
        tileCountZ,
        maxLightsPerCluster,
        viewportWidth,
        viewportHeight,
        near,
        far,
      };
    },

    resize(width: number, height: number, nearPlane: number, farPlane: number): void {
      viewportWidth = width;
      viewportHeight = height;
      near = nearPlane;
      far = farPlane;

      // Invalidate bind group (may need to reconfigure)
      bindGroup = null;
    },

    getClusterIndex(screenX: number, screenY: number, depth: number): number {
      // Calculate tile position
      const tileX = Math.floor(
        (Math.max(0, Math.min(screenX, viewportWidth - 1)) / viewportWidth) * tileCountX
      );
      const tileY = Math.floor(
        (Math.max(0, Math.min(screenY, viewportHeight - 1)) / viewportHeight) * tileCountY
      );

      // Logarithmic depth slicing for better distribution
      const clampedDepth = Math.max(near, Math.min(depth, far));
      const logDepth = Math.log(clampedDepth / near) / Math.log(far / near);
      const tileZ = Math.floor(logDepth * tileCountZ);

      // Clamp and compute index
      const clampedX = Math.max(0, Math.min(tileX, tileCountX - 1));
      const clampedY = Math.max(0, Math.min(tileY, tileCountY - 1));
      const clampedZ = Math.max(0, Math.min(tileZ, tileCountZ - 1));

      return clampedX + clampedY * tileCountX + clampedZ * tileCountX * tileCountY;
    },

    getTileSize(): { x: number; y: number } {
      return {
        x: viewportWidth / tileCountX,
        y: viewportHeight / tileCountY,
      };
    },

    getUniformData(): ClusterUniformData {
      return {
        tileCount: [tileCountX, tileCountY, tileCountZ],
        tileSize: [viewportWidth / tileCountX, viewportHeight / tileCountY],
        near,
        far,
        viewportSize: [viewportWidth, viewportHeight],
      };
    },

    dispose(): void {
      if (!disposed) {
        clusterBoundsBuffer.destroy();
        clusterLightsBuffer.destroy();
        clusterIndicesBuffer.destroy();
        disposed = true;
      }
    },
  };
}
