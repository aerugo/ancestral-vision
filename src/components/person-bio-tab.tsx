'use client';

import * as React from 'react';
import { Loader2, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdatePerson } from '@/hooks/use-people';
import { biographyTransitionEvents } from '@/visualization/biography-transition-events';

interface PersonBioTabProps {
  personId: string;
  biography: string | null | undefined;
}

/**
 * PersonBioTab - Displays and allows inline editing of a person's biography
 *
 * Features:
 * - View mode: Shows biography text or "No biography available" placeholder
 * - Edit mode: Textarea for editing with Save/Cancel buttons
 * - Auto-saves on save button click
 * - Shows loading state while saving
 */
export function PersonBioTab({
  personId,
  biography,
}: PersonBioTabProps): React.ReactElement {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedBiography, setEditedBiography] = React.useState(biography || '');
  const [error, setError] = React.useState<string | null>(null);

  const updatePerson = useUpdatePerson();

  // Sync edited biography when prop changes (e.g., after successful save)
  React.useEffect(() => {
    if (!isEditing) {
      setEditedBiography(biography || '');
    }
  }, [biography, isEditing]);

  const handleEdit = () => {
    setEditedBiography(biography || '');
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditedBiography(biography || '');
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      const trimmedBio = editedBiography.trim();
      const hadNoBiography = !biography || biography.trim() === '';
      const isAddingBiography = hadNoBiography && trimmedBio !== '';

      // If adding a biography (not editing), trigger the metamorphosis animation BEFORE
      // the mutation so it can capture the ghost node position before the scene rebuilds
      if (isAddingBiography) {
        biographyTransitionEvents.emit(personId);
      }

      await updatePerson.mutateAsync({
        id: personId,
        input: {
          // Use null to clear biography, otherwise send the trimmed value
          biography: trimmedBio === '' ? null : trimmedBio,
        },
      });

      setIsEditing(false);
    } catch {
      setError('Failed to save biography');
    }
  };

  // Edit mode
  if (isEditing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Edit Biography</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={updatePerson.isPending}
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={updatePerson.isPending}
              aria-label="Save biography"
            >
              {updatePerson.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <textarea
          value={editedBiography}
          onChange={(e) => setEditedBiography(e.target.value)}
          className="flex-1 min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          placeholder="Write a biography for this person..."
          disabled={updatePerson.isPending}
          autoFocus
        />

        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={updatePerson.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updatePerson.isPending}
          >
            {updatePerson.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="prose prose-sm prose-invert max-w-none">
      {biography ? (
        <>
          <p className="text-sm text-foreground whitespace-pre-wrap mb-4">
            {biography}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="mt-2"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Biography
          </Button>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground italic mb-4">
            No biography available.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Add Biography
          </Button>
        </div>
      )}
    </div>
  );
}
