/**
 * Security Settings Component Tests
 *
 * Tests for email and password change functionality via Firebase Auth.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SecuritySettings } from './security-settings';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
}));

import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';

// Mock the auth provider
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/components/providers/auth-provider';

// Mock Firebase lib
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      email: 'test@example.com',
    },
  },
}));

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

describe('SecuritySettings', () => {
  const mockUser = {
    email: 'test@example.com',
    uid: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
    } as ReturnType<typeof useAuth>);

    vi.mocked(reauthenticateWithCredential).mockResolvedValue({} as never);
    vi.mocked(updateEmail).mockResolvedValue(undefined);
    vi.mocked(updatePassword).mockResolvedValue(undefined);
    vi.mocked(EmailAuthProvider.credential).mockReturnValue({} as never);
  });

  it('should render email change form', () => {
    render(<SecuritySettings />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/new email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change email/i })).toBeInTheDocument();
  });

  it('should render password change form', () => {
    render(<SecuritySettings />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/new email/i);
    await user.type(emailInput, 'invalid-email');

    const currentPasswordInput = screen.getByLabelText(/current password.*email/i);
    await user.type(currentPasswordInput, 'password123');

    const changeEmailButton = screen.getByRole('button', { name: /change email/i });
    await user.click(changeEmailButton);

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(updateEmail).not.toHaveBeenCalled();
  });

  it('should validate password requirements', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const currentPasswordInput = screen.getByLabelText(/current password.*password/i);
    await user.type(currentPasswordInput, 'password123');

    const newPasswordInput = screen.getByLabelText(/new password/i);
    await user.type(newPasswordInput, 'short');

    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await user.type(confirmPasswordInput, 'short');

    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    await user.click(changePasswordButton);

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('should require current password for email change', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/new email/i);
    await user.type(emailInput, 'new@example.com');

    const changeEmailButton = screen.getByRole('button', { name: /change email/i });
    await user.click(changeEmailButton);

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
    expect(updateEmail).not.toHaveBeenCalled();
  });

  it('should require password confirmation', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const currentPasswordInput = screen.getByLabelText(/current password.*password/i);
    await user.type(currentPasswordInput, 'password123');

    const newPasswordInput = screen.getByLabelText(/new password/i);
    await user.type(newPasswordInput, 'newpassword123');

    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await user.type(confirmPasswordInput, 'differentpassword');

    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    await user.click(changePasswordButton);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('should call Firebase Auth for email change', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/new email/i);
    await user.type(emailInput, 'new@example.com');

    const currentPasswordInput = screen.getByLabelText(/current password.*email/i);
    await user.type(currentPasswordInput, 'password123');

    const changeEmailButton = screen.getByRole('button', { name: /change email/i });
    await user.click(changeEmailButton);

    await waitFor(() => {
      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(updateEmail).toHaveBeenCalled();
    });
  });

  it('should call Firebase Auth for password change', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const currentPasswordInput = screen.getByLabelText(/current password.*password/i);
    await user.type(currentPasswordInput, 'password123');

    const newPasswordInput = screen.getByLabelText(/new password/i);
    await user.type(newPasswordInput, 'newpassword123');

    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await user.type(confirmPasswordInput, 'newpassword123');

    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    await user.click(changePasswordButton);

    await waitFor(() => {
      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(updatePassword).toHaveBeenCalled();
    });
  });

  it('should show success message for email change', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/new email/i);
    await user.type(emailInput, 'new@example.com');

    const currentPasswordInput = screen.getByLabelText(/current password.*email/i);
    await user.type(currentPasswordInput, 'password123');

    const changeEmailButton = screen.getByRole('button', { name: /change email/i });
    await user.click(changeEmailButton);

    expect(await screen.findByText(/email updated/i)).toBeInTheDocument();
  });

  it('should show error message for email change failure', async () => {
    vi.mocked(updateEmail).mockRejectedValueOnce(new Error('Invalid password'));

    const user = userEvent.setup();
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/new email/i);
    await user.type(emailInput, 'new@example.com');

    const currentPasswordInput = screen.getByLabelText(/current password.*email/i);
    await user.type(currentPasswordInput, 'password123');

    const changeEmailButton = screen.getByRole('button', { name: /change email/i });
    await user.click(changeEmailButton);

    expect(await screen.findByText(/invalid password/i)).toBeInTheDocument();
  });
});
