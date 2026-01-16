/**
 * Renderer module for WebGPU rendering
 *
 * Invariants:
 * - INV-A001: WebGPURenderer must be initialized with `await renderer.init()`
 * - INV-A008: Three.js imports use `three/webgpu` and `three/tsl` paths for WebGPU
 *
 * Note: WebGL support has been deprecated. This module only supports WebGPU.
 * Users with browsers that don't support WebGPU will see an error message.
 */

import * as THREE from 'three';
import { SRGBColorSpace } from 'three';

/**
 * Error thrown when WebGPU is not supported in the current browser.
 * This error should be caught by the UI layer to display a user-friendly message.
 */
export class WebGPUNotSupportedError extends Error {
  public override readonly name = 'WebGPUNotSupportedError';

  constructor(reason?: string) {
    const message = reason
      ? `WebGPU is not supported in this browser: ${reason}`
      : 'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or another WebGPU-enabled browser.';
    super(message);
  }
}

/**
 * Check if WebGPU is supported in the current browser
 *
 * @returns Promise resolving to true if WebGPU is available, false otherwise
 */
export async function isWebGPUSupported(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return false;
    }

    // Add timeout to prevent hanging in problematic environments
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2000);
    });

    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      timeoutPromise
    ]);

    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * WebGPU Renderer type - cast from dynamic import
 * This provides type safety while still using dynamic imports
 */
export type WebGPURendererType = THREE.WebGLRenderer & {
  backend?: { device?: unknown };
  init(): Promise<void>;
};

/**
 * Create a WebGPU renderer
 *
 * @param canvas - The canvas element to render to
 * @returns Promise resolving to a WebGPURenderer
 * @throws WebGPUNotSupportedError if WebGPU is not available
 */
export async function createRenderer(
  canvas: HTMLCanvasElement
): Promise<WebGPURendererType> {
  const webgpuSupported = await isWebGPUSupported();

  if (!webgpuSupported) {
    throw new WebGPUNotSupportedError('navigator.gpu not available or adapter request failed');
  }

  // Dynamic import for WebGPU renderer to avoid bundling issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webgpuModule = await import('three/webgpu') as any;
  const WebGPURenderer = webgpuModule.default || webgpuModule.WebGPURenderer;

  if (!WebGPURenderer) {
    throw new WebGPUNotSupportedError('WebGPURenderer not found in three/webgpu module');
  }

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
  });

  // INV-A001: WebGPU requires async initialization
  await renderer.init();

  // Verify the renderer is actually working by checking for backend
  if (!renderer.backend || !renderer.backend.device) {
    renderer.dispose();
    throw new WebGPUNotSupportedError('WebGPU backend initialization failed');
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);

  // No tone mapping - colors are controlled in shader with clamping
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

  return renderer as WebGPURendererType;
}

/**
 * Dispose of renderer resources
 */
export function disposeRenderer(renderer: WebGPURendererType): void {
  renderer.dispose();
}
