/**
 * Family Graph Tests
 *
 * Tests for graph construction from family data with relationship inference.
 */
import { describe, it, expect } from 'vitest';
import { FamilyGraph, calculateBiographyWeight, type PersonInput, type ParentChildInput, type SpouseInput } from './family-graph';
import { EDGE_STRENGTH_DEFAULTS } from './types';

describe('calculateBiographyWeight', () => {
  it('should return 0 for undefined biography', () => {
    expect(calculateBiographyWeight(undefined)).toBe(0);
  });

  it('should return 0 for empty biography', () => {
    expect(calculateBiographyWeight('')).toBe(0);
    expect(calculateBiographyWeight('   ')).toBe(0);
  });

  it('should return weight between 0 and 1', () => {
    const weight = calculateBiographyWeight('A short biography');
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it('should return higher weight for longer biography', () => {
    const shortWeight = calculateBiographyWeight('Short bio.');
    const longWeight = calculateBiographyWeight('A much longer biography that contains many more characters and details about the person.');

    expect(longWeight).toBeGreaterThan(shortWeight);
  });

  it('should cap at weight 1 for very long biographies', () => {
    const veryLong = 'x'.repeat(2000);
    const weight = calculateBiographyWeight(veryLong);
    expect(weight).toBeLessThanOrEqual(1);
  });

  it('should use square root easing', () => {
    // At 250 chars (25% of max), weight should be sqrt(0.25) = 0.5
    const bio250 = 'x'.repeat(250);
    const weight = calculateBiographyWeight(bio250);
    expect(weight).toBeCloseTo(0.5, 1);
  });
});

describe('FamilyGraph', () => {
  describe('constructor', () => {
    it('should create empty graph from empty data', () => {
      const graph = new FamilyGraph([], []);
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
      expect(graph.centeredId).toBe('');
    });

    it('should create nodes from people', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
        { id: 'person2', name: 'Bob' },
      ];
      const graph = new FamilyGraph(people, []);

      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.get('person1')?.person.name).toBe('Alice');
      expect(graph.nodes.get('person2')?.person.name).toBe('Bob');
    });

    it('should use first person as centeredId by default', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
        { id: 'person2', name: 'Bob' },
      ];
      const graph = new FamilyGraph(people, []);

      expect(graph.centeredId).toBe('person1');
    });

    it('should use provided centeredPersonId', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
        { id: 'person2', name: 'Bob' },
      ];
      const graph = new FamilyGraph(people, [], 'person2');

      expect(graph.centeredId).toBe('person2');
    });
  });

  describe('parent-child relationships', () => {
    it('should create parent-child edges', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child' },
      ];

      const graph = new FamilyGraph(people, parentChild);

      expect(graph.edges.length).toBe(1);
      expect(graph.edges[0]?.sourceId).toBe('parent');
      expect(graph.edges[0]?.targetId).toBe('child');
      expect(graph.edges[0]?.strength).toBe(EDGE_STRENGTH_DEFAULTS['parent-child']);
    });

    it('should calculate generations from parent-child relationships', () => {
      const people: PersonInput[] = [
        { id: 'grandparent', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'grandparent', childId: 'parent' },
        { parentId: 'parent', childId: 'child' },
      ];

      const graph = new FamilyGraph(people, parentChild, 'parent');

      expect(graph.nodes.get('grandparent')?.generation).toBe(-1);
      expect(graph.nodes.get('parent')?.generation).toBe(0);
      expect(graph.nodes.get('child')?.generation).toBe(1);
    });
  });

  describe('children of same parent', () => {
    it('should create only parent-child edges for siblings', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child1', name: 'Child 1' },
        { id: 'child2', name: 'Child 2' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child1' },
        { parentId: 'parent', childId: 'child2' },
      ];

      const graph = new FamilyGraph(people, parentChild);

      // Only parent-child edges
      expect(graph.edges.length).toBe(2);
      expect(graph.edges.every(e => e.type === 'parent-child')).toBe(true);
    });

    it('should assign same generation to children of same parent', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child1', name: 'Child 1' },
        { id: 'child2', name: 'Child 2' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child1' },
        { parentId: 'parent', childId: 'child2' },
      ];

      const graph = new FamilyGraph(people, parentChild, 'parent');

      expect(graph.nodes.get('child1')?.generation).toBe(1);
      expect(graph.nodes.get('child2')?.generation).toBe(1);
    });
  });

  describe('biography weight', () => {
    it('should calculate biography weight for nodes', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice', biography: 'A long biography with lots of details.' },
        { id: 'person2', name: 'Bob', biography: '' },
      ];

      const graph = new FamilyGraph(people, []);

      expect(graph.nodes.get('person1')?.biographyWeight).toBeGreaterThan(0);
      expect(graph.nodes.get('person2')?.biographyWeight).toBe(0);
    });
  });

  describe('connections', () => {
    it('should add connections to nodes', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child' },
      ];

      const graph = new FamilyGraph(people, parentChild);

      expect(graph.nodes.get('parent')?.connections).toContain('child');
      expect(graph.nodes.get('child')?.connections).toContain('parent');
    });
  });

  describe('helper methods', () => {
    it('getNodesArray should return all nodes', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
        { id: 'person2', name: 'Bob' },
      ];
      const graph = new FamilyGraph(people, []);

      const nodes = graph.getNodesArray();
      expect(nodes.length).toBe(2);
      expect(nodes.map(n => n.id).sort()).toEqual(['person1', 'person2']);
    });

    it('getRelatives should return connected node IDs', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
        { id: 'unrelated', name: 'Unrelated' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child' },
      ];

      const graph = new FamilyGraph(people, parentChild);

      expect(graph.getRelatives('parent')).toContain('child');
      expect(graph.getRelatives('parent')).not.toContain('unrelated');
    });

    it('getGenerationNodes should return nodes in a generation', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child1', name: 'Child 1' },
        { id: 'child2', name: 'Child 2' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child1' },
        { parentId: 'parent', childId: 'child2' },
      ];

      const graph = new FamilyGraph(people, parentChild, 'parent');

      const gen1Nodes = graph.getGenerationNodes(1);
      expect(gen1Nodes.length).toBe(2);
      expect(gen1Nodes.map(n => n.id).sort()).toEqual(['child1', 'child2']);
    });

    it('getGenerationRange should return min and max generations', () => {
      const people: PersonInput[] = [
        { id: 'grandparent', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'grandparent', childId: 'parent' },
        { parentId: 'parent', childId: 'child' },
      ];

      const graph = new FamilyGraph(people, parentChild, 'parent');

      const range = graph.getGenerationRange();
      expect(range.min).toBe(-1);
      expect(range.max).toBe(1);
    });
  });

  describe('spouse relationships', () => {
    it('should create spouse edges from spouse relationships', () => {
      const people: PersonInput[] = [
        { id: 'husband', name: 'Husband' },
        { id: 'wife', name: 'Wife' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'husband', person2Id: 'wife' },
      ];

      const graph = new FamilyGraph(people, [], undefined, spouse);

      expect(graph.edges.length).toBe(1);
      const spouseEdge = graph.edges[0]!;
      expect(spouseEdge.type).toBe('spouse');
      expect(spouseEdge.strength).toBe(EDGE_STRENGTH_DEFAULTS['spouse']);
    });

    it('should assign spouses to the same generation', () => {
      const people: PersonInput[] = [
        { id: 'self', name: 'Self' },
        { id: 'spouse', name: 'Spouse' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'self', person2Id: 'spouse' },
      ];

      const graph = new FamilyGraph(people, [], 'self', spouse);

      expect(graph.nodes.get('self')?.generation).toBe(0);
      expect(graph.nodes.get('spouse')?.generation).toBe(0);
    });

    it('should handle spouses with parent-child relationships', () => {
      const people: PersonInput[] = [
        { id: 'parent1', name: 'Parent 1' },
        { id: 'parent2', name: 'Parent 2' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent1', childId: 'child' },
        { parentId: 'parent2', childId: 'child' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'parent1', person2Id: 'parent2' },
      ];

      const graph = new FamilyGraph(people, parentChild, 'child', spouse);

      // Both parents should be in same generation (-1)
      expect(graph.nodes.get('parent1')?.generation).toBe(-1);
      expect(graph.nodes.get('parent2')?.generation).toBe(-1);
      expect(graph.nodes.get('child')?.generation).toBe(0);
    });

    it('should add connections for spouse edges', () => {
      const people: PersonInput[] = [
        { id: 'husband', name: 'Husband' },
        { id: 'wife', name: 'Wife' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'husband', person2Id: 'wife' },
      ];

      const graph = new FamilyGraph(people, [], undefined, spouse);

      expect(graph.nodes.get('husband')?.connections).toContain('wife');
      expect(graph.nodes.get('wife')?.connections).toContain('husband');
    });

    it('should not create duplicate edges for same person pair', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Person 1' },
        { id: 'person2', name: 'Person 2' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'person1', person2Id: 'person2' },
        { person1Id: 'person2', person2Id: 'person1' }, // Duplicate in reverse
      ];

      const graph = new FamilyGraph(people, [], undefined, spouse);

      expect(graph.edges.length).toBe(1);
    });

    it('should infer spouse relationship from shared child (co-parents)', () => {
      const people: PersonInput[] = [
        { id: 'parent1', name: 'Parent 1' },
        { id: 'parent2', name: 'Parent 2' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent1', childId: 'child' },
        { parentId: 'parent2', childId: 'child' },
      ];

      // No explicit spouse relationship provided
      const graph = new FamilyGraph(people, parentChild, 'child');

      // Should have 2 parent-child edges + 1 inferred spouse edge
      const spouseEdges = graph.edges.filter(e => e.type === 'spouse');
      expect(spouseEdges.length).toBe(1);
      expect(spouseEdges[0]!.sourceId).toBe('parent1');
      expect(spouseEdges[0]!.targetId).toBe('parent2');
    });

    it('should not duplicate spouse edge when both explicit and inferred', () => {
      const people: PersonInput[] = [
        { id: 'parent1', name: 'Parent 1' },
        { id: 'parent2', name: 'Parent 2' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent1', childId: 'child' },
        { parentId: 'parent2', childId: 'child' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'parent1', person2Id: 'parent2' },
      ];

      const graph = new FamilyGraph(people, parentChild, 'child', spouse);

      // Should have only 1 spouse edge (inferred + explicit should not duplicate)
      const spouseEdges = graph.edges.filter(e => e.type === 'spouse');
      expect(spouseEdges.length).toBe(1);
    });
  });

  describe('findPath', () => {
    it('should return null for empty graph', () => {
      const graph = new FamilyGraph([], []);
      expect(graph.findPath('a', 'b')).toBeNull();
    });

    it('should return single-element path for same start and end', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
      ];
      const graph = new FamilyGraph(people, []);

      const path = graph.findPath('person1', 'person1');
      expect(path).toEqual(['person1']);
    });

    it('should return null when start node does not exist', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
      ];
      const graph = new FamilyGraph(people, []);

      expect(graph.findPath('nonexistent', 'person1')).toBeNull();
    });

    it('should return null when end node does not exist', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
      ];
      const graph = new FamilyGraph(people, []);

      expect(graph.findPath('person1', 'nonexistent')).toBeNull();
    });

    it('should find path between direct neighbors', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child' },
      ];
      const graph = new FamilyGraph(people, parentChild);

      const path = graph.findPath('parent', 'child');
      expect(path).toEqual(['parent', 'child']);
    });

    it('should find path in reverse direction', () => {
      const people: PersonInput[] = [
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'parent', childId: 'child' },
      ];
      const graph = new FamilyGraph(people, parentChild);

      const path = graph.findPath('child', 'parent');
      expect(path).toEqual(['child', 'parent']);
    });

    it('should find shortest path across multiple hops', () => {
      const people: PersonInput[] = [
        { id: 'grandparent', name: 'Grandparent' },
        { id: 'parent', name: 'Parent' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'grandparent', childId: 'parent' },
        { parentId: 'parent', childId: 'child' },
      ];
      const graph = new FamilyGraph(people, parentChild);

      const path = graph.findPath('grandparent', 'child');
      expect(path).toEqual(['grandparent', 'parent', 'child']);
    });

    it('should return null for disconnected nodes', () => {
      const people: PersonInput[] = [
        { id: 'person1', name: 'Alice' },
        { id: 'person2', name: 'Bob' },
        { id: 'unconnected', name: 'Unconnected' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'person1', childId: 'person2' },
      ];
      const graph = new FamilyGraph(people, parentChild);

      expect(graph.findPath('person1', 'unconnected')).toBeNull();
    });

    it('should find path through spouse connection', () => {
      const people: PersonInput[] = [
        { id: 'husband', name: 'Husband' },
        { id: 'wife', name: 'Wife' },
        { id: 'child', name: 'Child' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'husband', childId: 'child' },
      ];
      const spouse: SpouseInput[] = [
        { person1Id: 'husband', person2Id: 'wife' },
      ];
      const graph = new FamilyGraph(people, parentChild, undefined, spouse);

      // Path from wife to child goes through husband
      const path = graph.findPath('wife', 'child');
      expect(path).toEqual(['wife', 'husband', 'child']);
    });

    it('should find shortest path when multiple paths exist', () => {
      // Diamond graph: A connects to B and C, both B and C connect to D
      const people: PersonInput[] = [
        { id: 'A', name: 'A' },
        { id: 'B', name: 'B' },
        { id: 'C', name: 'C' },
        { id: 'D', name: 'D' },
      ];
      const parentChild: ParentChildInput[] = [
        { parentId: 'A', childId: 'B' },
        { parentId: 'A', childId: 'C' },
        { parentId: 'B', childId: 'D' },
        { parentId: 'C', childId: 'D' },
      ];
      const graph = new FamilyGraph(people, parentChild);

      const path = graph.findPath('A', 'D');
      // Should be length 3 (A -> B/C -> D), BFS finds one of the shortest paths
      expect(path).toHaveLength(3);
      expect(path![0]).toBe('A');
      expect(path![2]).toBe('D');
    });

    it('should handle large family tree', () => {
      // Build a tree with multiple generations
      const people: PersonInput[] = [];
      const parentChild: ParentChildInput[] = [];

      // Create 4 generations of people
      for (let gen = 0; gen < 4; gen++) {
        for (let i = 0; i < 3; i++) {
          people.push({ id: `gen${gen}-${i}`, name: `Person ${gen}-${i}` });
          if (gen > 0) {
            // Connect to parent in previous generation
            parentChild.push({
              parentId: `gen${gen - 1}-${i % 3}`,
              childId: `gen${gen}-${i}`,
            });
          }
        }
      }

      const graph = new FamilyGraph(people, parentChild);

      // Find path from first person to last person
      const path = graph.findPath('gen0-0', 'gen3-0');
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(1);
      expect(path![0]).toBe('gen0-0');
      expect(path![path!.length - 1]).toBe('gen3-0');
    });
  });
});
