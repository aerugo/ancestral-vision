/**
 * Force-Directed Layout System
 *
 * Implements golden angle distribution and force simulation
 * for organic mandala-style node positioning in the constellation.
 *
 * Based on prototype: reference_prototypes/family-constellations/src/core/layout.ts
 */

/**
 * Golden angle in radians (~137.5 degrees)
 * Creates organic, non-overlapping distribution inspired by phyllotaxis
 */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * 3D position vector
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Node in the layout system
 */
export interface LayoutNode {
  /** Unique identifier */
  id: string;
  /** Generation relative to subject (0 = subject, -1 = parents, -2 = grandparents, 1 = children) */
  generation: number;
  /** Current position in 3D space */
  position: Vector3;
  /** Current velocity for force simulation */
  velocity: Vector3;
}

/**
 * Edge connecting two nodes
 */
export interface LayoutEdge {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
}

/**
 * Configuration for force-directed layout
 */
export interface ForceLayoutConfig {
  /** Distance between generation rings (default: 50) */
  generationSpacing: number;
  /** Node repulsion force strength (default: 50) */
  repulsionStrength: number;
  /** Edge attraction force strength (default: 0.1) */
  attractionStrength: number;
  /** Gravity toward center strength (default: 0.02) */
  centerStrength: number;
  /** Force to maintain ring structure (default: 0.1) */
  generationStrength: number;
  /** Velocity damping factor (default: 0.9) */
  damping: number;
  /** Threshold for stable energy (default: 0.1) */
  stabilityThreshold: number;
  /** Edges connecting nodes */
  edges?: LayoutEdge[];
}

const DEFAULT_CONFIG: ForceLayoutConfig = {
  generationSpacing: 50,
  repulsionStrength: 50,
  attractionStrength: 0.1,
  centerStrength: 0.02,
  generationStrength: 0.1,
  damping: 0.9,
  stabilityThreshold: 0.1,
};

/**
 * Force-directed layout system with golden angle distribution
 */
export class ForceLayout {
  private _nodes: LayoutNode[];
  private _edges: LayoutEdge[];
  private _config: ForceLayoutConfig;
  private _energy: number = Infinity;
  private _nodeMap: Map<string, LayoutNode>;

  constructor(nodes: LayoutNode[], config: Partial<ForceLayoutConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._nodes = nodes;
    this._edges = config.edges || [];
    this._nodeMap = new Map(nodes.map(n => [n.id, n]));
  }

  /**
   * Initialize node positions using golden angle distribution
   * Places nodes in concentric rings by generation
   */
  public initialize(): void {
    // Group nodes by generation
    const generations = new Map<number, LayoutNode[]>();
    this._nodes.forEach(node => {
      const gen = node.generation;
      if (!generations.has(gen)) {
        generations.set(gen, []);
      }
      generations.get(gen)!.push(node);
    });

    // Position each generation in a ring
    generations.forEach((genNodes, gen) => {
      // Generation 0 (subject) gets small central radius
      // Other generations get radius proportional to |generation| * spacing
      const ringRadius = gen === 0
        ? 15 + genNodes.length * 3  // Small, expands with count
        : Math.abs(gen) * this._config.generationSpacing;

      // Offset each generation for visual variety
      const goldenOffset = gen * 0.5;

      genNodes.forEach((node, i) => {
        const angle = i * GOLDEN_ANGLE + goldenOffset;
        node.position.x = Math.cos(angle) * ringRadius;
        node.position.z = Math.sin(angle) * ringRadius;
        node.position.y = 0; // Flat layout
        node.velocity = { x: 0, y: 0, z: 0 };
      });
    });

    this._energy = this._calculateEnergy();
  }

  /**
   * Run one step of force simulation
   */
  public step(): void {
    // Reset forces (stored in velocity for simplicity)
    this._nodes.forEach(node => {
      // Don't reset velocity completely - we accumulate forces
    });

    // Apply all forces
    this._applyRepulsion();
    this._applyAttraction();
    this._applyCenterGravity();
    this._applyGenerationForce();

    // Update positions with damping
    this._nodes.forEach(node => {
      node.velocity.x *= this._config.damping;
      node.velocity.y *= this._config.damping;
      node.velocity.z *= this._config.damping;

      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;
      node.position.z += node.velocity.z;
    });

    this._energy = this._calculateEnergy();
  }

  /**
   * Check if layout has converged to stable state
   */
  public isStable(): boolean {
    return this._energy < this._config.stabilityThreshold;
  }

  /**
   * Get current system energy (sum of squared velocities)
   */
  public getEnergy(): number {
    return this._energy;
  }

  /**
   * Get all node positions as array
   */
  public getPositions(): Vector3[] {
    return this._nodes.map(n => ({ ...n.position }));
  }

  /**
   * Get position map by node ID
   */
  public getPositionMap(): Map<string, Vector3> {
    return new Map(this._nodes.map(n => [n.id, { ...n.position }]));
  }

  /**
   * Apply repulsion force between all pairs of nodes
   * O(n²) - could optimize with Barnes-Hut quadtree for large n
   */
  private _applyRepulsion(): void {
    const strength = this._config.repulsionStrength;

    for (let i = 0; i < this._nodes.length; i++) {
      for (let j = i + 1; j < this._nodes.length; j++) {
        const nodeA = this._nodes[i];
        const nodeB = this._nodes[j];

        const dx = nodeB.position.x - nodeA.position.x;
        const dz = nodeB.position.z - nodeA.position.z;
        const distSq = dx * dx + dz * dz + 0.01; // Avoid division by zero
        const dist = Math.sqrt(distSq);

        // Inverse square law repulsion
        const force = strength / distSq;
        const fx = (dx / dist) * force;
        const fz = (dz / dist) * force;

        // Apply equal and opposite forces
        nodeA.velocity.x -= fx;
        nodeA.velocity.z -= fz;
        nodeB.velocity.x += fx;
        nodeB.velocity.z += fz;
      }
    }
  }

  /**
   * Apply attraction force along edges
   */
  private _applyAttraction(): void {
    const strength = this._config.attractionStrength;

    this._edges.forEach(edge => {
      const source = this._nodeMap.get(edge.source);
      const target = this._nodeMap.get(edge.target);

      if (!source || !target) return;

      const dx = target.position.x - source.position.x;
      const dz = target.position.z - source.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz) + 0.01;

      // Linear attraction (Hooke's law)
      const force = dist * strength;
      const fx = (dx / dist) * force;
      const fz = (dz / dist) * force;

      // Pull nodes toward each other
      source.velocity.x += fx;
      source.velocity.z += fz;
      target.velocity.x -= fx;
      target.velocity.z -= fz;
    });
  }

  /**
   * Apply center gravity to prevent drift
   */
  private _applyCenterGravity(): void {
    const strength = this._config.centerStrength;

    this._nodes.forEach(node => {
      // Pull toward origin
      node.velocity.x -= node.position.x * strength;
      node.velocity.z -= node.position.z * strength;
    });
  }

  /**
   * Apply force to maintain generation ring structure
   */
  private _applyGenerationForce(): void {
    const strength = this._config.generationStrength;
    const spacing = this._config.generationSpacing;

    this._nodes.forEach(node => {
      const gen = node.generation;
      const targetRadius = gen === 0
        ? 15 // Subject stays near center
        : Math.abs(gen) * spacing;

      const currentRadius = Math.sqrt(
        node.position.x * node.position.x +
        node.position.z * node.position.z
      ) + 0.01;

      // Calculate radial force
      const radiusDiff = targetRadius - currentRadius;
      const force = radiusDiff * strength;

      // Apply force radially
      const fx = (node.position.x / currentRadius) * force;
      const fz = (node.position.z / currentRadius) * force;

      node.velocity.x += fx;
      node.velocity.z += fz;
    });
  }

  /**
   * Calculate total system energy (kinetic)
   */
  private _calculateEnergy(): number {
    return this._nodes.reduce((sum, node) => {
      return sum +
        node.velocity.x * node.velocity.x +
        node.velocity.y * node.velocity.y +
        node.velocity.z * node.velocity.z;
    }, 0);
  }
}
