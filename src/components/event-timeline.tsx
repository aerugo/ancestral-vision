/**
 * EventTimeline Component
 *
 * Displays a chronological timeline of events for a person.
 */
'use client';

import { useMemo, type ReactElement } from 'react';
import { Plus, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFuzzyDate, compareFuzzyDates, type FuzzyDate } from '@/lib/date-utils';

interface EventParticipant {
  personId: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  description?: string | null;
  date: FuzzyDate | null;
  location: { place: string; region?: string; country?: string } | null;
  participants: EventParticipant[];
}

interface EventTimelineProps {
  events: TimelineEvent[];
  onEventClick: (eventId: string) => void;
  onAddEvent?: () => void;
}

/**
 * EventTimeline - Displays events in chronological order
 *
 * Features:
 * - Chronological sorting by date
 * - Support for fuzzy dates (exact, approximate, before, after, range)
 * - Location display
 * - Participant count badge
 * - Empty state with add prompt
 */
export function EventTimeline({
  events,
  onEventClick,
  onAddEvent,
}: EventTimelineProps): ReactElement {
  // Sort events chronologically
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Handle null dates - put them at the end
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;

      return compareFuzzyDates(a.date, b.date);
    });
  }, [events]);

  // Empty state
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">No events recorded yet.</p>
        {onAddEvent && (
          <Button onClick={onAddEvent} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Event Button */}
      {onAddEvent && (
        <div className="flex justify-end">
          <Button onClick={onAddEvent} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      )}

      {/* Event List */}
      <ul role="list" className="space-y-3">
        {sortedEvents.map((event) => (
          <li key={event.id}>
            <button
              onClick={() => onEventClick(event.id)}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              {/* Header with title and participants */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{event.title}</h3>
                {event.participants.length > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    <Users className="h-3 w-3" />
                    +{event.participants.length}
                  </span>
                )}
              </div>

              {/* Date */}
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {event.date ? (
                  <span>{formatFuzzyDate(event.date)}</span>
                ) : (
                  <span className="italic">Date unknown</span>
                )}
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {[event.location.place, event.location.region, event.location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {/* Description Preview */}
              {event.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
