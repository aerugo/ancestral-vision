/**
 * GraphQL Schema Tests
 *
 * Tests to verify the schema defines all required types and fields.
 */
import { describe, it, expect } from 'vitest';
import { typeDefs } from './schema';

describe('GraphQL Schema', () => {
  it('should define Query type with me field', () => {
    expect(typeDefs).toContain('type Query');
    expect(typeDefs).toContain('me: User');
  });

  it('should define Query type with constellation field', () => {
    expect(typeDefs).toContain('constellation: Constellation');
  });

  it('should define Query type with person field', () => {
    expect(typeDefs).toContain('person(id: ID!): Person');
  });

  it('should define Query type with people field', () => {
    expect(typeDefs).toContain('people');
  });

  it('should define Mutation type with createConstellation', () => {
    expect(typeDefs).toContain('type Mutation');
    expect(typeDefs).toContain('createConstellation');
  });

  it('should define User type with required fields', () => {
    expect(typeDefs).toContain('type User');
    expect(typeDefs).toMatch(/id:\s*ID!/);
    expect(typeDefs).toMatch(/email:\s*String!/);
    expect(typeDefs).toMatch(/displayName:\s*String!/);
  });

  it('should define Constellation type with required fields', () => {
    expect(typeDefs).toContain('type Constellation');
    expect(typeDefs).toMatch(/title:\s*String!/);
    expect(typeDefs).toMatch(/personCount:\s*Int!/);
  });

  it('should define Person type with required fields', () => {
    expect(typeDefs).toContain('type Person');
    expect(typeDefs).toMatch(/givenName:\s*String!/);
  });

  it('should define auth-required mutations', () => {
    expect(typeDefs).toContain('createPerson');
    expect(typeDefs).toContain('updatePerson');
    expect(typeDefs).toContain('deletePerson');
  });

  it('should define NameOrder enum', () => {
    expect(typeDefs).toContain('enum NameOrder');
    expect(typeDefs).toContain('WESTERN');
    expect(typeDefs).toContain('EASTERN');
  });

  it('should define Gender enum', () => {
    expect(typeDefs).toContain('enum Gender');
    expect(typeDefs).toContain('MALE');
    expect(typeDefs).toContain('FEMALE');
  });

  it('should define input types for mutations', () => {
    expect(typeDefs).toContain('input CreateConstellationInput');
    expect(typeDefs).toContain('input CreatePersonInput');
    expect(typeDefs).toContain('input UpdatePersonInput');
  });
});
