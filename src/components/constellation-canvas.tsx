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
import {
  createConstellationMesh,
  generatePlaceholderPeople,
  type PlaceholderPerson,
} from '@/visualization/constellation';
import { ConstellationSelection } from '@/visualization/selection';
import { CameraAnimator } from '@/visualization/camera-animation';
import { usePeople } from '@/hooks/use-people';
import { useSelectionStore } from '@/store/selection-store';
import * as THREE from 'three';

/**
 * Convert API people data to PlaceholderPerson format for visualization
 */
function peopleToPlacelderPeople(
  people: Array<{ id: string; givenName: string | null; surname: string | null; generation: number }>
): PlaceholderPerson[] {
  return people.map((person, index) => {
    // Arrange in a spiral pattern based on generation
    const angle = (index / Math.max(people.length, 1)) * Math.PI * 4;
    const radius = 20 + Math.abs(person.generation) * 15;
    const height = person.generation * 20;

    return {
      id: person.id,
      givenName: person.givenName || person.surname || 'Unknown',
      position: {
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
      },
    };
  });
}

export function ConstellationCanvas(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectionRef = useRef<ConstellationSelection | null>(null);
  const cameraAnimatorRef = useRef<CameraAnimator | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);

  // Fetch real people data
  const { data: people } = usePeople();
  const { selectPerson } = useSelectionStore();

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

    // Create selection handler
    selectionRef.current = new ConstellationSelection(camera, scene);

    // Create camera animator for smooth transitions
    cameraAnimatorRef.current = new CameraAnimator(camera);

    // Create clock for delta time
    clockRef.current = new THREE.Clock();

    // Add constellation - use real data if available, otherwise placeholder
    const constellationPeople =
      people && people.length > 0
        ? peopleToPlacelderPeople(people)
        : generatePlaceholderPeople(10);
    const constellation = createConstellationMesh(constellationPeople);
    scene.add(constellation);

    // Click handler for selection
    const handleClick = (event: MouseEvent): void => {
      if (!selectionRef.current || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const personId = selectionRef.current.getIntersectedPerson(x, y);
      if (personId) {
        selectPerson(personId, []);

        // Animate camera to focus on the selected person
        const position = selectionRef.current.getIntersectedPosition(x, y);
        if (position && cameraAnimatorRef.current) {
          // Calculate camera target position (offset from the star)
          const cameraOffset = new THREE.Vector3(0, 10, 40);
          const targetPosition = new THREE.Vector3(
            position.x + cameraOffset.x,
            position.y + cameraOffset.y,
            position.z + cameraOffset.z
          );
          const lookAtTarget = new THREE.Vector3(position.x, position.y, position.z);

          cameraAnimatorRef.current.animateTo(targetPosition, lookAtTarget, {
            duration: 1.5,
            easing: 'easeInOutCubic',
          });
        }
      }
    };

    canvas.addEventListener('click', handleClick);

    // Animation loop - use setAnimationLoop per INV-A002
    renderer.setAnimationLoop(() => {
      const deltaTime = clockRef.current?.getDelta() ?? 0;

      // Update camera animation
      if (cameraAnimatorRef.current) {
        cameraAnimatorRef.current.update(deltaTime);
      }

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
      canvas.removeEventListener('click', handleClick);
      renderer.setAnimationLoop(null);
      controls.dispose();
      selectionRef.current?.dispose();
      disposeScene(scene);
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [people, selectPerson]);

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
