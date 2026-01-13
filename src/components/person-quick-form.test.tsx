/**
 * PersonQuickForm Component Tests
 *
 * Tests for the simplified person entry form used in onboarding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonQuickForm } from './person-quick-form';

describe('PersonQuickForm', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render label', () => {
    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    expect(screen.getByText('Father')).toBeInTheDocument();
  });

  it('should render given name input', () => {
    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    expect(screen.getByPlaceholderText(/given name/i)).toBeInTheDocument();
  });

  it('should render surname input', () => {
    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    expect(screen.getByPlaceholderText(/surname/i)).toBeInTheDocument();
  });

  it('should render birth year input when not compact', () => {
    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    expect(screen.getByPlaceholderText(/birth year/i)).toBeInTheDocument();
  });

  it('should not render birth year input when compact', () => {
    render(<PersonQuickForm label="Father" onChange={mockOnChange} compact />);

    expect(screen.queryByPlaceholderText(/birth year/i)).not.toBeInTheDocument();
  });

  it('should call onChange when given name changes', async () => {
    const user = userEvent.setup();

    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    const givenNameInput = screen.getByPlaceholderText(/given name/i);
    await user.type(givenNameInput, 'John');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    // Check that the last call includes the given name
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
    expect(lastCall[0]).toHaveProperty('givenName', 'John');
  });

  it('should call onChange when surname changes', async () => {
    const user = userEvent.setup();

    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    const surnameInput = screen.getByPlaceholderText(/surname/i);
    await user.type(surnameInput, 'Doe');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
    expect(lastCall[0]).toHaveProperty('surname', 'Doe');
  });

  it('should show validation error for empty given name when touched', async () => {
    const user = userEvent.setup();

    render(<PersonQuickForm label="Father" onChange={mockOnChange} showValidation />);

    const givenNameInput = screen.getByPlaceholderText(/given name/i);
    await user.click(givenNameInput);
    await user.tab(); // blur

    await waitFor(() => {
      expect(screen.getByText(/given name is required/i)).toBeInTheDocument();
    });
  });

  it('should accept initial values', () => {
    render(
      <PersonQuickForm
        label="Father"
        onChange={mockOnChange}
        initialValues={{ givenName: 'John', surname: 'Doe' }}
      />
    );

    expect(screen.getByPlaceholderText(/given name/i)).toHaveValue('John');
    expect(screen.getByPlaceholderText(/surname/i)).toHaveValue('Doe');
  });

  it('should handle birth year input', async () => {
    const user = userEvent.setup();

    render(<PersonQuickForm label="Father" onChange={mockOnChange} />);

    const birthYearInput = screen.getByPlaceholderText(/birth year/i);
    await user.type(birthYearInput, '1960');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
    expect(lastCall[0]).toHaveProperty('birthYear', 1960);
  });

  it('should apply compact styles', () => {
    render(<PersonQuickForm label="Father" onChange={mockOnChange} compact />);

    // Compact mode should have smaller inputs
    const givenNameInput = screen.getByPlaceholderText(/given name/i);
    expect(givenNameInput.className).toContain('h-8');
  });
});
