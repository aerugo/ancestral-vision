/**
 * AddRelationshipDialog Tests
 *
 * Tests for the relationship creation dialog component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AddRelationshipDialog } from './add-relationship-dialog';

// Mock the hooks
vi.mock('@/hooks/use-people', () => ({
  useCreatePerson: vi.fn(),
}));

vi.mock('@/hooks/use-relationships', () => ({
  useCreateParentChildRelationship: vi.fn(),
  useCreateSpouseRelationship: vi.fn(),
}));

import { useCreatePerson } from '@/hooks/use-people';
import {
  useCreateParentChildRelationship,
  useCreateSpouseRelationship,
} from '@/hooks/use-relationships';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('AddRelationshipDialog', () => {
  const mockOnClose = vi.fn();
  const mockCreatePerson = vi.fn();
  const mockCreateParentChild = vi.fn();
  const mockCreateSpouse = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useCreatePerson).mockReturnValue({
      mutateAsync: mockCreatePerson.mockResolvedValue({ id: 'new-person-1' }),
      isPending: false,
    } as unknown as ReturnType<typeof useCreatePerson>);

    vi.mocked(useCreateParentChildRelationship).mockReturnValue({
      mutateAsync: mockCreateParentChild.mockResolvedValue({ id: 'rel-1' }),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateParentChildRelationship>);

    vi.mocked(useCreateSpouseRelationship).mockReturnValue({
      mutateAsync: mockCreateSpouse.mockResolvedValue({ id: 'spouse-rel-1' }),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateSpouseRelationship>);
  });

  describe('Rendering', () => {
    it('should render dialog with title for adding parent', () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="parent"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add parent/i)).toBeInTheDocument();
    });

    it('should render dialog with title for adding child', () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="child"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/add child/i)).toBeInTheDocument();
    });

    it('should render dialog with title for adding spouse', () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="spouse"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/add spouse/i)).toBeInTheDocument();
    });

    it('should have form fields for name', () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="parent"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/given name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/surname/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should create person and parent-child relationship when adding parent', async () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="parent"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      // Fill in the form
      await userEvent.type(screen.getByLabelText(/given name/i), 'John');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Doe');

      // Submit the form
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should create person first
      await waitFor(() => {
        expect(mockCreatePerson).toHaveBeenCalledWith({
          givenName: 'John',
          surname: 'Doe',
        });
      });

      // Then create parent-child relationship (new person is parent)
      await waitFor(() => {
        expect(mockCreateParentChild).toHaveBeenCalledWith({
          parentId: 'new-person-1',
          childId: 'person-123',
        });
      });

      // Should close dialog
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should create person and parent-child relationship when adding child', async () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="child"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      // Fill in the form
      await userEvent.type(screen.getByLabelText(/given name/i), 'Jane');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Doe');

      // Submit the form
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should create person first
      await waitFor(() => {
        expect(mockCreatePerson).toHaveBeenCalledWith({
          givenName: 'Jane',
          surname: 'Doe',
        });
      });

      // Then create parent-child relationship (current person is parent)
      await waitFor(() => {
        expect(mockCreateParentChild).toHaveBeenCalledWith({
          parentId: 'person-123',
          childId: 'new-person-1',
        });
      });
    });

    it('should create person and spouse relationship when adding spouse', async () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="spouse"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      // Fill in the form
      await userEvent.type(screen.getByLabelText(/given name/i), 'Mary');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Smith');

      // Submit the form
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should create person first
      await waitFor(() => {
        expect(mockCreatePerson).toHaveBeenCalledWith({
          givenName: 'Mary',
          surname: 'Smith',
        });
      });

      // Then create spouse relationship
      await waitFor(() => {
        expect(mockCreateSpouse).toHaveBeenCalledWith({
          person1Id: 'person-123',
          person2Id: 'new-person-1',
        });
      });
    });

    it('should not submit with empty given name', async () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="parent"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      // Try to submit without filling in given name
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Should not call create functions
      expect(mockCreatePerson).not.toHaveBeenCalled();
    });
  });

  describe('Cancel', () => {
    it('should call onClose when cancel button clicked', async () => {
      render(
        <AddRelationshipDialog
          personId="person-123"
          relationshipType="parent"
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
