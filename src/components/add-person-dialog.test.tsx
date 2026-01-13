/**
 * AddPersonDialog Tests
 *
 * Tests for the add person dialog component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AddPersonDialog } from './add-person-dialog';

// Mock the hooks
vi.mock('@/hooks/use-people', () => ({
  useCreatePerson: vi.fn(),
}));

import { useCreatePerson } from '@/hooks/use-people';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('AddPersonDialog', () => {
  const mockOnClose = vi.fn();
  const mockCreatePerson = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCreatePerson).mockReturnValue({
      mutateAsync: mockCreatePerson.mockResolvedValue({ id: 'new-person-1' }),
      isPending: false,
    } as unknown as ReturnType<typeof useCreatePerson>);
  });

  describe('Rendering', () => {
    it('should render dialog with title', () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add person/i)).toBeInTheDocument();
    });

    it('should have form fields for name', () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/given name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/surname/i)).toBeInTheDocument();
    });

    it('should have save and cancel buttons', () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should create person on submit', async () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      // Fill in the form
      await userEvent.type(screen.getByLabelText(/given name/i), 'John');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Doe');

      // Submit the form
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should create person
      await waitFor(() => {
        expect(mockCreatePerson).toHaveBeenCalledWith({
          givenName: 'John',
          surname: 'Doe',
        });
      });

      // Should close dialog
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not submit with empty given name', async () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      // Try to submit without filling in given name
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should not call create function
      expect(mockCreatePerson).not.toHaveBeenCalled();
    });

    it('should allow submitting with only given name', async () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      // Fill in only given name
      await userEvent.type(screen.getByLabelText(/given name/i), 'Madonna');

      // Submit the form
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should create person with only given name
      await waitFor(() => {
        expect(mockCreatePerson).toHaveBeenCalledWith({
          givenName: 'Madonna',
          surname: undefined,
        });
      });
    });
  });

  describe('Cancel', () => {
    it('should call onClose when cancel button clicked', async () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', async () => {
      render(<AddPersonDialog onClose={mockOnClose} />, { wrapper: createWrapper() });

      // Click on backdrop (the overlay behind the dialog)
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        await userEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
