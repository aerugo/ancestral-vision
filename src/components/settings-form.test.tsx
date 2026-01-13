/**
 * Settings Form Component Tests
 *
 * Tests for the SettingsForm component that manages profile and preferences.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SettingsForm } from './settings-form';
import type { UserSettings } from '@/hooks/use-settings';

// Mock the hooks
vi.mock('@/hooks/use-settings', () => ({
  useSettings: vi.fn(),
  useUpdateProfile: vi.fn(),
  useUpdatePreferences: vi.fn(),
}));

import { useSettings, useUpdateProfile, useUpdatePreferences } from '@/hooks/use-settings';

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

describe('SettingsForm', () => {
  const mockUpdateProfile = vi.fn();
  const mockUpdatePreferences = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSettings).mockReturnValue({
      data: mockSettings,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useSettings>);

    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: mockUpdateProfile,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateProfile>);

    vi.mocked(useUpdatePreferences).mockReturnValue({
      mutateAsync: mockUpdatePreferences,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePreferences>);
  });

  it('should render profile section', () => {
    render(<SettingsForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
  });

  it('should render theme selector', () => {
    render(<SettingsForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /system/i })).toBeInTheDocument();
  });

  it('should render privacy selector', () => {
    render(<SettingsForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/default privacy/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /private/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /family/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /public/i })).toBeInTheDocument();
  });

  it('should render notification toggles', () => {
    render(<SettingsForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/digest frequency/i)).toBeInTheDocument();
  });

  it('should show current values', () => {
    render(<SettingsForm />, { wrapper: createWrapper() });

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /theme/i })).toHaveValue('dark');
    expect(screen.getByRole('combobox', { name: /default privacy/i })).toHaveValue('private');
  });

  it('should validate display name', async () => {
    const user = userEvent.setup();
    render(<SettingsForm />, { wrapper: createWrapper() });

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(await screen.findByText(/display name is required/i)).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('should submit form on save', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValueOnce(mockSettings);

    render(<SettingsForm />, { wrapper: createWrapper() });

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'New Name');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ displayName: 'New Name' });
    });
  });

  it('should show success message', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValueOnce(mockSettings);

    render(<SettingsForm />, { wrapper: createWrapper() });

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'New Name');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(await screen.findByText(/settings saved/i)).toBeInTheDocument();
  });

  it('should show error message', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockRejectedValueOnce(new Error('Failed to save'));

    render(<SettingsForm />, { wrapper: createWrapper() });

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'New Name');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
  });

  it('should disable save when unchanged', () => {
    render(<SettingsForm />, { wrapper: createWrapper() });

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('should show loading state', () => {
    vi.mocked(useSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useSettings>);

    render(<SettingsForm />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should update preferences when theme changes', async () => {
    const user = userEvent.setup();
    mockUpdatePreferences.mockResolvedValueOnce({
      ...mockSettings,
      preferences: { ...mockSettings.preferences, theme: 'light' },
    });

    render(<SettingsForm />, { wrapper: createWrapper() });

    const themeSelect = screen.getByRole('combobox', { name: /theme/i });
    await user.selectOptions(themeSelect, 'light');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'light' })
      );
    });
  });
});
