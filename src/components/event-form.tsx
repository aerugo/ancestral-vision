/**
 * EventForm Component (INV-U003: Form Validation Uses Zod)
 *
 * Form for creating and editing events with GEDCOM-style flexible dates.
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { FuzzyDate } from '@/lib/date-utils';
import type { ReactElement } from 'react';

/**
 * Preprocessor to handle NaN from empty number inputs
 */
const numberOrUndefined = z.preprocess(
  (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
  z.number().optional()
);

/**
 * Form schema with Zod validation
 */
const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dateType: z.enum(['exact', 'approximate', 'before', 'after', 'range']),
  year: numberOrUndefined,
  month: z.preprocess(
    (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(12).optional()
  ),
  day: z.preprocess(
    (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(31).optional()
  ),
  endYear: numberOrUndefined,
  location: z.string().optional(),
  privacy: z.enum(['PRIVATE', 'CONNECTIONS', 'PUBLIC']),
});

type EventFormData = z.infer<typeof eventFormSchema>;

/**
 * Data submitted by the form
 */
export interface EventFormInput {
  primaryPersonId: string;
  title: string;
  description?: string;
  date: FuzzyDate | null;
  location: { place: string } | null;
  privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
}

interface EventFormProps {
  primaryPersonId: string;
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * EventForm - Form for creating and editing events
 *
 * Features:
 * - Title and description fields
 * - GEDCOM-style flexible date types (exact, approximate, before, after, range)
 * - Location field
 * - Privacy level selection
 * - Zod validation (INV-U003)
 */
export function EventForm({
  primaryPersonId,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: EventFormProps): ReactElement {
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

  const processSubmit = (data: EventFormData): void => {
    // Build fuzzy date from form data
    let date: FuzzyDate | null = null;

    if (data.year) {
      switch (data.dateType) {
        case 'exact':
          date = {
            type: 'exact',
            year: data.year,
            month: data.month,
            day: data.day,
          };
          break;
        case 'approximate':
          date = {
            type: 'approximate',
            year: data.year,
            month: data.month,
          };
          break;
        case 'before':
          date = {
            type: 'before',
            year: data.year,
          };
          break;
        case 'after':
          date = {
            type: 'after',
            year: data.year,
          };
          break;
        case 'range':
          date = {
            type: 'range',
            startYear: data.year,
            endYear: data.endYear || data.year,
          };
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
      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="e.g., Birth, Graduation, Marriage"
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={3}
          placeholder="Additional details about the event..."
        />
      </div>

      {/* Date Type */}
      <div className="space-y-2">
        <Label>Date Type</Label>
        <div className="flex gap-4 flex-wrap">
          {(['exact', 'approximate', 'before', 'after', 'range'] as const).map(
            (type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={type}
                  {...register('dateType')}
                  aria-label={type}
                  className="accent-primary"
                />
                <span className="capitalize text-sm">{type}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Date Fields */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-24">
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
            <div className="w-20">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="number"
                min={1}
                max={12}
                {...register('month', { valueAsNumber: true })}
                placeholder="MM"
              />
            </div>
            <div className="w-20">
              <Label htmlFor="day">Day</Label>
              <Input
                id="day"
                type="number"
                min={1}
                max={31}
                {...register('day', { valueAsNumber: true })}
                placeholder="DD"
              />
            </div>
          </>
        )}

        {dateType === 'range' && (
          <div className="w-24">
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

      {/* Location */}
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          {...register('location')}
          placeholder="City, State, Country"
        />
      </div>

      {/* Privacy */}
      <div>
        <Label htmlFor="privacy">Privacy</Label>
        <select
          id="privacy"
          {...register('privacy')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="PRIVATE">Private</option>
          <option value="CONNECTIONS">Connections Only</option>
          <option value="PUBLIC">Public</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Event'}
        </Button>
      </div>
    </form>
  );
}
