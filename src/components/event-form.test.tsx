/**
 * Event Form Tests
 *
 * Tests for the EventForm component with date validation and Zod schema.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventForm } from './event-form';

describe('EventForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render event form fields', () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    });

    it('should render date type options', () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      expect(screen.getByLabelText(/exact/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/approximate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/before/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/after/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/range/i)).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel provided', () => {
      render(
        <EventForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          primaryPersonId="person-1"
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel not provided', () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should validate title is required', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should call onSubmit with valid data', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.type(screen.getByLabelText(/year/i), '1985');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Birth',
            primaryPersonId: 'person-1',
          })
        );
      });
    });
  });

  describe('Exact Date', () => {
    it('should accept exact date with full YYYY-MM-DD', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.type(screen.getByLabelText(/year/i), '1985');
      await userEvent.type(screen.getByLabelText(/month/i), '6');
      await userEvent.type(screen.getByLabelText(/day/i), '15');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            date: { type: 'exact', year: 1985, month: 6, day: 15 },
          })
        );
      });
    });

    it('should accept exact date with year only', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.type(screen.getByLabelText(/year/i), '1985');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.objectContaining({ type: 'exact', year: 1985 }),
          })
        );
      });
    });
  });

  describe('Approximate Date', () => {
    it('should accept approximate date', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.click(screen.getByLabelText(/approximate/i));
      await userEvent.type(screen.getByLabelText(/year/i), '1920');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            date: { type: 'approximate', year: 1920 },
          })
        );
      });
    });
  });

  describe('Before/After Date', () => {
    it('should accept before date', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Death');
      await userEvent.click(screen.getByLabelText(/before/i));
      await userEvent.type(screen.getByLabelText(/year/i), '1920');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            date: { type: 'before', year: 1920 },
          })
        );
      });
    });

    it('should accept after date', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.click(screen.getByLabelText(/after/i));
      await userEvent.type(screen.getByLabelText(/year/i), '1900');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            date: { type: 'after', year: 1900 },
          })
        );
      });
    });
  });

  describe('Date Range', () => {
    it('should accept date range', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.click(screen.getByLabelText(/range/i));
      // Use exact label text for Year field to avoid matching End Year
      await userEvent.type(screen.getByLabelText('Year'), '1920');
      await userEvent.type(screen.getByLabelText(/end year/i), '1925');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            date: { type: 'range', startYear: 1920, endYear: 1925 },
          })
        );
      });
    });

    it('should show end year field only for range type', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      // Initially no end year field
      expect(screen.queryByLabelText(/end year/i)).not.toBeInTheDocument();

      // Select range type
      await userEvent.click(screen.getByLabelText(/range/i));

      // End year field should appear
      expect(screen.getByLabelText(/end year/i)).toBeInTheDocument();
    });
  });

  describe('Location', () => {
    it('should accept location', async () => {
      render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

      await userEvent.type(screen.getByLabelText(/title/i), 'Birth');
      await userEvent.type(screen.getByLabelText(/year/i), '1985');
      await userEvent.type(screen.getByLabelText(/location/i), 'Boston, MA, USA');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            location: expect.objectContaining({ place: 'Boston, MA, USA' }),
          })
        );
      });
    });
  });

  describe('Edit Mode', () => {
    it('should populate fields with initial data', () => {
      const initialData = {
        title: 'Existing Event',
        description: 'Some description',
        dateType: 'exact' as const,
        year: 1990,
        month: 3,
        day: 15,
        location: 'New York',
      };

      render(
        <EventForm
          onSubmit={mockOnSubmit}
          primaryPersonId="person-1"
          initialData={initialData}
        />
      );

      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Event');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Some description');
      expect(screen.getByLabelText(/year/i)).toHaveValue(1990);
      expect(screen.getByLabelText(/month/i)).toHaveValue(3);
      expect(screen.getByLabelText(/day/i)).toHaveValue(15);
      expect(screen.getByLabelText(/location/i)).toHaveValue('New York');
    });
  });

  describe('Cancel', () => {
    it('should call onCancel when cancel button clicked', async () => {
      render(
        <EventForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          primaryPersonId="person-1"
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
