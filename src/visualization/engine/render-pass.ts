/**
 * RenderPassManager
 *
 * Manages custom WebGPU render passes that can run alongside Three.js.
 * Provides priority-based execution, pass configuration, and draw call batching.
 */

/**
 * Configuration for a single draw call within a render pass
 */
export interface DrawCall {
  /** Number of vertices to draw (for non-indexed draws) */
  vertexCount?: number;
  /** Number of indices to draw (for indexed draws) */
  indexCount?: number;
  /** Number of instances to draw */
  instanceCount?: number;
  /** First vertex to draw */
  firstVertex?: number;
  /** First index to draw */
  firstIndex?: number;
  /** Base vertex offset for indexed draws */
  baseVertex?: number;
  /** First instance to draw */
  firstInstance?: number;
  /** Vertex buffer for this draw call */
  vertexBuffer?: GPUBuffer;
  /** Index buffer for indexed draws */
  indexBuffer?: GPUBuffer;
  /** Index format for indexed draws */
  indexFormat?: GPUIndexFormat;
}

/**
 * Configuration for a render pass
 */
export interface RenderPassConfig {
  /** Color attachments for the render pass */
  colorAttachments: GPURenderPassColorAttachment[];
  /** Optional depth/stencil attachment */
  depthAttachment?: GPURenderPassDepthStencilAttachment;
  /** The render pipeline to use */
  pipeline: GPURenderPipeline;
  /** Bind groups to set (in order, index 0, 1, 2...) */
  bindGroups: GPUBindGroup[];
  /** Draw calls to execute */
  drawCalls: DrawCall[];
  /** Execution priority (lower = earlier, default: 0) */
  priority?: number;
  /** Whether the pass is enabled (default: true) */
  enabled?: boolean;
  /** Callback executed when the pass runs */
  onExecute?: () => void;
}

/**
 * Internal representation of a pass with name
 */
interface NamedPass {
  name: string;
  config: RenderPassConfig;
}

/**
 * RenderPassManager interface
 */
export interface RenderPassManager {
  /** Add a named render pass */
  addPass(name: string, config: RenderPassConfig): void;
  /** Remove a render pass by name */
  removePass(name: string): void;
  /** Check if a pass exists */
  hasPass(name: string): boolean;
  /** Get a pass configuration */
  getPass(name: string): RenderPassConfig | undefined;
  /** Get all pass names in execution order */
  getPassNames(): string[];
  /** Update an existing pass configuration */
  updatePass(name: string, updates: Partial<RenderPassConfig>): void;
  /** Execute all enabled passes on a command encoder */
  execute(encoder: GPUCommandEncoder): void;
  /** Remove all passes */
  clear(): void;
}

/**
 * Creates a new RenderPassManager
 *
 * @returns A RenderPassManager instance for managing render passes
 */
export function createRenderPassManager(): RenderPassManager {
  const passes = new Map<string, RenderPassConfig>();

  /**
   * Get passes sorted by priority (lower priority number = executed first)
   */
  function getSortedPasses(): NamedPass[] {
    return Array.from(passes.entries())
      .map(([name, config]) => ({ name, config }))
      .sort((a, b) => (a.config.priority ?? 0) - (b.config.priority ?? 0));
  }

  /**
   * Execute a single draw call
   */
  function executeDrawCall(passEncoder: GPURenderPassEncoder, drawCall: DrawCall): void {
    // Set vertex buffer if provided
    if (drawCall.vertexBuffer) {
      passEncoder.setVertexBuffer(0, drawCall.vertexBuffer);
    }

    // Indexed draw
    if (drawCall.indexBuffer && drawCall.indexCount !== undefined) {
      passEncoder.setIndexBuffer(
        drawCall.indexBuffer,
        drawCall.indexFormat ?? 'uint16'
      );
      passEncoder.drawIndexed(
        drawCall.indexCount,
        drawCall.instanceCount ?? 1,
        drawCall.firstIndex ?? 0,
        drawCall.baseVertex ?? 0,
        drawCall.firstInstance ?? 0
      );
    }
    // Non-indexed draw
    else if (drawCall.vertexCount !== undefined) {
      passEncoder.draw(
        drawCall.vertexCount,
        drawCall.instanceCount ?? 1,
        drawCall.firstVertex ?? 0,
        drawCall.firstInstance ?? 0
      );
    }
  }

  /**
   * Execute a single render pass
   */
  function executePass(
    encoder: GPUCommandEncoder,
    config: RenderPassConfig
  ): void {
    // Build render pass descriptor
    const descriptor: GPURenderPassDescriptor = {
      colorAttachments: config.colorAttachments,
    };

    if (config.depthAttachment) {
      descriptor.depthStencilAttachment = config.depthAttachment;
    }

    // Begin render pass
    const passEncoder = encoder.beginRenderPass(descriptor);

    // Set pipeline
    passEncoder.setPipeline(config.pipeline);

    // Set bind groups
    config.bindGroups.forEach((bindGroup, index) => {
      passEncoder.setBindGroup(index, bindGroup);
    });

    // Execute draw calls
    for (const drawCall of config.drawCalls) {
      executeDrawCall(passEncoder, drawCall);
    }

    // End pass
    passEncoder.end();

    // Call execution callback if provided
    config.onExecute?.();
  }

  return {
    addPass(name: string, config: RenderPassConfig): void {
      if (passes.has(name)) {
        throw new Error(`Pass "${name}" already exists`);
      }
      passes.set(name, { ...config, enabled: config.enabled ?? true });
    },

    removePass(name: string): void {
      passes.delete(name);
    },

    hasPass(name: string): boolean {
      return passes.has(name);
    },

    getPass(name: string): RenderPassConfig | undefined {
      return passes.get(name);
    },

    getPassNames(): string[] {
      return getSortedPasses().map((p) => p.name);
    },

    updatePass(name: string, updates: Partial<RenderPassConfig>): void {
      const existing = passes.get(name);
      if (!existing) {
        throw new Error(`Pass "${name}" does not exist`);
      }
      passes.set(name, { ...existing, ...updates });
    },

    execute(encoder: GPUCommandEncoder): void {
      const sorted = getSortedPasses();

      for (const { config } of sorted) {
        // Skip disabled passes
        if (config.enabled === false) {
          continue;
        }

        executePass(encoder, config);
      }
    },

    clear(): void {
      passes.clear();
    },
  };
}
