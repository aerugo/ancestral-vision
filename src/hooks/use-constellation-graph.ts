/**
 * Constellation Graph Data Hook
 *
 * Fetches constellation data optimized for the force-directed layout system:
 * - People with biography (for biography weight calculation)
 * - Parent-child relationships (from Person.parents and Person.children)
 * - Centered person ID for mandala focal point
 */
import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';
import { useAuthStore } from '@/store/auth-store';
import type { ParentChildInput, PersonInput, SpouseInput } from '@/visualization/layout';

/**
 * Person data for layout calculation
 */
export interface ConstellationPerson {
  id: string;
  givenName: string | null;
  surname: string | null;
  biography: string | null;
  generation: number;
}

/**
 * Parent-child relationship data
 */
interface PersonWithRelationships extends ConstellationPerson {
  parents: Array<{ id: string }>;
  children: Array<{ id: string }>;
  spouses: Array<{ id: string }>;
}

/**
 * Full constellation graph data for layout
 */
export interface ConstellationGraphData {
  /** All people in the constellation with layout data */
  people: PersonInput[];
  /** Parent-child relationships */
  parentChildRelationships: ParentChildInput[];
  /** Spouse relationships for clustering */
  spouseRelationships: SpouseInput[];
  /** ID of the centered person for the mandala */
  centeredPersonId: string | undefined;
  /** Raw people data with API types */
  rawPeople: ConstellationPerson[];
}

/**
 * GraphQL query to fetch constellation with people and their relationships
 */
const CONSTELLATION_GRAPH_QUERY = `
  query ConstellationGraph {
    constellation {
      id
      centeredPersonId
      people {
        id
        givenName
        surname
        biography
        generation
        parents {
          id
        }
        children {
          id
        }
        spouses {
          id
        }
      }
    }
  }
`;

interface ConstellationGraphResponse {
  constellation: {
    id: string;
    centeredPersonId: string | null;
    people: PersonWithRelationships[];
  } | null;
}

/**
 * Query key for constellation graph data
 */
export const constellationGraphQueryKey = ['constellation-graph'] as const;

/**
 * Hook to fetch constellation graph data for force-directed layout
 *
 * Returns all data needed for the FamilyGraph and ForceDirectedLayout classes:
 * - People with biography for weight calculation
 * - Parent-child relationships for edges
 * - Centered person ID for mandala focal point
 *
 * @returns TanStack Query result with constellation graph data
 *
 * @example
 * ```tsx
 * function Constellation() {
 *   const { data, isLoading, isError } = useConstellationGraph();
 *
 *   if (isLoading) return <Loading />;
 *   if (!data) return <Empty />;
 *
 *   // Build family graph with parent-child relationships
 *   const graph = new FamilyGraph(
 *     data.people,
 *     data.parentChildRelationships,
 *     data.centeredPersonId
 *   );
 *
 *   // Run layout
 *   const layout = new ForceDirectedLayout();
 *   layout.calculate(graph.getNodesArray(), graph.edges, graph.centeredId);
 * }
 * ```
 */
export function useConstellationGraph() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: constellationGraphQueryKey,
    queryFn: async (): Promise<ConstellationGraphData | null> => {
      const response = await gql<ConstellationGraphResponse>(CONSTELLATION_GRAPH_QUERY);

      if (!response.constellation) {
        return null;
      }

      const { constellation } = response;
      const { people, centeredPersonId } = constellation;

      // Extract parent-child relationships (avoiding duplicates)
      const parentChildSet = new Set<string>();
      const parentChildRelationships: ParentChildInput[] = [];

      for (const person of people) {
        // Add relationships from person's parents
        for (const parent of person.parents) {
          const key = `${parent.id}-${person.id}`;
          if (!parentChildSet.has(key)) {
            parentChildSet.add(key);
            parentChildRelationships.push({
              parentId: parent.id,
              childId: person.id,
            });
          }
        }

        // Add relationships from person's children
        for (const child of person.children) {
          const key = `${person.id}-${child.id}`;
          if (!parentChildSet.has(key)) {
            parentChildSet.add(key);
            parentChildRelationships.push({
              parentId: person.id,
              childId: child.id,
            });
          }
        }
      }

      // Extract spouse relationships (avoiding duplicates)
      const spouseSet = new Set<string>();
      const spouseRelationships: SpouseInput[] = [];

      for (const person of people) {
        for (const spouse of person.spouses) {
          // Create a consistent key regardless of order
          const key = [person.id, spouse.id].sort().join('-');
          if (!spouseSet.has(key)) {
            spouseSet.add(key);
            spouseRelationships.push({
              person1Id: person.id,
              person2Id: spouse.id,
            });
          }
        }
      }

      // Convert to PersonInput format
      const personInputs: PersonInput[] = people.map(person => ({
        id: person.id,
        name: person.givenName || person.surname || 'Unknown',
        biography: person.biography ?? undefined,
      }));

      // Prepare raw people data (with API types for constellation-canvas)
      const rawPeople: ConstellationPerson[] = people.map(person => ({
        id: person.id,
        givenName: person.givenName,
        surname: person.surname,
        biography: person.biography,
        generation: person.generation,
      }));

      return {
        people: personInputs,
        parentChildRelationships,
        spouseRelationships,
        centeredPersonId: centeredPersonId ?? undefined,
        rawPeople,
      };
    },
    // Only fetch when authenticated
    enabled: !!token,
  });
}
