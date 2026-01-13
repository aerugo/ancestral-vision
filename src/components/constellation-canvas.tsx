'use client';

/**
 * ConstellationCanvas - 3D visualization component for the family constellation
 *
 * Invariants:
 * - INV-A001: WebGPURenderer must be initialized with `await renderer.init()`
 * - INV-A002: Use `renderer.setAnimationLoop()` not `requestAnimationFrame()`
 * - INV-A009: Scene cleanup on component unmount (dispose geometry, materials, textures)
 */

import { useRef, useEffect, useCallback } from 'react';
import type { WebGLRenderer, PerspectiveCamera, Scene } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRenderer } from '@/visualization/renderer';
import { createScene, createCamera, createControls, disposeScene } from '@/visualization/scene';
import { createConstellationMesh, generatePlaceholderPeople } from '@/visualization/constellation';

export function ConstellationCanvas(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initScene = useCallback(async (): Promise<(() => void) | undefined> => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    container.appendChild(canvas);

    // Get dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Initialize renderer (async for WebGPU support - INV-A001)
    const renderer = await createRenderer(canvas);
    rendererRef.current = renderer;

    // Create scene
    const scene = createScene();
    sceneRef.current = scene;

    // Create camera
    const camera = createCamera(width, height);
    cameraRef.current = camera;

    // Create controls
    const controls = createControls(camera, canvas);
    controlsRef.current = controls;

    // Add placeholder constellation
    const placeholderPeople = generatePlaceholderPeople(10);
    const constellation = createConstellationMesh(placeholderPeople);
    scene.add(constellation);

    // Animation loop - use setAnimationLoop per INV-A002
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    // Handle resize
    const handleResize = (): void => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Return cleanup function (INV-A009)
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    initScene().then((cleanupFn) => {
      if (mounted) {
        cleanup = cleanupFn;
      } else if (cleanupFn) {
        // If unmounted before init completed, clean up immediately
        cleanupFn();
      }
    });

    return () => {
      mounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [initScene]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="constellation-canvas"
    />
  );
}
