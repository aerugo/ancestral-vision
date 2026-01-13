/**
 * Renderer module for WebGPU/WebGL rendering
 *
 * Invariants:
 * - INV-A001: WebGPURenderer must be initialized with `await renderer.init()`
 * - INV-A008: Three.js imports use `three/webgpu` and `three/tsl` paths for WebGPU
 */

import { WebGLRenderer } from 'three';

// Note: WebGPU renderer would be imported from 'three/webgpu' when using WebGPU
// For now, we use WebGLRenderer with the same interface pattern

/**
 * Check if WebGPU is supported in the current browser
 */
export async function isWebGPUSupported(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Create a renderer with WebGPU support (falling back to WebGL)
 *
 * @param canvas - The canvas element to render to
 * @returns Promise resolving to a WebGLRenderer (or WebGPURenderer when supported)
 */
export async function createRenderer(
  canvas: HTMLCanvasElement
): Promise<WebGLRenderer> {
  const webgpuSupported = await isWebGPUSupported();

  if (webgpuSupported) {
    // WebGPU path - dynamically import to avoid bundling issues
    try {
      // Dynamic import for WebGPU renderer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webgpuModule = await import('three/webgpu') as any;
      const WebGPURenderer = webgpuModule.default || webgpuModule.WebGPURenderer;

      if (WebGPURenderer) {
        console.log('Using WebGPU renderer');
        const renderer = new WebGPURenderer({
          canvas,
          antialias: true,
        });

        // INV-A001: WebGPU requires async initialization
        await renderer.init();

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);

        return renderer as unknown as WebGLRenderer;
      }
    } catch (error) {
      console.warn('WebGPU renderer failed to initialize, falling back to WebGL:', error);
    }
  }

  // Fallback to WebGL
  console.log('Using WebGL renderer');
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });

  // Clamp pixel ratio to max 2 for performance
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);

  return renderer;
}

/**
 * Type guard to check if renderer is WebGPU
 */
export function isWebGPURenderer(renderer: WebGLRenderer): boolean {
  return 'backend' in renderer;
}

/**
 * Dispose of renderer resources
 */
export function disposeRenderer(renderer: WebGLRenderer): void {
  renderer.dispose();
}
