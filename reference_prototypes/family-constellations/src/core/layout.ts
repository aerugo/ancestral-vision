import type { GraphNode, GraphEdge, Vec3, EngineConfig } from '../types';
import { BarnesHutTree } from './barnesHut';

// Threshold for using Barnes-Hut algorithm
const BARNES_HUT_THRESHOLD = 100;

// Golden angle in radians - creates natural, organic distribution (Hilma af Klint inspired)
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

/**
 * 3D Mandala Layout Algorithm
 * Positions nodes in sacred geometry patterns with concentric generation rings
 * Uses Barnes-Hut approximation for O(n log n) performance on large graphs
 * Inspired by Hilma af Klint's spiritual diagrams and sacred mandalas
 */
export class ForceDirectedLayout {
  private config: EngineConfig['layout'];
  private barnesHut: BarnesHutTree;
  private useBarnesHut: boolean = false;

  constructor(config: EngineConfig['layout']) {
    this.config = config;
    this.barnesHut = new BarnesHutTree(0.7); // theta = 0.7 for good balance
  }

  /**
   * Calculate layout positions for all nodes
   */
  calculate(
    nodes: GraphNode[],
    edges: GraphEdge[],
    centeredId: string
  ): void {
    // Use Barnes-Hut for large graphs
    this.useBarnesHut = nodes.length > BARNES_HUT_THRESHOLD;

    if (this.useBarnesHut) {
      console.log(`Using Barnes-Hut algorithm for ${nodes.length} nodes`);
    }

    // Initialize positions
    this.initializePositions(nodes, centeredId);

    // Run simulation iterations
    for (let i = 0; i < this.config.iterations; i++) {
      this.simulationStep(nodes, edges, i / this.config.iterations);
    }

    // Center the layout
    this.centerLayout(nodes);
  }

  /**
   * Initialize node positions in mandala rings (sacred geometry layout)
   * Uses golden angle for natural, organic distribution
   */
  private initializePositions(nodes: GraphNode[], centeredId: string): void {
    const genGroups = new Map<number, GraphNode[]>();

    // Group by generation
    for (const node of nodes) {
      const gen = node.generation;
      if (!genGroups.has(gen)) {
        genGroups.set(gen, []);
      }
      genGroups.get(gen)!.push(node);
    }

    // Sort generations for consistent ordering
    const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

    // Global node index for golden angle progression
    let globalIndex = 0;

    // Position each generation in a concentric mandala ring
    for (const gen of sortedGens) {
      const genNodes = genGroups.get(gen)!;

      // Mandala ring radius - grows with absolute generation distance
      // Generation 0 gets a small radius to avoid all nodes at exact same point
      const ringRadius = gen === 0
        ? 15 + genNodes.length * 3  // Small inner ring for gen 0
        : Math.abs(gen) * this.config.generationSpacing;

      // Subtle Y offset for depth - creates a gentle bowl/dome shape
      const baseY = gen * 8;

      for (let i = 0; i < genNodes.length; i++) {
        // Golden angle positioning for organic, non-uniform distribution
        const goldenOffset = gen * Math.PI / 6; // Offset each ring for visual interest
        const angle = i * GOLDEN_ANGLE + goldenOffset;

        // Slight radius variation based on biography weight (more important = slightly outward)
        const radiusVariation = genNodes[i].biographyWeight * 5;
        const nodeRadius = ringRadius + radiusVariation;

        // Add tiny jitter to prevent exact same positions (causes Barnes-Hut issues)
        const jitter = 0.01;

        genNodes[i].position = {
          x: Math.cos(angle) * nodeRadius + (Math.random() - 0.5) * jitter,
          y: baseY + (Math.random() - 0.5) * jitter,
          z: Math.sin(angle) * nodeRadius + (Math.random() - 0.5) * jitter,
        };
        genNodes[i].velocity = { x: 0, y: 0, z: 0 };

        globalIndex++;
      }
    }

    // Center person at the mandala's heart (origin) with tiny offset
    const centered = nodes.find((n) => n.id === centeredId);
    if (centered) {
      centered.position = { x: 0.001, y: 0, z: 0.001 };
    }
  }

  /**
   * Single simulation step
   */
  private simulationStep(
    nodes: GraphNode[],
    edges: GraphEdge[],
    progress: number
  ): void {
    // Reset forces
    for (const node of nodes) {
      node.velocity = { x: 0, y: 0, z: 0 };
    }

    // Apply repulsion between all nodes
    if (this.useBarnesHut) {
      this.applyRepulsionBarnesHut(nodes);
    } else {
      this.applyRepulsionDirect(nodes);
    }

    // Apply attraction along edges
    this.applyAttraction(nodes, edges);

    // Apply center force
    this.applyCenterForce(nodes);

    // Apply generation layering force
    this.applyGenerationForce(nodes);

    // Cooling schedule
    const temperature = 1 - progress * 0.8;

    // Update positions
    for (const node of nodes) {
      node.position.x += node.velocity.x * temperature;
      node.position.y += node.velocity.y * temperature;
      node.position.z += node.velocity.z * temperature;
    }
  }

  /**
   * Repulsion using Barnes-Hut approximation - O(n log n)
   */
  private applyRepulsionBarnesHut(nodes: GraphNode[]): void {
    // Build octree from current positions
    const positions = nodes.map(n => n.position);
    this.barnesHut.build(positions);

    // Calculate force on each node
    for (let i = 0; i < nodes.length; i++) {
      const force = this.barnesHut.calculateForce(
        i,
        nodes[i].position,
        this.config.repulsionForce
      );

      nodes[i].velocity.x += force.x;
      nodes[i].velocity.y += force.y;
      nodes[i].velocity.z += force.z;
    }
  }

  /**
   * Direct repulsion calculation - O(n²)
   */
  private applyRepulsionDirect(nodes: GraphNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;

        const distSq = dx * dx + dy * dy + dz * dz + 0.1;
        const dist = Math.sqrt(distSq);

        const force = this.config.repulsionForce / distSq;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        a.velocity.x -= fx;
        a.velocity.y -= fy;
        a.velocity.z -= fz;

        b.velocity.x += fx;
        b.velocity.y += fy;
        b.velocity.z += fz;
      }
    }
  }

  /**
   * Attraction force along edges
   */
  private applyAttraction(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);

      if (!source || !target) continue;

      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const dz = target.position.z - source.position.z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

      // Ideal distance based on edge type
      const idealDist =
        edge.type === 'parent-child'
          ? this.config.generationSpacing
          : edge.type === 'spouse'
            ? this.config.generationSpacing * 0.3
            : this.config.generationSpacing * 0.5;

      const force =
        (dist - idealDist) * this.config.attractionForce * edge.strength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      source.velocity.x += fx;
      source.velocity.y += fy;
      source.velocity.z += fz;

      target.velocity.x -= fx;
      target.velocity.y -= fy;
      target.velocity.z -= fz;
    }
  }

  /**
   * Center force to keep graph from drifting
   */
  private applyCenterForce(nodes: GraphNode[]): void {
    for (const node of nodes) {
      node.velocity.x -= node.position.x * this.config.centerForce;
      node.velocity.z -= node.position.z * this.config.centerForce;
    }
  }

  /**
   * Maintain mandala ring structure - keeps nodes in circular formation
   */
  private applyGenerationForce(nodes: GraphNode[]): void {
    for (const node of nodes) {
      // Target Y based on generation (gentle layering)
      const targetY = node.generation * 8;
      node.velocity.y += (targetY - node.position.y) * 0.15;

      // Target radius for mandala ring
      const targetRadius = Math.abs(node.generation) * this.config.generationSpacing;

      // Current radius from center (XZ plane)
      const currentRadius = Math.sqrt(
        node.position.x * node.position.x + node.position.z * node.position.z
      );

      // Push/pull toward target ring radius (maintains concentric circles)
      if (currentRadius > 0.1 && node.generation !== 0) {
        const radiusDiff = targetRadius - currentRadius;
        const radialForce = radiusDiff * 0.08;

        // Apply radial force in XZ direction
        node.velocity.x += (node.position.x / currentRadius) * radialForce;
        node.velocity.z += (node.position.z / currentRadius) * radialForce;
      }
    }
  }

  /**
   * Center the layout around origin
   */
  private centerLayout(nodes: GraphNode[]): void {
    let cx = 0,
      cy = 0,
      cz = 0;

    for (const node of nodes) {
      cx += node.position.x;
      cy += node.position.y;
      cz += node.position.z;
    }

    cx /= nodes.length;
    cy /= nodes.length;
    cz /= nodes.length;

    for (const node of nodes) {
      node.position.x -= cx;
      node.position.y -= cy;
      node.position.z -= cz;
    }
  }
}

/**
 * Utility functions for vector math
 */
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
