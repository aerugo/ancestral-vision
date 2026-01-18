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
  ConstellationManager,
  type ConstellationPersonData,
} from '@/visualization/constellation-manager';
import { getConnectedPersonIds } from '@/visualization/selection';
import { calculateBiographyWeight } from '@/visualization/layout';
import { getRandomColorIndex } from '@/visualization/materials/palette';

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
  updateEdgePulseIntensities,
  updateEdgePulseIntensitiesSmooth,
  type EdgeSystemData,
  type EdgeSystemResult,
} from '@/visualization/edges';
import {
  PathPulseAnimator,
} from '@/visualization/path-pulse';
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
import {
  biographyTransitionEvents,
  setTransitionStarted,
  setTransitionCompleted,
} from '@/visualization/biography-transition-events';
import {
  BiographyTransitionAnimator,
  createMetamorphosisParticles,
  updateMetamorphosisParticles,
  setMetamorphosisParticleOrigin,
  setMetamorphosisTargetRadius,
  disposeMetamorphosisParticles,
  type MetamorphosisParticleResult,
} from '@/visualization/biography-transition';
// ConstellationManager handles ghost/biography pools with dynamic add/remove
// No longer need direct imports from instanced-constellation
import * as THREE from 'three';
// Animation System A/B Test (INV-A010)
import { useAnimationModeStore } from '@/stores/animation-mode-store';
import {
  AnimationSystem,
  ConstellationAnimationSetup,
  AnimationInspector,
} from '@/visualization/animation';

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
 * Result of layout calculation including positions, edges, and graph
 */
interface LayoutResult {
  people: PlaceholderPerson[];
  edges: GraphEdge[];
  /** FamilyGraph reference for pulse animation path-finding */
  graph: FamilyGraph | null;
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
  if (people.length === 0) return { people: [], edges: [], graph: null };

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

  return { people: result, edges, graph };
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
  // Constellation manager for pooled ghost/biography nodes with dynamic add/remove
  const constellationManagerRef = useRef<ConstellationManager | null>(null);
  const edgeSystemRef = useRef<EdgeSystemResult | null>(null);
  const backgroundParticlesRef = useRef<BackgroundParticleResult | null>(null);
  const eventFirefliesRef = useRef<EventFireflyResult | null>(null);
  const sacredGeometryGridRef = useRef<THREE.Group | null>(null);
  const postProcessingRef = useRef<PostProcessingPipelineResult | null>(null);
  // Pulse animation for selection transitions
  const pulseAnimatorRef = useRef<PathPulseAnimator | null>(null);
  const graphRef = useRef<FamilyGraph | null>(null);
  // Biography transition animation for ghost-to-biography metamorphosis
  const biographyTransitionRef = useRef<BiographyTransitionAnimator | null>(null);
  const metamorphosisParticlesRef = useRef<MetamorphosisParticleResult | null>(null);
  // Reveal sphere that fades in during particle reformation (temporary until real node appears)
  const revealSphereRef = useRef<THREE.Mesh | null>(null);
  // Camera state to restore after scene rebuild (preserves position during biography transition)
  const cameraStateToRestoreRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // Animation System A/B Test (INV-A010)
  // These refs allow switching between legacy manual updates and unified AnimationSystem
  const animationSystemRef = useRef<AnimationSystem | null>(null);
  const animationSetupRef = useRef<ConstellationAnimationSetup | null>(null);
  const animationInspectorRef = useRef<AnimationInspector | null>(null);

  // WebGPU error state for user-friendly error display
  const [webGPUError, setWebGPUError] = useState<string | null>(null);

  // Animation mode for A/B testing (legacy vs AnimationSystem)
  const animationMode = useAnimationModeStore((state) => state.mode);

  // Fetch constellation graph data (people + relationships) for layout
  const { data: graphData, isLoading, isError, error } = useConstellationGraph();
  const { selectPerson, clearSelection } = useSelectionStore();

  // Keyboard navigation state (using refs to avoid re-initializing scene)
  const focusedIndexRef = useRef<number>(-1);
  const focusIndicatorRef = useRef<THREE.Mesh | null>(null);
  const peoplePositionsRef = useRef<PlaceholderPerson[]>([]);

  // Track previous graphData for incremental updates
  const prevGraphDataRef = useRef<typeof graphData>(null);
  // Flag to skip rebuild when applying incremental updates
  const skipRebuildRef = useRef(false);

  // Debug logging
  if (isError) {
    console.error('[ConstellationCanvas] Failed to fetch constellation graph:', error);
  }
  if (!isLoading && !isError) {
    console.log('[ConstellationCanvas] Constellation graph loaded:', graphData?.rawPeople?.length ?? 0, 'people,', graphData?.parentChildRelationships?.length ?? 0, 'parent-child relationships');
  }

  const initScene = useCallback(async (): Promise<(() => void) | undefined> => {
    // Check if we should skip rebuild (incremental update was applied)
    if (skipRebuildRef.current) {
      console.log('[initScene] Skipping rebuild - incremental update was applied');
      skipRebuildRef.current = false;
      return undefined;
    }

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

    // Restore camera state if transitioning from biography animation
    // This prevents the camera from jumping back to default position after scene rebuild
    if (cameraStateToRestoreRef.current) {
      camera.position.copy(cameraStateToRestoreRef.current.position);
      controls.target.copy(cameraStateToRestoreRef.current.target);
      controls.update();
      cameraStateToRestoreRef.current = null;
      console.log('[initScene] Restored camera state after biography transition');
    }

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
          ? { people: [], edges: [], graph: null } // Don't show anything while loading
          : { people: generatePlaceholderPeople(10), edges: [], graph: null }; // Only show placeholder if no data after load

    const constellationPeople = layoutResult.people;
    const graphEdges = layoutResult.edges;

    // Store graph reference for pulse animation path-finding
    graphRef.current = layoutResult.graph;

    // Create pulse animator for selection transitions
    // Slow, organic pulse with breathing effect at target
    pulseAnimatorRef.current = new PathPulseAnimator({
      hopDuration: 0.4,
      minDuration: 0.8,
      maxDuration: 4.0,
      easing: 'easeInOutCubic',
      pulseWidth: 0.35,
      breathingDuration: 1.8,
    });

    // Create biography transition animator for ghost-to-biography metamorphosis
    biographyTransitionRef.current = new BiographyTransitionAnimator({
      duration: 5.0, // Duration for full animation: explosion + reformation + bright reveal
      easing: 'easeInOutCubic',
      cameraZoomDistance: 25, // Zoom closer to see the effect
    });

    // Create metamorphosis particle system (hidden until animation starts)
    // Uses new defaults: 2000 particles, 35 maxRadius, 24 pointSize for dramatic effect
    const metamorphosisResult = createMetamorphosisParticles();
    metamorphosisParticlesRef.current = metamorphosisResult;
    scene.add(metamorphosisResult.mesh);

    // Create reveal sphere (fades in during particle reformation, hidden until needed)
    // This provides a smooth transition before the real biography node appears
    const revealSphereGeometry = new THREE.SphereGeometry(3, 32, 32);
    const revealSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4a84a, // Sacred Gold
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const revealSphere = new THREE.Mesh(revealSphereGeometry, revealSphereMaterial);
    revealSphere.visible = false;
    revealSphereRef.current = revealSphere;
    scene.add(revealSphere);

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

      // Create ConstellationManager and initialize with all people
      // The manager handles both ghost and biography pools with dynamic add/remove
      const allPeopleData: ConstellationPersonData[] = [
        ...ghostPeople.map(p => ({
          id: p.id,
          hasBiography: false,
          biographyWeight: 0,
          position: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
          colorIndex: getRandomColorIndex(),
        })),
        ...biographyPeople.map(p => ({
          id: p.id,
          hasBiography: true,
          biographyWeight: p.biographyWeight,
          position: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
          colorIndex: getRandomColorIndex(),
        })),
      ];

      constellationManagerRef.current = new ConstellationManager();
      constellationManagerRef.current.initialize(scene, { people: allPeopleData });
      console.log(`[initScene] ConstellationManager initialized: ${ghostPeople.length} ghost, ${biographyPeople.length} biography nodes`);

      // Store graphData for incremental update comparison
      prevGraphDataRef.current = graphData;
    }

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
            sourceId: edge.sourceId,
            targetId: edge.targetId,
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
    // Only nodes with events get fireflies
    if (positions.length > 0 && constellationPeople.length > 0) {
      // Build event types array based on eventCount from API
      // For now, use placeholder event type; real event types can be fetched later
      const nodeEventTypes: string[][] = constellationPeople.map((p) => {
        const rawPerson = graphData?.rawPeople?.find(rp => rp.id === p.id);
        const eventCount = rawPerson?.eventCount ?? 0;
        // Return empty array if no events, otherwise placeholder events
        return eventCount > 0 ? Array(eventCount).fill('default') : [];
      });

      const fireflyResult = createEventFireflies({
        nodePositions: positions,
        nodeBiographyWeights: biographyWeights,
        nodeEventTypes,
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
      // ConstellationManager handles both ghost and biography pools
      constellationManagerRef.current?.updateSelectionState(selectedPersonId, connectedIds);
    };

    // Helper to update pulse intensities from animator state
    const updatePulseIntensities = (): void => {
      if (!pulseAnimatorRef.current?.isAnimating()) return;

      const nodeIntensities = pulseAnimatorRef.current.getAllNodeIntensities();

      // ConstellationManager handles pulse intensity for both pools
      constellationManagerRef.current?.updatePulseIntensity(nodeIntensities);

      // Update edge pulse intensities with smooth per-vertex falloff (light orb effect)
      if (edgeSystemRef.current) {
        const pulseDetails = pulseAnimatorRef.current.getEdgePulseDetails();
        const progressAttribute = edgeSystemRef.current.mesh.geometry.getAttribute('aProgress') as THREE.BufferAttribute | null;
        if (progressAttribute) {
          updateEdgePulseIntensitiesSmooth(
            edgeSystemRef.current.pulseIntensityAttribute,
            progressAttribute,
            edgeSystemRef.current.segmentMapping,
            pulseDetails,
            0.4 // Pulse width - controls how wide the orb glow is
          );
        }
      }
    };

    // Helper to clear all pulse intensities
    const clearPulseIntensities = (): void => {
      const emptyMap = new Map<string, number>();

      // ConstellationManager clears pulse intensity for both pools
      constellationManagerRef.current?.updatePulseIntensity(emptyMap);

      if (edgeSystemRef.current) {
        updateEdgePulseIntensities(
          edgeSystemRef.current.pulseIntensityAttribute,
          edgeSystemRef.current.segmentMapping,
          emptyMap
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

        // Get previous selection for pulse animation
        const previousId = useSelectionStore.getState().selectedPersonId;

        // Check if we should trigger a pulse animation
        let pulseAnimationStarted = false;
        if (previousId && previousId !== personId && graphRef.current) {
          // Find path between previous and new selection
          const path = graphRef.current.findPath(previousId, personId);

          if (path && path.length > 1) {
            pulseAnimationStarted = true;

            // Cancel any existing animation
            pulseAnimatorRef.current?.cancel();
            clearPulseIntensities();

            // Start pulse animation with two callbacks:
            // - onArrival: apply selection glow when pulse reaches target (start of breathing)
            // - onComplete: clear pulse intensities after breathing ends
            pulseAnimatorRef.current?.start(
              path,
              () => {
                // Pulse arrived at target - apply selection glow now
                // This ensures breathing fades seamlessly into the selection state
                updateConstellationSelectionState(personId, connectedIds);
              },
              () => {
                // Breathing complete - clear pulse intensities
                clearPulseIntensities();
              }
            );
          }
        }

        // Update Zustand store
        selectPerson(personId, connectedIds);

        // Update selection state on constellation meshes for glow highlighting
        // Only update immediately if no pulse animation was started
        if (!pulseAnimationStarted) {
          updateConstellationSelectionState(personId, connectedIds);
        }
      } else {
        // Clicked on empty space - clear selection
        clearSelection();
        updateConstellationSelectionState(null, []);

        // Cancel any pulse animation
        pulseAnimatorRef.current?.cancel();
        clearPulseIntensities();
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

    // Subscribe to biography transition events for ghost-to-biography metamorphosis
    const unsubscribeBiographyTransition = biographyTransitionEvents.subscribe((personId) => {
      console.log('[BiographyTransition] Received event for person:', personId);

      // Use ConstellationManager to check if person is a ghost node and get position
      if (!constellationManagerRef.current?.isGhostNode(personId)) {
        console.log('[BiographyTransition] Person not found in ghost pool, skipping animation');
        return;
      }

      const nodePosition = constellationManagerRef.current.getNodePosition(personId);
      if (!nodePosition) {
        console.log('[BiographyTransition] Could not get node position');
        return;
      }

      console.log('[BiographyTransition] Node position:', nodePosition.toArray());

      // Mark transition as in progress to delay query invalidation
      setTransitionStarted();

      // Start the transition in ConstellationManager (sets up biography node at scale 0)
      constellationManagerRef.current.startTransition(personId, 0.1);

      // Start the visual animation
      biographyTransitionRef.current?.start(personId, nodePosition, {
        onCameraZoomStart: (targetPos, zoomDistance) => {
          console.log('[BiographyTransition] Camera zoom start to:', targetPos.toArray(), 'distance:', zoomDistance);
          if (cameraAnimatorRef.current && cameraRef.current && controlsRef.current) {
            // Calculate camera position: maintain current viewing angle but move closer
            const currentPos = cameraRef.current.position.clone();
            const dirToTarget = new THREE.Vector3().subVectors(targetPos, currentPos);

            // Normalize and calculate zoom position
            dirToTarget.normalize();
            const zoomPosition = targetPos.clone().sub(dirToTarget.multiplyScalar(zoomDistance));
            console.log('[BiographyTransition] Camera zoom position:', zoomPosition.toArray());

            // Update OrbitControls target FIRST - this ensures controls won't fight the animation
            controlsRef.current.target.copy(targetPos);

            // Start the camera animation
            cameraAnimatorRef.current.animateTo(zoomPosition, targetPos, {
              duration: 1.0,
              easing: 'easeInOutCubic',
            });
          }
        },
        onCameraZoomComplete: () => {
          console.log('[BiographyTransition] Camera zoom complete');
        },
        onParticleBurstStart: (position) => {
          console.log('[BiographyTransition] Particle burst start at:', position);
          if (metamorphosisParticlesRef.current) {
            setMetamorphosisParticleOrigin(metamorphosisParticlesRef.current.uniforms, position);
            // Target radius matches a biography node with minimal weight
            // sphereRadius (2) * baseScale (1.0) = 2, plus a bit for visual size
            setMetamorphosisTargetRadius(metamorphosisParticlesRef.current.uniforms, 3);
            metamorphosisParticlesRef.current.mesh.visible = true;
          }
          // Position reveal sphere at node location (backup for seamless transition)
          if (revealSphereRef.current) {
            revealSphereRef.current.position.copy(position);
            revealSphereRef.current.visible = true;
            (revealSphereRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        },
        onComplete: () => {
          console.log('[BiographyTransition] Animation complete');
          // Hide particles (they've faded out by now)
          if (metamorphosisParticlesRef.current) {
            metamorphosisParticlesRef.current.mesh.visible = false;
          }
          // Hide reveal sphere - with pooled architecture the biography node is already visible
          if (revealSphereRef.current) {
            revealSphereRef.current.visible = false;
          }
          // Complete the transition in ConstellationManager (removes ghost, finalizes biography)
          constellationManagerRef.current?.completeTransition();
          // Mark transition complete - this will trigger the pending query invalidation
          setTransitionCompleted();
        },
      });
    });

    // Animation System A/B Test (INV-A010)
    // Initialize AnimationSystem for unified time management
    const animSystem = new AnimationSystem();
    animationSystemRef.current = animSystem;
    animationSetupRef.current = new ConstellationAnimationSetup(animSystem);
    animationInspectorRef.current = new AnimationInspector(animSystem);

    // Expose animation controls to console in development
    if (process.env.NODE_ENV === 'development') {
      animationInspectorRef.current.exposeGlobally('__animationSystem');
    }

    // Register uniforms with AnimationSystem for unified updates
    // Note: ghost/biography uniforms are managed internally by ConstellationManager
    if (edgeSystemRef.current) {
      animationSetupRef.current.registerEdges(edgeSystemRef.current.uniforms);
    }
    if (backgroundParticlesRef.current) {
      animationSetupRef.current.registerBackgroundParticles(backgroundParticlesRef.current.uniforms);
    }
    if (eventFirefliesRef.current) {
      animationSetupRef.current.registerEventFireflies(eventFirefliesRef.current.uniforms);
    }

    // Animation loop - use setAnimationLoop per INV-A002
    let elapsedTimeLegacy = 0; // Used only in legacy mode
    renderer.setAnimationLoop(() => {
      // Cap delta time to prevent "catch up" after sleep/tab suspend
      const rawDelta = clockRef.current?.getDelta() ?? 0;
      const deltaTime = Math.min(rawDelta, 0.1); // Max 100ms per frame

      // Get current animation mode from store
      const currentMode = useAnimationModeStore.getState().mode;

      // Time management differs based on mode
      let elapsedTime: number;
      if (currentMode === 'animation-system') {
        // AnimationSystem mode: unified time management with pause/resume/timeScale
        animSystem.update(deltaTime);
        elapsedTime = animSystem.getElapsedTime();
      } else {
        // Legacy mode: manual time accumulation
        elapsedTimeLegacy += deltaTime;
        elapsedTime = elapsedTimeLegacy;
      }

      // Update camera animation
      if (cameraAnimatorRef.current) {
        cameraAnimatorRef.current.update(deltaTime);
      }

      // Update pulse animation for selection transitions
      if (pulseAnimatorRef.current?.isAnimating()) {
        pulseAnimatorRef.current.update(deltaTime);
        updatePulseIntensities();
      }

      // Update biography transition animation for ghost-to-biography metamorphosis
      if (biographyTransitionRef.current?.isAnimating()) {
        biographyTransitionRef.current.update(deltaTime);
        const state = biographyTransitionRef.current.getState();

        // ConstellationManager handles ghost shrink and biography grow
        constellationManagerRef.current?.updateTransition(state.progress);

        // Update metamorphosis particles - use full progress for the new vortex animation
        // The particle system handles its own internal phasing (implosion/compression/explosion)
        if (metamorphosisParticlesRef.current && state.progress > 0) {
          updateMetamorphosisParticles(
            metamorphosisParticlesRef.current.uniforms,
            state.progress,
            elapsedTime
          );
        }

        // Fade in reveal sphere during reconvene phase (0.55-0.85)
        // The sphere emerges from within the particle cloud as it forms
        // This is a backup for the seamless transition - the biography node grows via ConstellationManager
        if (revealSphereRef.current) {
          const material = revealSphereRef.current.material as THREE.MeshBasicMaterial;
          if (state.progress >= 0.55) {
            // Fade from 0 to 1 over the range 0.55-0.85
            const fadeProgress = Math.min((state.progress - 0.55) / 0.30, 1);
            // Use easeInOutCubic for smooth emergence
            const eased = fadeProgress < 0.5
              ? 4 * fadeProgress * fadeProgress * fadeProgress
              : 1 - Math.pow(-2 * fadeProgress + 2, 3) / 2;
            // Increase max brightness during peak glow (0.75-0.88)
            const glowBoost = state.progress >= 0.75 && state.progress < 0.88
              ? 1.0 + Math.sin((state.progress - 0.75) / 0.13 * Math.PI) * 0.6
              : 1.0;
            material.opacity = eased * 0.95 * glowBoost;
            // Scale from tiny (0.2) to full (1.0) - emerge from within particle cloud
            const scale = 0.2 + eased * 0.8;
            revealSphereRef.current.scale.setScalar(scale);
            // Pulse the color brightness during glow phase
            const brightness = 0.83 + (glowBoost - 1) * 0.34; // 0.83 to 1.0
            material.color.setRGB(brightness, brightness * 0.79, brightness * 0.35);
          }
        }
      }

      // Update constellation time uniforms for animations (ghost mandala + biography cloud)
      constellationManagerRef.current?.updateTime(elapsedTime);

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

      // Only update controls when camera is not animating
      // Otherwise OrbitControls will fight with the camera animation
      if (!cameraAnimatorRef.current?.isAnimating()) {
        controls.update();
      }

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
      // Save camera state before cleanup so it can be restored on scene rebuild
      // This preserves the camera position when data changes (e.g., adding/removing biography)
      if (cameraRef.current && controlsRef.current) {
        cameraStateToRestoreRef.current = {
          position: cameraRef.current.position.clone(),
          target: controlsRef.current.target.clone(),
        };
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleClick);
      unsubscribeBiographyTransition();
      renderer.setAnimationLoop(null);
      controls.dispose();
      selectionRef.current?.dispose();
      focusIndicatorRef.current = null;
      // Cancel any ongoing biography transition
      biographyTransitionRef.current?.cancel();
      biographyTransitionRef.current = null;
      constellationManagerRef.current?.cancelTransition();
      // Dispose constellation pools (ghost and biography nodes)
      constellationManagerRef.current?.dispose();
      constellationManagerRef.current = null;
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
      // Dispose metamorphosis particles (biography transition animation)
      if (metamorphosisParticlesRef.current) {
        disposeMetamorphosisParticles(metamorphosisParticlesRef.current.mesh);
        metamorphosisParticlesRef.current = null;
      }
      // Dispose reveal sphere (biography transition animation)
      if (revealSphereRef.current) {
        revealSphereRef.current.geometry.dispose();
        (revealSphereRef.current.material as THREE.Material).dispose();
        revealSphereRef.current = null;
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

  // Handle incremental constellation updates when graphData changes
  // This avoids rebuilding the entire scene for biography add/remove
  useEffect(() => {
    // Skip on initial mount or if no manager
    if (!constellationManagerRef.current || !graphData || !prevGraphDataRef.current) {
      // Store current data for next comparison
      prevGraphDataRef.current = graphData;
      return;
    }

    // Check if the people set is the same (only biography status changed)
    const prevPeople = prevGraphDataRef.current.rawPeople;
    const currPeople = graphData.rawPeople;

    if (prevPeople.length !== currPeople.length) {
      // People added or removed - need full rebuild (handled by initScene)
      prevGraphDataRef.current = graphData;
      return;
    }

    // Check if same person IDs (order doesn't matter)
    const prevIds = new Set(prevPeople.map(p => p.id));
    const currIds = new Set(currPeople.map(p => p.id));
    const sameIds = prevIds.size === currIds.size && [...prevIds].every(id => currIds.has(id));

    if (!sameIds) {
      // Different people - need full rebuild
      prevGraphDataRef.current = graphData;
      return;
    }

    // Same people, check for biography changes
    const changes: Array<{ id: string; hasBiography: boolean; biographyWeight: number }> = [];
    for (const curr of currPeople) {
      const prev = prevPeople.find(p => p.id === curr.id);
      if (!prev) continue;

      const prevHasBio = Boolean(prev.biography?.trim());
      const currHasBio = Boolean(curr.biography?.trim());

      if (prevHasBio !== currHasBio) {
        changes.push({
          id: curr.id,
          hasBiography: currHasBio,
          biographyWeight: calculateBiographyWeight(curr.biography ?? undefined),
        });
      }
    }

    if (changes.length > 0) {
      console.log('[ConstellationCanvas] Applying incremental updates:', changes);

      // Apply changes via ConstellationManager
      for (const change of changes) {
        if (change.hasBiography) {
          // Ghost -> Biography: Use transition if not already transitioning
          if (!constellationManagerRef.current.isTransitioning()) {
            const position = constellationManagerRef.current.getNodePosition(change.id);
            if (position) {
              // This was triggered by data change, not animation - just move the node
              constellationManagerRef.current.startTransition(change.id, change.biographyWeight);
              constellationManagerRef.current.updateTransition(1); // Instant transition
              constellationManagerRef.current.completeTransition();
            }
          }
        } else {
          // Biography -> Ghost: Move node from biography pool to ghost pool
          const position = constellationManagerRef.current.getNodePosition(change.id);
          if (position && constellationManagerRef.current.isBiographyNode(change.id)) {
            // Remove from biography pool
            constellationManagerRef.current.biographyPool?.removeNode(change.id);
            // Add to ghost pool
            constellationManagerRef.current.ghostPool?.addNode({
              id: change.id,
              position,
            });
            console.log(`[ConstellationCanvas] Moved ${change.id} from biography to ghost pool`);
          }
        }
      }

      // Mark that we handled this update - skip rebuild
      skipRebuildRef.current = true;
    }

    prevGraphDataRef.current = graphData;
  }, [graphData]);

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
