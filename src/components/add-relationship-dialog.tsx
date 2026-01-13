/**
 * AddRelationshipDialog Component
 *
 * Dialog for adding family relationships (parent, child, spouse) to a person.
 * Creates a new person and establishes the relationship.
 */
'use client';

import { useState, type ReactElement, type FormEvent } from 'react';
import { useCreatePerson } from '@/hooks/use-people';
import {
  useCreateParentChildRelationship,
  useCreateSpouseRelationship,
} from '@/hooks/use-relationships';
import { Button } from '@/components/ui/button';

export type RelationshipType = 'parent' | 'child' | 'spouse';

interface AddRelationshipDialogProps {
  personId: string;
  relationshipType: RelationshipType;
  onClose: () => void;
}

/**
 * Get dialog title based on relationship type
 */
function getTitle(type: RelationshipType): string {
  switch (type) {
    case 'parent':
      return 'Add Parent';
    case 'child':
      return 'Add Child';
    case 'spouse':
      return 'Add Spouse';
  }
}

/**
 * AddRelationshipDialog - Dialog for creating family relationships
 *
 * Features:
 * - Form for entering new person's name
 * - Creates person and relationship in sequence
 * - Handles parent, child, and spouse relationship types
 */
export function AddRelationshipDialog({
  personId,
  relationshipType,
  onClose,
}: AddRelationshipDialogProps): ReactElement {
  const [givenName, setGivenName] = useState('');
  const [surname, setSurname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPerson = useCreatePerson();
  const createParentChild = useCreateParentChildRelationship();
  const createSpouse = useCreateSpouseRelationship();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!givenName.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // First, create the new person
      const newPerson = await createPerson.mutateAsync({
        givenName: givenName.trim(),
        surname: surname.trim() || undefined,
      });

      // Then, create the relationship
      if (relationshipType === 'parent') {
        // New person is the parent, current person is the child
        await createParentChild.mutateAsync({
          parentId: newPerson.id,
          childId: personId,
        });
      } else if (relationshipType === 'child') {
        // Current person is the parent, new person is the child
        await createParentChild.mutateAsync({
          parentId: personId,
          childId: newPerson.id,
        });
      } else if (relationshipType === 'spouse') {
        // Create spouse relationship
        await createSpouse.mutateAsync({
          person1Id: personId,
          person2Id: newPerson.id,
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to create relationship:', error);
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
        <h2 className="text-lg font-semibold mb-4">{getTitle(relationshipType)}</h2>

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
