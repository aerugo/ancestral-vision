'use client';

/**
 * ConstellationCanvas - 3D visualization component for the family constellation
 *
 * Invariants:
 * - INV-A001: WebGPURenderer must be initialized with `await renderer.init()`
 * - INV-A002: Use `renderer.setAnimationLoop()` not `requestAnimationFrame()`
 * - INV-A009: Scene cleanup on component unmount (dispose geometry, materials, textures)
 *
 * Note: WebGL support has been deprecated. This component requires WebGPU.
 * Users with unsupported browsers will see an error message.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { WebGLRenderer, PerspectiveCamera, Scene } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRenderer, WebGPUNotSupportedError } from '@/visualization/renderer';
import { createScene, createCamera, createControls, disposeScene } from '@/visualization/scene';
import {
  createGhostConstellation,
  createBiographyConstellation,
  updateAnyConstellationTime,
  updateSelectionState,
  disposeInstancedConstellation,
  type ConstellationData,
  type InstancedConstellationResult,
} from '@/visualization/instanced-constellation';
import { getConnectedPersonIds } from '@/visualization/selection';
import { calculateBiographyWeight } from '@/visualization/layout';
import { getRandomColorIndex } from '@/visualization/materials';

/**
 * Placeholder person data for visualization
 */
interface PlaceholderPerson {
  id: string;
  givenName: string;
  position: { x: number; y: number; z: number };
}

/**
 * Generate placeholder people for testing/demo purposes
 * Creates people arranged in a spiral pattern
 */
function generatePlaceholderPeople(count: number): PlaceholderPerson[] {
  const people: PlaceholderPerson[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 4;
    const radius = 20 + i * 2;
    const height = (i % 5) * 10 - 20;
    people.push({
      id: `placeholder-${i}`,
      givenName: `Person ${i + 1}`,
      position: {
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
      },
    });
  }
  return people;
}
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
  updateSacredGeometryGrid,
  disposeSacredGeometryGrid,
} from '@/visualization/effects';
import {
  createPostProcessingPipeline,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessingPipeline,
  type PostProcessingPipelineResult,
} from '@/visualization/tsl-pipeline';
import { ConstellationSelection } from '@/visualization/selection';
import { CameraAnimator } from '@/visualization/camera-animation';
import {
  FamilyGraph,
  ForceDirectedLayout,
  type PersonInput,
  type ParentChildInput,
  type SpouseInput,
  type GraphEdge,
} from '@/visualization/layout';
import { useConstellationGraph } from '@/hooks/use-constellation-graph';
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
 * Result of layout calculation including positions and edges
 */
interface LayoutResult {
  people: PlaceholderPerson[];
  edges: GraphEdge[];
}

/**
 * Convert API people data to PlaceholderPerson format for visualization
 * Uses force-directed layout with golden angle distribution
 * Layout algorithm ported from: reference_prototypes/family-constellations/
 *
 * Uses FamilyGraph to build parent-child and spouse edges for layout
 */
function peopleToPlacelderPeople(
  people: Array<{ id: string; givenName: string | null; surname: string | null; generation: number; biography?: string | null }>,
  parentChildRelationships: ParentChildInput[] = [],
  centeredPersonId?: string,
  spouseRelationships: SpouseInput[] = []
): LayoutResult {
  if (people.length === 0) return { people: [], edges: [] };

  // Convert to PersonInput format for FamilyGraph
  const personInputs: PersonInput[] = people.map(person => ({
    id: person.id,
    name: person.givenName || person.surname || 'Unknown',
    biography: person.biography ?? undefined,
  }));

  // Build family graph with parent-child relationships
  // If no relationships provided, infer from generation structure
  let parentChild = parentChildRelationships;

  if (parentChild.length === 0) {
    console.warn('[peopleToPlacelderPeople] No parent-child relationships provided, generating demo relationships');
    // Fallback: Infer parent-child relationships from generation structure
    // Group by generation and connect to adjacent generations
    const genMap = new Map<number, typeof people>();
    people.forEach(person => {
      const gen = person.generation;
      if (!genMap.has(gen)) genMap.set(gen, []);
      genMap.get(gen)!.push(person);
    });

    const sortedGens = Array.from(genMap.keys()).sort((a, b) => a - b);
    parentChild = [];

    for (let i = 0; i < sortedGens.length - 1; i++) {
      const currentGen = sortedGens[i];
      const nextGen = sortedGens[i + 1];
      if (currentGen === undefined || nextGen === undefined) continue;

      const currentPeople = genMap.get(currentGen) || [];
      const nextPeople = genMap.get(nextGen) || [];

      // Connect each person in current gen to 1-2 people in next gen
      currentPeople.forEach((person, idx) => {
        const connectCount = Math.min(2, nextPeople.length);
        for (let j = 0; j < connectCount; j++) {
          const targetIndex = (idx + j) % nextPeople.length;
          const targetPerson = nextPeople[targetIndex];
          if (targetPerson) {
            parentChild.push({
              parentId: person.id,
              childId: targetPerson.id,
            });
          }
        }
      });
    }
  }

  // Build the graph with parent-child and spouse relationships
  const graph = new FamilyGraph(
    personInputs,
    parentChild,
    centeredPersonId ?? people[0]?.id,
    spouseRelationships
  );

  // Get nodes array and edges
  const nodes = graph.getNodesArray();
  const edges = graph.edges;

  const spouseEdgeCount = edges.filter(e => e.type === 'spouse').length;
  const parentChildEdgeCount = edges.filter(e => e.type === 'parent-child').length;
  console.log(`[peopleToPlacelderPeople] Graph built: ${nodes.length} nodes, ${parentChildEdgeCount} parent-child edges, ${spouseEdgeCount} spouse edges (invisible)`);

  // Run force-directed layout
  const layout = new ForceDirectedLayout();
  layout.calculate(nodes, edges, graph.centeredId);

  // Convert to PlaceholderPerson format
  const result: PlaceholderPerson[] = people.map(person => {
    const node = graph.nodes.get(person.id);
    const pos = node?.position ?? { x: 0, y: 0, z: 0 };
    return {
      id: person.id,
      givenName: person.givenName || person.surname || 'Unknown',
      position: {
        x: pos.x,
        y: pos.y,
        z: pos.z,
      },
    };
  });

  return { people: result, edges };
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
  // Ghost constellation for nodes without biography (small, semi-transparent, blue mandala)
  const ghostConstellationRef = useRef<InstancedConstellationResult | null>(null);
  // Biography constellation for nodes with biography (cloud effect with palette colors)
  const biographyConstellationRef = useRef<InstancedConstellationResult | null>(null);
  const edgeSystemRef = useRef<EdgeSystemResult | null>(null);
  const backgroundParticlesRef = useRef<BackgroundParticleResult | null>(null);
  const eventFirefliesRef = useRef<EventFireflyResult | null>(null);
  const sacredGeometryGridRef = useRef<THREE.Group | null>(null);
  const postProcessingRef = useRef<PostProcessingPipelineResult | null>(null);

  // WebGPU error state for user-friendly error display
  const [webGPUError, setWebGPUError] = useState<string | null>(null);

  // Fetch constellation graph data (people + relationships) for layout
  const { data: graphData, isLoading, isError, error } = useConstellationGraph();
  const { selectPerson, clearSelection } = useSelectionStore();

  // Keyboard navigation state (using refs to avoid re-initializing scene)
  const focusedIndexRef = useRef<number>(-1);
  const focusIndicatorRef = useRef<THREE.Mesh | null>(null);
  const peoplePositionsRef = useRef<PlaceholderPerson[]>([]);

  // Debug logging
  if (isError) {
    console.error('[ConstellationCanvas] Failed to fetch constellation graph:', error);
  }
  if (!isLoading && !isError) {
    console.log('[ConstellationCanvas] Constellation graph loaded:', graphData?.rawPeople?.length ?? 0, 'people,', graphData?.parentChildRelationships?.length ?? 0, 'parent-child relationships');
  }

  const initScene = useCallback(async (): Promise<(() => void) | undefined> => {
    console.log('[initScene] Starting initialization...');
    const container = containerRef.current;
    if (!container) {
      console.log('[initScene] No container ref, returning');
      return undefined;
    }
    console.log('[initScene] Container found, creating canvas...');

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
    console.log('[initScene] Creating renderer...');
    let renderer: WebGLRenderer;
    try {
      renderer = await createRenderer(canvas);
      console.log('[initScene] Renderer created:', renderer);
      rendererRef.current = renderer;
    } catch (err) {
      if (err instanceof WebGPUNotSupportedError) {
        console.warn('[initScene] WebGPU not supported:', err.message);
        setWebGPUError(err.message);
      } else {
        console.error('[initScene] Renderer creation failed:', err);
        setWebGPUError('Failed to initialize 3D renderer. Please try refreshing the page.');
      }
      // Clean up canvas on error
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return undefined;
    }

    console.log('[initScene] Creating scene and camera...');
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
    // Layout result includes both positioned people AND proper edges with types
    const layoutResult =
      graphData && graphData.rawPeople.length > 0
        ? peopleToPlacelderPeople(
            graphData.rawPeople,
            graphData.parentChildRelationships,
            graphData.centeredPersonId,
            graphData.spouseRelationships
          )
        : isLoading
          ? { people: [], edges: [] } // Don't show anything while loading
          : { people: generatePlaceholderPeople(10), edges: [] }; // Only show placeholder if no data after load

    const constellationPeople = layoutResult.people;
    const graphEdges = layoutResult.edges;

    // Split nodes by biography presence (not family relationships)
    // - Ghost nodes: no biography - small, semi-transparent, blue mandala
    // - Biography nodes: has biography - cloud effect with palette colors
    const positions: THREE.Vector3[] = [];
    const biographyWeights: number[] = [];
    const positionMap = new Map<string, THREE.Vector3>(); // Map person ID to position for edge rendering
    const personIdToIndex = new Map<string, number>(); // Map person ID to index in positions array

    if (constellationPeople.length > 0) {
      // Split by biography presence
      interface PersonWithBio extends PlaceholderPerson {
        hasBiography: boolean;
        biographyWeight: number;
      }

      const ghostPeople: PersonWithBio[] = [];
      const biographyPeople: PersonWithBio[] = [];

      constellationPeople.forEach((p, idx) => {
        // Look up the raw person data to check for biography
        const rawPerson = graphData?.rawPeople?.find(rp => rp.id === p.id);
        const biography = rawPerson?.biography;
        const hasBio = Boolean(biography && biography.trim().length > 0);
        const bioWeight = calculateBiographyWeight(biography ?? undefined);

        const pos = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
        positionMap.set(p.id, pos);
        positions.push(pos);
        biographyWeights.push(bioWeight);
        personIdToIndex.set(p.id, idx);

        const personWithBio: PersonWithBio = {
          ...p,
          hasBiography: hasBio ?? false,
          biographyWeight: bioWeight,
        };

        if (hasBio) {
          biographyPeople.push(personWithBio);
        } else {
          ghostPeople.push(personWithBio);
        }
      });

      console.log(`[initScene] Biography-based split: ${biographyPeople.length} with biography, ${ghostPeople.length} ghost nodes`);

      // Create ghost constellation for nodes without biography
      // Small, semi-transparent, ghostly blue with swirling mandala pattern
      if (ghostPeople.length > 0) {
        const ghostData = {
          positions: ghostPeople.map(p => new THREE.Vector3(p.position.x, p.position.y, p.position.z)),
          biographyWeights: ghostPeople.map(() => 0), // No biography weight for ghosts
          personIds: ghostPeople.map(p => p.id),
        };

        const ghostResult = createGhostConstellation(ghostData);
        ghostConstellationRef.current = ghostResult;
        scene.add(ghostResult.mesh);
        console.log(`[initScene] Ghost constellation created: ${ghostPeople.length} nodes`);
      }

      // Create biography constellation for nodes with biography
      // Cloud effect with palette colors and selection glow
      if (biographyPeople.length > 0) {
        const bioData: ConstellationData = {
          positions: biographyPeople.map(p => new THREE.Vector3(p.position.x, p.position.y, p.position.z)),
          biographyWeights: biographyPeople.map(p => p.biographyWeight),
          personIds: biographyPeople.map(p => p.id),
          colorIndices: biographyPeople.map(() => getRandomColorIndex()),
        };

        const bioResult = createBiographyConstellation(bioData);
        biographyConstellationRef.current = bioResult;
        scene.add(bioResult.mesh);
        console.log(`[initScene] Biography constellation created: ${biographyPeople.length} nodes`);
      }
    }

    // Store person ID to index mapping for selection state updates
    const personIdToIndexRef = personIdToIndex;

    // Add edge system - use REAL edges from FamilyGraph with proper types
    // Filter out spouse edges (invisible - for layout clustering only)
    if (positions.length > 1 && graphEdges.length > 0) {
      const visualEdges: EdgeSystemData['edges'] = graphEdges
        .filter((edge): edge is GraphEdge & { type: 'parent-child' } => edge.type === 'parent-child')
        .map(edge => {
          const sourcePos = positionMap.get(edge.sourceId);
          const targetPos = positionMap.get(edge.targetId);
          if (!sourcePos || !targetPos) return null;
          return {
            id: edge.id,
            sourcePosition: sourcePos,
            targetPosition: targetPos,
            type: edge.type,
            strength: edge.strength,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      if (visualEdges.length > 0) {
        const edgeResult = createEdgeSystem({ edges: visualEdges }, { material: { enhancedMode: true } });
        edgeSystemRef.current = edgeResult;
        scene.add(edgeResult.mesh);
      }
    }

    // Add background particles - atmospheric Haeckel-inspired particles
    const particleResult = createBackgroundParticles({
      count: 300,
      innerRadius: 100,
      outerRadius: 400,
    });
    backgroundParticlesRef.current = particleResult;
    scene.add(particleResult.mesh);

    // Add event fireflies - orbital particles representing life events
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

    // Setup post-processing - TSL bloom and vignette
    // Higher threshold (0.5) ensures only bright selected/connected nodes bloom
    try {
      const postProcessingResult = createPostProcessingPipeline(renderer, scene, camera, {
        bloom: {
          enabled: true,
          strength: 2.0,
          radius: 0.8,
          threshold: 0.4,
        },
        vignette: {
          enabled: true,
          darkness: 0.4,
          offset: 0.3,
        },
      });
      postProcessingRef.current = postProcessingResult;
      console.log('[ConstellationCanvas] TSL post-processing enabled');
    } catch (error) {
      console.warn('[ConstellationCanvas] Post-processing setup failed:', error);
      postProcessingRef.current = null;
    }

    // Store people positions for keyboard navigation
    peoplePositionsRef.current = constellationPeople;

    // Create focus indicator for keyboard navigation
    const focusIndicator = createFocusIndicator();
    focusIndicatorRef.current = focusIndicator;
    scene.add(focusIndicator);

    // Helper function to update selection state on constellation meshes
    const updateConstellationSelectionState = (
      selectedPersonId: string | null,
      connectedIds: string[]
    ): void => {
      // Update ghost constellation selection state
      if (ghostConstellationRef.current) {
        const ghostPersonIds = ghostConstellationRef.current.mesh.userData.personIds as string[];
        const selectedIdx = selectedPersonId ? ghostPersonIds.indexOf(selectedPersonId) : -1;
        const connectedIdxs = connectedIds
          .map(id => ghostPersonIds.indexOf(id))
          .filter(idx => idx >= 0);

        updateSelectionState(
          ghostConstellationRef.current.selectionStateAttribute,
          selectedIdx >= 0 ? selectedIdx : null,
          connectedIdxs
        );
      }

      // Update biography constellation selection state
      if (biographyConstellationRef.current) {
        const bioPersonIds = biographyConstellationRef.current.mesh.userData.personIds as string[];
        const selectedIdx = selectedPersonId ? bioPersonIds.indexOf(selectedPersonId) : -1;
        const connectedIdxs = connectedIds
          .map(id => bioPersonIds.indexOf(id))
          .filter(idx => idx >= 0);

        updateSelectionState(
          biographyConstellationRef.current.selectionStateAttribute,
          selectedIdx >= 0 ? selectedIdx : null,
          connectedIdxs
        );
      }
    };

    // Click handler for selection
    const handleClick = (event: MouseEvent): void => {
      if (!selectionRef.current || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const personId = selectionRef.current.getIntersectedPerson(x, y);
      if (personId) {
        // Get connected person IDs from the graph for selection highlighting
        const connectedIds = getConnectedPersonIds(
          personId,
          graphData?.parentChildRelationships ?? [],
          graphData?.spouseRelationships ?? []
        );

        // Update Zustand store
        selectPerson(personId, connectedIds);

        // Update selection state on constellation meshes for glow highlighting
        updateConstellationSelectionState(personId, connectedIds);
      } else {
        // Clicked on empty space - clear selection
        clearSelection();
        updateConstellationSelectionState(null, []);
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

      // Update ghost constellation time uniform for mandala animation
      if (ghostConstellationRef.current) {
        updateAnyConstellationTime(ghostConstellationRef.current.uniforms, elapsedTime);
      }

      // Update biography constellation time uniform for cloud flow animation
      if (biographyConstellationRef.current) {
        updateAnyConstellationTime(biographyConstellationRef.current.uniforms, elapsedTime);
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

      // Update sacred geometry grid animation (Phase 5) - slow rotation
      if (sacredGeometryGridRef.current) {
        updateSacredGeometryGrid(sacredGeometryGridRef.current, elapsedTime);
      }

      controls.update();

      // Render with TSL post-processing (Phase 2 WebGPU Graphics Engine)
      // INV-A013: TSL PostProcessing works with both WebGPU and WebGL renderers
      if (postProcessingRef.current) {
        renderWithPostProcessing(postProcessingRef.current);
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

        // Update post-processing size (Phase 2 WebGPU Graphics Engine)
        if (postProcessingRef.current) {
          updatePostProcessingSize(postProcessingRef.current, newWidth, newHeight);
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
      // Dispose ghost constellation (nodes without biography - mandala pattern)
      if (ghostConstellationRef.current) {
        disposeInstancedConstellation(ghostConstellationRef.current.mesh);
        ghostConstellationRef.current = null;
      }
      // Dispose biography constellation (nodes with biography - cloud effect)
      if (biographyConstellationRef.current) {
        disposeInstancedConstellation(biographyConstellationRef.current.mesh);
        biographyConstellationRef.current = null;
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
      // Dispose post-processing (Phase 2 WebGPU Graphics Engine - INV-A009)
      if (postProcessingRef.current) {
        disposePostProcessingPipeline(postProcessingRef.current);
        postProcessingRef.current = null;
      }
      disposeScene(scene);
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [graphData, selectPerson, clearSelection, isLoading]);

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

  // Show error message if WebGPU is not supported
  if (webGPUError) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950"
        data-testid="constellation-canvas-error"
      >
        <div className="max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🌌</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            WebGPU Required
          </h2>
          <p className="text-slate-400 mb-4">
            {webGPUError}
          </p>
          <p className="text-sm text-slate-500">
            Supported browsers: Chrome 113+, Edge 113+, or other WebGPU-enabled browsers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="constellation-canvas"
    />
  );
}
