/**
 * GraphQL API Route
 *
 * Next.js API route that serves the GraphQL endpoint using GraphQL Yoga.
 */
import { createYoga } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "@/graphql/schema";
import { resolvers } from "@/graphql/resolvers";
import { createContext } from "@/graphql/context";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const { handleRequest } = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
  // Enable GraphiQL in development
  graphiql: process.env["NODE_ENV"] !== "production",
  // CORS configuration
  cors: {
    origin: process.env["ALLOWED_ORIGINS"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  },
});

export { handleRequest as GET, handleRequest as POST };
