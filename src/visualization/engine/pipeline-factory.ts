/**
 * PipelineFactory
 *
 * Handles async WebGPU pipeline creation with caching to avoid
 * redundant shader compilation. Supports both render and compute pipelines.
 */

/**
 * Cached pipeline entry (can be render or compute)
 */
type CachedPipeline = GPURenderPipeline | GPUComputePipeline;

/**
 * In-flight promise for concurrent request deduplication
 */
type PendingPipeline = Promise<CachedPipeline>;

/**
 * PipelineFactory interface
 */
export interface PipelineFactory {
  /** Create a render pipeline asynchronously (no caching) */
  createRenderPipelineAsync(
    descriptor: GPURenderPipelineDescriptor
  ): Promise<GPURenderPipeline>;

  /** Create a compute pipeline asynchronously (no caching) */
  createComputePipelineAsync(
    descriptor: GPUComputePipelineDescriptor
  ): Promise<GPUComputePipeline>;

  /** Get or create a cached render pipeline */
  getOrCreateRenderPipeline(
    key: string,
    descriptor: GPURenderPipelineDescriptor
  ): Promise<GPURenderPipeline>;

  /** Get or create a cached compute pipeline */
  getOrCreateComputePipeline(
    key: string,
    descriptor: GPUComputePipelineDescriptor
  ): Promise<GPUComputePipeline>;

  /** Get a cached pipeline by key (returns null if not cached) */
  getCachedPipeline(key: string): CachedPipeline | null;

  /** Check if a pipeline is cached */
  hasPipeline(key: string): boolean;

  /** Clear all cached pipelines */
  clearCache(): void;

  /** Get the number of cached pipelines */
  getCacheSize(): number;
}

/**
 * Creates a new PipelineFactory
 *
 * @param device - The GPUDevice to create pipelines on
 * @returns A PipelineFactory instance
 */
export function createPipelineFactory(device: GPUDevice): PipelineFactory {
  // Cache of completed pipelines
  const cache = new Map<string, CachedPipeline>();

  // In-flight promises for deduplicating concurrent requests
  const pending = new Map<string, PendingPipeline>();

  return {
    async createRenderPipelineAsync(
      descriptor: GPURenderPipelineDescriptor
    ): Promise<GPURenderPipeline> {
      return device.createRenderPipelineAsync(descriptor);
    },

    async createComputePipelineAsync(
      descriptor: GPUComputePipelineDescriptor
    ): Promise<GPUComputePipeline> {
      return device.createComputePipelineAsync(descriptor);
    },

    async getOrCreateRenderPipeline(
      key: string,
      descriptor: GPURenderPipelineDescriptor
    ): Promise<GPURenderPipeline> {
      // Check cache first
      const cached = cache.get(key);
      if (cached) {
        return cached as GPURenderPipeline;
      }

      // Check if there's an in-flight request
      const inflight = pending.get(key);
      if (inflight) {
        return inflight as Promise<GPURenderPipeline>;
      }

      // Create new pipeline
      const promise = device.createRenderPipelineAsync(descriptor);
      pending.set(key, promise);

      try {
        const pipeline = await promise;
        cache.set(key, pipeline);
        return pipeline;
      } finally {
        pending.delete(key);
      }
    },

    async getOrCreateComputePipeline(
      key: string,
      descriptor: GPUComputePipelineDescriptor
    ): Promise<GPUComputePipeline> {
      // Check cache first
      const cached = cache.get(key);
      if (cached) {
        return cached as GPUComputePipeline;
      }

      // Check if there's an in-flight request
      const inflight = pending.get(key);
      if (inflight) {
        return inflight as Promise<GPUComputePipeline>;
      }

      // Create new pipeline
      const promise = device.createComputePipelineAsync(descriptor);
      pending.set(key, promise);

      try {
        const pipeline = await promise;
        cache.set(key, pipeline);
        return pipeline;
      } finally {
        pending.delete(key);
      }
    },

    getCachedPipeline(key: string): CachedPipeline | null {
      return cache.get(key) ?? null;
    },

    hasPipeline(key: string): boolean {
      return cache.has(key);
    },

    clearCache(): void {
      cache.clear();
      // Note: We don't clear pending - let in-flight requests complete
    },

    getCacheSize(): number {
      return cache.size;
    },
  };
}
