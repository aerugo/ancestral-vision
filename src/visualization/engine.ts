/**
 * Visualization Engine
 * Orchestrates all visual systems: nodes, edges, particles, fireflies, grid, post-processing
 */
import * as THREE from 'three';
import { createRenderer } from './renderer';
import {
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
  type PostProcessingConfig,
  type PostProcessingResult,
} from './effects/post-processing';
import {
  createSacredGeometryGrid,
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
} from './effects/sacred-geometry-grid';
import { MeshStandardNodeMaterial, PointsNodeMaterial } from 'three/webgpu';
import { uniform } from 'three/tsl';

/**
 * Node data for visualization
 */
export interface NodeData {
  id: string;
  position: THREE.Vector3;
  biographyWeight: number;
  events: string[];
}

/**
 * Edge data for visualization
 */
export interface EdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'parent-child' | 'spouse' | 'sibling';
  strength: number;
}

/**
 * Complete visualization data
 */
export interface VisualizationData {
  nodes: NodeData[];
  edges: EdgeData[];
}

/**
 * Node visualization config
 */
export interface NodeConfig {
  baseSize?: number;
  glowIntensity?: number;
  pulseSpeed?: number;
}

/**
 * Edge visualization config
 */
export interface EdgeConfig {
  curvature?: number;
  flowSpeed?: number;
}

/**
 * Particle visualization config
 */
export interface ParticleConfig {
  count?: number;
  size?: number;
}

/**
 * Complete visualization config
 */
export interface VisualizationConfig {
  node?: NodeConfig;
  edge?: EdgeConfig;
  particles?: ParticleConfig;
  grid?: SacredGeometryConfig;
  postProcessing?: PostProcessingConfig;
}

/**
 * Resolved configuration with defaults applied
 */
interface ResolvedConfig {
  node: Required<NodeConfig>;
  edge: Required<EdgeConfig>;
  particles: Required<ParticleConfig>;
  grid: SacredGeometryConfig;
  postProcessing: PostProcessingConfig;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ResolvedConfig = {
  node: {
    baseSize: 1.0,
    glowIntensity: 1.5,
    pulseSpeed: 2.0,
  },
  edge: {
    curvature: 0.3,
    flowSpeed: 0.5,
  },
  particles: {
    count: 300,
    size: 2.0,
  },
  grid: {},
  postProcessing: {},
};

/**
 * Visualization Engine interface
 */
export interface VisualizationEngine {
  // Core methods
  setData(data: VisualizationData): void;
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  dispose(): void;

  // Getters
  getRenderer(): THREE.WebGLRenderer;
  getScene(): THREE.Scene;
  getCamera(): THREE.PerspectiveCamera;
  getConfig(): ResolvedConfig;
  getNodeCount(): number;
  getEdgeCount(): number;
  isRunning(): boolean;
}

/**
 * Creates the visualization engine
 * @param container - DOM container for renderer
 * @param config - Optional configuration
 * @returns Visualization engine instance
 */
export async function createVisualizationEngine(
  container: HTMLElement,
  config: VisualizationConfig = {}
): Promise<VisualizationEngine> {
  // Resolve configuration with defaults
  const resolvedConfig: ResolvedConfig = {
    node: { ...DEFAULT_CONFIG.node, ...config.node },
    edge: { ...DEFAULT_CONFIG.edge, ...config.edge },
    particles: { ...DEFAULT_CONFIG.particles, ...config.particles },
    grid: { ...DEFAULT_CONFIG.grid, ...config.grid },
    postProcessing: { ...DEFAULT_CONFIG.postProcessing, ...config.postProcessing },
  };

  // Create renderer (async for WebGPU init)
  const renderer = await createRenderer(container);

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0612);

  // Create camera
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
  camera.position.set(0, 0, 100);

  // Create sacred geometry grid
  const gridGroup = createSacredGeometryGrid(resolvedConfig.grid);
  scene.add(gridGroup);

  // Post-processing (WebGL only)
  let postProcessing: PostProcessingResult | null = null;
  const isWebGL = renderer.constructor.name === 'WebGLRenderer';
  if (isWebGL) {
    postProcessing = createPostProcessing(
      renderer as THREE.WebGLRenderer,
      scene,
      camera,
      resolvedConfig.postProcessing
    );
  }

  // Internal state
  let running = false;
  let disposed = false;
  let nodeCount = 0;
  let edgeCount = 0;
  const nodeMeshes: THREE.Mesh[] = [];
  const edgeLines: THREE.Line[] = [];
  const nodeMaterials: THREE.Material[] = [];
  const edgeMaterials: THREE.Material[] = [];
  const nodeGeometries: THREE.BufferGeometry[] = [];
  const edgeGeometries: THREE.BufferGeometry[] = [];

  // Time uniform for animations
  const timeUniform = uniform(0);
  let animationStartTime = 0;

  /**
   * Animation loop
   */
  function animate(): void {
    if (!running || disposed) return;

    // Update time uniform
    const elapsed = (performance.now() - animationStartTime) / 1000;
    timeUniform.value = elapsed;

    // Render
    if (postProcessing) {
      renderWithPostProcessing(postProcessing.composer);
    } else {
      renderer.render(scene, camera);
    }
  }

  /**
   * Clears all visualization data
   */
  function clearData(): void {
    // Remove and dispose nodes
    for (const mesh of nodeMeshes) {
      scene.remove(mesh);
    }
    for (const geometry of nodeGeometries) {
      geometry.dispose();
    }
    for (const material of nodeMaterials) {
      material.dispose();
    }
    nodeMeshes.length = 0;
    nodeGeometries.length = 0;
    nodeMaterials.length = 0;

    // Remove and dispose edges
    for (const line of edgeLines) {
      scene.remove(line);
    }
    for (const geometry of edgeGeometries) {
      geometry.dispose();
    }
    for (const material of edgeMaterials) {
      material.dispose();
    }
    edgeLines.length = 0;
    edgeGeometries.length = 0;
    edgeMaterials.length = 0;

    nodeCount = 0;
    edgeCount = 0;
  }

  /**
   * Creates node mesh from data
   */
  function createNodeMesh(node: NodeData): THREE.Mesh {
    const size = resolvedConfig.node.baseSize * (1 + node.biographyWeight * 2.5);
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    nodeGeometries.push(geometry);

    const material = new MeshStandardNodeMaterial();
    material.color = new THREE.Color(0x4a9eff);
    nodeMaterials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(node.position);
    mesh.userData.nodeId = node.id;
    mesh.userData.biographyWeight = node.biographyWeight;
    mesh.userData.events = node.events;

    return mesh;
  }

  /**
   * Creates edge line from data
   */
  function createEdgeLine(edge: EdgeData, sourcePos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Line {
    // Calculate control point for quadratic bezier
    const midPoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
    const curvature = resolvedConfig.edge.curvature * direction.length();
    const controlPoint = midPoint.clone().add(perpendicular.multiplyScalar(curvature));

    // Create bezier curve
    const curve = new THREE.QuadraticBezierCurve3(sourcePos, controlPoint, targetPos);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    edgeGeometries.push(geometry);

    // Edge color based on type
    let color = 0xffffff;
    switch (edge.type) {
      case 'parent-child':
        color = 0x4a9eff;
        break;
      case 'spouse':
        color = 0xff6b9e;
        break;
      case 'sibling':
        color = 0x7ed321;
        break;
    }

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: edge.strength * 0.8,
    });
    edgeMaterials.push(material);

    const line = new THREE.Line(geometry, material);
    line.userData.edgeId = edge.id;
    line.userData.type = edge.type;

    return line;
  }

  // Return engine interface
  const engine: VisualizationEngine = {
    setData(data: VisualizationData): void {
      if (disposed) return;

      // Clear existing data
      clearData();

      // Build node position map
      const nodePositions = new Map<string, THREE.Vector3>();
      for (const node of data.nodes) {
        nodePositions.set(node.id, node.position);
      }

      // Create nodes
      for (const node of data.nodes) {
        const mesh = createNodeMesh(node);
        nodeMeshes.push(mesh);
        scene.add(mesh);
      }
      nodeCount = data.nodes.length;

      // Create edges
      for (const edge of data.edges) {
        const sourcePos = nodePositions.get(edge.sourceId);
        const targetPos = nodePositions.get(edge.targetId);
        if (sourcePos && targetPos) {
          const line = createEdgeLine(edge, sourcePos, targetPos);
          edgeLines.push(line);
          scene.add(line);
        }
      }
      edgeCount = edgeLines.length;
    },

    start(): void {
      if (disposed || running) return;
      running = true;
      animationStartTime = performance.now();
      renderer.setAnimationLoop(animate);
    },

    stop(): void {
      if (!running) return;
      running = false;
      renderer.setAnimationLoop(null);
    },

    resize(width: number, height: number): void {
      if (disposed) return;

      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      if (postProcessing) {
        updatePostProcessingSize(postProcessing.composer, width, height);
      }
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;

      // Stop animation
      engine.stop();

      // Clear visualization data
      clearData();

      // Dispose sacred geometry grid
      scene.remove(gridGroup);
      disposeSacredGeometryGrid(gridGroup);

      // Dispose post-processing
      if (postProcessing) {
        disposePostProcessing(postProcessing.composer);
        postProcessing = null;
      }

      // Dispose renderer
      renderer.dispose();
    },

    getRenderer(): THREE.WebGLRenderer {
      return renderer as THREE.WebGLRenderer;
    },

    getScene(): THREE.Scene {
      return scene;
    },

    getCamera(): THREE.PerspectiveCamera {
      return camera;
    },

    getConfig(): ResolvedConfig {
      return resolvedConfig;
    },

    getNodeCount(): number {
      return nodeCount;
    },

    getEdgeCount(): number {
      return edgeCount;
    },

    isRunning(): boolean {
      return running;
    },
  };

  return engine;
}

/**
 * Disposes a visualization engine
 * @param engine - Engine to dispose
 */
export function disposeVisualizationEngine(engine: VisualizationEngine): void {
  engine.dispose();
}
