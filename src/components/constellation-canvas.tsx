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
import {
  createInstancedConstellation,
  updateConstellationTime,
  disposeInstancedConstellation,
  type ConstellationData,
  type InstancedConstellationResult,
} from '@/visualization/instanced-constellation';
import {
  createEdgeSystem,
  updateEdgeSystemTime,
  disposeEdgeSystem,
  type EdgeSystemData,
  type EdgeSystemResult,
} from '@/visualization/edges';
import {
  createBackgroundParticles,
  updateBackgroundParticlesTime,
  disposeBackgroundParticles,
  createEventFireflies,
  updateEventFirefliesTime,
  disposeEventFireflies,
  type BackgroundParticleResult,
  type EventFireflyResult,
} from '@/visualization/particles';
import {
  createSacredGeometryGrid,
  disposeSacredGeometryGrid,
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
  type PostProcessingResult,
} from '@/visualization/effects';
import { ConstellationSelection } from '@/visualization/selection';
import { CameraAnimator } from '@/visualization/camera-animation';
import { ForceLayout, type LayoutNode } from '@/visualization/layout';
import { usePeople } from '@/hooks/use-people';
import { useSelectionStore } from '@/store/selection-store';
import * as THREE from 'three';

/**
 * Focus indicator mesh for keyboard navigation
 */
function createFocusIndicator(): THREE.Mesh {
  const geometry = new THREE.RingGeometry(3, 3.5, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.visible = false;
  return ring;
}

/**
 * Convert API people data to PlaceholderPerson format for visualization
 * Uses force-directed layout with golden angle distribution
 */
function peopleToPlacelderPeople(
  people: Array<{ id: string; givenName: string | null; surname: string | null; generation: number }>
): PlaceholderPerson[] {
  if (people.length === 0) return [];

  // Create layout nodes from people data
  const layoutNodes: LayoutNode[] = people.map(person => ({
    id: person.id,
    generation: person.generation,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
  }));

  // Initialize force-directed layout with golden angle distribution
  const layout = new ForceLayout(layoutNodes, {
    generationSpacing: 60,      // Distance between generation rings
    repulsionStrength: 80,      // Push nodes apart
    centerStrength: 0.03,       // Keep centered
    generationStrength: 0.15,   // Maintain ring structure
    damping: 0.85,              // Velocity decay
  });

  // Initialize positions using golden angle
  layout.initialize();

  // Run simulation until stable (max 150 iterations)
  for (let i = 0; i < 150; i++) {
    layout.step();
    if (layout.isStable()) break;
  }

  // Get final positions from layout
  const positionMap = layout.getPositionMap();

  return people.map(person => {
    const layoutPos = positionMap.get(person.id) || { x: 0, y: 0, z: 0 };
    return {
      id: person.id,
      givenName: person.givenName || person.surname || 'Unknown',
      position: {
        x: layoutPos.x,
        y: layoutPos.y, // Layout keeps y=0, can add variation if desired
        z: layoutPos.z,
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
  const instancedConstellationRef = useRef<InstancedConstellationResult | null>(null);
  const edgeSystemRef = useRef<EdgeSystemResult | null>(null);
  const backgroundParticlesRef = useRef<BackgroundParticleResult | null>(null);
  const eventFirefliesRef = useRef<EventFireflyResult | null>(null);
  const sacredGeometryGridRef = useRef<THREE.Group | null>(null);
  const postProcessingRef = useRef<PostProcessingResult | null>(null);
  const usePostProcessingRef = useRef<boolean>(false);

  // Fetch real people data
  const { data: people, isLoading, isError, error } = usePeople();
  const { selectPerson, clearSelection } = useSelectionStore();

  // Keyboard navigation state (using refs to avoid re-initializing scene)
  const focusedIndexRef = useRef<number>(-1);
  const focusIndicatorRef = useRef<THREE.Mesh | null>(null);
  const peoplePositionsRef = useRef<PlaceholderPerson[]>([]);

  // Debug logging
  if (isError) {
    console.error('[ConstellationCanvas] Failed to fetch people:', error);
  }
  if (!isLoading && !isError) {
    console.log('[ConstellationCanvas] People loaded:', people?.length ?? 0, 'people');
  }

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

    // Add constellation - use real data if available
    // Only use placeholder data if loading fails (empty array after load)
    const constellationPeople =
      people && people.length > 0
        ? peopleToPlacelderPeople(people)
        : isLoading
          ? [] // Don't show anything while loading
          : generatePlaceholderPeople(10); // Only show placeholder if no data after load

    // Use new instanced constellation with TSL materials (Phase 1)
    const positions: THREE.Vector3[] = [];
    const biographyWeights: number[] = [];
    if (constellationPeople.length > 0) {
      const constellationData: ConstellationData = {
        positions: constellationPeople.map(p => new THREE.Vector3(p.position.x, p.position.y, p.position.z)),
        biographyWeights: constellationPeople.map(() => Math.random() * 0.8 + 0.2), // Random weights for demo
        personIds: constellationPeople.map(p => p.id),
      };
      positions.push(...constellationData.positions);
      biographyWeights.push(...constellationData.biographyWeights);
      const instancedResult = createInstancedConstellation(constellationData);
      instancedConstellationRef.current = instancedResult;
      scene.add(instancedResult.mesh);
    }

    // Add edge system (Phase 2) - create demo edges between nodes
    if (positions.length > 1) {
      const edges: EdgeSystemData['edges'] = [];
      // Create edges between consecutive nodes to demo the Bezier curves
      for (let i = 0; i < positions.length - 1; i++) {
        const sourcePos = positions[i];
        const targetPos = positions[i + 1];
        if (sourcePos && targetPos) {
          edges.push({
            id: `edge-${i}`,
            sourcePosition: sourcePos,
            targetPosition: targetPos,
            type: 'parent-child',
            strength: 0.8 + Math.random() * 0.2,
          });
        }
      }
      // Add an extra edge from last to first to show a loop
      const firstPos = positions[0];
      const lastPos = positions[positions.length - 1];
      if (firstPos && lastPos && positions.length > 2) {
        edges.push({
          id: 'edge-loop',
          sourcePosition: lastPos,
          targetPosition: firstPos,
          type: 'spouse',
          strength: 0.6,
        });
      }
      const edgeResult = createEdgeSystem({ edges });
      edgeSystemRef.current = edgeResult;
      scene.add(edgeResult.mesh);
    }

    // Add background particles (Phase 3) - atmospheric Haeckel-inspired particles
    const particleResult = createBackgroundParticles({
      count: 300,
      innerRadius: 100,
      outerRadius: 400,
      pointSize: 3,
    });
    backgroundParticlesRef.current = particleResult;
    scene.add(particleResult.mesh);

    // Add event fireflies (Phase 4) - orbital particles representing life events
    if (positions.length > 0) {
      // Demo event types for each node
      const demoEventTypes = [
        ['birth', 'marriage'],
        ['birth', 'death'],
        ['birth', 'occupation', 'marriage'],
        ['birth'],
        ['birth', 'military', 'death'],
        ['birth', 'graduation', 'marriage', 'death'],
        ['birth', 'residence'],
        ['birth', 'marriage', 'occupation'],
        ['birth', 'death'],
        ['birth', 'marriage', 'residence', 'occupation'],
      ];
      const fireflyResult = createEventFireflies({
        nodePositions: positions,
        nodeBiographyWeights: biographyWeights,
        nodeEventTypes: positions.map((_, i) => demoEventTypes[i % demoEventTypes.length] || ['birth']),
      });
      eventFirefliesRef.current = fireflyResult;
      scene.add(fireflyResult.mesh);
    }

    // Add sacred geometry grid (Phase 5) - mandala-style background reference grid
    const gridGroup = createSacredGeometryGrid({
      ringCount: 8,
      ringSpacing: 50,
      radialCount: 12,
      opacity: 0.08,
      yOffset: -30, // Below constellation
    });
    sacredGeometryGridRef.current = gridGroup;
    scene.add(gridGroup);

    // Setup post-processing (Phase 6) - bloom and vignette effects
    // Note: EffectComposer requires WebGLRenderer, check if renderer is compatible
    try {
      // Only enable post-processing for WebGL renderer (WebGPU has different pipeline)
      const isWebGL = renderer.constructor.name === 'WebGLRenderer';
      if (isWebGL) {
        const postProcessingResult = createPostProcessing(renderer, scene, camera, {
          bloom: {
            enabled: true,
            intensity: 0.6,
            threshold: 0.3,
            radius: 0.5,
          },
          vignette: {
            enabled: true,
            darkness: 0.4,
            offset: 0.3,
          },
        });
        postProcessingRef.current = postProcessingResult;
        usePostProcessingRef.current = true;
        console.log('[ConstellationCanvas] Post-processing enabled (WebGL)');
      } else {
        console.log('[ConstellationCanvas] Post-processing disabled (WebGPU - not supported)');
        usePostProcessingRef.current = false;
      }
    } catch (error) {
      console.warn('[ConstellationCanvas] Post-processing setup failed:', error);
      usePostProcessingRef.current = false;
    }

    // Also add old constellation for comparison (can be removed later)
    const constellation = createConstellationMesh(constellationPeople);
    constellation.position.x = 100; // Offset to compare side by side
    scene.add(constellation);

    // Store people positions for keyboard navigation
    peoplePositionsRef.current = constellationPeople;

    // Create focus indicator for keyboard navigation
    const focusIndicator = createFocusIndicator();
    focusIndicatorRef.current = focusIndicator;
    scene.add(focusIndicator);

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

    // Keyboard handler for navigation
    const handleKeyDown = (event: KeyboardEvent): void => {
      const peopleList = peoplePositionsRef.current;
      if (peopleList.length === 0) return;

      const currentIndex = focusedIndexRef.current;
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          // Move to previous person (wrap around)
          newIndex = currentIndex <= 0 ? peopleList.length - 1 : currentIndex - 1;
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Move to next person (wrap around)
          newIndex = currentIndex >= peopleList.length - 1 ? 0 : currentIndex + 1;
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Open drawer for focused person
          if (currentIndex >= 0 && currentIndex < peopleList.length) {
            const person = peopleList[currentIndex];
            if (person) {
              selectPerson(person.id, []);
            }
          }
          return;
        case 'ArrowDown':
          event.preventDefault();
          // Close drawer
          clearSelection();
          return;
        default:
          return;
      }

      // Update focus index and move focus indicator
      focusedIndexRef.current = newIndex;
      const focusedPerson = peopleList[newIndex];
      if (focusedPerson && focusIndicatorRef.current) {
        focusIndicatorRef.current.position.set(
          focusedPerson.position.x,
          focusedPerson.position.y,
          focusedPerson.position.z
        );
        focusIndicatorRef.current.visible = true;

        // Animate camera to focused person
        if (cameraAnimatorRef.current) {
          const cameraOffset = new THREE.Vector3(0, 10, 40);
          const targetPosition = new THREE.Vector3(
            focusedPerson.position.x + cameraOffset.x,
            focusedPerson.position.y + cameraOffset.y,
            focusedPerson.position.z + cameraOffset.z
          );
          const lookAtTarget = new THREE.Vector3(
            focusedPerson.position.x,
            focusedPerson.position.y,
            focusedPerson.position.z
          );

          cameraAnimatorRef.current.animateTo(targetPosition, lookAtTarget, {
            duration: 0.8,
            easing: 'easeInOutCubic',
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Animation loop - use setAnimationLoop per INV-A002
    let elapsedTime = 0;
    renderer.setAnimationLoop(() => {
      const deltaTime = clockRef.current?.getDelta() ?? 0;
      elapsedTime += deltaTime;

      // Update camera animation
      if (cameraAnimatorRef.current) {
        cameraAnimatorRef.current.update(deltaTime);
      }

      // Update instanced constellation time uniform for animation
      if (instancedConstellationRef.current) {
        updateConstellationTime(instancedConstellationRef.current.uniforms, elapsedTime);
      }

      // Update edge system time uniform for flowing animation (Phase 2)
      if (edgeSystemRef.current) {
        updateEdgeSystemTime(edgeSystemRef.current.uniforms, elapsedTime);
      }

      // Update background particles time uniform for animation (Phase 3)
      if (backgroundParticlesRef.current) {
        updateBackgroundParticlesTime(backgroundParticlesRef.current.uniforms, elapsedTime);
      }

      // Update event fireflies time uniform for orbital animation (Phase 4)
      if (eventFirefliesRef.current) {
        updateEventFirefliesTime(eventFirefliesRef.current.uniforms, elapsedTime);
      }

      controls.update();

      // Render with or without post-processing (Phase 6)
      if (usePostProcessingRef.current && postProcessingRef.current) {
        renderWithPostProcessing(postProcessingRef.current.composer);
      } else {
        renderer.render(scene, camera);
      }
    });

    // Handle resize
    const handleResize = (): void => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);

        // Update post-processing size (Phase 6)
        if (postProcessingRef.current) {
          updatePostProcessingSize(postProcessingRef.current.composer, newWidth, newHeight);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Return cleanup function (INV-A009)
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleClick);
      renderer.setAnimationLoop(null);
      controls.dispose();
      selectionRef.current?.dispose();
      focusIndicatorRef.current = null;
      // Dispose instanced constellation (Phase 1 resources)
      if (instancedConstellationRef.current) {
        disposeInstancedConstellation(instancedConstellationRef.current.mesh);
        instancedConstellationRef.current = null;
      }
      // Dispose edge system (Phase 2 resources)
      if (edgeSystemRef.current) {
        disposeEdgeSystem(edgeSystemRef.current.mesh);
        edgeSystemRef.current = null;
      }
      // Dispose background particles (Phase 3 resources)
      if (backgroundParticlesRef.current) {
        disposeBackgroundParticles(backgroundParticlesRef.current.mesh);
        backgroundParticlesRef.current = null;
      }
      // Dispose event fireflies (Phase 4 resources)
      if (eventFirefliesRef.current) {
        disposeEventFireflies(eventFirefliesRef.current.mesh);
        eventFirefliesRef.current = null;
      }
      // Dispose sacred geometry grid (Phase 5 resources)
      if (sacredGeometryGridRef.current) {
        disposeSacredGeometryGrid(sacredGeometryGridRef.current);
        sacredGeometryGridRef.current = null;
      }
      // Dispose post-processing (Phase 6 resources)
      if (postProcessingRef.current) {
        disposePostProcessing(postProcessingRef.current.composer);
        postProcessingRef.current = null;
      }
      disposeScene(scene);
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [people, selectPerson, clearSelection, isLoading]);

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
