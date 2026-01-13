import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/store/auth-store';

// Mock the graphql-request module
vi.mock('graphql-request', () => ({
  GraphQLClient: vi.fn().mockImplementation(function (
    this: { requestConfig: Record<string, unknown> },
    _endpoint: string,
    config: Record<string, unknown>
  ) {
    this.requestConfig = config;
    return {
      request: vi.fn(),
      requestConfig: config,
    };
  }),
}));

describe('GraphQL Client', () => {
  beforeEach(() => {
    vi.resetModules();
    useAuthStore.getState().reset();
  });

  it('should create client with correct endpoint', async () => {
    const { graphqlClient } = await import('./graphql-client');
    expect(graphqlClient).toBeDefined();
  });

  it('should export gql helper function', async () => {
    const { gql } = await import('./graphql-client');
    expect(gql).toBeDefined();
    expect(typeof gql).toBe('function');
  });
});

describe('Auth Header Middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    useAuthStore.getState().reset();
  });

  it('should add Authorization header when token exists', async () => {
    // Set a token in the auth store
    useAuthStore.getState().setToken('test-jwt-token');

    const { getAuthHeaders } = await import('./graphql-client');
    const headers = getAuthHeaders();

    expect(headers).toHaveProperty('Authorization');
    expect(headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should return empty object when no token exists', async () => {
    const { getAuthHeaders } = await import('./graphql-client');
    const headers = getAuthHeaders();

    expect(headers).toEqual({});
  });

  it('should return empty object when token is null', async () => {
    useAuthStore.getState().setToken(null);

    const { getAuthHeaders } = await import('./graphql-client');
    const headers = getAuthHeaders();

    expect(headers).toEqual({});
  });
});
