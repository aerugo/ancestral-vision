/**
 * EditPersonDialog Component
 *
 * Dialog for editing person details with full international name support.
 * Uses PersonForm for comprehensive editing (AC6: International name support).
 */
'use client';

import { type ReactElement } from 'react';
import { usePerson, useUpdatePerson } from '@/hooks/use-people';
import { Button } from '@/components/ui/button';
import { PersonForm } from './person-form';
import type { PersonFormData } from '@/lib/schemas/person';

interface EditPersonDialogProps {
  personId: string;
  onClose: () => void;
}

/**
 * EditPersonDialog - Dialog for editing existing person details
 *
 * Features:
 * - Full international name support (patronymic, matronymic, Eastern names)
 * - Zod validation via PersonForm (INV-U003)
 * - Updates person via GraphQL mutation
 */
export function EditPersonDialog({
  personId,
  onClose,
}: EditPersonDialogProps): ReactElement {
  const { data: person, isLoading: isPersonLoading } = usePerson(personId);
  const updatePerson = useUpdatePerson();

  const handleSubmit = async (data: PersonFormData) => {
    try {
      await updatePerson.mutateAsync({
        id: personId,
        input: {
          givenName: data.givenName,
          surname: data.surname || undefined,
          maidenName: data.maidenName || undefined,
          patronymic: data.patronymic || undefined,
          matronymic: data.matronymic || undefined,
          nickname: data.nickname || undefined,
          suffix: data.suffix || undefined,
          nameOrder: data.nameOrder,
          gender: data.gender || undefined,
          biography: data.biography || undefined,
          speculative: data.speculative,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to update person:', error);
    }
  };

  // Convert API person data to form format
  const personFormData = person
    ? {
        id: person.id,
        givenName: person.givenName || '',
        surname: person.surname || '',
        maidenName: person.maidenName || '',
        patronymic: person.patronymic || '',
        matronymic: person.matronymic || '',
        nickname: person.nickname || '',
        suffix: person.suffix || '',
        nameOrder: (person.nameOrder as 'WESTERN' | 'EASTERN' | 'PATRONYMIC' | 'PATRONYMIC_SUFFIX' | 'MATRONYMIC') || 'WESTERN',
        gender: person.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' | undefined,
        biography: person.biography || '',
        speculative: person.speculative || false,
      }
    : undefined;

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
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Edit Person</h2>

        {isPersonLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : personFormData ? (
          <>
            <PersonForm
              person={personFormData}
              onSubmit={handleSubmit}
              isLoading={updatePerson.isPending}
            />
            <div className="flex justify-end gap-2 mt-4 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Person not found
          </div>
        )}
      </div>
    </div>
  );
}
