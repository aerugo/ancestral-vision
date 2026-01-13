/**
 * EditPersonDialog Component Tests
 *
 * TDD tests for the EditPersonDialog component that allows editing
 * person details with full international name support.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditPersonDialog } from './edit-person-dialog';

// Mock the use-people hooks
const mockUpdatePerson = vi.fn();
vi.mock('@/hooks/use-people', () => ({
  usePerson: vi.fn((id: string | null) => ({
    data: id
      ? {
          id,
          givenName: 'John',
          surname: 'Doe',
          patronymic: null,
          maidenName: null,
          matronymic: null,
          nickname: null,
          suffix: null,
          nameOrder: 'WESTERN',
          gender: 'MALE',
          biography: 'A test biography',
          speculative: false,
          birthDate: null,
          deathDate: null,
          generation: 0,
        }
      : null,
    isLoading: false,
  })),
  useUpdatePerson: vi.fn(() => ({
    mutateAsync: mockUpdatePerson,
    isPending: false,
  })),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('EditPersonDialog', () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    personId: 'test-person-id',
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePerson.mockResolvedValue({
      id: 'test-person-id',
      givenName: 'John',
      surname: 'Doe',
    });
  });

  describe('Rendering', () => {
    it('should render dialog with edit person title', () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Person')).toBeInTheDocument();
    });

    it('should render PersonForm with existing person data', () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      // Check that the form fields have the person's data
      expect(screen.getByLabelText(/given name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/^surname$/i)).toHaveValue('Doe');
    });

    it('should render all international name fields', () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      expect(screen.getByLabelText(/given name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^surname$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maiden name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/patronymic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/matronymic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/suffix/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name order/i)).toBeInTheDocument();
    });

    it('should render save and cancel buttons', () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onClose when cancel button is clicked', () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      // Find and click the backdrop (the outer dialog area)
      const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call updatePerson mutation on form submit', async () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      // Modify a field
      const givenNameInput = screen.getByLabelText(/given name/i);
      fireEvent.change(givenNameInput, { target: { value: 'Jane' } });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdatePerson).toHaveBeenCalledWith({
          id: 'test-person-id',
          input: expect.objectContaining({
            givenName: 'Jane',
          }),
        });
      });
    });

    it('should close dialog after successful save', async () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should update international name fields', async () => {
      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      // Fill in international name fields
      fireEvent.change(screen.getByLabelText(/maiden name/i), {
        target: { value: 'Smith' },
      });
      fireEvent.change(screen.getByLabelText(/patronymic/i), {
        target: { value: 'Ivanovich' },
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdatePerson).toHaveBeenCalledWith({
          id: 'test-person-id',
          input: expect.objectContaining({
            maidenName: 'Smith',
            patronymic: 'Ivanovich',
          }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should not close dialog on error', async () => {
      mockUpdatePerson.mockRejectedValueOnce(new Error('Update failed'));

      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdatePerson).toHaveBeenCalled();
      });

      // Dialog should remain open (wait a bit for async error handling)
      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  // Note: This test modifies global mocks, so it's placed last to avoid interference
  describe('Loading State', () => {
    it('should disable save button during submission', async () => {
      // Mock pending state by modifying the mock implementation
      const usePeopleMock = await import('@/hooks/use-people');
      vi.spyOn(usePeopleMock, 'useUpdatePerson').mockReturnValue({
        mutateAsync: mockUpdatePerson,
        isPending: true,
        mutate: vi.fn(),
        data: undefined,
        error: null,
        isError: false,
        isIdle: false,
        isPaused: false,
        isSuccess: false,
        reset: vi.fn(),
        status: 'pending',
        variables: undefined,
        failureCount: 0,
        failureReason: null,
        context: undefined,
        submittedAt: 0,
      });

      renderWithProviders(<EditPersonDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });
});
