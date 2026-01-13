/**
 * AddPersonDialog Component
 *
 * Dialog for manually adding a new person to the constellation.
 */
'use client';

import { useState, type ReactElement, type FormEvent } from 'react';
import { useCreatePerson } from '@/hooks/use-people';
import { Button } from '@/components/ui/button';

interface AddPersonDialogProps {
  onClose: () => void;
}

/**
 * AddPersonDialog - Dialog for creating a new person
 *
 * Features:
 * - Simple form for entering person's name
 * - Creates person in the user's constellation
 */
export function AddPersonDialog({ onClose }: AddPersonDialogProps): ReactElement {
  const [givenName, setGivenName] = useState('');
  const [surname, setSurname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPerson = useCreatePerson();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!givenName.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createPerson.mutateAsync({
        givenName: givenName.trim(),
        surname: surname.trim() || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Failed to create person:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Content */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Add Person</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="givenName" className="block text-sm font-medium mb-1">
                Given Name
              </label>
              <input
                id="givenName"
                type="text"
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="surname" className="block text-sm font-medium mb-1">
                Surname
              </label>
              <input
                id="surname"
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !givenName.trim()}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
