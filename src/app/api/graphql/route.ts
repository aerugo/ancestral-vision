/**
 * GraphQL API Route
 *
 * Next.js App Router API route for GraphQL requests.
 * Uses GraphQL Yoga with the schema and resolvers defined in this project.
 */
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { createContext } from '@/graphql/context';

/**
 * Create executable schema from type definitions and resolvers
 */
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

/**
 * Create GraphQL Yoga handler
 */
const yoga = createYoga({
  schema,
  context: ({ request }) => createContext(request),
  graphqlEndpoint: '/api/graphql',
});

/**
 * Wrap yoga handler for Next.js App Router
 */
const handleRequest = async (request: Request) => {
  return yoga.handle(request);
};

/**
 * Handle GET requests (GraphQL playground)
 */
export { handleRequest as GET };

/**
 * Handle POST requests (GraphQL queries and mutations)
 */
export { handleRequest as POST };
