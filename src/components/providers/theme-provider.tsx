'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps as NextThemesProviderProps } from 'next-themes';

/**
 * Theme provider props
 */
export interface ThemeProviderProps extends NextThemesProviderProps {
  children: React.ReactNode;
}

/**
 * Theme Provider Component
 *
 * Wraps the application with next-themes for dark/light mode support.
 * Default theme is dark (cosmic aesthetic per INV-U001).
 */
export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps): React.ReactElement {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
