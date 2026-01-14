/**
 * Search Resolvers
 *
 * Implements fuzzy name search using PostgreSQL pg_trgm extension.
 * Falls back to ILIKE search if pg_trgm is not available.
 */
import { prisma } from '@/lib/prisma';

const DEFAULT_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

interface SearchResult {
  id: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  birthDate: unknown;
  similarity: number;
}

// GraphQL context type (user is the Prisma User record)
interface GraphQLContext {
  user: { id: string } | null;
}

/**
 * Search queries
 */
export const searchQueries = {
  /**
   * Search people by name with fuzzy matching
   *
   * Uses PostgreSQL pg_trgm for similarity search when available,
   * falls back to ILIKE pattern matching otherwise.
   */
  searchPeople: async (
    _parent: unknown,
    { query, limit = DEFAULT_LIMIT }: { query: string; limit?: number },
    ctx: GraphQLContext
  ): Promise<SearchResult[]> => {
    // Require authentication (INV-S001)
    if (!ctx.user) {
      return [];
    }

    // Minimum query length
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return [];
    }

    // Get user's constellation (INV-S002)
    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: ctx.user.id },
    });

    if (!constellation) {
      return [];
    }

    // Clamp limit
    const effectiveLimit = Math.min(Math.max(1, limit), 100);

    try {
      // Try pg_trgm similarity search first
      const results = await prisma.$queryRaw<SearchResult[]>`
        SELECT
          id,
          "displayName",
          "givenName",
          surname,
          "birthDate",
          GREATEST(
            COALESCE(similarity("givenName", ${trimmedQuery}), 0),
            COALESCE(similarity(surname, ${trimmedQuery}), 0),
            COALESCE(similarity("displayName", ${trimmedQuery}), 0)
          ) as similarity
        FROM "Person"
        WHERE
          "constellationId" = ${constellation.id}
          AND "deletedAt" IS NULL
          AND (
            "givenName" % ${trimmedQuery}
            OR surname % ${trimmedQuery}
            OR "displayName" % ${trimmedQuery}
          )
        ORDER BY similarity DESC
        LIMIT ${effectiveLimit}
      `;

      return results;
    } catch (error) {
      // Fall back to ILIKE search if pg_trgm is not available
      console.warn('pg_trgm not available, falling back to ILIKE search');

      const pattern = `%${trimmedQuery}%`;
      const results = await prisma.person.findMany({
        where: {
          constellationId: constellation.id,
          deletedAt: null,
          OR: [
            { givenName: { contains: trimmedQuery, mode: 'insensitive' } },
            { surname: { contains: trimmedQuery, mode: 'insensitive' } },
            { displayName: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        take: effectiveLimit,
        orderBy: { displayName: 'asc' },
      });

      // Convert to SearchResult format with synthetic similarity scores
      return results.map((person) => {
        // Calculate a simple similarity based on string matching
        const lowerQuery = trimmedQuery.toLowerCase();
        const displayMatch = (person.displayName || '').toLowerCase().includes(lowerQuery);
        const givenMatch = (person.givenName || '').toLowerCase().includes(lowerQuery);
        const surnameMatch = (person.surname || '').toLowerCase().includes(lowerQuery);

        // Assign similarity based on match quality
        let similarity = 0.5;
        if (displayMatch && givenMatch && surnameMatch) similarity = 0.9;
        else if (displayMatch) similarity = 0.8;
        else if (givenMatch || surnameMatch) similarity = 0.7;

        return {
          id: person.id,
          displayName: person.displayName || `${person.givenName} ${person.surname || ''}`.trim(),
          givenName: person.givenName,
          surname: person.surname,
          birthDate: person.birthDate,
          similarity,
        };
      });
    }
  },
};
