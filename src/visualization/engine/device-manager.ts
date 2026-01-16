/**
 * WebGPU Device Manager
 *
 * Manages access to the WebGPU device, providing:
 * - Direct GPU device access for custom pipelines
 * - Integration with Three.js WebGPURenderer
 * - Pipeline caching for performance
 * - Resource creation helpers
 */

import type { WebGPURenderer } from 'three/webgpu';

export interface DeviceManagerConfig {
  /** Required features for the adapter */
  requiredFeatures?: GPUFeatureName[];
  /** Required limits for the device */
  requiredLimits?: Record<string, number>;
}

export interface DeviceManager {
  /** The WebGPU device */
  readonly device: GPUDevice;
  /** The WebGPU adapter */
  readonly adapter: GPUAdapter;
  /** Preferred texture format for the canvas */
  readonly format: GPUTextureFormat;
  /** Whether timestamp queries are supported */
  readonly supportsTimestampQuery: boolean;

  // Resource creation
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
  createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;

  // Pipeline management (cached)
  getOrCreateRenderPipeline(
    key: string,
    factory: () => GPURenderPipelineDescriptor
  ): Promise<GPURenderPipeline>;
  getOrCreateComputePipeline(
    key: string,
    factory: () => GPUComputePipelineDescriptor
  ): Promise<GPUComputePipeline>;
  getCachedPipeline(key: string): GPURenderPipeline | GPUComputePipeline | null;

  // Cleanup
  dispose(): void;
}

/**
 * Internal implementation of DeviceManager
 */
class DeviceManagerImpl implements DeviceManager {
  private _device: GPUDevice;
  private _adapter: GPUAdapter;
  private _format: GPUTextureFormat;
  private _pipelineCache: Map<string, GPURenderPipeline | GPUComputePipeline>;
  private _pendingPipelines: Map<string, Promise<GPURenderPipeline | GPUComputePipeline>>;

  public constructor(device: GPUDevice, adapter: GPUAdapter, format: GPUTextureFormat) {
    this._device = device;
    this._adapter = adapter;
    this._format = format;
    this._pipelineCache = new Map();
    this._pendingPipelines = new Map();
  }

  public get device(): GPUDevice {
    return this._device;
  }

  public get adapter(): GPUAdapter {
    return this._adapter;
  }

  public get format(): GPUTextureFormat {
    return this._format;
  }

  public get supportsTimestampQuery(): boolean {
    return this._device.features.has('timestamp-query');
  }

  public createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
    return this._device.createBuffer(descriptor);
  }

  public createTexture(descriptor: GPUTextureDescriptor): GPUTexture {
    return this._device.createTexture(descriptor);
  }

  public createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler {
    return this._device.createSampler(descriptor);
  }

  public createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout {
    return this._device.createBindGroupLayout(descriptor);
  }

  public createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup {
    return this._device.createBindGroup(descriptor);
  }

  public createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule {
    return this._device.createShaderModule(descriptor);
  }

  public async getOrCreateRenderPipeline(
    key: string,
    factory: () => GPURenderPipelineDescriptor
  ): Promise<GPURenderPipeline> {
    // Check cache first
    const cached = this._pipelineCache.get(key);
    if (cached) {
      return cached as GPURenderPipeline;
    }

    // Check if already being created
    const pending = this._pendingPipelines.get(key);
    if (pending) {
      return pending as Promise<GPURenderPipeline>;
    }

    // Create new pipeline asynchronously
    const promise = this._device.createRenderPipelineAsync(factory());
    this._pendingPipelines.set(key, promise);

    try {
      const pipeline = await promise;
      this._pipelineCache.set(key, pipeline);
      this._pendingPipelines.delete(key);
      return pipeline;
    } catch (error) {
      this._pendingPipelines.delete(key);
      throw error;
    }
  }

  public async getOrCreateComputePipeline(
    key: string,
    factory: () => GPUComputePipelineDescriptor
  ): Promise<GPUComputePipeline> {
    // Check cache first
    const cached = this._pipelineCache.get(key);
    if (cached) {
      return cached as GPUComputePipeline;
    }

    // Check if already being created
    const pending = this._pendingPipelines.get(key);
    if (pending) {
      return pending as Promise<GPUComputePipeline>;
    }

    // Create new pipeline asynchronously
    const promise = this._device.createComputePipelineAsync(factory());
    this._pendingPipelines.set(key, promise);

    try {
      const pipeline = await promise;
      this._pipelineCache.set(key, pipeline);
      this._pendingPipelines.delete(key);
      return pipeline;
    } catch (error) {
      this._pendingPipelines.delete(key);
      throw error;
    }
  }

  public getCachedPipeline(key: string): GPURenderPipeline | GPUComputePipeline | null {
    return this._pipelineCache.get(key) ?? null;
  }

  public dispose(): void {
    this._pipelineCache.clear();
    this._pendingPipelines.clear();
    // Note: We don't destroy the device here as it may be shared with Three.js
  }
}

/**
 * Creates a DeviceManager from an existing Three.js WebGPURenderer
 *
 * This extracts the GPU device from Three.js, allowing us to create
 * custom pipelines that work alongside Three.js rendering.
 *
 * @param renderer - Three.js WebGPURenderer (must be initialized)
 * @returns DeviceManager instance
 */
export async function createDeviceManagerFromThree(
  renderer: WebGPURenderer
): Promise<DeviceManager> {
  // Access Three.js internal backend
  // Note: This accesses internal APIs and may need updates with Three.js versions
  const backend = (renderer as unknown as { backend: ThreeWebGPUBackend }).backend;

  if (!backend || !backend.device) {
    throw new Error(
      'WebGPURenderer not initialized. Call renderer.init() before creating DeviceManager.'
    );
  }

  const device = backend.device;
  const adapter = backend.adapter;
  const format = navigator.gpu.getPreferredCanvasFormat();

  return new DeviceManagerImpl(device, adapter, format);
}

/**
 * Creates a standalone DeviceManager (not linked to Three.js)
 *
 * Useful for testing or when not using Three.js.
 *
 * @param config - Optional configuration
 * @returns DeviceManager instance
 */
export async function createStandaloneDeviceManager(
  config: DeviceManagerConfig = {}
): Promise<DeviceManager> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported in this browser');
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    throw new Error('Failed to get WebGPU adapter');
  }

  const requiredFeatures: GPUFeatureName[] = config.requiredFeatures ?? [];

  // Add timestamp-query if available (optional feature)
  if (adapter.features.has('timestamp-query') && !requiredFeatures.includes('timestamp-query')) {
    requiredFeatures.push('timestamp-query');
  }

  const device = await adapter.requestDevice({
    requiredFeatures,
    requiredLimits: config.requiredLimits,
  });

  const format = navigator.gpu.getPreferredCanvasFormat();

  return new DeviceManagerImpl(device, adapter, format);
}

/**
 * Type for Three.js internal WebGPU backend
 * This is an internal API and may change between Three.js versions
 */
interface ThreeWebGPUBackend {
  device: GPUDevice;
  adapter: GPUAdapter;
  context: GPUCanvasContext;
}
