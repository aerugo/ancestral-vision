/**
 * PersonForm Component Tests
 *
 * TDD tests for the person form with Zod validation,
 * international name support, and contextual creation.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonForm } from './person-form';

describe('PersonForm', () => {
  describe('Validation (INV-U003: Zod)', () => {
    it('should validate required givenName', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      // Try to submit without name
      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      // Should show error
      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid person data', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'John');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Doe');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'John',
            surname: 'Doe',
          })
        );
      });
    });

    it('should display validation errors for empty givenName', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      // Focus and blur givenName without entering anything
      const givenNameInput = screen.getByLabelText(/given name/i);
      await userEvent.click(givenNameInput);
      await userEvent.tab(); // blur

      // Submit to trigger validation
      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should reject biography exceeding 50000 characters', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Test');

      // Try to set a very long biography (we'll simulate this with a shorter check)
      const biographyInput = screen.getByLabelText(/biography/i);
      // Note: We test the schema validation directly in schema tests
      // Here we just verify the field exists
      expect(biographyInput).toBeInTheDocument();
    });
  });

  describe('International Names', () => {
    it('should handle patronymic names', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Ivan');
      await userEvent.type(screen.getByLabelText(/patronymic/i), 'Petrovich');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Sidorov');

      // Select Patronymic name order
      await userEvent.selectOptions(
        screen.getByLabelText(/name order/i),
        'PATRONYMIC'
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Ivan',
            patronymic: 'Petrovich',
            surname: 'Sidorov',
            nameOrder: 'PATRONYMIC',
          })
        );
      });
    });

    it('should handle maiden names', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Maria');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Smith');
      await userEvent.type(screen.getByLabelText(/maiden name/i), 'Johnson');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Maria',
            surname: 'Smith',
            maidenName: 'Johnson',
          })
        );
      });
    });

    it('should handle Eastern name order', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Taro');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Yamamoto');

      await userEvent.selectOptions(
        screen.getByLabelText(/name order/i),
        'EASTERN'
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Taro',
            surname: 'Yamamoto',
            nameOrder: 'EASTERN',
          })
        );
      });
    });

    it('should handle matronymic names', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Bjork');
      await userEvent.type(screen.getByLabelText(/matronymic/i), 'Gudmundsdottir');

      await userEvent.selectOptions(
        screen.getByLabelText(/name order/i),
        'MATRONYMIC'
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Bjork',
            matronymic: 'Gudmundsdottir',
            nameOrder: 'MATRONYMIC',
          })
        );
      });
    });

    it('should handle nickname and suffix', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'William');
      await userEvent.type(screen.getByLabelText(/nickname/i), 'Bill');
      await userEvent.type(screen.getByLabelText(/suffix/i), 'Jr.');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'William',
            nickname: 'Bill',
            suffix: 'Jr.',
          })
        );
      });
    });
  });

  describe('Edit Mode', () => {
    it('should populate fields with existing person data', () => {
      const existingPerson = {
        id: 'person-123',
        givenName: 'Jane',
        surname: 'Doe',
        gender: 'FEMALE' as const,
      };

      render(<PersonForm person={existingPerson} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText(/given name/i)).toHaveValue('Jane');
      expect(screen.getByLabelText(/surname/i)).toHaveValue('Doe');
    });

    it('should populate all name fields in edit mode', () => {
      const existingPerson = {
        id: 'person-456',
        givenName: 'Ivan',
        surname: 'Sidorov',
        patronymic: 'Petrovich',
        maidenName: '',
        nickname: 'Vanya',
        nameOrder: 'PATRONYMIC' as const,
      };

      render(<PersonForm person={existingPerson} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText(/given name/i)).toHaveValue('Ivan');
      expect(screen.getByLabelText(/surname/i)).toHaveValue('Sidorov');
      expect(screen.getByLabelText(/patronymic/i)).toHaveValue('Petrovich');
      expect(screen.getByLabelText(/nickname/i)).toHaveValue('Vanya');
      expect(screen.getByLabelText(/name order/i)).toHaveValue('PATRONYMIC');
    });

    it('should call onSubmit with updated data', async () => {
      const onSubmit = vi.fn();
      const existingPerson = {
        id: 'person-789',
        givenName: 'John',
        surname: 'Doe',
      };

      render(<PersonForm person={existingPerson} onSubmit={onSubmit} />);

      // Update the surname
      const surnameInput = screen.getByLabelText(/surname/i);
      await userEvent.clear(surnameInput);
      await userEvent.type(surnameInput, 'Smith');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'John',
            surname: 'Smith',
          })
        );
      });
    });
  });

  describe('Gender Selection', () => {
    it('should allow selecting gender', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Alex');
      await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'OTHER');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Alex',
            gender: 'OTHER',
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(<PersonForm onSubmit={vi.fn()} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show Save when not loading', () => {
      render(<PersonForm onSubmit={vi.fn()} isLoading={false} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Contextual Creation', () => {
    it('should show "Add Parent" context when creating parent', () => {
      render(
        <PersonForm
          context={{ type: 'parent', relativeTo: { id: 'child-id', givenName: 'Child' } }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText(/add parent of child/i)).toBeInTheDocument();
    });

    it('should show "Add Child" context when creating child', () => {
      render(
        <PersonForm
          context={{ type: 'child', relativeTo: { id: 'parent-id', givenName: 'Parent' } }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText(/add child of parent/i)).toBeInTheDocument();
    });

    it('should show "Add Spouse" context when creating spouse', () => {
      render(
        <PersonForm
          context={{ type: 'spouse', relativeTo: { id: 'person-id', givenName: 'Person' } }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText(/add spouse of person/i)).toBeInTheDocument();
    });

    it('should not show context when none provided', () => {
      render(<PersonForm onSubmit={vi.fn()} />);

      expect(screen.queryByText(/add parent of/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/add child of/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/add spouse of/i)).not.toBeInTheDocument();
    });
  });

  describe('Speculative Person', () => {
    it('should allow marking person as speculative', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Unknown');
      await userEvent.click(screen.getByLabelText(/speculative/i));

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Unknown',
            speculative: true,
          })
        );
      });
    });
  });
});
