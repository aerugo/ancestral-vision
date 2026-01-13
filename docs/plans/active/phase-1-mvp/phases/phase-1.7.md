# Phase 1.7: Search

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement fuzzy name search using PostgreSQL pg_trgm extension, with a global search bar UI that navigates to selected people in the constellation.

---

## Invariants Enforced in This Phase

- **INV-S001**: All GraphQL Mutations Require Authentication
- **INV-S002**: Users Can Only Access Their Own Constellation
- **INV-A005**: TanStack Query for Server State

---

## TDD Steps

### Step 1.7.1: Write Search Query Tests (RED)

Create `src/graphql/resolvers/search.test.ts`:

**Test Cases**:

1. `it('should return matching people by name')` - Basic search
2. `it('should return empty array for unauthenticated')` - Auth check
3. `it('should match given name')` - First name search
4. `it('should match surname')` - Last name search
5. `it('should match full name')` - Combined search
6. `it('should handle typos with fuzzy matching')` - Trigram similarity
7. `it('should rank results by relevance')` - Better matches first
8. `it('should limit results to 20')` - Pagination
9. `it('should only search user constellation')` - Scope filter
10. `it('should exclude deleted people')` - Soft delete filter

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestData, seedTestUserWithPeople } from '@/tests/graphql-test-utils';
import { gql } from 'graphql-tag';

const SEARCH_PEOPLE = gql`
  query SearchPeople($query: String!, $limit: Int) {
    searchPeople(query: $query, limit: $limit) {
      id
      displayName
      givenName
      surname
      similarity
    }
  }
`;

describe('Search Resolvers', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Seed test data
    await seedTestUserWithPeople(ctx.prisma, ctx.user.uid, [
      { givenName: 'John', surname: 'Smith' },
      { givenName: 'Jane', surname: 'Smith' },
      { givenName: 'Jonathan', surname: 'Smithson' },
      { givenName: 'Mary', surname: 'Johnson' },
      { givenName: 'Robert', surname: 'Williams' },
    ]);
  });

  afterAll(async () => {
    await cleanupTestData(ctx.prisma, ctx.user.uid);
  });

  it('should return matching people by name', async () => {
    const result = await ctx.execute(SEARCH_PEOPLE, { query: 'Smith' });

    expect(result.data.searchPeople).toHaveLength(3);
    expect(result.data.searchPeople.map((p: any) => p.surname)).toEqual(
      expect.arrayContaining(['Smith', 'Smith', 'Smithson'])
    );
  });

  it('should return empty array for unauthenticated', async () => {
    const unauthCtx = await createTestContext({ authenticated: false });
    const result = await unauthCtx.execute(SEARCH_PEOPLE, { query: 'Smith' });

    expect(result.data.searchPeople).toEqual([]);
  });

  it('should handle typos with fuzzy matching', async () => {
    // "Jonh" should still match "John"
    const result = await ctx.execute(SEARCH_PEOPLE, { query: 'Jonh' });

    expect(result.data.searchPeople.length).toBeGreaterThan(0);
    expect(result.data.searchPeople[0].givenName).toBe('John');
  });

  it('should rank results by relevance', async () => {
    const result = await ctx.execute(SEARCH_PEOPLE, { query: 'John Smith' });

    // Exact match "John Smith" should be first
    expect(result.data.searchPeople[0].displayName).toBe('John Smith');
    expect(result.data.searchPeople[0].similarity).toBeGreaterThan(
      result.data.searchPeople[1]?.similarity ?? 0
    );
  });

  it('should limit results', async () => {
    const result = await ctx.execute(SEARCH_PEOPLE, { query: 'S', limit: 2 });

    expect(result.data.searchPeople.length).toBeLessThanOrEqual(2);
  });

  // ... more tests
});
```

### Step 1.7.2: Write Search Hook Tests (RED)

Create `src/hooks/use-search.test.ts`:

**Test Cases**:

1. `it('should search people')` - useSearchPeople hook
2. `it('should debounce search queries')` - Debounce behavior
3. `it('should handle empty query')` - No results for empty
4. `it('should handle loading state')` - isLoading flag
5. `it('should handle errors')` - Error handling
6. `it('should clear results on empty query')` - Reset state

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearchPeople } from './use-search';

vi.mock('@/lib/graphql-client');

describe('Search Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce search queries', async () => {
    const mockGraphqlClient = vi.mocked(await import('@/lib/graphql-client'));
    mockGraphqlClient.graphqlClient.request = vi.fn().mockResolvedValue({
      searchPeople: [],
    });

    const { result } = renderHook(
      () => useSearchPeople('John'),
      { wrapper: createWrapper(queryClient) }
    );

    // Should not call immediately
    expect(mockGraphqlClient.graphqlClient.request).not.toHaveBeenCalled();

    // Fast-forward debounce (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockGraphqlClient.graphqlClient.request).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle empty query', async () => {
    const { result } = renderHook(
      () => useSearchPeople(''),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  // ... more tests
});
```

### Step 1.7.3: Write Search Bar Tests (RED)

Create `src/components/search-bar.test.tsx`:

**Test Cases**:

1. `it('should render search input')` - Input field
2. `it('should show placeholder text')` - Placeholder
3. `it('should update on input')` - Value change
4. `it('should show loading spinner')` - Loading state
5. `it('should display results dropdown')` - Results list
6. `it('should show no results message')` - Empty state
7. `it('should highlight matching text')` - Match highlighting
8. `it('should navigate on result click')` - Selection handler
9. `it('should navigate with keyboard')` - Arrow keys + Enter
10. `it('should close dropdown on Escape')` - Escape key
11. `it('should close dropdown on blur')` - Focus out
12. `it('should clear input on X click')` - Clear button

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './search-bar';

vi.mock('@/hooks/use-search', () => ({
  useSearchPeople: vi.fn(),
}));

import { useSearchPeople } from '@/hooks/use-search';

describe('SearchBar', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchPeople).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
  });

  it('should render search input', () => {
    render(<SearchBar onSelect={mockOnSelect} />);

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should display results dropdown', async () => {
    vi.mocked(useSearchPeople).mockReturnValue({
      data: [
        { id: '1', displayName: 'John Smith', similarity: 0.9 },
        { id: '2', displayName: 'Jane Smith', similarity: 0.8 },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<SearchBar onSelect={mockOnSelect} />);

    await userEvent.type(screen.getByRole('searchbox'), 'Smith');

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should navigate on result click', async () => {
    vi.mocked(useSearchPeople).mockReturnValue({
      data: [{ id: 'person-123', displayName: 'John Smith', similarity: 0.9 }],
      isLoading: false,
      error: null,
    } as any);

    render(<SearchBar onSelect={mockOnSelect} />);

    await userEvent.type(screen.getByRole('searchbox'), 'John');
    await userEvent.click(screen.getByText('John Smith'));

    expect(mockOnSelect).toHaveBeenCalledWith('person-123');
  });

  it('should navigate with keyboard', async () => {
    vi.mocked(useSearchPeople).mockReturnValue({
      data: [
        { id: '1', displayName: 'John Smith', similarity: 0.9 },
        { id: '2', displayName: 'Jane Smith', similarity: 0.8 },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<SearchBar onSelect={mockOnSelect} />);

    const input = screen.getByRole('searchbox');
    await userEvent.type(input, 'Smith');

    // Arrow down to first result
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  it('should close dropdown on Escape', async () => {
    vi.mocked(useSearchPeople).mockReturnValue({
      data: [{ id: '1', displayName: 'John Smith', similarity: 0.9 }],
      isLoading: false,
      error: null,
    } as any);

    render(<SearchBar onSelect={mockOnSelect} />);

    await userEvent.type(screen.getByRole('searchbox'), 'John');
    expect(screen.getByText('John Smith')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
  });

  // ... more tests
});
```

### Step 1.7.4: Write Database Migration (RED)

Create `prisma/migrations/XXXXXX_add_search_indexes/migration.sql`:

```sql
-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for trigram search
CREATE INDEX IF NOT EXISTS person_given_name_trgm_idx
  ON "Person" USING GIN ("givenName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS person_surname_trgm_idx
  ON "Person" USING GIN ("surname" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS person_display_name_trgm_idx
  ON "Person" USING GIN ("displayName" gin_trgm_ops);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS person_constellation_search_idx
  ON "Person" ("constellationId", "deletedAt")
  WHERE "deletedAt" IS NULL;
```

### Step 1.7.5: Implement Search Resolver (GREEN)

Update `src/graphql/schema.ts`:

```typescript
// Add to typeDefs
type SearchResult {
  id: ID!
  displayName: String!
  givenName: String
  surname: String
  birthDate: JSON
  similarity: Float!
}

extend type Query {
  searchPeople(query: String!, limit: Int): [SearchResult!]!
}
```

Create `src/graphql/resolvers/search.ts`:

```typescript
import type { GraphQLContext } from '../types';

const DEFAULT_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

export const searchResolvers = {
  Query: {
    searchPeople: async (
      _: unknown,
      { query, limit = DEFAULT_LIMIT }: { query: string; limit?: number },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) return [];

      // Minimum query length
      if (query.trim().length < MIN_QUERY_LENGTH) {
        return [];
      }

      // Get user's constellation
      const constellation = await ctx.prisma.constellation.findFirst({
        where: { ownerId: ctx.user.uid },
      });

      if (!constellation) return [];

      // Use raw query for pg_trgm similarity search
      const results = await ctx.prisma.$queryRaw<SearchResult[]>`
        SELECT
          id,
          "displayName",
          "givenName",
          surname,
          "birthDate",
          GREATEST(
            similarity("givenName", ${query}),
            similarity(surname, ${query}),
            similarity("displayName", ${query})
          ) as similarity
        FROM "Person"
        WHERE
          "constellationId" = ${constellation.id}
          AND "deletedAt" IS NULL
          AND (
            "givenName" % ${query}
            OR surname % ${query}
            OR "displayName" % ${query}
          )
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      return results;
    },
  },
};
```

### Step 1.7.6: Implement Search Hook (GREEN)

Create `src/hooks/use-search.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-tag';
import { useDebouncedValue } from './use-debounced-value';

const SEARCH_PEOPLE = gql`
  query SearchPeople($query: String!, $limit: Int) {
    searchPeople(query: $query, limit: $limit) {
      id
      displayName
      givenName
      surname
      birthDate
      similarity
    }
  }
`;

interface SearchResult {
  id: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  birthDate: unknown;
  similarity: number;
}

export function useSearchPeople(query: string, limit = 20) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: ['search', debouncedQuery, limit],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }

      const result = await graphqlClient.request<{ searchPeople: SearchResult[] }>(
        SEARCH_PEOPLE,
        { query: debouncedQuery, limit }
      );

      return result.searchPeople;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Helper hook for debouncing
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Step 1.7.7: Implement Search Bar Component (GREEN)

Create `src/components/search-bar.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchPeople } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSelect: (personId: string) => void;
  className?: string;
}

export function SearchBar({ onSelect, className }: SearchBarProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { data: results = [], isLoading } = useSearchPeople(query);

  const handleSelect = useCallback((personId: string) => {
    onSelect(personId);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const highlightMatch = (text: string, query: string): JSX.Element => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return <>{text}</>;

    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-primary/30 text-foreground">
          {text.slice(index, index + query.length)}
        </mark>
        {text.slice(index + query.length)}
      </>
    );
  };

  // Open dropdown when results appear
  useEffect(() => {
    if (results.length > 0 && query.length >= 2) {
      setIsOpen(true);
    }
  }, [results, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          role="searchbox"
          placeholder="Search people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-auto"
          role="listbox"
        >
          {results.length === 0 && !isLoading && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No results found
            </li>
          )}

          {results.map((result, index) => (
            <li
              key={result.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                'px-4 py-2 cursor-pointer hover:bg-muted transition-colors',
                index === selectedIndex && 'bg-muted'
              )}
              onClick={() => handleSelect(result.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium">
                {highlightMatch(result.displayName, query)}
              </div>
              {result.birthDate && (
                <div className="text-xs text-muted-foreground">
                  {formatBirthYear(result.birthDate)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBirthYear(birthDate: unknown): string {
  if (!birthDate || typeof birthDate !== 'object') return '';
  const date = birthDate as { year?: number };
  return date.year ? `b. ${date.year}` : '';
}
```

### Step 1.7.8: Integrate with Layout (GREEN)

Update layout to include SearchBar with navigation to constellation:

```typescript
// In main layout or header component
import { SearchBar } from '@/components/search-bar';
import { useSelectionStore } from '@/store/selection-store';

function Header() {
  const selectPerson = useSelectionStore((state) => state.selectPerson);

  const handleSearchSelect = (personId: string) => {
    // Select person in constellation (triggers camera animation)
    selectPerson(personId, []);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-2">
      <SearchBar
        onSelect={handleSearchSelect}
        className="max-w-md mx-auto"
      />
    </header>
  );
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `prisma/migrations/*/migration.sql` | CREATE | pg_trgm extension and indexes |
| `src/graphql/schema.ts` | MODIFY | Add search query |
| `src/graphql/resolvers/search.ts` | CREATE | Search resolver with raw SQL |
| `src/graphql/resolvers/search.test.ts` | CREATE | Search resolver tests |
| `src/hooks/use-search.ts` | CREATE | Debounced search hook |
| `src/hooks/use-search.test.ts` | CREATE | Hook tests |
| `src/components/search-bar.tsx` | CREATE | Search UI component |
| `src/components/search-bar.test.tsx` | CREATE | Component tests |

---

## Verification

```bash
# Run migration
npx prisma migrate dev --name add_search_indexes

# Run specific tests
npx vitest run src/graphql/resolvers/search.test.ts
npx vitest run src/hooks/use-search.test.ts
npx vitest run src/components/search-bar.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All ~15 search tests pass
- [ ] pg_trgm extension enabled
- [ ] GIN indexes created for name columns
- [ ] Fuzzy matching handles typos
- [ ] Results ranked by similarity
- [ ] Debounced search (300ms)
- [ ] Keyboard navigation works
- [ ] Click result navigates to person
- [ ] Only user's constellation searched
- [ ] Type check passes
- [ ] Lint passes

---

*Created: 2026-01-13*
