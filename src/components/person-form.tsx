/**
 * PersonForm Component
 *
 * Form component for creating and editing person records.
 * Uses Zod for validation (INV-U003) and supports international name formats.
 */
'use client';

import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { personFormSchema, type PersonFormData, type PersonFormInput } from '@/lib/schemas/person';
import { cn } from '@/lib/utils';

/**
 * Context for contextual person creation (Add Parent/Child/Spouse)
 */
export interface PersonFormContext {
  type: 'parent' | 'child' | 'spouse';
  relativeTo: {
    id: string;
    givenName: string;
  };
}

/**
 * Props for PersonForm component
 */
export interface PersonFormProps {
  /** Existing person data for edit mode */
  person?: Partial<PersonFormData> & { id?: string };
  /** Callback when form is submitted with valid data */
  onSubmit: (data: PersonFormData) => void;
  /** Loading state to disable form during submission */
  isLoading?: boolean;
  /** Context for contextual creation (Add Parent/Child/Spouse) */
  context?: PersonFormContext;
}

/**
 * Get contextual creation header text
 */
function getContextHeader(context?: PersonFormContext): string | null {
  if (!context) return null;

  switch (context.type) {
    case 'parent':
      return `Add Parent of ${context.relativeTo.givenName}`;
    case 'child':
      return `Add Child of ${context.relativeTo.givenName}`;
    case 'spouse':
      return `Add Spouse of ${context.relativeTo.givenName}`;
    default:
      return null;
  }
}

/**
 * PersonForm - Form for creating/editing person records
 *
 * Features:
 * - Zod validation (INV-U003)
 * - International name support (patronymic, matronymic, Eastern names)
 * - Contextual creation headers
 * - Loading state support
 */
export function PersonForm({
  person,
  onSubmit,
  isLoading = false,
  context,
}: PersonFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormInput, unknown, PersonFormData>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      nameOrder: 'WESTERN',
      speculative: false,
      ...person,
    },
  });

  const handleFormSubmit = (data: PersonFormData) => {
    onSubmit(data);
  };

  const contextHeader = getContextHeader(context);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Contextual Creation Header */}
      {contextHeader && (
        <div className="mb-4 rounded-md bg-muted p-3">
          <p className="text-sm font-medium">{contextHeader}</p>
        </div>
      )}

      {/* Given Name (Required) */}
      <div className="space-y-1">
        <Label htmlFor="givenName">Given Name *</Label>
        <Input
          id="givenName"
          {...register('givenName')}
          aria-invalid={!!errors.givenName}
          className={cn(errors.givenName && 'border-destructive')}
        />
        {errors.givenName && (
          <p className="text-sm text-destructive">{errors.givenName.message}</p>
        )}
      </div>

      {/* Surname */}
      <div className="space-y-1">
        <Label htmlFor="surname">Surname</Label>
        <Input id="surname" {...register('surname')} />
      </div>

      {/* Maiden Name */}
      <div className="space-y-1">
        <Label htmlFor="maidenName">Maiden Name</Label>
        <Input id="maidenName" {...register('maidenName')} />
      </div>

      {/* Patronymic */}
      <div className="space-y-1">
        <Label htmlFor="patronymic">Patronymic</Label>
        <Input id="patronymic" {...register('patronymic')} />
      </div>

      {/* Matronymic */}
      <div className="space-y-1">
        <Label htmlFor="matronymic">Matronymic</Label>
        <Input id="matronymic" {...register('matronymic')} />
      </div>

      {/* Nickname */}
      <div className="space-y-1">
        <Label htmlFor="nickname">Nickname</Label>
        <Input id="nickname" {...register('nickname')} />
      </div>

      {/* Suffix */}
      <div className="space-y-1">
        <Label htmlFor="suffix">Suffix</Label>
        <Input id="suffix" {...register('suffix')} placeholder="Jr., Sr., III, etc." />
      </div>

      {/* Name Order */}
      <div className="space-y-1">
        <Label htmlFor="nameOrder">Name Order</Label>
        <select
          id="nameOrder"
          {...register('nameOrder')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="WESTERN">Western (Given Surname)</option>
          <option value="EASTERN">Eastern (Surname Given)</option>
          <option value="PATRONYMIC">Patronymic (Given Patronymic Surname)</option>
          <option value="PATRONYMIC_SUFFIX">Patronymic Suffix</option>
          <option value="MATRONYMIC">Matronymic</option>
        </select>
      </div>

      {/* Gender */}
      <div className="space-y-1">
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          {...register('gender')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select...</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
      </div>

      {/* Biography */}
      <div className="space-y-1">
        <Label htmlFor="biography">Biography</Label>
        <textarea
          id="biography"
          {...register('biography')}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Notes, life story, or additional information..."
        />
        {errors.biography && (
          <p className="text-sm text-destructive">{errors.biography.message}</p>
        )}
      </div>

      {/* Speculative */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="speculative"
          {...register('speculative')}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="speculative" className="cursor-pointer">
          Speculative (uncertain/theoretical ancestor)
        </Label>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
