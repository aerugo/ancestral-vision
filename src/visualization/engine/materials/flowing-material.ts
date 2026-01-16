/**
 * FlowingMaterial
 *
 * A material with animated flowing surface effects using tri-planar
 * texturing. Supports customizable colors, emissive glow, and PBR properties.
 */
import type { TextureManager } from '../textures/texture-manager';

/**
 * Size of uniform buffer in bytes (GPU aligned)
 *
 * Layout:
 * - baseColor: vec3<f32> + padding = 16 bytes (offset 0)
 * - emissive: vec3<f32> + emissiveStrength = 16 bytes (offset 16)
 * - flowSpeed, flowScale, turbulence, time = 16 bytes (offset 32)
 * - triplanarBlend, metallic, roughness, padding = 16 bytes (offset 48)
 */
export const FLOWING_MATERIAL_UNIFORM_SIZE = 64;

/**
 * Configuration for a flowing material
 */
export interface FlowingMaterialConfig {
  /** Base color RGB (0-1) */
  baseColor?: [number, number, number];
  /** Emissive color RGB (0-1) */
  emissive?: [number, number, number];
  /** Emissive intensity multiplier */
  emissiveStrength?: number;
  /** Flow animation speed */
  flowSpeed?: number;
  /** Scale of the flow pattern */
  flowScale?: number;
  /** Turbulence amount for noise distortion */
  turbulence?: number;
  /** Blend sharpness for tri-planar projection */
  triplanarBlend?: number;
  /** Metallic factor (0-1) */
  metallic?: number;
  /** Roughness factor (0-1) */
  roughness?: number;
  /** Name of base texture in TextureManager */
  baseTexture?: string;
}

/**
 * Uniform values for the material
 */
export interface FlowingMaterialUniforms {
  baseColor: [number, number, number];
  emissive: [number, number, number];
  emissiveStrength: number;
  flowSpeed: number;
  flowScale: number;
  turbulence: number;
  time: number;
  triplanarBlend: number;
  metallic: number;
  roughness: number;
}

/**
 * FlowingMaterial interface
 */
export interface FlowingMaterial {
  /** Configure material properties */
  configure(config: FlowingMaterialConfig): void;
  /** Update uniforms (call each frame with elapsed time) */
  update(time: number): void;
  /** Get current uniform values */
  getUniforms(): FlowingMaterialUniforms;
  /** Get bind group layout descriptor */
  getBindGroupLayout(): GPUBindGroupLayoutDescriptor;
  /** Get bind group (null if texture not loaded) */
  getBindGroup(): GPUBindGroup | null;
  /** Get WGSL shader code */
  getShaderCode(type: 'triplanar' | 'flow' | 'uniforms'): string;
  /** Get uniform buffer */
  getUniformBuffer(): GPUBuffer;
  /** Check if uniforms need upload */
  isDirty(): boolean;
  /** Load textures from base path */
  loadTextures(basePath: string): Promise<void>;
  /** Create a copy of this material */
  clone(): FlowingMaterial;
  /** Dispose GPU resources */
  dispose(): void;
}

// WGSL shader code for tri-planar projection
const TRIPLANAR_SHADER = `
// Tri-planar texture sampling
fn triplanarSample(
  tex: texture_2d<f32>,
  samp: sampler,
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  flow: vec3<f32>,
  scale: f32,
  blendSharpness: f32
) -> vec4<f32> {
  // UV coordinates for each projection plane
  let uvX = worldPos.yz * scale + flow.yz;
  let uvY = worldPos.xz * scale + flow.xz;
  let uvZ = worldPos.xy * scale + flow.xy;

  // Sample from all three projections
  let texX = textureSample(tex, samp, uvX);
  let texY = textureSample(tex, samp, uvY);
  let texZ = textureSample(tex, samp, uvZ);

  // Blend weights based on surface normal
  let blending = pow(abs(normal), vec3<f32>(blendSharpness));
  let blendSum = blending.x + blending.y + blending.z;
  let normalizedBlend = blending / blendSum;

  // Final blended color
  return texX * normalizedBlend.x + texY * normalizedBlend.y + texZ * normalizedBlend.z;
}
`;

// WGSL shader code for flowing material
const FLOW_SHADER = `
// Calculate flow offset based on time
fn calculateFlowOffset(time: f32, flowSpeed: f32) -> vec3<f32> {
  return vec3<f32>(
    sin(time * flowSpeed * 0.3) * 0.2,
    time * flowSpeed * 0.1,
    cos(time * flowSpeed * 0.2) * 0.15
  );
}

// Simple 3D noise function
fn hash3(p: vec3<f32>) -> f32 {
  let h = dot(p, vec3<f32>(127.1, 311.7, 74.7));
  return fract(sin(h) * 43758.5453);
}

fn noise3(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash3(i), hash3(i + vec3<f32>(1.0, 0.0, 0.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 0.0)), hash3(i + vec3<f32>(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3<f32>(0.0, 0.0, 1.0)), hash3(i + vec3<f32>(1.0, 0.0, 1.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 1.0)), hash3(i + vec3<f32>(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

// FBM noise for turbulence
fn fbmNoise(p: vec3<f32>, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * noise3(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Main flowing material color function
fn flowingMaterialColor(
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  time: f32,
  baseTexture: texture_2d<f32>,
  baseSampler: sampler,
  uniforms: FlowingMaterialUniforms
) -> vec4<f32> {
  // Calculate flow offset
  let flowOffset = calculateFlowOffset(time, uniforms.flowSpeed);

  // Tri-planar texture sampling with flow
  let surfaceColor = triplanarSample(
    baseTexture, baseSampler,
    worldPos, normal, flowOffset,
    uniforms.flowScale,
    uniforms.triplanarBlend
  );

  // Add turbulence noise
  let noise = fbmNoise(worldPos * uniforms.turbulence + flowOffset, 4);
  let finalColor = mix(surfaceColor.rgb, uniforms.baseColor, noise * 0.3);

  // Self-illumination/emissive
  let emissive = uniforms.emissive * uniforms.emissiveStrength * (0.5 + noise * 0.5);

  return vec4<f32>(finalColor + emissive, 1.0);
}
`;

// WGSL uniform struct definition
const UNIFORM_STRUCT = `
struct FlowingMaterialUniforms {
  baseColor: vec3<f32>,
  _pad0: f32,
  emissive: vec3<f32>,
  emissiveStrength: f32,
  flowSpeed: f32,
  flowScale: f32,
  turbulence: f32,
  time: f32,
  triplanarBlend: f32,
  metallic: f32,
  roughness: f32,
  _pad1: f32,
}
`;

/**
 * Creates a new FlowingMaterial
 *
 * @param device - The GPUDevice to create resources on
 * @param textureManager - TextureManager for texture access
 * @returns A FlowingMaterial instance
 */
export function createFlowingMaterial(
  device: GPUDevice,
  textureManager: TextureManager
): FlowingMaterial {
  // Create uniform buffer
  const uniformBuffer = device.createBuffer({
    size: FLOWING_MATERIAL_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Uniform data
  const uniformData = new Float32Array(FLOWING_MATERIAL_UNIFORM_SIZE / 4);

  // Material state
  let baseColor: [number, number, number] = [1, 1, 1];
  let emissive: [number, number, number] = [0, 0, 0];
  let emissiveStrength = 0;
  let flowSpeed = 0.5;
  let flowScale = 1.0;
  let turbulence = 1.0;
  let time = 0;
  let triplanarBlend = 4.0;
  let metallic = 0;
  let roughness = 0.5;
  let baseTextureName: string | null = null;

  let dirty = true;
  let disposed = false;
  let bindGroup: GPUBindGroup | null = null;
  let bindGroupLayout: GPUBindGroupLayout | null = null;

  // Bind group layout descriptor
  const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'float' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: 'filtering' },
      },
    ],
  };

  /**
   * Pack uniforms into the data array
   */
  function packUniforms(): void {
    // baseColor + padding
    uniformData[0] = baseColor[0];
    uniformData[1] = baseColor[1];
    uniformData[2] = baseColor[2];
    uniformData[3] = 0; // padding

    // emissive + emissiveStrength
    uniformData[4] = emissive[0];
    uniformData[5] = emissive[1];
    uniformData[6] = emissive[2];
    uniformData[7] = emissiveStrength;

    // flowSpeed, flowScale, turbulence, time
    uniformData[8] = flowSpeed;
    uniformData[9] = flowScale;
    uniformData[10] = turbulence;
    uniformData[11] = time;

    // triplanarBlend, metallic, roughness, padding
    uniformData[12] = triplanarBlend;
    uniformData[13] = metallic;
    uniformData[14] = roughness;
    uniformData[15] = 0; // padding
  }

  /**
   * Get or create bind group layout
   */
  function getLayout(): GPUBindGroupLayout {
    if (!bindGroupLayout) {
      bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    return bindGroupLayout;
  }

  const material: FlowingMaterial = {
    configure(config: FlowingMaterialConfig): void {
      if (config.baseColor !== undefined) {
        baseColor = [...config.baseColor];
      }
      if (config.emissive !== undefined) {
        emissive = [...config.emissive];
      }
      if (config.emissiveStrength !== undefined) {
        emissiveStrength = config.emissiveStrength;
      }
      if (config.flowSpeed !== undefined) {
        flowSpeed = config.flowSpeed;
      }
      if (config.flowScale !== undefined) {
        flowScale = config.flowScale;
      }
      if (config.turbulence !== undefined) {
        turbulence = config.turbulence;
      }
      if (config.triplanarBlend !== undefined) {
        triplanarBlend = config.triplanarBlend;
      }
      if (config.metallic !== undefined) {
        metallic = config.metallic;
      }
      if (config.roughness !== undefined) {
        roughness = config.roughness;
      }
      if (config.baseTexture !== undefined) {
        baseTextureName = config.baseTexture;
      }

      dirty = true;
      bindGroup = null; // Invalidate bind group
    },

    update(newTime: number): void {
      time = newTime;
      packUniforms();
      device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);
      dirty = false;
    },

    getUniforms(): FlowingMaterialUniforms {
      return {
        baseColor: [...baseColor],
        emissive: [...emissive],
        emissiveStrength,
        flowSpeed,
        flowScale,
        turbulence,
        time,
        triplanarBlend,
        metallic,
        roughness,
      };
    },

    getBindGroupLayout(): GPUBindGroupLayoutDescriptor {
      return bindGroupLayoutDescriptor;
    },

    getBindGroup(): GPUBindGroup | null {
      if (!baseTextureName) {
        return null;
      }

      const textureView = textureManager.getTextureView(baseTextureName);
      if (!textureView) {
        return null;
      }

      if (!bindGroup) {
        bindGroup = device.createBindGroup({
          layout: getLayout(),
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: textureView },
            { binding: 2, resource: textureManager.getSampler() },
          ],
        });
      }

      return bindGroup;
    },

    getShaderCode(type: 'triplanar' | 'flow' | 'uniforms'): string {
      switch (type) {
        case 'triplanar':
          return TRIPLANAR_SHADER;
        case 'flow':
          return FLOW_SHADER;
        case 'uniforms':
          return UNIFORM_STRUCT;
      }
    },

    getUniformBuffer(): GPUBuffer {
      return uniformBuffer;
    },

    isDirty(): boolean {
      return dirty;
    },

    async loadTextures(basePath: string): Promise<void> {
      if (!baseTextureName) {
        return;
      }

      if (textureManager.hasTexture(baseTextureName)) {
        return;
      }

      const url = `${basePath}/${baseTextureName}.jpg`;
      try {
        await textureManager.loadTexture(baseTextureName, url, {
          mipLevels: 4,
        });
      } catch (error) {
        console.warn(`Failed to load texture ${baseTextureName}:`, error);
      }
    },

    clone(): FlowingMaterial {
      const cloned = createFlowingMaterial(device, textureManager);
      cloned.configure({
        baseColor: [...baseColor],
        emissive: [...emissive],
        emissiveStrength,
        flowSpeed,
        flowScale,
        turbulence,
        triplanarBlend,
        metallic,
        roughness,
        baseTexture: baseTextureName ?? undefined,
      });
      return cloned;
    },

    dispose(): void {
      if (!disposed) {
        uniformBuffer.destroy();
        disposed = true;
      }
    },
  };

  return material;
}
