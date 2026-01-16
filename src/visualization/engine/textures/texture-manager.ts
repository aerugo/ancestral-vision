/**
 * TextureManager
 *
 * Manages texture loading, caching, and procedural generation for WebGPU.
 * Provides utilities for loading images, creating noise textures, and
 * managing samplers.
 */

/**
 * Default sampler configuration for textures
 */
export const DEFAULT_SAMPLER_CONFIG: GPUSamplerDescriptor = {
  magFilter: 'linear',
  minFilter: 'linear',
  mipmapFilter: 'linear',
  addressModeU: 'repeat',
  addressModeV: 'repeat',
  addressModeW: 'repeat',
};

/**
 * Configuration for texture creation
 */
export interface TextureConfig {
  /** Texture format (default: rgba8unorm) */
  format?: GPUTextureFormat;
  /** Number of mip levels (default: 1) */
  mipLevels?: number;
  /** Texture usage flags */
  usage?: GPUTextureUsageFlags;
  /** Force reload even if cached */
  forceReload?: boolean;
}

/**
 * Configuration for noise texture generation
 */
export interface NoiseConfig {
  /** Seed for reproducible noise */
  seed?: number;
  /** Number of octaves for FBM */
  octaves?: number;
  /** Persistence for FBM (amplitude decay) */
  persistence?: number;
  /** Lacunarity for FBM (frequency increase) */
  lacunarity?: number;
}

/**
 * Gradient color stop
 */
export interface GradientStop {
  /** Position along gradient (0-1) */
  position: number;
  /** RGBA color values (0-1) */
  color: [number, number, number, number];
}

/**
 * Cached texture data
 */
interface CachedTexture {
  texture: GPUTexture;
  view: GPUTextureView;
}

/**
 * TextureManager interface
 */
export interface TextureManager {
  /** Load texture from URL */
  loadTexture(name: string, url: string, config?: TextureConfig): Promise<GPUTexture>;
  /** Get cached texture by name */
  getTexture(name: string): GPUTexture | null;
  /** Check if texture exists */
  hasTexture(name: string): boolean;
  /** Get texture view */
  getTextureView(name: string): GPUTextureView | null;
  /** Get or create sampler */
  getSampler(name?: string, config?: GPUSamplerDescriptor): GPUSampler;
  /** Create procedural noise texture */
  createNoiseTexture(
    name: string,
    width: number,
    height: number,
    config?: NoiseConfig
  ): GPUTexture;
  /** Create gradient texture */
  createGradientTexture(
    name: string,
    width: number,
    stops: GradientStop[]
  ): GPUTexture;
  /** Create solid color texture */
  createSolidColorTexture(
    name: string,
    color: [number, number, number, number]
  ): GPUTexture;
  /** Remove and destroy texture */
  removeTexture(name: string): void;
  /** Get bind group entries for texture and sampler */
  getBindGroupEntries(
    textureName: string,
    textureBinding: number,
    samplerBinding: number,
    samplerName?: string
  ): GPUBindGroupEntry[];
  /** Get number of cached textures */
  getTextureCount(): number;
  /** Dispose all resources */
  dispose(): void;
}

/**
 * Simple pseudo-random number generator (seeded)
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Generate Perlin-like noise value
 */
function noise2D(x: number, y: number, random: () => number): number {
  // Simple value noise with interpolation
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Hash function for grid points
  const hash = (px: number, py: number) => {
    const n = px * 374761393 + py * 668265263;
    return ((n ^ (n >> 13)) * 1274126177) / 0x7fffffff;
  };

  // Sample corners
  const n00 = hash(xi, yi);
  const n10 = hash(xi + 1, yi);
  const n01 = hash(xi, yi + 1);
  const n11 = hash(xi + 1, yi + 1);

  // Smoothstep interpolation
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);

  // Bilinear interpolation
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;

  return nx0 * (1 - sy) + nx1 * sy;
}

/**
 * Generate FBM (Fractal Brownian Motion) noise
 */
function fbm(
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
  random: () => number
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, random);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Creates a new TextureManager
 *
 * @param device - The GPUDevice to create textures on
 * @returns A TextureManager instance
 */
export function createTextureManager(device: GPUDevice): TextureManager {
  const textures = new Map<string, CachedTexture>();
  const samplers = new Map<string, GPUSampler>();
  let disposed = false;

  /**
   * Store texture in cache
   */
  function cacheTexture(name: string, texture: GPUTexture): CachedTexture {
    const view = texture.createView();
    const cached: CachedTexture = { texture, view };
    textures.set(name, cached);
    return cached;
  }

  return {
    async loadTexture(
      name: string,
      url: string,
      config: TextureConfig = {}
    ): Promise<GPUTexture> {
      // Check cache unless force reload
      if (!config.forceReload && textures.has(name)) {
        return textures.get(name)!.texture;
      }

      // Fetch image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load texture: ${url} (${response.status})`);
      }

      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      // Determine texture parameters
      const format = config.format ?? 'rgba8unorm';
      const mipLevelCount = config.mipLevels ?? 1;
      const usage =
        config.usage ??
        GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT;

      // Create texture
      const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height],
        format,
        mipLevelCount,
        usage,
      });

      // Copy image to texture
      device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture },
        [imageBitmap.width, imageBitmap.height]
      );

      // Clean up
      imageBitmap.close();

      // Remove old texture if reloading
      if (config.forceReload && textures.has(name)) {
        textures.get(name)!.texture.destroy();
      }

      cacheTexture(name, texture);
      return texture;
    },

    getTexture(name: string): GPUTexture | null {
      return textures.get(name)?.texture ?? null;
    },

    hasTexture(name: string): boolean {
      return textures.has(name);
    },

    getTextureView(name: string): GPUTextureView | null {
      return textures.get(name)?.view ?? null;
    },

    getSampler(name = 'default', config?: GPUSamplerDescriptor): GPUSampler {
      // Return cached sampler if exists and no new config
      if (samplers.has(name) && !config) {
        return samplers.get(name)!;
      }

      // Create new sampler
      const samplerConfig = config ?? DEFAULT_SAMPLER_CONFIG;
      const sampler = device.createSampler(samplerConfig);
      samplers.set(name, sampler);
      return sampler;
    },

    createNoiseTexture(
      name: string,
      width: number,
      height: number,
      config: NoiseConfig = {}
    ): GPUTexture {
      const seed = config.seed ?? Date.now();
      const octaves = config.octaves ?? 1;
      const persistence = config.persistence ?? 0.5;
      const lacunarity = config.lacunarity ?? 2.0;

      const random = seededRandom(seed);

      // Generate noise data
      const data = new Uint8Array(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const nx = x / width * 4;
          const ny = y / height * 4;

          const value = fbm(nx, ny, octaves, persistence, lacunarity, random);
          const byte = Math.floor(value * 255);

          const idx = (y * width + x) * 4;
          data[idx + 0] = byte; // R
          data[idx + 1] = byte; // G
          data[idx + 2] = byte; // B
          data[idx + 3] = 255; // A
        }
      }

      // Create texture
      const texture = device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });

      device.queue.writeTexture(
        { texture },
        data,
        { bytesPerRow: width * 4 },
        [width, height]
      );

      cacheTexture(name, texture);
      return texture;
    },

    createGradientTexture(
      name: string,
      width: number,
      stops: GradientStop[]
    ): GPUTexture {
      // Sort stops by position
      const sortedStops = [...stops].sort((a, b) => a.position - b.position);

      // Generate gradient data (1D texture, height=1)
      const data = new Uint8Array(width * 4);

      for (let x = 0; x < width; x++) {
        const t = x / (width - 1);

        // Find surrounding stops
        let lower = sortedStops[0];
        let upper = sortedStops[sortedStops.length - 1];

        for (let i = 0; i < sortedStops.length - 1; i++) {
          if (t >= sortedStops[i].position && t <= sortedStops[i + 1].position) {
            lower = sortedStops[i];
            upper = sortedStops[i + 1];
            break;
          }
        }

        // Interpolate between stops
        const range = upper.position - lower.position;
        const localT = range > 0 ? (t - lower.position) / range : 0;

        const idx = x * 4;
        data[idx + 0] = Math.floor(
          (lower.color[0] + (upper.color[0] - lower.color[0]) * localT) * 255
        );
        data[idx + 1] = Math.floor(
          (lower.color[1] + (upper.color[1] - lower.color[1]) * localT) * 255
        );
        data[idx + 2] = Math.floor(
          (lower.color[2] + (upper.color[2] - lower.color[2]) * localT) * 255
        );
        data[idx + 3] = Math.floor(
          (lower.color[3] + (upper.color[3] - lower.color[3]) * localT) * 255
        );
      }

      // Create 1D texture (width x 1)
      const texture = device.createTexture({
        size: [width, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });

      device.queue.writeTexture(
        { texture },
        data,
        { bytesPerRow: width * 4 },
        [width, 1]
      );

      cacheTexture(name, texture);
      return texture;
    },

    createSolidColorTexture(
      name: string,
      color: [number, number, number, number]
    ): GPUTexture {
      const data = new Uint8Array([
        Math.floor(color[0] * 255),
        Math.floor(color[1] * 255),
        Math.floor(color[2] * 255),
        Math.floor(color[3] * 255),
      ]);

      const texture = device.createTexture({
        size: [1, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });

      device.queue.writeTexture({ texture }, data, { bytesPerRow: 4 }, [1, 1]);

      cacheTexture(name, texture);
      return texture;
    },

    removeTexture(name: string): void {
      const cached = textures.get(name);
      if (cached) {
        cached.texture.destroy();
        textures.delete(name);
      }
    },

    getBindGroupEntries(
      textureName: string,
      textureBinding: number,
      samplerBinding: number,
      samplerName = 'default'
    ): GPUBindGroupEntry[] {
      const cached = textures.get(textureName);
      if (!cached) {
        throw new Error(`Texture not found: ${textureName}`);
      }

      return [
        {
          binding: textureBinding,
          resource: cached.view,
        },
        {
          binding: samplerBinding,
          resource: this.getSampler(samplerName),
        },
      ];
    },

    getTextureCount(): number {
      return textures.size;
    },

    dispose(): void {
      if (disposed) return;

      for (const cached of textures.values()) {
        cached.texture.destroy();
      }
      textures.clear();
      samplers.clear();
      disposed = true;
    },
  };
}
