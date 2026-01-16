/**
 * Family Graph Construction
 *
 * Ported from: reference_prototypes/family-constellations/src/graph/graph.ts
 * Builds graph nodes and edges from family data with proper relationship types.
 * Calculates generations via BFS from centered person.
 */

import type { GraphNode, GraphEdge, LayoutPerson, Vec3 } from './types';
import { EDGE_STRENGTH_DEFAULTS } from './types';

/**
 * Input data for parent-child relationship
 */
export interface ParentChildInput {
  parentId: string;
  childId: string;
}

/**
 * Input data for spouse relationship
 */
export interface SpouseInput {
  person1Id: string;
  person2Id: string;
}

/**
 * Input data for a person in the graph
 */
export interface PersonInput {
  id: string;
  name: string;
  biography?: string;
}

/**
 * Calculate biography weight (0-1) based on biography length
 * Uses logarithmic scaling for more natural distribution
 * Ported from: reference_prototypes/family-constellations/src/parser/parser.ts
 */
export function calculateBiographyWeight(biography?: string): number {
  if (!biography) return 0;

  const length = biography.trim().length;
  if (length === 0) return 0;

  // Logarithmic scaling with square root easing
  const maxLength = 1000;
  const normalized = Math.min(length, maxLength) / maxLength;

  // Apply easing for more natural distribution
  return Math.pow(normalized, 0.5);
}

/**
 * FamilyGraph represents the family tree as a graph data structure
 * Uses parent-child relationships to define the tree structure
 */
export class FamilyGraph {
  /** Map of node ID to GraphNode */
  public nodes: Map<string, GraphNode> = new Map();

  /** Array of all edges in the graph */
  public edges: GraphEdge[] = [];

  /** ID of the centered person for the mandala */
  public centeredId: string;

  /**
   * Create a family graph from people and relationships
   * @param people Array of people with their data
   * @param parentChildRelationships Array of parent-child relationships
   * @param centeredPersonId ID of the person at the center of the mandala
   * @param spouseRelationships Optional array of spouse relationships for clustering
   */
  constructor(
    people: PersonInput[],
    parentChildRelationships: ParentChildInput[],
    centeredPersonId?: string,
    spouseRelationships?: SpouseInput[]
  ) {
    // Determine centered person: prefer provided ID, then first person
    this.centeredId = centeredPersonId ?? people[0]?.id ?? '';

    // Build nodes
    this._buildNodes(people);

    // Build edges from parent-child relationships
    this._buildEdges(parentChildRelationships);

    // Infer spouse relationships from shared children (co-parents)
    this._inferSpousesFromChildren(parentChildRelationships);

    // Build edges from explicit spouse relationships (if provided)
    if (spouseRelationships) {
      this._buildSpouseEdges(spouseRelationships);
    }

    // Calculate generations via BFS from centered person
    this._calculateGenerations();
  }

  /**
   * Build nodes from people data
   */
  private _buildNodes(people: PersonInput[]): void {
    for (const person of people) {
      const node: GraphNode = {
        id: person.id,
        person: {
          id: person.id,
          name: person.name,
          biography: person.biography,
        },
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        generation: 0,
        biographyWeight: calculateBiographyWeight(person.biography),
        connections: [],
        eventCount: 0,
      };
      this.nodes.set(person.id, node);
    }
  }

  /**
   * Build edges from parent-child relationships only
   * Only ONE edge between any two people (deduplicated by person pair)
   */
  private _buildEdges(parentChildRelationships: ParentChildInput[]): void {
    // Track unique edges by person PAIR only
    const edgeSet = new Set<string>();

    for (const rel of parentChildRelationships) {
      const pairKey = [rel.parentId, rel.childId].sort().join('-');
      if (edgeSet.has(pairKey)) continue;
      edgeSet.add(pairKey);

      // Skip if either node doesn't exist
      if (!this.nodes.has(rel.parentId) || !this.nodes.has(rel.childId)) continue;

      const edge: GraphEdge = {
        id: pairKey + '-parent-child',
        sourceId: rel.parentId,
        targetId: rel.childId,
        type: 'parent-child',
        strength: EDGE_STRENGTH_DEFAULTS['parent-child'],
      };
      this.edges.push(edge);

      // Add connections to nodes
      this.nodes.get(rel.parentId)?.connections.push(rel.childId);
      this.nodes.get(rel.childId)?.connections.push(rel.parentId);
    }
  }

  /**
   * Infer spouse relationships from shared children (co-parents)
   * If two people are both parents of the same child, they are treated as spouses
   */
  private _inferSpousesFromChildren(
    parentChildRelationships: ParentChildInput[]
  ): void {
    // Group parents by child
    const parentsByChild = new Map<string, string[]>();
    for (const rel of parentChildRelationships) {
      if (!parentsByChild.has(rel.childId)) {
        parentsByChild.set(rel.childId, []);
      }
      parentsByChild.get(rel.childId)!.push(rel.parentId);
    }

    // Track existing edges to avoid duplicates
    const existingPairs = new Set(
      this.edges.map((e) => [e.sourceId, e.targetId].sort().join('-'))
    );

    // For each child with multiple parents, create spouse edges between the parents
    for (const [_childId, parents] of parentsByChild) {
      if (parents.length < 2) continue;

      // Create spouse edges for all pairs of co-parents
      for (let i = 0; i < parents.length; i++) {
        for (let j = i + 1; j < parents.length; j++) {
          const parent1 = parents[i]!;
          const parent2 = parents[j]!;
          const pairKey = [parent1, parent2].sort().join('-');

          if (existingPairs.has(pairKey)) continue;
          existingPairs.add(pairKey);

          // Skip if either node doesn't exist
          if (!this.nodes.has(parent1) || !this.nodes.has(parent2)) continue;

          const edge: GraphEdge = {
            id: pairKey + '-spouse-inferred',
            sourceId: parent1,
            targetId: parent2,
            type: 'spouse',
            strength: EDGE_STRENGTH_DEFAULTS['spouse'],
          };
          this.edges.push(edge);

          // Add connections to nodes
          this.nodes.get(parent1)?.connections.push(parent2);
          this.nodes.get(parent2)?.connections.push(parent1);
        }
      }
    }
  }

  /**
   * Build spouse edges for tight clustering
   * Spouse edges are invisible (not rendered) but affect layout
   */
  private _buildSpouseEdges(spouseRelationships: SpouseInput[]): void {
    // Track existing edges to avoid duplicates
    const existingPairs = new Set(
      this.edges.map((e) => [e.sourceId, e.targetId].sort().join('-'))
    );

    for (const rel of spouseRelationships) {
      const pairKey = [rel.person1Id, rel.person2Id].sort().join('-');
      if (existingPairs.has(pairKey)) continue;
      existingPairs.add(pairKey);

      // Skip if either node doesn't exist
      if (!this.nodes.has(rel.person1Id) || !this.nodes.has(rel.person2Id))
        continue;

      const edge: GraphEdge = {
        id: pairKey + '-spouse',
        sourceId: rel.person1Id,
        targetId: rel.person2Id,
        type: 'spouse',
        strength: EDGE_STRENGTH_DEFAULTS['spouse'],
      };
      this.edges.push(edge);

      // Add connections to nodes
      this.nodes.get(rel.person1Id)?.connections.push(rel.person2Id);
      this.nodes.get(rel.person2Id)?.connections.push(rel.person1Id);
    }
  }

  /**
   * Calculate generations via BFS from centered person
   * Parent = -1 generation, Child = +1 generation
   * Spouses are placed in the same generation
   */
  private _calculateGenerations(): void {
    const visited = new Set<string>();
    const queue: { id: string; gen: number }[] = [];

    const centeredNode = this.nodes.get(this.centeredId);
    if (!centeredNode) return;

    centeredNode.generation = 0;
    visited.add(this.centeredId);
    queue.push({ id: this.centeredId, gen: 0 });

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      const node = this.nodes.get(id);
      if (!node) continue;

      // Process edges to determine generation
      for (const edge of this.edges) {
        let neighborId: string | null = null;
        let genOffset = 0;

        if (edge.type === 'spouse') {
          // Spouses share the same generation
          if (edge.sourceId === id && !visited.has(edge.targetId)) {
            neighborId = edge.targetId;
            genOffset = 0; // Same generation
          } else if (edge.targetId === id && !visited.has(edge.sourceId)) {
            neighborId = edge.sourceId;
            genOffset = 0; // Same generation
          }
        } else {
          // Parent-child edges determine generation direction
          if (edge.sourceId === id && !visited.has(edge.targetId)) {
            // This node is parent, target is child
            neighborId = edge.targetId;
            genOffset = 1;
          } else if (edge.targetId === id && !visited.has(edge.sourceId)) {
            // This node is child, source is parent
            neighborId = edge.sourceId;
            genOffset = -1;
          }
        }

        if (neighborId) {
          visited.add(neighborId);
          const neighborNode = this.nodes.get(neighborId);
          if (neighborNode) {
            neighborNode.generation = gen + genOffset;
            queue.push({ id: neighborId, gen: gen + genOffset });
          }
        }
      }
    }
  }

  /**
   * Get all relatives connected to a person
   */
  public getRelatives(personId: string): string[] {
    const node = this.nodes.get(personId);
    return node ? [...new Set(node.connections)] : [];
  }

  /**
   * Get all nodes in a specific generation
   */
  public getGenerationNodes(generation: number): GraphNode[] {
    return Array.from(this.nodes.values()).filter(
      (n) => n.generation === generation
    );
  }

  /**
   * Get the range of generations
   */
  public getGenerationRange(): { min: number; max: number } {
    let min = 0;
    let max = 0;
    for (const node of this.nodes.values()) {
      min = Math.min(min, node.generation);
      max = Math.max(max, node.generation);
    }
    return { min, max };
  }

  /**
   * Get all nodes as array
   */
  public getNodesArray(): GraphNode[] {
    return Array.from(this.nodes.values());
  }
}
