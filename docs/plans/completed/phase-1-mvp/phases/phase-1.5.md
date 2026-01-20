# Phase 1.5: Events System

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement freeform events with GEDCOM-style flexible dates, shared events (multiple participants), location geocoding, and integration with the profile panel timeline.

---

## Invariants Enforced in This Phase

- **INV-D001**: Entity IDs are UUID v4 - Event IDs
- **INV-D005**: Soft Delete with 30-Day Recovery - Events use deletedAt
- **INV-S001**: All GraphQL Mutations Require Authentication
- **INV-S002**: Users Can Only Access Their Own Constellation
- **INV-A005**: TanStack Query for Server State
- **INV-U003**: Form Validation Uses Zod
- **NEW INV-D007**: Events support flexible GEDCOM-style dates

---

## TDD Steps

### Step 1.5.1: Write Date Utils Tests (RED)

Create `src/lib/date-utils.test.ts`:

**Test Cases**:

1. `it('should parse exact date YYYY-MM-DD')` - Full date
2. `it('should parse partial date YYYY-MM')` - Month only
3. `it('should parse year only YYYY')` - Year only
4. `it('should parse approximate date ABT 1920')` - About
5. `it('should parse before date BEF 1920')` - Before
6. `it('should parse after date AFT 1920')` - After
7. `it('should parse date range BET 1920 AND 1925')` - Between
8. `it('should format exact date for display')` - Display format
9. `it('should format approximate date for display')` - "About 1920"
10. `it('should format range for display')` - "Between 1920 and 1925"
11. `it('should validate date object structure')` - Schema validation
12. `it('should handle null/undefined dates')` - Edge cases

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseFuzzyDate,
  formatFuzzyDate,
  validateFuzzyDate,
  FuzzyDate,
} from './date-utils';

describe('Date Utils', () => {
  describe('parseFuzzyDate', () => {
    it('should parse exact date YYYY-MM-DD', () => {
      const result = parseFuzzyDate('1985-06-15');

      expect(result).toEqual({
        type: 'exact',
        year: 1985,
        month: 6,
        day: 15,
      });
    });

    it('should parse partial date YYYY-MM', () => {
      const result = parseFuzzyDate('1985-06');

      expect(result).toEqual({
        type: 'exact',
        year: 1985,
        month: 6,
      });
    });

    it('should parse year only', () => {
      const result = parseFuzzyDate('1985');

      expect(result).toEqual({
        type: 'exact',
        year: 1985,
      });
    });

    it('should parse approximate date ABT', () => {
      const result = parseFuzzyDate('ABT 1920');

      expect(result).toEqual({
        type: 'approximate',
        year: 1920,
      });
    });

    it('should parse before date BEF', () => {
      const result = parseFuzzyDate('BEF 1920');

      expect(result).toEqual({
        type: 'before',
        year: 1920,
      });
    });

    it('should parse after date AFT', () => {
      const result = parseFuzzyDate('AFT 1920');

      expect(result).toEqual({
        type: 'after',
        year: 1920,
      });
    });

    it('should parse date range BET...AND', () => {
      const result = parseFuzzyDate('BET 1920 AND 1925');

      expect(result).toEqual({
        type: 'range',
        startYear: 1920,
        endYear: 1925,
      });
    });
  });

  describe('formatFuzzyDate', () => {
    it('should format exact date', () => {
      const date: FuzzyDate = { type: 'exact', year: 1985, month: 6, day: 15 };
      expect(formatFuzzyDate(date)).toBe('June 15, 1985');
    });

    it('should format approximate date', () => {
      const date: FuzzyDate = { type: 'approximate', year: 1920 };
      expect(formatFuzzyDate(date)).toBe('About 1920');
    });

    it('should format range', () => {
      const date: FuzzyDate = { type: 'range', startYear: 1920, endYear: 1925 };
      expect(formatFuzzyDate(date)).toBe('Between 1920 and 1925');
    });
  });

  describe('validateFuzzyDate', () => {
    it('should validate correct date object', () => {
      const date: FuzzyDate = { type: 'exact', year: 1985 };
      expect(validateFuzzyDate(date)).toBe(true);
    });

    it('should reject invalid type', () => {
      expect(() => validateFuzzyDate({ type: 'invalid' as any })).toThrow();
    });
  });
});
```

### Step 1.5.2: Write Event GraphQL Tests (RED)

Create `src/graphql/resolvers/event.test.ts`:

**Test Cases**:

1. `it('should return events for a person')` - Query personEvents
2. `it('should return empty array for unauthenticated')` - Auth check
3. `it('should create an event')` - createEvent mutation
4. `it('should require authentication to create')` - Auth error
5. `it('should create event with flexible date')` - GEDCOM dates
6. `it('should create event with location')` - Location JSON
7. `it('should add participants to event')` - Shared events
8. `it('should update an event')` - updateEvent mutation
9. `it('should add participant to existing event')` - addEventParticipant
10. `it('should remove participant from event')` - removeEventParticipant
11. `it('should soft delete an event')` - deleteEvent sets deletedAt
12. `it('should exclude deleted events from queries')` - Filter deleted

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestData } from '@/tests/graphql-test-utils';
import { gql } from 'graphql-tag';

const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      description
      date
      location
      primaryPersonId
      participants {
        id
        personId
      }
      createdAt
    }
  }
`;

const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      date
    }
  }
`;

const ADD_PARTICIPANT = gql`
  mutation AddEventParticipant($eventId: ID!, $personId: ID!) {
    addEventParticipant(eventId: $eventId, personId: $personId) {
      id
      participants {
        personId
      }
    }
  }
`;

const PERSON_EVENTS = gql`
  query PersonEvents($personId: ID!) {
    personEvents(personId: $personId) {
      id
      title
      date
      location
      participants {
        personId
      }
    }
  }
`;

describe('Event Resolvers', () => {
  // ... setup and tests
});
```

### Step 1.5.3: Write Event Hooks Tests (RED)

Create `src/hooks/use-events.test.ts`:

**Test Cases**:

1. `it('should fetch events for a person')` - usePersonEvents
2. `it('should create an event')` - useCreateEvent
3. `it('should update an event')` - useUpdateEvent
4. `it('should delete an event')` - useDeleteEvent
5. `it('should add participant')` - useAddEventParticipant
6. `it('should remove participant')` - useRemoveEventParticipant
7. `it('should handle loading state')` - isLoading flag
8. `it('should invalidate cache after mutation')` - Cache invalidation

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePersonEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useAddEventParticipant,
} from './use-events';

vi.mock('@/lib/graphql-client');

describe('Event Hooks', () => {
  // ... tests
});
```

### Step 1.5.4: Write Event Form Tests (RED)

Create `src/components/event-form.test.tsx`:

**Test Cases**:

1. `it('should render event form fields')` - Form structure
2. `it('should validate title is required')` - Title validation
3. `it('should accept exact date')` - Date input
4. `it('should accept approximate date')` - "About" toggle
5. `it('should accept date range')` - Range input
6. `it('should show location autocomplete')` - Location input
7. `it('should allow adding participants')` - Multi-person
8. `it('should show participant selector')` - Person dropdown
9. `it('should call onSubmit with valid data')` - Submit handler
10. `it('should show error messages')` - Validation display

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventForm } from './event-form';

describe('EventForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render event form fields', () => {
    render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('should validate title is required', async () => {
    render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should accept approximate date', async () => {
    render(<EventForm onSubmit={mockOnSubmit} primaryPersonId="person-1" />);

    // Fill in title
    await userEvent.type(screen.getByLabelText(/title/i), 'Birth');

    // Toggle approximate date
    await userEvent.click(screen.getByLabelText(/approximate/i));

    // Enter year
    await userEvent.type(screen.getByLabelText(/year/i), '1920');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        date: expect.objectContaining({ type: 'approximate', year: 1920 }),
      })
    );
  });

  // ... more tests
});
```

### Step 1.5.5: Write Event Timeline Tests (RED)

Create `src/components/event-timeline.test.tsx`:

**Test Cases**:

1. `it('should render timeline of events')` - Timeline display
2. `it('should sort events chronologically')` - Date ordering
3. `it('should handle events with fuzzy dates')` - Approximate display
4. `it('should show event icon')` - Icon display
5. `it('should show participants count')` - Multi-person badge
6. `it('should handle empty state')` - No events
7. `it('should open event editor on click')` - Click handler
8. `it('should show add event button')` - Create new

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventTimeline } from './event-timeline';

const mockEvents = [
  {
    id: 'event-1',
    title: 'Birth',
    date: { type: 'exact', year: 1985, month: 6, day: 15 },
    location: { place: 'Boston', region: 'MA', country: 'USA' },
    participants: [],
  },
  {
    id: 'event-2',
    title: 'Graduation',
    date: { type: 'approximate', year: 2007 },
    location: null,
    participants: [{ personId: 'person-2' }],
  },
];

describe('EventTimeline', () => {
  it('should render timeline of events', () => {
    render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

    expect(screen.getByText('Birth')).toBeInTheDocument();
    expect(screen.getByText('Graduation')).toBeInTheDocument();
  });

  it('should sort events chronologically', () => {
    render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

    const titles = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(titles).toEqual(['Birth', 'Graduation']);
  });

  it('should show participants count', () => {
    render(<EventTimeline events={mockEvents} onEventClick={vi.fn()} />);

    // Graduation has 1 additional participant
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  // ... more tests
});
```

### Step 1.5.6: Implement Date Utils (GREEN)

Create `src/lib/date-utils.ts`:

```typescript
import { z } from 'zod';

export const fuzzyDateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exact'),
    year: z.number().int().min(1).max(9999),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
  }),
  z.object({
    type: z.literal('approximate'),
    year: z.number().int().min(1).max(9999),
    month: z.number().int().min(1).max(12).optional(),
  }),
  z.object({
    type: z.literal('before'),
    year: z.number().int().min(1).max(9999),
  }),
  z.object({
    type: z.literal('after'),
    year: z.number().int().min(1).max(9999),
  }),
  z.object({
    type: z.literal('range'),
    startYear: z.number().int().min(1).max(9999),
    endYear: z.number().int().min(1).max(9999),
    startMonth: z.number().int().min(1).max(12).optional(),
    endMonth: z.number().int().min(1).max(12).optional(),
  }),
]);

export type FuzzyDate = z.infer<typeof fuzzyDateSchema>;

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function parseFuzzyDate(input: string): FuzzyDate {
  const trimmed = input.trim().toUpperCase();

  // Range: BET 1920 AND 1925
  const rangeMatch = trimmed.match(/^BET\s+(\d{4})\s+AND\s+(\d{4})$/);
  if (rangeMatch) {
    return {
      type: 'range',
      startYear: parseInt(rangeMatch[1], 10),
      endYear: parseInt(rangeMatch[2], 10),
    };
  }

  // Before: BEF 1920
  const befMatch = trimmed.match(/^BEF\s+(\d{4})$/);
  if (befMatch) {
    return { type: 'before', year: parseInt(befMatch[1], 10) };
  }

  // After: AFT 1920
  const aftMatch = trimmed.match(/^AFT\s+(\d{4})$/);
  if (aftMatch) {
    return { type: 'after', year: parseInt(aftMatch[1], 10) };
  }

  // Approximate: ABT 1920
  const abtMatch = trimmed.match(/^ABT\s+(\d{4})(?:-(\d{2}))?$/);
  if (abtMatch) {
    return {
      type: 'approximate',
      year: parseInt(abtMatch[1], 10),
      month: abtMatch[2] ? parseInt(abtMatch[2], 10) : undefined,
    };
  }

  // Exact: YYYY-MM-DD, YYYY-MM, or YYYY
  const exactMatch = input.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (exactMatch) {
    return {
      type: 'exact',
      year: parseInt(exactMatch[1], 10),
      month: exactMatch[2] ? parseInt(exactMatch[2], 10) : undefined,
      day: exactMatch[3] ? parseInt(exactMatch[3], 10) : undefined,
    };
  }

  throw new Error(`Cannot parse date: ${input}`);
}

export function formatFuzzyDate(date: FuzzyDate): string {
  switch (date.type) {
    case 'exact': {
      const parts: string[] = [];
      if (date.month) parts.push(MONTHS[date.month]);
      if (date.day) parts.push(`${date.day},`);
      parts.push(date.year.toString());
      return parts.join(' ').replace(', ,', ',');
    }
    case 'approximate':
      return `About ${date.year}`;
    case 'before':
      return `Before ${date.year}`;
    case 'after':
      return `After ${date.year}`;
    case 'range':
      return `Between ${date.startYear} and ${date.endYear}`;
  }
}

export function validateFuzzyDate(date: unknown): boolean {
  const result = fuzzyDateSchema.safeParse(date);
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return true;
}

export function compareFuzzyDates(a: FuzzyDate, b: FuzzyDate): number {
  const getYear = (d: FuzzyDate): number => {
    if (d.type === 'range') return d.startYear;
    return d.year;
  };
  return getYear(a) - getYear(b);
}
```

### Step 1.5.7: Implement GraphQL Schema & Resolvers (GREEN)

Update `src/graphql/schema.ts`:

```typescript
// Add to typeDefs
type Event {
  id: ID!
  title: String!
  description: String
  icon: String
  date: JSON
  location: JSON
  primaryPersonId: ID!
  primaryPerson: Person!
  participants: [EventParticipant!]!
  privacy: PrivacyLevel!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type EventParticipant {
  id: ID!
  eventId: ID!
  personId: ID!
  person: Person!
}

input CreateEventInput {
  primaryPersonId: ID!
  title: String!
  description: String
  icon: String
  date: JSON
  location: JSON
  participantIds: [ID!]
  privacy: PrivacyLevel
}

input UpdateEventInput {
  title: String
  description: String
  icon: String
  date: JSON
  location: JSON
  privacy: PrivacyLevel
}

extend type Query {
  personEvents(personId: ID!): [Event!]!
  event(id: ID!): Event
}

extend type Mutation {
  createEvent(input: CreateEventInput!): Event!
  updateEvent(id: ID!, input: UpdateEventInput!): Event!
  deleteEvent(id: ID!): Event!
  addEventParticipant(eventId: ID!, personId: ID!): Event!
  removeEventParticipant(eventId: ID!, personId: ID!): Event!
}
```

Create `src/graphql/resolvers/event.ts`:

```typescript
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types';
import { validateFuzzyDate } from '@/lib/date-utils';

export const eventResolvers = {
  Query: {
    personEvents: async (_: unknown, { personId }: { personId: string }, ctx: GraphQLContext) => {
      if (!ctx.user) return [];

      // Check person belongs to user's constellation
      const person = await ctx.prisma.person.findFirst({
        where: { id: personId, constellation: { ownerId: ctx.user.uid } },
      });
      if (!person) return [];

      // Get events where person is primary or participant
      return ctx.prisma.event.findMany({
        where: {
          OR: [
            { primaryPersonId: personId },
            { participants: { some: { personId } } },
          ],
          deletedAt: null,
        },
        include: { participants: true },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    createEvent: async (_: unknown, { input }: { input: CreateEventInput }, ctx: GraphQLContext) => {
      requireAuth(ctx);

      // Validate date if provided
      if (input.date) {
        validateFuzzyDate(input.date);
      }

      // Verify primary person belongs to user's constellation
      const person = await ctx.prisma.person.findFirst({
        where: { id: input.primaryPersonId, constellation: { ownerId: ctx.user!.uid } },
        include: { constellation: true },
      });

      if (!person) {
        throw new GraphQLError('Person not found');
      }

      // Create event with participants
      return ctx.prisma.event.create({
        data: {
          constellationId: person.constellationId,
          primaryPersonId: input.primaryPersonId,
          title: input.title,
          description: input.description,
          icon: input.icon,
          date: input.date,
          location: input.location,
          privacy: input.privacy || 'PRIVATE',
          createdBy: ctx.user!.uid,
          participants: input.participantIds
            ? {
                create: input.participantIds.map((personId) => ({ personId })),
              }
            : undefined,
        },
        include: { participants: true },
      });
    },

    addEventParticipant: async (
      _: unknown,
      { eventId, personId }: { eventId: string; personId: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      const event = await ctx.prisma.event.findFirst({
        where: { id: eventId, constellation: { ownerId: ctx.user!.uid } },
      });

      if (!event) {
        throw new GraphQLError('Event not found');
      }

      // Verify person is in same constellation
      const person = await ctx.prisma.person.findFirst({
        where: { id: personId, constellationId: event.constellationId },
      });

      if (!person) {
        throw new GraphQLError('Person not found in constellation');
      }

      await ctx.prisma.eventParticipant.create({
        data: { eventId, personId },
      });

      return ctx.prisma.event.findUnique({
        where: { id: eventId },
        include: { participants: true },
      });
    },

    // ... updateEvent, deleteEvent, removeEventParticipant
  },

  Event: {
    primaryPerson: (event: Event, _: unknown, ctx: GraphQLContext) =>
      ctx.prisma.person.findUnique({ where: { id: event.primaryPersonId } }),
  },

  EventParticipant: {
    person: (participant: EventParticipant, _: unknown, ctx: GraphQLContext) =>
      ctx.prisma.person.findUnique({ where: { id: participant.personId } }),
  },
};
```

### Step 1.5.8: Implement Event Form Component (GREEN)

Create `src/components/event-form.tsx`:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fuzzyDateSchema } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dateType: z.enum(['exact', 'approximate', 'before', 'after', 'range']),
  year: z.number().optional(),
  month: z.number().optional(),
  day: z.number().optional(),
  endYear: z.number().optional(),
  location: z.string().optional(),
  privacy: z.enum(['PRIVATE', 'CONNECTIONS', 'PUBLIC']),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  primaryPersonId: string;
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormInput) => void;
  onCancel?: () => void;
}

export function EventForm({
  primaryPersonId,
  initialData,
  onSubmit,
  onCancel,
}: EventFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      dateType: 'exact',
      privacy: 'PRIVATE',
      ...initialData,
    },
  });

  const dateType = watch('dateType');

  const processSubmit = (data: EventFormData) => {
    // Build fuzzy date from form data
    let date = null;
    if (data.year) {
      switch (data.dateType) {
        case 'exact':
          date = { type: 'exact', year: data.year, month: data.month, day: data.day };
          break;
        case 'approximate':
          date = { type: 'approximate', year: data.year };
          break;
        case 'before':
          date = { type: 'before', year: data.year };
          break;
        case 'after':
          date = { type: 'after', year: data.year };
          break;
        case 'range':
          date = { type: 'range', startYear: data.year, endYear: data.endYear };
          break;
      }
    }

    onSubmit({
      primaryPersonId,
      title: data.title,
      description: data.description,
      date,
      location: data.location ? { place: data.location } : null,
      privacy: data.privacy,
    });
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} placeholder="e.g., Birth, Graduation, Marriage" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Date Type</Label>
        <div className="flex gap-2 flex-wrap">
          {['exact', 'approximate', 'before', 'after', 'range'].map((type) => (
            <label key={type} className="flex items-center gap-1">
              <input
                type="radio"
                value={type}
                {...register('dateType')}
                aria-label={type}
              />
              <span className="capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            {...register('year', { valueAsNumber: true })}
            placeholder="YYYY"
          />
        </div>

        {dateType === 'exact' && (
          <>
            <div>
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="number"
                min={1}
                max={12}
                {...register('month', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="day">Day</Label>
              <Input
                id="day"
                type="number"
                min={1}
                max={31}
                {...register('day', { valueAsNumber: true })}
              />
            </div>
          </>
        )}

        {dateType === 'range' && (
          <div>
            <Label htmlFor="endYear">End Year</Label>
            <Input
              id="endYear"
              type="number"
              {...register('endYear', { valueAsNumber: true })}
              placeholder="YYYY"
            />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...register('location')} placeholder="City, State, Country" />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Save Event</Button>
      </div>
    </form>
  );
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/date-utils.ts` | CREATE | GEDCOM-style date parsing/formatting |
| `src/lib/date-utils.test.ts` | CREATE | Date utility tests |
| `src/graphql/schema.ts` | MODIFY | Add Event types and operations |
| `src/graphql/resolvers/event.ts` | CREATE | Event resolver implementation |
| `src/graphql/resolvers/event.test.ts` | CREATE | Event resolver tests |
| `src/hooks/use-events.ts` | CREATE | TanStack Query hooks |
| `src/hooks/use-events.test.ts` | CREATE | Hook tests |
| `src/components/event-form.tsx` | CREATE | Event creation/editing form |
| `src/components/event-form.test.tsx` | CREATE | Form tests |
| `src/components/event-timeline.tsx` | CREATE | Timeline display |
| `src/components/event-timeline.test.tsx` | CREATE | Timeline tests |
| `src/components/person-profile-panel.tsx` | MODIFY | Add Events tab |

---

## Verification

```bash
# Run specific tests
npx vitest run src/lib/date-utils.test.ts
npx vitest run src/graphql/resolvers/event.test.ts
npx vitest run src/components/event-form.test.tsx
npx vitest run src/components/event-timeline.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All ~25 event tests pass
- [ ] Flexible dates work (exact, approximate, before, after, range)
- [ ] Can create/edit/delete events
- [ ] Shared events link multiple people
- [ ] Events display in timeline in profile panel
- [ ] Location field works
- [ ] Privacy levels work
- [ ] Type check passes
- [ ] Lint passes
- [ ] INV-D007 verified (flexible dates)

---

*Created: 2026-01-13*
