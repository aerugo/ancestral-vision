/**
 * PersonEventsTab Tests
 *
 * Tests for the PersonEventsTab component that manages events for a person.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonEventsTab } from './person-events-tab';
import * as eventHooks from '@/hooks/use-events';

// Mock the event hooks
vi.mock('@/hooks/use-events');

const mockEvents = [
  {
    id: 'event-1',
    title: 'Birth',
    description: 'Born in Boston',
    date: { type: 'exact' as const, year: 1985, month: 6, day: 15 },
    location: { place: 'Boston', region: 'MA', country: 'USA' },
    participants: [],
    privacy: 'PRIVATE' as const,
  },
  {
    id: 'event-2',
    title: 'Graduation',
    description: null,
    date: { type: 'approximate' as const, year: 2007 },
    location: null,
    participants: [{ personId: 'person-2' }],
    privacy: 'PRIVATE' as const,
  },
];

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
}

describe('PersonEventsTab', () => {
  const mockPersonId = 'person-1';
  const mockCreateEvent = vi.fn();
  const mockUpdateEvent = vi.fn();
  const mockDeleteEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default hook implementations
    vi.mocked(eventHooks.usePersonEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof eventHooks.usePersonEvents>);

    vi.mocked(eventHooks.useCreateEvent).mockReturnValue({
      mutateAsync: mockCreateEvent,
      isPending: false,
    } as unknown as ReturnType<typeof eventHooks.useCreateEvent>);

    vi.mocked(eventHooks.useUpdateEvent).mockReturnValue({
      mutateAsync: mockUpdateEvent,
      isPending: false,
    } as unknown as ReturnType<typeof eventHooks.useUpdateEvent>);

    vi.mocked(eventHooks.useDeleteEvent).mockReturnValue({
      mutate: mockDeleteEvent,
      isPending: false,
    } as unknown as ReturnType<typeof eventHooks.useDeleteEvent>);
  });

  describe('Loading State', () => {
    it('should show loading indicator when events are loading', () => {
      vi.mocked(eventHooks.usePersonEvents).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as ReturnType<typeof eventHooks.usePersonEvents>);

      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      expect(screen.getByText(/loading events/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', () => {
      vi.mocked(eventHooks.usePersonEvents).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as ReturnType<typeof eventHooks.usePersonEvents>);

      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      expect(screen.getByText(/error loading events/i)).toBeInTheDocument();
    });
  });

  describe('List View', () => {
    it('should render event timeline with events', () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      expect(screen.getByText('Birth')).toBeInTheDocument();
      expect(screen.getByText('Graduation')).toBeInTheDocument();
    });

    it('should show add event button', () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      expect(screen.getByRole('button', { name: /add.*event/i })).toBeInTheDocument();
    });

    it('should render empty state when no events', () => {
      vi.mocked(eventHooks.usePersonEvents).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof eventHooks.usePersonEvents>);

      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      expect(screen.getByText(/no events/i)).toBeInTheDocument();
    });
  });

  describe('Create Event', () => {
    it('should show create form when add button clicked', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*event/i }));

      expect(screen.getByText(/new event/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it('should show back button in create view', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*event/i }));

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should return to list when back clicked', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*event/i }));
      await userEvent.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByText('Birth')).toBeInTheDocument();
    });

    it('should call createEvent on form submit', async () => {
      mockCreateEvent.mockResolvedValue({ id: 'new-event' });
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*event/i }));
      await userEvent.type(screen.getByLabelText(/title/i), 'New Event');
      await userEvent.type(screen.getByLabelText(/year/i), '2020');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Event', () => {
    it('should show edit form when event clicked', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByText('Birth'));

      expect(screen.getByText(/edit event/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Birth')).toBeInTheDocument();
    });

    it('should show delete button in edit view', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByText('Birth'));

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should show confirmation dialog when delete clicked', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByText('Birth'));
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/delete this event/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('should call deleteEvent when confirmed', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByText('Birth'));
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDeleteEvent).toHaveBeenCalledWith('event-1');
    });

    it('should close dialog when cancel clicked', async () => {
      renderWithQueryClient(<PersonEventsTab personId={mockPersonId} />);

      await userEvent.click(screen.getByText('Birth'));
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));

      // Find cancel button within the dialog (there are two Cancel buttons)
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      // The dialog cancel button is the last one
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText(/delete this event/i)).not.toBeInTheDocument();
    });
  });
});
