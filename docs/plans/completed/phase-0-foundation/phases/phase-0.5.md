# Phase 0.5: State Management

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Configure TanStack Query for server state and Zustand for client state. Create stores and hooks for auth, UI, and constellation data.

---

## Invariants Enforced in This Phase

- **INV-A005**: TanStack Query is the only way to fetch server data
- **INV-A006**: Zustand stores handle only client/UI state
- **INV-A007**: GraphQL client automatically includes auth token

---

## TDD Steps

### Step 0.5.1: Write Failing Tests (RED)

Create `src/store/auth-store.test.ts`:

**Test Cases**:

1. `it('should initialize with null user')` - Initial state
2. `it('should set user on login')` - Login action
3. `it('should clear user on logout')` - Logout action
4. `it('should persist auth state')` - Persistence

Create `src/store/ui-store.test.ts`:

**Test Cases**:

1. `it('should initialize with default UI state')` - Initial state
2. `it('should toggle theme')` - Theme switching
3. `it('should track selected person')` - Selection state

Create `src/hooks/use-constellation.test.ts`:

**Test Cases**:

1. `it('should fetch constellation for authenticated user')` - Query
2. `it('should handle loading state')` - Loading
3. `it('should handle error state')` - Error handling

```typescript
// src/store/auth-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth-store';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('should initialize with null user', () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should set user on login', () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    useAuthStore.getState().setUser(mockUser);

    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(isAuthenticated).toBe(true);
  });

  it('should clear user on logout', () => {
    useAuthStore.getState().setUser({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    useAuthStore.getState().clearUser();

    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });
});
```

```typescript
// src/store/ui-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui-store';

describe('UI Store', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  it('should initialize with default UI state', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.selectedPersonId).toBeNull();
    expect(state.isPanelOpen).toBe(false);
    expect(state.viewMode).toBe('3d');
  });

  it('should toggle theme', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');

    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('should track selected person', () => {
    useUIStore.getState().setSelectedPerson('person-123');
    expect(useUIStore.getState().selectedPersonId).toBe('person-123');
    expect(useUIStore.getState().isPanelOpen).toBe(true);

    useUIStore.getState().setSelectedPerson(null);
    expect(useUIStore.getState().selectedPersonId).toBeNull();
  });

  it('should track panel state', () => {
    useUIStore.getState().setSelectedPerson('person-123');
    expect(useUIStore.getState().isPanelOpen).toBe(true);

    useUIStore.getState().closePanel();
    expect(useUIStore.getState().isPanelOpen).toBe(false);
  });
});
```

```typescript
// src/hooks/use-constellation.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConstellation } from './use-constellation';

// Mock GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
}));

describe('useConstellation Hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it('should fetch constellation for authenticated user', async () => {
    const mockConstellation = {
      id: 'const-123',
      title: 'Test Family',
      personCount: 5,
    };

    const { graphqlClient } = await import('@/lib/graphql-client');
    (graphqlClient.request as vi.Mock).mockResolvedValueOnce({
      constellation: mockConstellation,
    });

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockConstellation);
  });

  it('should handle loading state', async () => {
    const { graphqlClient } = await import('@/lib/graphql-client');
    (graphqlClient.request as vi.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', async () => {
    const { graphqlClient } = await import('@/lib/graphql-client');
    (graphqlClient.request as vi.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

### Step 0.5.2: Implement to Pass Tests (GREEN)

**`src/store/auth-store.ts`**:

```typescript
// src/store/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  token: string | null;
  setUser: (user: AuthUser) => void;
  setToken: (token: string | null) => void;
  clearUser: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  token: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      setToken: (token) => set({ token }),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
          token: null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist token, user comes from Firebase
        token: state.token,
      }),
    }
  )
);
```

**`src/store/ui-store.ts`**:

```typescript
// src/store/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';
type ViewMode = '3d' | '2d';

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Person selection
  selectedPersonId: string | null;
  setSelectedPerson: (id: string | null) => void;

  // Panel state
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;

  // Camera
  cameraTarget: { x: number; y: number; z: number } | null;
  setCameraTarget: (target: { x: number; y: number; z: number } | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  theme: 'dark' as Theme,
  viewMode: '3d' as ViewMode,
  selectedPersonId: null,
  isPanelOpen: false,
  cameraTarget: null,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,

      setTheme: (theme) => set({ theme }),

      setViewMode: (viewMode) => set({ viewMode }),

      setSelectedPerson: (selectedPersonId) =>
        set({
          selectedPersonId,
          isPanelOpen: selectedPersonId !== null,
        }),

      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),

      setCameraTarget: (cameraTarget) => set({ cameraTarget }),

      reset: () => set(initialState),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
      }),
    }
  )
);
```

**`src/lib/graphql-client.ts`**:

```typescript
// src/lib/graphql-client.ts
import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/store/auth-store';

const endpoint = '/api/graphql';

export const graphqlClient = new GraphQLClient(endpoint, {
  requestMiddleware: async (request) => {
    const token = useAuthStore.getState().token;
    if (token) {
      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    return request;
  },
});

// Type-safe request helper
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  return graphqlClient.request<T>(query, variables);
}
```

**`src/hooks/use-constellation.ts`**:

```typescript
// src/hooks/use-constellation.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';

// Types
interface Constellation {
  id: string;
  title: string;
  description: string | null;
  personCount: number;
  generationSpan: number;
  centeredPersonId: string | null;
}

// Queries
const CONSTELLATION_QUERY = `
  query Constellation {
    constellation {
      id
      title
      description
      personCount
      generationSpan
      centeredPersonId
    }
  }
`;

const CREATE_CONSTELLATION_MUTATION = `
  mutation CreateConstellation($input: CreateConstellationInput!) {
    createConstellation(input: $input) {
      id
      title
    }
  }
`;

// Hooks
export function useConstellation() {
  return useQuery({
    queryKey: ['constellation'],
    queryFn: async () => {
      const data = await gql<{ constellation: Constellation | null }>(
        CONSTELLATION_QUERY
      );
      return data.constellation;
    },
  });
}

export function useCreateConstellation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const data = await gql<{ createConstellation: Constellation }>(
        CREATE_CONSTELLATION_MUTATION,
        { input }
      );
      return data.createConstellation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constellation'] });
    },
  });
}
```

### Step 0.5.3: Refactor

1. Add optimistic updates for mutations
2. Add query prefetching
3. Create hook for people list

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/store/auth-store.ts` | CREATE | Auth state management |
| `src/store/auth-store.test.ts` | CREATE | Auth store tests |
| `src/store/ui-store.ts` | CREATE | UI state management |
| `src/store/ui-store.test.ts` | CREATE | UI store tests |
| `src/lib/graphql-client.ts` | CREATE | GraphQL client with auth |
| `src/hooks/use-constellation.ts` | CREATE | Constellation query hooks |
| `src/hooks/use-constellation.test.ts` | CREATE | Hook tests |
| `src/hooks/use-me.ts` | CREATE | Current user hook |
| `src/hooks/use-people.ts` | CREATE | People query hooks |
| `src/components/providers/query-provider.tsx` | CREATE | TanStack Query provider |

---

## Verification

```bash
# Run store tests
npx vitest run src/store

# Run hook tests
npx vitest run src/hooks

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All store tests pass
- [ ] All hook tests pass
- [ ] Auth store persists token
- [ ] UI store persists theme preference
- [ ] GraphQL client includes auth header
- [ ] Type check passes
- [ ] Lint passes
