/**
 * LightManager
 *
 * Manages point lights for clustered lighting. Handles light data
 * storage, GPU buffer synchronization, and provides bind group layouts
 * for shader access.
 */
import * as THREE from 'three';

/**
 * Size of a single light struct in bytes (GPU aligned)
 *
 * Layout (48 bytes):
 * - position: vec3<f32> + padding = 16 bytes (offset 0)
 * - color: vec3<f32> + intensity: f32 = 16 bytes (offset 16)
 * - range: f32 + padding = 16 bytes (offset 32)
 */
export const LIGHT_STRUCT_SIZE = 48;

/**
 * Default maximum number of lights
 */
export const DEFAULT_MAX_LIGHTS = 1024;

/**
 * Point light definition for adding/updating lights
 */
export interface PointLight {
  position: THREE.Vector3;
  color: THREE.Color;
  range: number;
  intensity: number;
}

/**
 * Partial point light for updates
 */
export type PointLightUpdate = Partial<PointLight>;

/**
 * Internal point light data with ID
 */
export interface PointLightData extends PointLight {
  id: number;
}

/**
 * LightManager configuration
 */
export interface LightManagerConfig {
  maxLights?: number;
}

/**
 * GPU buffers for light data
 */
export interface LightBuffers {
  lightsBuffer: GPUBuffer;
  lightCountBuffer: GPUBuffer;
}

/**
 * LightManager interface
 */
export interface LightManager {
  /** Add a light and return its ID */
  addLight(light: PointLight): number;
  /** Update an existing light */
  updateLight(id: number, updates: PointLightUpdate): void;
  /** Remove a light by ID */
  removeLight(id: number): void;
  /** Get light data by ID */
  getLight(id: number): PointLightData | undefined;
  /** Get all active lights */
  getAllLights(): PointLightData[];
  /** Get current light count */
  getLightCount(): number;
  /** Check if data needs to be synced */
  isDirty(): boolean;
  /** Sync light data to GPU */
  sync(force?: boolean): void;
  /** Get GPU buffers */
  getBuffers(): LightBuffers;
  /** Get bind group layout descriptor */
  getBindGroupLayout(): GPUBindGroupLayoutDescriptor;
  /** Remove all lights */
  clear(): void;
  /** Dispose GPU resources */
  dispose(): void;
}

/**
 * Creates a new LightManager
 *
 * @param device - The GPUDevice to create buffers on
 * @param config - Optional configuration
 * @returns A LightManager instance
 */
export function createLightManager(
  device: GPUDevice,
  config: LightManagerConfig = {}
): LightManager {
  const maxLights = config.maxLights ?? DEFAULT_MAX_LIGHTS;

  // Create GPU buffers
  const lightsBuffer = device.createBuffer({
    size: maxLights * LIGHT_STRUCT_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const lightCountBuffer = device.createBuffer({
    size: 16, // vec4 aligned
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Internal storage
  const lights = new Map<number, PointLightData>();
  const freeIds: number[] = [];
  let nextId = 0;
  let dirty = false;
  let disposed = false;

  // Reusable typed arrays for GPU upload
  const lightData = new Float32Array(maxLights * (LIGHT_STRUCT_SIZE / 4));
  const countData = new Uint32Array(4);

  /**
   * Pack light data into the typed array for GPU upload
   */
  function packLightData(): void {
    let index = 0;

    for (const light of lights.values()) {
      const offset = index * (LIGHT_STRUCT_SIZE / 4);

      // Position (vec3 + padding)
      lightData[offset + 0] = light.position.x;
      lightData[offset + 1] = light.position.y;
      lightData[offset + 2] = light.position.z;
      lightData[offset + 3] = 0; // padding

      // Color (vec3) + intensity (f32)
      lightData[offset + 4] = light.color.r;
      lightData[offset + 5] = light.color.g;
      lightData[offset + 6] = light.color.b;
      lightData[offset + 7] = light.intensity;

      // Range + padding
      lightData[offset + 8] = light.range;
      lightData[offset + 9] = 0;
      lightData[offset + 10] = 0;
      lightData[offset + 11] = 0;

      index++;
    }

    countData[0] = lights.size;
    countData[1] = 0;
    countData[2] = 0;
    countData[3] = 0;
  }

  return {
    addLight(light: PointLight): number {
      if (lights.size >= maxLights) {
        throw new Error('Maximum light count exceeded');
      }

      // Get ID from free list or generate new one
      const id = freeIds.length > 0 ? freeIds.pop()! : nextId++;

      const lightData: PointLightData = {
        id,
        position: light.position.clone(),
        color: light.color.clone(),
        range: light.range,
        intensity: light.intensity,
      };

      lights.set(id, lightData);
      dirty = true;

      return id;
    },

    updateLight(id: number, updates: PointLightUpdate): void {
      const light = lights.get(id);
      if (!light) {
        throw new Error(`Light with ID ${id} does not exist`);
      }

      if (updates.position) {
        light.position.copy(updates.position);
      }
      if (updates.color) {
        light.color.copy(updates.color);
      }
      if (updates.range !== undefined) {
        light.range = updates.range;
      }
      if (updates.intensity !== undefined) {
        light.intensity = updates.intensity;
      }

      dirty = true;
    },

    removeLight(id: number): void {
      if (lights.has(id)) {
        lights.delete(id);
        freeIds.push(id);
        dirty = true;
      }
    },

    getLight(id: number): PointLightData | undefined {
      const light = lights.get(id);
      if (!light) return undefined;

      // Return a copy to prevent external mutation
      return {
        id: light.id,
        position: light.position.clone(),
        color: light.color.clone(),
        range: light.range,
        intensity: light.intensity,
      };
    },

    getAllLights(): PointLightData[] {
      return Array.from(lights.values()).map((light) => ({
        id: light.id,
        position: light.position.clone(),
        color: light.color.clone(),
        range: light.range,
        intensity: light.intensity,
      }));
    },

    getLightCount(): number {
      return lights.size;
    },

    isDirty(): boolean {
      return dirty;
    },

    sync(force = false): void {
      if (disposed) return;

      if (!dirty && !force) return;

      packLightData();

      // Upload lights buffer (only the used portion)
      const usedSize = lights.size * LIGHT_STRUCT_SIZE;
      if (usedSize > 0) {
        device.queue.writeBuffer(
          lightsBuffer,
          0,
          lightData.buffer,
          0,
          usedSize
        );
      }

      // Upload light count
      device.queue.writeBuffer(lightCountBuffer, 0, countData.buffer);

      dirty = false;
    },

    getBuffers(): LightBuffers {
      return {
        lightsBuffer,
        lightCountBuffer,
      };
    },

    getBindGroupLayout(): GPUBindGroupLayoutDescriptor {
      return {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
              type: 'read-only-storage',
            },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
              type: 'uniform',
            },
          },
        ],
      };
    },

    clear(): void {
      lights.clear();
      freeIds.length = 0;
      dirty = true;
    },

    dispose(): void {
      if (!disposed) {
        lightsBuffer.destroy();
        lightCountBuffer.destroy();
        disposed = true;
      }
    },
  };
}
