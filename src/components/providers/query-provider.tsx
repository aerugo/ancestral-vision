'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * Props for QueryProvider
 */
interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Creates a QueryClient with sensible defaults
 * Configured for optimistic updates and stale-while-revalidate patterns
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 1 minute
        staleTime: 60 * 1000,
        // Cache data for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed queries up to 3 times
        retry: 3,
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Don't retry mutations by default
        retry: false,
      },
    },
  });
}

// Browser QueryClient - persists across re-renders
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get QueryClient instance
 * Creates new instance for SSR, reuses for browser
 */
function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create new QueryClient
    return makeQueryClient();
  } else {
    // Browser: reuse same QueryClient
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Provider component for TanStack Query
 *
 * Wraps the application with QueryClientProvider to enable
 * data fetching with useQuery and useMutation hooks.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <html>
 *       <body>
 *         <QueryProvider>
 *           {children}
 *         </QueryProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a stable QueryClient that persists across re-renders
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
