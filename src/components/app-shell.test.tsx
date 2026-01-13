import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

// Mock the auth provider
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/components/providers/auth-provider';

const mockedUseAuth = vi.mocked(useAuth);

describe('App Shell', () => {
  it('should render navigation', () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: 'test', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render canvas container', () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: 'test', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByTestId('canvas-container')).toBeInTheDocument();
  });

  it('should render children', () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: 'test', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell><div data-testid="child">Child Content</div></AppShell>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should show user name when authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: 'test', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell>Content</AppShell>);
    // The user menu button should show initials
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('should show sign in button when not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show loading state while checking auth', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell>Content</AppShell>);
    // Should show loading placeholder instead of sign in button
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('should show logo link to home', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AppShell>Content</AppShell>);
    const logoLink = screen.getByRole('link', { name: /ancestral vision/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });
});
