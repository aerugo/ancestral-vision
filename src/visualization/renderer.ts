/**
 * Renderer module for WebGPU/WebGL rendering
 *
 * Invariants:
 * - INV-A001: WebGPURenderer must be initialized with `await renderer.init()`
 * - INV-A008: Three.js imports use `three/webgpu` and `three/tsl` paths for WebGPU
 */

import * as THREE from 'three';
import { WebGLRenderer, SRGBColorSpace } from 'three';

// Note: WebGPU renderer would be imported from 'three/webgpu' when using WebGPU
// For now, we use WebGLRenderer with the same interface pattern

/**
 * Check if WebGPU is supported in the current browser
 *
 * Note: WebGPU detection can be unreliable in headless browsers.
 * Headless environments are automatically detected and forced to use WebGL.
 */
export async function isWebGPUSupported(): Promise<boolean> {
  // Force WebGL in test/headless environments where WebGPU is unreliable
  if (typeof navigator !== 'undefined') {
    const nav = navigator as { webdriver?: boolean };
    const isHeadless =
      nav.webdriver === true ||
      /HeadlessChrome/.test(navigator.userAgent) ||
      /Playwright/.test(navigator.userAgent);

    if (isHeadless) {
      console.log('[isWebGPUSupported] Headless browser detected, forcing WebGL');
      return false;
    }
  }

  try {
    console.log('[isWebGPUSupported] Checking navigator.gpu...');
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      console.log('[isWebGPUSupported] navigator.gpu not available');
      return false;
    }
    console.log('[isWebGPUSupported] Requesting adapter with timeout...');

    // Add timeout to prevent hanging in headless browsers
    // Reduced to 1 second for faster fallback in problematic environments
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log('[isWebGPUSupported] Adapter request timed out');
        resolve(null);
      }, 1000);
    });

    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      timeoutPromise
    ]);

    console.log('[isWebGPUSupported] Adapter result:', adapter !== null);
    return adapter !== null;
  } catch (error) {
    console.log('[isWebGPUSupported] Error:', error);
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
  console.log('[createRenderer] Checking WebGPU support...');
  const webgpuSupported = await isWebGPUSupported();
  console.log('[createRenderer] WebGPU supported:', webgpuSupported);

  if (webgpuSupported) {
    // WebGPU path - dynamically import to avoid bundling issues
    try {
      console.log('[createRenderer] Importing WebGPU module...');
      // Dynamic import for WebGPU renderer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webgpuModule = await import('three/webgpu') as any;
      console.log('[createRenderer] WebGPU module imported:', Object.keys(webgpuModule));
      const WebGPURenderer = webgpuModule.default || webgpuModule.WebGPURenderer;

      if (WebGPURenderer) {
        console.log('Using WebGPU renderer');
        const renderer = new WebGPURenderer({
          canvas,
          antialias: true,
        });
        console.log('[createRenderer] WebGPU renderer created, initializing...');

        // INV-A001: WebGPU requires async initialization
        await renderer.init();
        console.log('[createRenderer] WebGPU renderer initialized');

        // Verify the renderer is actually working by checking for backend
        // In some headless browsers, init() succeeds but the context is null
        if (!renderer.backend || !renderer.backend.device) {
          console.warn('[createRenderer] WebGPU renderer initialized but backend/device is null, falling back to WebGL');
          renderer.dispose();
          throw new Error('WebGPU backend not available');
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);

        // No tone mapping - colors are controlled in shader with clamping
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.outputColorSpace = SRGBColorSpace;
        console.log('[createRenderer] WebGPU renderer configured');

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

  // No tone mapping - colors are controlled in shader with clamping
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

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
