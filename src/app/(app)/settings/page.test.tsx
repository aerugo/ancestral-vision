/**
 * Settings Page Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import SettingsPage from './page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

// Mock auth provider
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock settings hook
vi.mock('@/hooks/use-settings', () => ({
  useSettings: vi.fn(),
  useUpdateProfile: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdatePreferences: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

// Mock Firebase lib
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      email: 'test@example.com',
    },
  },
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
}));

import { useAuth } from '@/components/providers/auth-provider';
import { useSettings } from '@/hooks/use-settings';
import type { UserSettings } from '@/hooks/use-settings';

const mockSettings: UserSettings = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  preferences: {
    theme: 'dark',
    defaultPrivacy: 'private',
    emailNotifications: true,
    emailDigestFrequency: 'daily',
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it('should redirect unauthenticated users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useSettings).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useSettings>);

    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should show settings form', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useSettings).mockReturnValue({
      data: mockSettings,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useSettings>);

    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/settings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
  });

  it('should show security section', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useSettings).mockReturnValue({
      data: mockSettings,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useSettings>);

    render(<SettingsPage />, { wrapper: createWrapper() });

    // Security section has h2 headings for each form
    const emailHeadings = screen.getAllByText(/change email/i);
    const passwordHeadings = screen.getAllByText(/change password/i);
    expect(emailHeadings.length).toBeGreaterThan(0);
    expect(passwordHeadings.length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test User' },
      loading: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useSettings>);

    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
