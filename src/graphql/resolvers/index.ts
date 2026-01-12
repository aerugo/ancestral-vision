/**
 * GraphQL Resolvers Index
 *
 * Aggregates all resolvers for the GraphQL schema.
 */
import { GraphQLScalarType, Kind } from "graphql";
import { userResolvers } from "./user";
import { constellationResolvers } from "./constellation";
import { personResolvers } from "./person";

/**
 * DateTime scalar type for ISO 8601 date-time strings.
 */
const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO 8601 date-time string",
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      return value;
    }
    throw new Error("DateTime must be a Date object or ISO string");
  },
  parseValue(value: unknown): Date {
    if (typeof value === "string") {
      return new Date(value);
    }
    throw new Error("DateTime must be a string");
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error("DateTime must be a string");
  },
});

/**
 * FuzzyDate scalar type for flexible date representation.
 */
const FuzzyDateScalar = new GraphQLScalarType({
  name: "FuzzyDate",
  description: "Flexible date representation supporting partial dates",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

/**
 * Place scalar type for location data.
 */
const PlaceScalar = new GraphQLScalarType({
  name: "Place",
  description: "Geographic place with locality, region, and country",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

/**
 * Merge all resolvers with custom scalars.
 */
export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...constellationResolvers.Query,
    ...personResolvers.Query,
  },
  Mutation: {
    ...constellationResolvers.Mutation,
    ...personResolvers.Mutation,
  },
  User: {
    ...userResolvers.User,
  },
  Constellation: {
    ...constellationResolvers.Constellation,
  },
  DateTime: DateTimeScalar,
  FuzzyDate: FuzzyDateScalar,
  Place: PlaceScalar,
};
