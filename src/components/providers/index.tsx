'use client';

import { type ReactNode, useEffect } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';
import { BiographyGenerationProvider, useBiographyGenerationContext } from '@/contexts/biography-generation-context';
import { usePendingBiographySuggestions } from '@/hooks/use-ai';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Inner component that restores pending biography suggestions from DB on app load.
 * Must be inside both QueryProvider and BiographyGenerationProvider.
 */
function PendingSuggestionsRestorer({ children }: { children: ReactNode }): React.ReactElement {
  const { data: pendingSuggestions } = usePendingBiographySuggestions();
  const context = useBiographyGenerationContext();

  useEffect(() => {
    if (pendingSuggestions && pendingSuggestions.length > 0) {
      context.restorePendingSuggestions(pendingSuggestions);
    }
  }, [pendingSuggestions, context]);

  return <>{children}</>;
}

/**
 * Providers Component
 *
 * Aggregates all application providers in the correct order:
 * 1. QueryProvider - TanStack Query for server state
 * 2. AuthProvider - Firebase authentication
 * 3. BiographyGenerationProvider - Persistent biography generation state
 * 4. PendingSuggestionsRestorer - Restores pending suggestions from DB
 * 5. ThemeProvider - Dark/light mode support
 *
 * INV-U001: Dark theme is the default (cosmic aesthetic)
 */
export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <QueryProvider>
      <AuthProvider>
        <BiographyGenerationProvider>
          <PendingSuggestionsRestorer>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </PendingSuggestionsRestorer>
        </BiographyGenerationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
