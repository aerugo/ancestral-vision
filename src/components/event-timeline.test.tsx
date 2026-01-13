/**
 * Event Timeline Tests
 *
 * Tests for the EventTimeline component that displays events chronologically.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventTimeline } from './event-timeline';
import type { FuzzyDate } from '@/lib/date-utils';

interface MockEvent {
  id: string;
  title: string;
  description?: string | null;
  date: FuzzyDate | null;
  location: { place: string; region?: string; country?: string } | null;
  participants: { personId: string }[];
}

const mockEvents: MockEvent[] = [
  {
    id: 'event-1',
    title: 'Birth',
    description: 'Born in Boston',
    date: { type: 'exact', year: 1985, month: 6, day: 15 },
    location: { place: 'Boston', region: 'MA', country: 'USA' },
    participants: [],
  },
  {
    id: 'event-2',
    title: 'Graduation',
    description: null,
    date: { type: 'approximate', year: 2007 },
    location: null,
    participants: [{ personId: 'person-2' }],
  },
  {
    id: 'event-3',
    title: 'Wedding',
    description: 'Married Jane',
    date: { type: 'exact', year: 2010, month: 8, day: 20 },
    location: { place: 'New York', country: 'USA' },
    participants: [{ personId: 'person-2' }, { personId: 'person-3' }],
  },
];

describe('EventTimeline', () => {
  describe('Rendering', () => {
    it('should render timeline of events', () => {
      render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

      expect(screen.getByText('Birth')).toBeInTheDocument();
      expect(screen.getByText('Graduation')).toBeInTheDocument();
      expect(screen.getByText('Wedding')).toBeInTheDocument();
    });

    it('should sort events chronologically', () => {
      const unsortedEvents: MockEvent[] = [
        { ...mockEvents[2] }, // Wedding 2010
        { ...mockEvents[0] }, // Birth 1985
        { ...mockEvents[1] }, // Graduation 2007
      ];

      render(<EventTimeline events={unsortedEvents} onEventClick={vi.fn()} />);

      const eventTitles = screen.getAllByRole('heading', { level: 3 });
      expect(eventTitles[0]).toHaveTextContent('Birth');
      expect(eventTitles[1]).toHaveTextContent('Graduation');
      expect(eventTitles[2]).toHaveTextContent('Wedding');
    });

    it('should display formatted dates', () => {
      render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

      expect(screen.getByText('June 15, 1985')).toBeInTheDocument();
      expect(screen.getByText('About 2007')).toBeInTheDocument();
      expect(screen.getByText('August 20, 2010')).toBeInTheDocument();
    });

    it('should handle events with fuzzy dates', () => {
      const eventsWithFuzzyDates: MockEvent[] = [
        {
          id: 'fuzzy-1',
          title: 'Unknown Birth',
          date: { type: 'before', year: 1900 },
          location: null,
          participants: [],
        },
        {
          id: 'fuzzy-2',
          title: 'Post War Event',
          date: { type: 'after', year: 1945 },
          location: null,
          participants: [],
        },
        {
          id: 'fuzzy-3',
          title: 'Range Event',
          date: { type: 'range', startYear: 1920, endYear: 1925 },
          location: null,
          participants: [],
        },
      ];

      render(<EventTimeline events={eventsWithFuzzyDates} onEventClick={vi.fn()} />);

      expect(screen.getByText('Before 1900')).toBeInTheDocument();
      expect(screen.getByText('After 1945')).toBeInTheDocument();
      expect(screen.getByText('Between 1920 and 1925')).toBeInTheDocument();
    });

    it('should handle events without dates', () => {
      const eventsWithoutDates: MockEvent[] = [
        {
          id: 'no-date-1',
          title: 'Undated Event',
          date: null,
          location: null,
          participants: [],
        },
      ];

      render(<EventTimeline events={eventsWithoutDates} onEventClick={vi.fn()} />);

      expect(screen.getByText('Undated Event')).toBeInTheDocument();
      expect(screen.getByText(/date unknown/i)).toBeInTheDocument();
    });
  });

  describe('Participants', () => {
    it('should show participants count', () => {
      render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

      // Wedding has 2 participants
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should not show count for events with no participants', () => {
      const singleEvent: MockEvent[] = [mockEvents[0]]; // Birth has no participants

      render(<EventTimeline events={singleEvent} onEventClick={vi.fn()} />);

      expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
    });
  });

  describe('Location', () => {
    it('should display location when available', () => {
      render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

      // Use getAllByText since "Boston" appears in both location and description
      expect(screen.getAllByText(/Boston/).length).toBeGreaterThan(0);
      expect(screen.getByText(/New York/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should handle empty events array', () => {
      render(<EventTimeline events={[]} onEventClick={vi.fn()} />);

      expect(screen.getByText(/no events/i)).toBeInTheDocument();
    });

    it('should show add event prompt when empty', () => {
      render(
        <EventTimeline events={[]} onEventClick={vi.fn()} onAddEvent={vi.fn()} />
      );

      expect(
        screen.getByRole('button', { name: /add.*event/i })
      ).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onEventClick when event clicked', async () => {
      const handleClick = vi.fn();
      render(<EventTimeline events={mockEvents} onEventClick={handleClick} />);

      await userEvent.click(screen.getByText('Birth'));

      expect(handleClick).toHaveBeenCalledWith('event-1');
    });

    it('should show add event button when onAddEvent provided', () => {
      const handleAddEvent = vi.fn();
      render(
        <EventTimeline
          events={mockEvents}
          onEventClick={vi.fn()}
          onAddEvent={handleAddEvent}
        />
      );

      expect(
        screen.getByRole('button', { name: /add.*event/i })
      ).toBeInTheDocument();
    });

    it('should call onAddEvent when add button clicked', async () => {
      const handleAddEvent = vi.fn();
      render(
        <EventTimeline
          events={mockEvents}
          onEventClick={vi.fn()}
          onAddEvent={handleAddEvent}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /add.*event/i }));

      expect(handleAddEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible list structure', () => {
      render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('should have clickable event titles', () => {
      render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

      const buttons = screen.getAllByRole('button');
      // Should have at least 3 buttons for event clicks
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });
});
