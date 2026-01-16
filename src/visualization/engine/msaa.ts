/**
 * MSAA Manager
 *
 * Manages multi-sample anti-aliasing textures for WebGPU rendering.
 * Handles texture creation, resizing, and cleanup.
 */

/**
 * Common MSAA sample counts supported by WebGPU
 */
export const SAMPLE_COUNTS = [1, 4] as const;

export type SampleCount = (typeof SAMPLE_COUNTS)[number];

/**
 * Configuration for creating an MSAA texture
 */
export interface MSAAConfig {
  /** Width of the texture in pixels */
  width: number;
  /** Height of the texture in pixels */
  height: number;
  /** Number of samples (default: 4) */
  sampleCount?: SampleCount;
  /** Texture format */
  format: GPUTextureFormat;
}

/**
 * MSAAManager interface
 */
export interface MSAAManager {
  /** Create a new MSAA texture */
  createTexture(config: MSAAConfig): void;
  /** Resize the existing MSAA texture */
  resize(width: number, height: number): void;
  /** Get the current MSAA texture */
  getTexture(): GPUTexture | null;
  /** Get a view of the MSAA texture */
  getTextureView(): GPUTextureView | null;
  /** Get the current sample count */
  getSampleCount(): SampleCount;
  /** Get the current configuration */
  getConfig(): MSAAConfig | null;
  /** Dispose of the MSAA texture */
  dispose(): void;
}

/**
 * Creates a new MSAAManager
 *
 * @param device - The GPUDevice to create textures on
 * @returns An MSAAManager instance
 */
export function createMSAAManager(device: GPUDevice): MSAAManager {
  let texture: GPUTexture | null = null;
  let textureView: GPUTextureView | null = null;
  let currentConfig: MSAAConfig | null = null;

  /**
   * Internal function to create the texture
   */
  function createTextureInternal(config: MSAAConfig): void {
    // Dispose old texture if exists
    if (texture) {
      texture.destroy();
      texture = null;
      textureView = null;
    }

    const sampleCount = config.sampleCount ?? 4;

    texture = device.createTexture({
      size: [config.width, config.height],
      format: config.format,
      sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    currentConfig = {
      ...config,
      sampleCount,
    };

    // Invalidate cached view
    textureView = null;
  }

  return {
    createTexture(config: MSAAConfig): void {
      createTextureInternal(config);
    },

    resize(width: number, height: number): void {
      if (!currentConfig) {
        throw new Error('No MSAA texture exists. Call createTexture first.');
      }

      createTextureInternal({
        ...currentConfig,
        width,
        height,
      });
    },

    getTexture(): GPUTexture | null {
      return texture;
    },

    getTextureView(): GPUTextureView | null {
      if (!texture) {
        return null;
      }

      // Cache the view
      if (!textureView) {
        textureView = texture.createView();
      }

      return textureView;
    },

    getSampleCount(): SampleCount {
      return currentConfig?.sampleCount ?? 1;
    },

    getConfig(): MSAAConfig | null {
      return currentConfig ? { ...currentConfig } : null;
    },

    dispose(): void {
      if (texture) {
        texture.destroy();
        texture = null;
        textureView = null;
        currentConfig = null;
      }
    },
  };
}
