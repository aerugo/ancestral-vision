/**
 * PersonQuickForm Component
 *
 * A simplified person entry form for use in onboarding wizard.
 * Collects basic information: given name, surname, and optional birth year.
 */
'use client';

import { type ReactElement, useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface PersonQuickFormData {
  givenName: string;
  surname: string;
  birthYear?: number;
}

interface PersonQuickFormProps {
  /** Label for the form */
  label: string;
  /** Callback when form data changes */
  onChange: (data: PersonQuickFormData) => void;
  /** Initial values for the form */
  initialValues?: Partial<PersonQuickFormData>;
  /** Whether to use compact styling */
  compact?: boolean;
  /** Whether to show validation errors */
  showValidation?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PersonQuickForm - Simplified person entry
 */
export function PersonQuickForm({
  label,
  onChange,
  initialValues,
  compact = false,
  showValidation = false,
  className,
}: PersonQuickFormProps): ReactElement {
  const [givenName, setGivenName] = useState(initialValues?.givenName || '');
  const [surname, setSurname] = useState(initialValues?.surname || '');
  const [birthYear, setBirthYear] = useState<string>(
    initialValues?.birthYear?.toString() || ''
  );
  const [touched, setTouched] = useState(false);

  // Notify parent of changes
  const notifyChange = useCallback(
    (gn: string, sn: string, by: string) => {
      const data: PersonQuickFormData = {
        givenName: gn,
        surname: sn,
      };

      if (by) {
        const parsedYear = parseInt(by, 10);
        if (!isNaN(parsedYear)) {
          data.birthYear = parsedYear;
        }
      }

      onChange(data);
    },
    [onChange]
  );

  // Handle given name change
  const handleGivenNameChange = (value: string) => {
    setGivenName(value);
    notifyChange(value, surname, birthYear);
  };

  // Handle surname change
  const handleSurnameChange = (value: string) => {
    setSurname(value);
    notifyChange(givenName, value, birthYear);
  };

  // Handle birth year change
  const handleBirthYearChange = (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setBirthYear(cleaned);
    notifyChange(givenName, surname, cleaned);
  };

  // Validation
  const showGivenNameError = showValidation && touched && !givenName.trim();

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <div className={cn('space-y-2', compact && 'space-y-1')}>
        <div>
          <Input
            value={givenName}
            onChange={(e) => handleGivenNameChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Given name"
            className={cn(
              compact && 'h-8 text-sm',
              showGivenNameError && 'border-destructive'
            )}
          />
          {showGivenNameError && (
            <p className="mt-1 text-xs text-destructive">Given name is required</p>
          )}
        </div>
        <Input
          value={surname}
          onChange={(e) => handleSurnameChange(e.target.value)}
          placeholder="Surname (optional)"
          className={cn(compact && 'h-8 text-sm')}
        />
        {!compact && (
          <Input
            value={birthYear}
            onChange={(e) => handleBirthYearChange(e.target.value)}
            placeholder="Birth year (optional)"
            type="text"
            inputMode="numeric"
          />
        )}
      </div>
    </div>
  );
}
