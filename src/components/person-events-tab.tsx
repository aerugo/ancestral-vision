/**
 * PersonEventsTab Component
 *
 * Tab content for managing events associated with a person.
 * Uses EventTimeline for display and EventForm for editing.
 */
'use client';

import * as React from 'react';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventTimeline } from './event-timeline';
import { EventForm, type EventFormInput } from './event-form';
import {
  usePersonEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@/hooks/use-events';
import { formatFuzzyDate, type FuzzyDate } from '@/lib/date-utils';

interface PersonEventsTabProps {
  personId: string;
}

type ViewMode = 'list' | 'create' | 'edit';

interface EventData {
  id: string;
  title: string;
  description?: string | null;
  date: FuzzyDate | null;
  location: { place: string; region?: string; country?: string } | null;
  participants: { personId: string }[];
  privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
}

export function PersonEventsTab({
  personId,
}: PersonEventsTabProps): React.ReactElement {
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [selectedEvent, setSelectedEvent] = React.useState<EventData | null>(null);
  const [deleteEventId, setDeleteEventId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data: events, isLoading, isError } = usePersonEvents(personId);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const handleEventClick = (eventId: string) => {
    const event = events?.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setViewMode('edit');
      setError(null);
    }
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setViewMode('create');
    setError(null);
  };

  const handleCreateSubmit = async (data: EventFormInput) => {
    try {
      await createEvent.mutateAsync({
        primaryPersonId: data.primaryPersonId,
        title: data.title,
        description: data.description,
        date: data.date ?? undefined,
        location: data.location ?? undefined,
        privacy: data.privacy,
      });
      setViewMode('list');
      setError(null);
    } catch {
      setError('Failed to create event');
    }
  };

  const handleEditSubmit = async (data: EventFormInput) => {
    if (!selectedEvent) return;
    try {
      await updateEvent.mutateAsync({
        id: selectedEvent.id,
        input: {
          title: data.title,
          description: data.description,
          date: data.date ?? undefined,
          location: data.location ?? undefined,
          privacy: data.privacy,
        },
      });
      setViewMode('list');
      setSelectedEvent(null);
      setError(null);
    } catch {
      setError('Failed to update event');
    }
  };

  const handleDelete = () => {
    if (deleteEventId) {
      deleteEvent.mutate(deleteEventId);
      setDeleteEventId(null);
      setSelectedEvent(null);
      setViewMode('list');
    }
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setViewMode('list');
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error loading events</p>
      </div>
    );
  }

  // Create Event View
  if (viewMode === 'create') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h3 className="font-medium">New Event</h3>
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <EventForm
          primaryPersonId={personId}
          onSubmit={handleCreateSubmit}
          onCancel={handleBack}
          isLoading={createEvent.isPending}
        />
      </div>
    );
  }

  // Edit Event View
  if (viewMode === 'edit' && selectedEvent) {
    // Convert event data to form initial data format
    const initialData = {
      title: selectedEvent.title,
      description: selectedEvent.description || undefined,
      dateType: (selectedEvent.date?.type || 'exact') as
        | 'exact'
        | 'approximate'
        | 'before'
        | 'after'
        | 'range',
      year: getYearFromDate(selectedEvent.date),
      month: selectedEvent.date?.type === 'exact' ? selectedEvent.date.month : undefined,
      day: selectedEvent.date?.type === 'exact' ? selectedEvent.date.day : undefined,
      endYear: selectedEvent.date?.type === 'range' ? selectedEvent.date.endYear : undefined,
      location: selectedEvent.location?.place || undefined,
      privacy: selectedEvent.privacy,
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h3 className="font-medium">Edit Event</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteEventId(selectedEvent.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <EventForm
          primaryPersonId={personId}
          initialData={initialData}
          onSubmit={handleEditSubmit}
          onCancel={handleBack}
          isLoading={updateEvent.isPending}
        />

        {/* Delete Confirmation */}
        {deleteEventId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete this event?</h3>
              <p className="text-muted-foreground mb-4">
                This event will be permanently deleted. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteEventId(null)}>
                  Cancel
                </Button>
                <Button onClick={handleDelete} aria-label="Confirm">
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View (Timeline)
  return (
    <EventTimeline
      events={events || []}
      onEventClick={handleEventClick}
      onAddEvent={handleAddEvent}
    />
  );
}

/**
 * Extract year from FuzzyDate for form initialization
 */
function getYearFromDate(date: FuzzyDate | null): number | undefined {
  if (!date) return undefined;

  switch (date.type) {
    case 'exact':
    case 'approximate':
    case 'before':
    case 'after':
      return date.year;
    case 'range':
      return date.startYear;
    default:
      return undefined;
  }
}
