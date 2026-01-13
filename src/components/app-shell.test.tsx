import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './app-shell';

// Mock the auth provider
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock the search hooks
vi.mock('@/hooks/use-search', () => ({
  useSearchPeople: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

// Mock AddPersonDialog
vi.mock('@/components/add-person-dialog', () => ({
  AddPersonDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="add-person-dialog">
      Add Person Dialog
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import { useAuth } from '@/components/providers/auth-provider';

const mockedUseAuth = vi.mocked(useAuth);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderWithQueryClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

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

    renderWithQueryClient(<AppShell>Content</AppShell>);
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
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

    renderWithQueryClient(<AppShell><div data-testid="child">Child Content</div></AppShell>);
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
    // Should show loading placeholder instead of sign in button
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('should link logo to landing page when not authenticated', () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
    const logoLink = screen.getByRole('link', { name: /ancestral vision/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('should link logo to constellation when authenticated', () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
    const logoLink = screen.getByRole('link', { name: /ancestral vision/i });
    expect(logoLink).toHaveAttribute('href', '/constellation');
  });

  it('should render search bar when authenticated and onPersonSelect provided', () => {
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

    const mockOnSelect = vi.fn();
    renderWithQueryClient(<AppShell onPersonSelect={mockOnSelect}>Content</AppShell>);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('should not render search bar when not authenticated', () => {
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

    const mockOnSelect = vi.fn();
    renderWithQueryClient(<AppShell onPersonSelect={mockOnSelect}>Content</AppShell>);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('should not render search bar without onPersonSelect callback', () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('should show Add Person button when authenticated', () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
    expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument();
  });

  it('should not show Add Person button when not authenticated', () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);
    expect(screen.queryByRole('button', { name: /add person/i })).not.toBeInTheDocument();
  });

  it('should open AddPersonDialog when Add Person button clicked', async () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);

    await userEvent.click(screen.getByRole('button', { name: /add person/i }));

    expect(screen.getByTestId('add-person-dialog')).toBeInTheDocument();
  });

  it('should close AddPersonDialog when onClose is called', async () => {
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

    renderWithQueryClient(<AppShell>Content</AppShell>);

    // Open dialog
    await userEvent.click(screen.getByRole('button', { name: /add person/i }));
    expect(screen.getByTestId('add-person-dialog')).toBeInTheDocument();

    // Close dialog
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('add-person-dialog')).not.toBeInTheDocument();
  });
});
