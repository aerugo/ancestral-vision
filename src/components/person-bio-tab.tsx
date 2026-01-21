'use client';

import * as React from 'react';
import { Loader2, Pencil, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdatePerson } from '@/hooks/use-people';
import { useGenerateBiography, useApplyBiographySuggestion } from '@/hooks/use-ai';
import { biographyTransitionEvents } from '@/visualization/biography-transition-events';

interface PersonBioTabProps {
  personId: string;
  biography: string | null | undefined;
}

type ViewState = 'view' | 'edit' | 'generating' | 'preview';

/**
 * PersonBioTab - Displays and allows inline editing of a person's biography
 *
 * Features:
 * - View mode: Shows biography text or "No biography available" placeholder
 * - Edit mode: Textarea for editing with Save/Cancel buttons
 * - Generate mode: AI-generated biography with loading animation
 * - Preview mode: Review generated biography before accepting
 * - Auto-saves on save button click
 * - Shows loading state while saving
 * - Triggers metamorphosis animation when adding new biography
 */
export function PersonBioTab({
  personId,
  biography,
}: PersonBioTabProps): React.ReactElement {
  const [viewState, setViewState] = React.useState<ViewState>('view');
  const [editedBiography, setEditedBiography] = React.useState(biography || '');
  const [generatedBiography, setGeneratedBiography] = React.useState<string | null>(null);
  const [suggestionId, setSuggestionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const updatePerson = useUpdatePerson();
  const generateBiography = useGenerateBiography();
  const applyBiographySuggestion = useApplyBiographySuggestion();

  // Sync edited biography when prop changes (e.g., after successful save)
  React.useEffect(() => {
    if (viewState === 'view') {
      setEditedBiography(biography || '');
    }
  }, [biography, viewState]);

  const handleEdit = () => {
    setEditedBiography(biography || '');
    setViewState('edit');
    setError(null);
  };

  const handleCancel = () => {
    setEditedBiography(biography || '');
    setGeneratedBiography(null);
    setSuggestionId(null);
    setViewState('view');
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

      setViewState('view');
    } catch {
      setError('Failed to save biography');
    }
  };

  const handleGenerate = async () => {
    try {
      setError(null);
      setViewState('generating');

      const result = await generateBiography.mutateAsync({
        personId,
        maxLength: 500,
      });

      setGeneratedBiography(result.biography);
      setSuggestionId(result.suggestionId);
      setViewState('preview');
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('QUOTA_EXCEEDED')
          ? 'AI quota exceeded. Please try again later.'
          : 'Failed to generate biography'
      );
      setViewState('view');
    }
  };

  const handleAcceptGenerated = async () => {
    if (!suggestionId || !generatedBiography) return;

    try {
      setError(null);
      const hadNoBiography = !biography || biography.trim() === '';

      // Trigger the metamorphosis animation BEFORE applying the suggestion
      if (hadNoBiography) {
        biographyTransitionEvents.emit(personId);
      }

      await applyBiographySuggestion.mutateAsync({
        suggestionId,
        personId,
      });

      setGeneratedBiography(null);
      setSuggestionId(null);
      setViewState('view');
    } catch {
      setError('Failed to apply biography');
    }
  };

  const handleRejectGenerated = () => {
    setGeneratedBiography(null);
    setSuggestionId(null);
    setViewState('view');
    setError(null);
  };

  // Generating mode - show loading animation
  if (viewState === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
          <Loader2 className="h-6 w-6 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Generating biography...
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          This may take a moment
        </p>
      </div>
    );
  }

  // Preview mode - show generated biography with accept/reject options
  if (viewState === 'preview' && generatedBiography) {
    const isPending = applyBiographySuggestion.isPending;

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI-Generated Biography</span>
          </div>
        </div>

        <div className="flex-1 rounded-md border border-primary/30 bg-primary/5 p-3 mb-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {generatedBiography}
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectGenerated}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleAcceptGenerated}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Use This Biography
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode
  if (viewState === 'edit') {
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
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Biography
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate with AI
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground italic mb-4">
            No biography available.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Write Biography
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-4 text-center">{error}</p>
      )}
    </div>
  );
}
