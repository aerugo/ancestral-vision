/**
 * ClusterCompute
 *
 * Manages compute shader pipelines for clustered lighting:
 * 1. Cluster bounds calculation - computes AABB for each cluster in view space
 * 2. Light assignment - assigns lights to clusters based on intersection
 */
import type { LightManager } from './light-manager';
import type { ClusterGrid } from './cluster-grid';

/**
 * WGSL shader for computing cluster bounds in view space
 */
const CLUSTER_BOUNDS_SHADER = `
struct CameraUniforms {
  projectionMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  inverseProjection: mat4x4<f32>,
  position: vec3<f32>,
  _pad0: f32,
  near: f32,
  far: f32,
  time: f32,
  _pad1: f32,
}

struct ClusterBounds {
  minPoint: vec4<f32>,
  maxPoint: vec4<f32>,
}

struct ClusterConfig {
  tileCount: vec3<u32>,
  _pad0: u32,
  viewportSize: vec2<f32>,
  near: f32,
  far: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> config: ClusterConfig;
@group(1) @binding(0) var<storage, read_write> clusterBounds: array<ClusterBounds>;

fn screenToView(screenPos: vec2<f32>, depth: f32) -> vec3<f32> {
  let ndc = vec4<f32>(
    (screenPos.x / config.viewportSize.x) * 2.0 - 1.0,
    1.0 - (screenPos.y / config.viewportSize.y) * 2.0,
    depth,
    1.0
  );
  let viewPos = camera.inverseProjection * ndc;
  return viewPos.xyz / viewPos.w;
}

fn getDepthSlice(slice: u32) -> f32 {
  // Logarithmic depth distribution
  let nearLog = log(config.near);
  let farLog = log(config.far);
  let t = f32(slice) / f32(config.tileCount.z);
  return exp(nearLog + t * (farLog - nearLog));
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let tileIndex = globalId.x + globalId.y * config.tileCount.x +
                  globalId.z * config.tileCount.x * config.tileCount.y;

  if (globalId.x >= config.tileCount.x ||
      globalId.y >= config.tileCount.y ||
      globalId.z >= config.tileCount.z) {
    return;
  }

  let tileSize = config.viewportSize / vec2<f32>(config.tileCount.xy);

  let tileMin = vec2<f32>(globalId.xy) * tileSize;
  let tileMax = tileMin + tileSize;

  let zNear = getDepthSlice(globalId.z);
  let zFar = getDepthSlice(globalId.z + 1u);

  // Convert corners to view space
  let minNear = screenToView(tileMin, zNear);
  let maxNear = screenToView(tileMax, zNear);
  let minFar = screenToView(tileMin, zFar);
  let maxFar = screenToView(tileMax, zFar);

  // Compute AABB in view space
  var minPoint = min(min(minNear, maxNear), min(minFar, maxFar));
  var maxPoint = max(max(minNear, maxNear), max(minFar, maxFar));

  clusterBounds[tileIndex].minPoint = vec4<f32>(minPoint, 0.0);
  clusterBounds[tileIndex].maxPoint = vec4<f32>(maxPoint, 0.0);
}
`;

/**
 * WGSL shader for assigning lights to clusters
 */
const LIGHT_ASSIGNMENT_SHADER = `
struct PointLight {
  position: vec4<f32>,
  colorIntensity: vec4<f32>,
  rangeData: vec4<f32>,
}

struct ClusterBounds {
  minPoint: vec4<f32>,
  maxPoint: vec4<f32>,
}

struct ClusterLightData {
  count: atomic<u32>,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

struct CameraUniforms {
  projectionMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  inverseProjection: mat4x4<f32>,
  position: vec3<f32>,
  _pad0: f32,
  near: f32,
  far: f32,
  time: f32,
  _pad1: f32,
}

struct LightCount {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

struct ClusterConfig {
  tileCount: vec3<u32>,
  maxLightsPerCluster: u32,
  viewportSize: vec2<f32>,
  near: f32,
  far: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> lightCount: LightCount;
@group(0) @binding(2) var<storage, read> lights: array<PointLight>;
@group(1) @binding(0) var<storage, read> clusterBounds: array<ClusterBounds>;
@group(1) @binding(1) var<storage, read_write> clusterLights: array<ClusterLightData>;
@group(1) @binding(2) var<storage, read_write> clusterIndices: array<u32>;
@group(2) @binding(0) var<uniform> config: ClusterConfig;

fn sphereAABBIntersect(center: vec3<f32>, radius: f32, aabbMin: vec3<f32>, aabbMax: vec3<f32>) -> bool {
  let closest = clamp(center, aabbMin, aabbMax);
  let dist = distance(center, closest);
  return dist <= radius;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let lightIndex = globalId.x;
  if (lightIndex >= lightCount.count) {
    return;
  }

  let light = lights[lightIndex];
  let lightPosWorld = light.position.xyz;
  let lightRange = light.rangeData.x;

  // Transform to view space
  let lightPosView = (camera.viewMatrix * vec4<f32>(lightPosWorld, 1.0)).xyz;

  let clusterCount = config.tileCount.x * config.tileCount.y * config.tileCount.z;

  // Check each cluster for intersection
  for (var i = 0u; i < clusterCount; i++) {
    let bounds = clusterBounds[i];

    if (sphereAABBIntersect(lightPosView, lightRange, bounds.minPoint.xyz, bounds.maxPoint.xyz)) {
      let offset = atomicAdd(&clusterLights[i].count, 1u);
      if (offset < config.maxLightsPerCluster) {
        clusterIndices[i * config.maxLightsPerCluster + offset] = lightIndex;
      }
    }
  }
}
`;

/**
 * ClusterCompute configuration
 */
export interface ClusterComputeConfig {
  boundsWorkgroupSize?: [number, number, number];
  assignmentWorkgroupSize?: number;
}

/**
 * ClusterCompute interface
 */
export interface ClusterCompute {
  /** Initialize compute pipelines (async) */
  initialize(): Promise<void>;
  /** Check if initialized */
  isInitialized(): boolean;
  /** Update cluster bounds */
  updateBounds(encoder: GPUCommandEncoder): void;
  /** Assign lights to clusters */
  assignLights(encoder: GPUCommandEncoder): void;
  /** Execute both passes */
  execute(encoder: GPUCommandEncoder, cameraBindGroup?: GPUBindGroup): void;
  /** Set camera uniform buffer */
  setCameraBuffer(buffer: GPUBuffer): void;
  /** Get shader code */
  getShaderCode(type: 'bounds' | 'assignment'): string;
  /** Dispose resources */
  dispose(): void;
}

/**
 * Creates a new ClusterCompute
 */
export function createClusterCompute(
  device: GPUDevice,
  lightManager: LightManager,
  clusterGrid: ClusterGrid,
  config: ClusterComputeConfig = {}
): ClusterCompute {
  const boundsWorkgroupSize = config.boundsWorkgroupSize ?? [4, 4, 4];
  const assignmentWorkgroupSize = config.assignmentWorkgroupSize ?? 64;

  // Create shader modules
  const boundsShaderModule = device.createShaderModule({
    label: 'cluster-bounds-shader',
    code: CLUSTER_BOUNDS_SHADER,
  });

  const assignmentShaderModule = device.createShaderModule({
    label: 'light-assignment-shader',
    code: LIGHT_ASSIGNMENT_SHADER,
  });

  let boundsPipeline: GPUComputePipeline | null = null;
  let assignmentPipeline: GPUComputePipeline | null = null;
  let boundsBindGroup: GPUBindGroup | null = null;
  let assignmentBindGroup: GPUBindGroup | null = null;
  let configBindGroup: GPUBindGroup | null = null;
  let cameraBuffer: GPUBuffer | null = null;
  let configBuffer: GPUBuffer | null = null;
  let initialized = false;

  /**
   * Create config uniform buffer
   */
  function createConfigBuffer(): GPUBuffer {
    const gridConfig = clusterGrid.getConfig();
    const buffer = device.createBuffer({
      size: 32, // 8 u32/f32 values
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const data = new ArrayBuffer(32);
    const u32View = new Uint32Array(data);
    const f32View = new Float32Array(data);

    u32View[0] = gridConfig.tileCountX;
    u32View[1] = gridConfig.tileCountY;
    u32View[2] = gridConfig.tileCountZ;
    u32View[3] = gridConfig.maxLightsPerCluster;
    f32View[4] = gridConfig.viewportWidth;
    f32View[5] = gridConfig.viewportHeight;
    f32View[6] = gridConfig.near;
    f32View[7] = gridConfig.far;

    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  /**
   * Create bind groups
   */
  function createBindGroups(): void {
    if (!boundsPipeline || !assignmentPipeline) return;

    const lightBuffers = lightManager.getBuffers();
    const clusterBuffers = clusterGrid.getBuffers();

    // Create config buffer if needed
    if (!configBuffer) {
      configBuffer = createConfigBuffer();
    }

    // Bounds pass bind groups
    if (cameraBuffer) {
      boundsBindGroup = device.createBindGroup({
        layout: boundsPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: cameraBuffer } },
          { binding: 1, resource: { buffer: configBuffer } },
        ],
      });
    }

    // Assignment pass bind groups
    if (cameraBuffer) {
      assignmentBindGroup = device.createBindGroup({
        layout: assignmentPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: cameraBuffer } },
          { binding: 1, resource: { buffer: lightBuffers.lightCountBuffer } },
          { binding: 2, resource: { buffer: lightBuffers.lightsBuffer } },
        ],
      });
    }

    configBindGroup = device.createBindGroup({
      layout: assignmentPipeline.getBindGroupLayout(2),
      entries: [{ binding: 0, resource: { buffer: configBuffer } }],
    });
  }

  return {
    async initialize(): Promise<void> {
      if (initialized) return;

      // Create compute pipelines
      boundsPipeline = await device.createComputePipelineAsync({
        label: 'cluster-bounds-pipeline',
        layout: 'auto',
        compute: {
          module: boundsShaderModule,
          entryPoint: 'main',
        },
      });

      assignmentPipeline = await device.createComputePipelineAsync({
        label: 'light-assignment-pipeline',
        layout: 'auto',
        compute: {
          module: assignmentShaderModule,
          entryPoint: 'main',
        },
      });

      createBindGroups();
      initialized = true;
    },

    isInitialized(): boolean {
      return initialized;
    },

    updateBounds(encoder: GPUCommandEncoder): void {
      if (!initialized || !boundsPipeline) {
        throw new Error('ClusterCompute not initialized');
      }

      const gridConfig = clusterGrid.getConfig();
      const clusterBuffers = clusterGrid.getBuffers();

      const pass = encoder.beginComputePass({ label: 'cluster-bounds-pass' });
      pass.setPipeline(boundsPipeline);

      if (boundsBindGroup) {
        pass.setBindGroup(0, boundsBindGroup);
      }

      // Cluster buffers bind group
      const clusterBindGroup = device.createBindGroup({
        layout: boundsPipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: { buffer: clusterBuffers.clusterBoundsBuffer } },
        ],
      });
      pass.setBindGroup(1, clusterBindGroup);

      // Dispatch workgroups
      const dispatchX = Math.ceil(gridConfig.tileCountX / boundsWorkgroupSize[0]);
      const dispatchY = Math.ceil(gridConfig.tileCountY / boundsWorkgroupSize[1]);
      const dispatchZ = Math.ceil(gridConfig.tileCountZ / boundsWorkgroupSize[2]);
      pass.dispatchWorkgroups(dispatchX, dispatchY, dispatchZ);

      pass.end();
    },

    assignLights(encoder: GPUCommandEncoder): void {
      if (!initialized || !assignmentPipeline) {
        throw new Error('ClusterCompute not initialized');
      }

      const lightCount = lightManager.getLightCount();
      const clusterBuffers = clusterGrid.getBuffers();

      const pass = encoder.beginComputePass({ label: 'light-assignment-pass' });
      pass.setPipeline(assignmentPipeline);

      if (assignmentBindGroup) {
        pass.setBindGroup(0, assignmentBindGroup);
      }

      // Cluster buffers bind group
      const clusterBindGroup = device.createBindGroup({
        layout: assignmentPipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: { buffer: clusterBuffers.clusterBoundsBuffer } },
          { binding: 1, resource: { buffer: clusterBuffers.clusterLightsBuffer } },
          { binding: 2, resource: { buffer: clusterBuffers.clusterIndicesBuffer } },
        ],
      });
      pass.setBindGroup(1, clusterBindGroup);

      if (configBindGroup) {
        pass.setBindGroup(2, configBindGroup);
      }

      // Dispatch workgroups for lights
      if (lightCount > 0) {
        const dispatchX = Math.ceil(lightCount / assignmentWorkgroupSize);
        pass.dispatchWorkgroups(dispatchX);
      }

      pass.end();
    },

    execute(encoder: GPUCommandEncoder, _cameraBindGroup?: GPUBindGroup): void {
      if (!initialized) {
        throw new Error('ClusterCompute not initialized');
      }

      this.updateBounds(encoder);
      this.assignLights(encoder);
    },

    setCameraBuffer(buffer: GPUBuffer): void {
      cameraBuffer = buffer;
      if (initialized) {
        createBindGroups();
      }
    },

    getShaderCode(type: 'bounds' | 'assignment'): string {
      return type === 'bounds' ? CLUSTER_BOUNDS_SHADER : LIGHT_ASSIGNMENT_SHADER;
    },

    dispose(): void {
      configBuffer?.destroy();
      configBuffer = null;
      boundsPipeline = null;
      assignmentPipeline = null;
      boundsBindGroup = null;
      assignmentBindGroup = null;
      configBindGroup = null;
      initialized = false;
    },
  };
}
