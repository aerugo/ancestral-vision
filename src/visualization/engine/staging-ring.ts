/**
 * Staging Buffer Ring
 *
 * Provides efficient CPU-to-GPU data transfer using a ring of staging buffers.
 * This avoids pipeline stalls by ensuring a mapped buffer is always available.
 *
 * Based on the webgpu-metaballs "stagingRing" approach which provides the best
 * balance of performance and memory usage.
 */

import type { DeviceManager } from './device-manager';

export interface StagingBufferRingConfig {
  /** Number of buffers in the ring (default: 3) */
  ringSize?: number;
  /** Initial buffer size in bytes (default: 64KB) */
  initialBufferSize?: number;
  /** Maximum buffer size before creating new buffer (default: 4MB) */
  maxBufferSize?: number;
}

export interface StagingBufferRing {
  /**
   * Upload data to a GPU buffer
   * @param target - Destination GPU buffer
   * @param targetOffset - Offset in destination buffer (bytes)
   * @param data - Data to upload
   * @param dataOffset - Offset in source data (bytes, default: 0)
   * @param size - Number of bytes to copy (default: data.byteLength)
   */
  upload(
    target: GPUBuffer,
    targetOffset: number,
    data: ArrayBuffer | ArrayBufferView,
    dataOffset?: number,
    size?: number
  ): void;

  /**
   * Flush all pending uploads to the command encoder
   * Call this before submitting the command buffer
   * @param encoder - Command encoder to record copy commands to
   */
  flush(encoder: GPUCommandEncoder): void;

  /**
   * Prepare for next frame
   * Maps the next staging buffer for writing
   */
  prepareNextFrame(): Promise<void>;

  /**
   * Dispose all resources
   */
  dispose(): void;
}

interface StagingBuffer {
  buffer: GPUBuffer;
  size: number;
  mappedArray: ArrayBuffer | null;
  offset: number; // Current write offset
}

interface PendingCopy {
  stagingBuffer: GPUBuffer;
  stagingOffset: number;
  targetBuffer: GPUBuffer;
  targetOffset: number;
  size: number;
}

const DEFAULT_RING_SIZE = 3;
const DEFAULT_INITIAL_SIZE = 64 * 1024; // 64KB
const DEFAULT_MAX_SIZE = 4 * 1024 * 1024; // 4MB

/**
 * Creates a staging buffer ring for efficient GPU uploads
 */
export function createStagingBufferRing(
  deviceManager: DeviceManager,
  config: StagingBufferRingConfig = {}
): StagingBufferRing {
  const ringSize = config.ringSize ?? DEFAULT_RING_SIZE;
  const initialBufferSize = config.initialBufferSize ?? DEFAULT_INITIAL_SIZE;
  const maxBufferSize = config.maxBufferSize ?? DEFAULT_MAX_SIZE;

  const device = deviceManager.device;

  // Create ring of staging buffers
  const stagingBuffers: StagingBuffer[] = [];
  for (let i = 0; i < ringSize; i++) {
    const buffer = device.createBuffer({
      size: initialBufferSize,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });

    stagingBuffers.push({
      buffer,
      size: initialBufferSize,
      mappedArray: buffer.getMappedRange(),
      offset: 0,
    });
  }

  let currentIndex = 0;
  const pendingCopies: PendingCopy[] = [];

  /**
   * Get or create a staging buffer with enough space
   */
  function getStagingBuffer(requiredSize: number): StagingBuffer {
    let staging = stagingBuffers[currentIndex];

    // Check if current buffer has enough space
    const remainingSpace = staging.size - staging.offset;

    if (remainingSpace >= requiredSize) {
      return staging;
    }

    // Need a new buffer - either grow or move to next in ring
    if (staging.offset > 0) {
      // Current buffer has data, move to next
      currentIndex = (currentIndex + 1) % ringSize;
      staging = stagingBuffers[currentIndex];

      // Wait for the buffer to be available (should already be mapped from prepareNextFrame)
      if (!staging.mappedArray) {
        throw new Error('Staging buffer not mapped. Ensure prepareNextFrame() is called each frame.');
      }

      staging.offset = 0;
    }

    // Check if we need to grow the buffer
    if (staging.size < requiredSize) {
      const newSize = Math.min(
        Math.max(staging.size * 2, requiredSize),
        maxBufferSize
      );

      if (newSize < requiredSize) {
        throw new Error(`Required buffer size ${requiredSize} exceeds maximum ${maxBufferSize}`);
      }

      // Destroy old buffer and create larger one
      staging.buffer.destroy();
      staging.buffer = device.createBuffer({
        size: newSize,
        usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      staging.size = newSize;
      staging.mappedArray = staging.buffer.getMappedRange();
      staging.offset = 0;
    }

    return staging;
  }

  return {
    upload(
      target: GPUBuffer,
      targetOffset: number,
      data: ArrayBuffer | ArrayBufferView,
      dataOffset: number = 0,
      size?: number
    ): void {
      // Get actual data bytes
      let srcData: ArrayBuffer;
      let srcOffset: number;
      let copySize: number;

      if (ArrayBuffer.isView(data)) {
        srcData = data.buffer;
        srcOffset = data.byteOffset + dataOffset;
        copySize = size ?? data.byteLength - dataOffset;
      } else {
        srcData = data;
        srcOffset = dataOffset;
        copySize = size ?? data.byteLength - dataOffset;
      }

      // Align to 4 bytes (WebGPU requirement for buffer copies)
      const alignedSize = Math.ceil(copySize / 4) * 4;

      // Get staging buffer with enough space
      const staging = getStagingBuffer(alignedSize);

      // Copy data to staging buffer
      const srcView = new Uint8Array(srcData, srcOffset, copySize);
      const dstView = new Uint8Array(staging.mappedArray!, staging.offset, copySize);
      dstView.set(srcView);

      // Record pending copy
      pendingCopies.push({
        stagingBuffer: staging.buffer,
        stagingOffset: staging.offset,
        targetBuffer: target,
        targetOffset,
        size: alignedSize,
      });

      // Advance offset
      staging.offset += alignedSize;
    },

    flush(encoder: GPUCommandEncoder): void {
      // Unmap all staging buffers that have pending data
      const usedIndices = new Set<number>();
      for (const copy of pendingCopies) {
        for (let i = 0; i < stagingBuffers.length; i++) {
          if (stagingBuffers[i].buffer === copy.stagingBuffer) {
            usedIndices.add(i);
            break;
          }
        }
      }

      for (const idx of usedIndices) {
        const staging = stagingBuffers[idx];
        if (staging.mappedArray) {
          staging.buffer.unmap();
          staging.mappedArray = null;
        }
      }

      // Record copy commands
      for (const copy of pendingCopies) {
        encoder.copyBufferToBuffer(
          copy.stagingBuffer,
          copy.stagingOffset,
          copy.targetBuffer,
          copy.targetOffset,
          copy.size
        );
      }

      // Clear pending copies
      pendingCopies.length = 0;
    },

    async prepareNextFrame(): Promise<void> {
      // Map all staging buffers for the next frame
      const mapPromises: Promise<void>[] = [];

      for (const staging of stagingBuffers) {
        if (!staging.mappedArray) {
          const promise = staging.buffer.mapAsync(GPUMapMode.WRITE).then(() => {
            staging.mappedArray = staging.buffer.getMappedRange();
            staging.offset = 0;
          });
          mapPromises.push(promise);
        } else {
          // Already mapped, just reset offset
          staging.offset = 0;
        }
      }

      await Promise.all(mapPromises);

      // Reset to first buffer
      currentIndex = 0;
    },

    dispose(): void {
      for (const staging of stagingBuffers) {
        if (staging.mappedArray) {
          staging.buffer.unmap();
        }
        staging.buffer.destroy();
      }
      stagingBuffers.length = 0;
      pendingCopies.length = 0;
    },
  };
}
