'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers Component
 *
 * Aggregates all application providers in the correct order:
 * 1. QueryProvider - TanStack Query for server state
 * 2. AuthProvider - Firebase authentication
 * 3. ThemeProvider - Dark/light mode support
 *
 * INV-U001: Dark theme is the default (cosmic aesthetic)
 */
export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
