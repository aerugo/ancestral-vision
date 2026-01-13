import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from './index';

// Mock the providers
vi.mock('./query-provider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

vi.mock('./auth-provider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock('./theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

describe('Providers', () => {
  it('should render children', () => {
    render(
      <Providers>
        <div data-testid="child">Hello</div>
      </Providers>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should wrap with QueryProvider', () => {
    render(
      <Providers>
        <div>Content</div>
      </Providers>
    );

    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
  });

  it('should wrap with AuthProvider', () => {
    render(
      <Providers>
        <div>Content</div>
      </Providers>
    );

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
  });

  it('should wrap with ThemeProvider', () => {
    render(
      <Providers>
        <div>Content</div>
      </Providers>
    );

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
  });

  it('should nest providers in correct order', () => {
    render(
      <Providers>
        <div data-testid="child">Content</div>
      </Providers>
    );

    // Query > Auth > Theme > Child
    const queryProvider = screen.getByTestId('query-provider');
    const authProvider = screen.getByTestId('auth-provider');
    const themeProvider = screen.getByTestId('theme-provider');
    const child = screen.getByTestId('child');

    expect(queryProvider).toContainElement(authProvider);
    expect(authProvider).toContainElement(themeProvider);
    expect(themeProvider).toContainElement(child);
  });
});
